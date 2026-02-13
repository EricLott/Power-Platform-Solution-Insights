
export interface SolutionFile {
  name: string;
  path: string;
  content: string;
  type: 'xml' | 'xaml' | 'json' | 'js' | 'css' | 'other';
}

export type DiffStatus = 'added' | 'removed' | 'modified' | 'unchanged';

export interface LogicalDiff {
  type: ComponentType;
  added?: any[];
  removed?: any[];
  modified?: { name: string; old: any; new: any }[];
}

export interface FileDiff {
  path: string;
  name: string;
  status: DiffStatus;
  oldContent?: string;
  newContent?: string;
  type: SolutionFile['type'];
  logicalDiff?: LogicalDiff;
  oldMetadata?: any;
  newMetadata?: any;
}

export interface SolutionDiff {
  oldMetadata: SolutionMetadata | null;
  newMetadata: SolutionMetadata | null;
  fileDiffs: FileDiff[];
  stats: {
    added: number;
    removed: number;
    modified: number;
  };
}

export interface JsBug {
  fileName: string;
  filePath: string;
  issue: string;
  severity: 'critical' | 'warning' | 'info';
  suggestion: string;
}

export type ComponentType = 
  | 'App' 
  | 'ModelApp' 
  | 'Flow' 
  | 'Table' 
  | 'WebResource' 
  | 'EnvVar' 
  | 'Plugin' 
  | 'SecurityRole' 
  | 'Sitemap' 
  | 'ConnectionRef' 
  | 'CustomControl' 
  | 'Other';

export interface LogicalComponent {
  id: string;
  displayName: string;
  logicalName: string;
  type: ComponentType;
  description?: string;
  files: string[]; 
  metadata?: any;
}

export interface CanvasAppMetadata {
  name: string;
  displayName: string;
  description: string;
  appId: string;
  path: string;
  isPage: boolean;
  appVersion?: string;
  createdClientVersion?: string;
  minClientVersion?: string;
  tags?: any;
  databaseReferences?: any;
  connectionReferences?: any;
  cdsDependencies?: any;
  canvasAppType?: string;
  dataSources?: string[];
  controlCount?: Record<string, number>;
  layout?: {
    width: number;
    height: number;
    orientation: string;
  };
}

export interface ModelAppMetadata {
  uniqueName: string;
  displayName: string;
  version: string;
  formFactor: string;
  clientType: string;
  navigationType: string;
  components: { type: string; schemaName?: string; id?: string }[];
  roles: string[];
  elements: { name: string; uniqueName: string }[];
  settings: { name: string; value: string }[];
}

export interface SecurityRoleMetadata {
  id: string;
  name: string;
  isManaged: boolean;
  privileges: {
    privilegeId: string;
    name: string;
    level: string;
    depth?: string;
    action?: string;
    entity?: string;
  }[];
}

export interface EntityRelationship {
  name: string;
  type: 'OneToMany' | 'ManyToOne' | 'ManyToMany';
  from: string;
  to: string;
}

export interface EntityMetadata {
  logicalName: string;
  displayName: string;
  relationships: EntityRelationship[];
  fields?: { name: string, displayName: string, type: string }[];
}

export interface SolutionMetadata {
  uniqueName: string;
  version: string;
  localizedName: string;
  publisher: string;
  components: LogicalComponent[];
  entities: EntityMetadata[]; 
  canvasApps?: CanvasAppMetadata[]; 
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}
