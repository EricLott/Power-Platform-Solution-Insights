
import JSZip from 'jszip';
import { 
  SolutionFile, 
  SolutionMetadata, 
  EntityMetadata, 
  EntityRelationship, 
  CanvasAppMetadata,
  LogicalComponent,
  ComponentType,
  ModelAppMetadata,
  SecurityRoleMetadata
} from '../types';

// Map Power Platform Component Type IDs to our enum
const COMPONENT_TYPE_MAP: Record<string, ComponentType> = {
  "1": "Table",
  "2": "Table", // Attribute
  "3": "Table", // Relationship
  "9": "Table", // OptionSet
  "20": "SecurityRole",
  "26": "WebResource",
  "29": "Flow",
  "30": "App", // Canvas App
  "60": "ModelApp",
  "62": "Sitemap",
  "91": "Plugin", // Plugin Assembly
  "92": "Plugin", // Plugin Type
  "300": "App", // Canvas App (sometimes)
  "371": "ConnectionRef",
  "380": "EnvVar",
};

export const parseSolutionZip = async (file: File): Promise<{ files: SolutionFile[], metadata: SolutionMetadata }> => {
  const zip = await JSZip.loadAsync(file);
  const files: SolutionFile[] = [];
  let metadata: SolutionMetadata = {
    uniqueName: 'Unknown',
    version: '0.0.0.0',
    localizedName: 'Unknown Solution',
    publisher: 'Unknown',
    components: [],
    entities: []
  };

  const filePromises: Promise<void>[] = [];
  const entityMap = new Map<string, EntityMetadata>();
  const components: LogicalComponent[] = [];

  // 1. Collect all files from ZIP
  zip.forEach((relativePath, zipEntry) => {
    if (!zipEntry.dir) {
      const p = zipEntry.async(relativePath.endsWith('.msapp') ? 'uint8array' : 'string').then(content => {
        const ext = relativePath.split('.').pop()?.toLowerCase() || '';
        let type: SolutionFile['type'] = 'other';
        if (ext === 'xml') type = 'xml';
        else if (ext === 'xaml') type = 'xaml';
        else if (ext === 'json') type = 'json';
        else if (ext === 'js') type = 'js';
        else if (ext === 'css') type = 'css';

        files.push({
          name: zipEntry.name.split('/').pop() || '',
          path: relativePath,
          content: typeof content === 'string' ? content : '[Binary Content]',
          type
        });

        if (relativePath.endsWith('.msapp')) {
            (zipEntry as any).binaryContent = content;
        }
      });
      filePromises.push(p);
    }
  });

  await Promise.all(filePromises);

  const customizationsXml = files.find(f => f.path === 'customizations.xml')?.content;
  const solutionXml = files.find(f => f.path === 'solution.xml')?.content;
  const parser = new DOMParser();

  // 2. Parse general solution metadata and ALL root components
  if (solutionXml) {
    const xmlDoc = parser.parseFromString(solutionXml, 'text/xml');
    metadata.uniqueName = xmlDoc.querySelector('UniqueName')?.textContent || 'Unknown';
    metadata.version = xmlDoc.querySelector('Version')?.textContent || '0.0.0.0';
    metadata.localizedName = xmlDoc.querySelector('LocalizedName')?.getAttribute('description') || 'Unknown Solution';
    metadata.publisher = xmlDoc.querySelector('Publisher UniqueName')?.textContent || 'Unknown';

    xmlDoc.querySelectorAll('RootComponents > RootComponent').forEach(node => {
        const typeId = node.getAttribute('type') || '';
        const id = node.getAttribute('id') || '';
        const schemaName = node.getAttribute('schemaName') || '';
        
        if (id && !components.some(c => c.id === id)) {
            components.push({
                id,
                logicalName: schemaName || id,
                displayName: schemaName || id,
                type: COMPONENT_TYPE_MAP[typeId] || 'Other',
                files: files.filter(f => f.path.includes(id) || (schemaName && f.path.includes(schemaName))).map(f => f.path)
            });
        }
    });
  }

  // 3. Parse customizations for logical components
  if (customizationsXml) {
    const xmlDoc = parser.parseFromString(customizationsXml, 'text/xml');

    // Security Roles
    xmlDoc.querySelectorAll('Roles > Role').forEach(node => {
      const id = node.getAttribute('id') || '';
      const name = node.getAttribute('name') || '';
      
      const roleMeta: SecurityRoleMetadata = {
        id,
        name,
        isManaged: node.getAttribute('ismanaged') === '1',
        privileges: []
      };

      node.querySelectorAll('RolePrivileges > RolePrivilege').forEach(p => {
        const privName = p.getAttribute('name') || '';
        let action = undefined;
        let entity = 'General Settings';

        // Pattern: prv[Action][Entity]
        // Common Actions: AppendTo, Append, Create, Read, Write, Delete, Assign, Share
        const actionMatch = privName.match(/^prv(Create|Read|Write|Delete|AppendTo|Append|Assign|Share)(.*)$/);
        
        if (actionMatch) {
          action = actionMatch[1];
          entity = actionMatch[2] || 'Global System';
        } else {
          // Check for common non-standard prefixes or just strip prv
          if (privName.startsWith('prv')) {
            entity = privName.substring(3);
          } else {
            entity = privName;
          }
        }

        roleMeta.privileges.push({
          privilegeId: p.getAttribute('privilegeid') || privName,
          name: privName,
          level: p.getAttribute('level') || '',
          depth: p.getAttribute('depth') || undefined,
          action,
          entity
        });
      });

      const existing = components.find(c => c.id === id && c.type === 'SecurityRole');
      if (existing) {
        existing.displayName = name;
        existing.metadata = roleMeta;
      } else {
        components.push({
          id,
          logicalName: name,
          displayName: name,
          type: 'SecurityRole',
          files: [],
          metadata: roleMeta
        });
      }
    });

    // Tables
    xmlDoc.querySelectorAll('Entities > Entity').forEach(node => {
      const logicalName = node.querySelector(':scope > Name')?.textContent || '';
      const displayName = node.querySelector(':scope > Name')?.getAttribute('LocalizedName') || logicalName;
      
      const entity: EntityMetadata = { logicalName, displayName, relationships: [], fields: [] };
      node.querySelectorAll('attribute').forEach(attr => {
          const fieldLogicalName = attr.querySelector('LogicalName')?.textContent || attr.getAttribute('PhysicalName') || '';
          const fieldDisplayName = attr.querySelector('displaynames > displayname')?.getAttribute('description') || fieldLogicalName;
          const fieldType = attr.querySelector('Type')?.textContent || 'string';
          entity.fields?.push({ name: fieldLogicalName, displayName: fieldDisplayName, type: fieldType });
      });

      entityMap.set(logicalName, entity);
      
      const existing = components.find(c => c.logicalName === logicalName && c.type === 'Table');
      if (existing) {
          existing.displayName = displayName;
          existing.metadata = { fields: entity.fields };
      } else {
          components.push({
              id: logicalName,
              logicalName,
              displayName,
              type: 'Table',
              files: files.filter(f => f.path.startsWith(`Entities/${logicalName}/`)).map(f => f.path),
              metadata: { fields: entity.fields }
          });
      }
    });

    // Relationships
    xmlDoc.querySelectorAll('EntityRelationships > EntityRelationship').forEach(relNode => {
      const name = relNode.getAttribute('Name') || '';
      const type = relNode.querySelector('EntityRelationshipType')?.textContent as any || 'OneToMany';
      const from = relNode.querySelector('ReferencedEntityName')?.textContent || '';
      const to = relNode.querySelector('ReferencingEntityName')?.textContent || '';

      if (from && to) {
        const relationship: EntityRelationship = { name, type, from, to };
        const fromEntity = entityMap.get(from);
        if (fromEntity) fromEntity.relationships.push(relationship);
        const toEntity = entityMap.get(to);
        if (toEntity) toEntity.relationships.push(relationship);
      }
    });

    // Model Driven Apps (AppModules)
    xmlDoc.querySelectorAll('AppModules > AppModule').forEach(node => {
        const uniqueName = node.querySelector('UniqueName')?.textContent || '';
        const localizedName = node.querySelector('LocalizedNames > LocalizedName')?.getAttribute('description') || uniqueName;
        
        const modelMeta: ModelAppMetadata = {
            uniqueName,
            displayName: localizedName,
            version: node.querySelector('IntroducedVersion')?.textContent || '1.0.0.0',
            formFactor: node.querySelector('FormFactor')?.textContent || '1',
            clientType: node.querySelector('ClientType')?.textContent || '4',
            navigationType: node.querySelector('NavigationType')?.textContent || '0',
            components: [],
            roles: [],
            elements: [],
            settings: []
        };

        // Parse Components
        node.querySelectorAll('AppModuleComponents > AppModuleComponent').forEach(c => {
            modelMeta.components.push({
                type: c.getAttribute('type') || '',
                schemaName: c.getAttribute('schemaName') || undefined,
                id: c.getAttribute('id') || undefined
            });
        });

        // Parse Roles
        node.querySelectorAll('AppModuleRoleMaps > Role').forEach(r => {
            modelMeta.roles.push(r.getAttribute('id') || '');
        });

        // Parse Elements
        node.querySelectorAll('appelements > appelement').forEach(e => {
            modelMeta.elements.push({
                uniqueName: e.getAttribute('uniquename') || '',
                name: e.querySelector('name')?.textContent || ''
            });
        });

        // Parse Settings
        node.querySelectorAll('appsettings > appsetting').forEach(s => {
            modelMeta.settings.push({
                name: s.getAttribute('settingdefinitionid.uniquename') || '',
                value: s.querySelector('value')?.textContent || ''
            });
        });

        const existing = components.find(c => c.logicalName === uniqueName && c.type === 'ModelApp');
        if (existing) {
            existing.displayName = localizedName;
            existing.metadata = modelMeta;
        } else {
            components.push({
                id: uniqueName,
                logicalName: uniqueName,
                displayName: localizedName,
                type: 'ModelApp',
                files: files.filter(f => f.path.includes(uniqueName)).map(f => f.path),
                metadata: modelMeta
            });
        }
    });

    // Cloud Flows
    xmlDoc.querySelectorAll('Workflows > Workflow').forEach(node => {
      const name = node.getAttribute('Name') || 'Untitled Flow';
      const logicalName = node.getAttribute('WorkflowId') || '';
      const fileName = node.querySelector('JsonFileName, XamlFileName')?.textContent || '';
      const normalizedFileName = fileName.startsWith('/') ? fileName.substring(1) : fileName;

      const existing = components.find(c => c.id === logicalName);
      if (existing) {
          existing.displayName = name;
          existing.files = Array.from(new Set([...existing.files, ...files.filter(f => f.path.includes(normalizedFileName)).map(f => f.path)]));
      } else {
          components.push({
              id: logicalName,
              logicalName,
              displayName: name,
              type: 'Flow',
              description: node.getAttribute('Description') || '',
              files: files.filter(f => f.path.includes(normalizedFileName) || f.path.includes(logicalName)).map(f => f.path)
          });
      }
    });
  }

  // 4. Handle Canvas Apps
  const canvasAppFiles = files.filter(f => f.path.startsWith('CanvasApps/') && f.path.endsWith('.xml') && !f.path.includes('_'));
  const canvasAppMetadataList: CanvasAppMetadata[] = [];

  for (const f of canvasAppFiles) {
    const xmlDoc = parser.parseFromString(f.content, 'text/xml');
    const displayName = xmlDoc.querySelector('DisplayName')?.textContent || '';
    const appId = xmlDoc.querySelector('AppId')?.textContent || '';
    const name = xmlDoc.querySelector('Name')?.textContent || '';
    const appType = xmlDoc.querySelector('AppType, CanvasAppType')?.textContent || '0';
    
    // Parse JSON-encoded strings from XML if present
    const parseJsonSafely = (selector: string) => {
        const text = xmlDoc.querySelector(selector)?.textContent;
        if (!text) return undefined;
        try { return JSON.parse(text); } catch { return undefined; }
    };

    const appMeta: CanvasAppMetadata = {
        name, 
        displayName, 
        description: xmlDoc.querySelector('Description')?.textContent || '', 
        appId, 
        path: f.path, 
        isPage: appType === '1',
        appVersion: xmlDoc.querySelector('AppVersion')?.textContent || undefined,
        createdClientVersion: xmlDoc.querySelector('CreatedByClientVersion')?.textContent || undefined,
        minClientVersion: xmlDoc.querySelector('MinClientVersion')?.textContent || undefined,
        tags: parseJsonSafely('Tags'),
        databaseReferences: parseJsonSafely('DatabaseReferences'),
        connectionReferences: parseJsonSafely('ConnectionReferences'),
        cdsDependencies: parseJsonSafely('CdsDependencies'),
        canvasAppType: appType
    };

    // Extract Data Sources from DatabaseReferences if they exist
    if (appMeta.databaseReferences) {
        const dataSources = new Set<string>();
        Object.values(appMeta.databaseReferences).forEach((ref: any) => {
            if (ref.dataSources) {
                Object.keys(ref.dataSources).forEach(ds => dataSources.add(ds));
            }
        });
        appMeta.dataSources = Array.from(dataSources);
    }

    const msappFile = files.find(file => file.path.startsWith('CanvasApps/') && file.path.includes(name) && file.path.endsWith('.msapp'));
    if (msappFile) {
        const zipEntry = zip.file(msappFile.path);
        const binary = (zipEntry as any).binaryContent;
        if (binary) {
            const msappZip = await JSZip.loadAsync(binary);
            const propsFile = msappZip.file("Properties.json");
            if (propsFile) {
                const props = JSON.parse(await propsFile.async("string"));
                if (!appMeta.description) appMeta.description = props.AppDescription || "";
                appMeta.controlCount = props.ControlCount || {};
                appMeta.layout = { width: props.DocumentLayoutWidth, height: props.DocumentLayoutHeight, orientation: props.DocumentLayoutOrientation };
                
                // Merge DataSources if not already found in XML
                if (!appMeta.dataSources && props.LocalDatabaseReferences) {
                    try {
                        const dbRefs = JSON.parse(props.LocalDatabaseReferences);
                        appMeta.dataSources = Object.keys(dbRefs.dataSources || {});
                    } catch {}
                }
            }
        }
    }

    canvasAppMetadataList.push(appMeta);

    const existing = components.find(c => c.logicalName === name || c.id === appId);
    if (existing) {
        existing.type = 'App';
        existing.displayName = displayName;
        existing.metadata = appMeta;
    } else {
        components.push({
            id: appId || name,
            logicalName: name,
            displayName,
            type: 'App',
            description: appMeta.description,
            files: files.filter(file => file.path.includes(name)).map(file => file.path),
            metadata: appMeta
        });
    }
  }

  metadata.components = components.filter((v, i, a) => a.findIndex(t => (t.id === v.id)) === i);
  metadata.entities = Array.from(entityMap.values());
  metadata.canvasApps = canvasAppMetadataList;
  
  return { files, metadata };
};
