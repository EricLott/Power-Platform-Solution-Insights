
import React, { useState, useMemo } from 'react';
import { SolutionFile, SolutionMetadata, LogicalComponent, ComponentType } from '../types';

interface ExplorerProps {
  metadata: SolutionMetadata;
  files: SolutionFile[];
  onSelectComponent: (component: LogicalComponent) => void;
  onSelectFile: (file: SolutionFile) => void;
  selectedId: string | null;
  scannedFiles?: Set<string>;
  buggyFiles?: Set<string>;
}

const Explorer: React.FC<ExplorerProps> = ({ 
  metadata, 
  files, 
  onSelectComponent, 
  onSelectFile,
  selectedId,
  scannedFiles = new Set(),
  buggyFiles = new Set()
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['App', 'Flow', 'Table']));
  const [searchTerm, setSearchTerm] = useState('');

  const grouped = useMemo(() => {
    const groups: Record<string, LogicalComponent[]> = {};
    metadata.components.forEach(comp => {
      const type = comp.type || 'Other';
      if (!groups[type]) groups[type] = [];
      groups[type].push(comp);
    });
    return groups;
  }, [metadata]);

  const toggleSection = (section: string) => {
    const next = new Set(expandedSections);
    if (next.has(section)) next.delete(section);
    else next.add(section);
    setExpandedSections(next);
  };

  const getSectionIcon = (type: string) => {
    switch (type) {
      case 'App': return <div className="w-5 h-5 rounded-md bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px]">📱</div>;
      case 'ModelApp': return <div className="w-5 h-5 rounded-md bg-violet-100 text-violet-600 flex items-center justify-center text-[10px]">🏢</div>;
      case 'Flow': return <div className="w-5 h-5 rounded-md bg-sky-100 text-sky-600 flex items-center justify-center text-[10px]">🌊</div>;
      case 'Table': return <div className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-600 flex items-center justify-center text-[10px]">📊</div>;
      case 'WebResource': return <div className="w-5 h-5 rounded-md bg-amber-100 text-amber-600 flex items-center justify-center text-[10px]">📜</div>;
      case 'EnvVar': return <div className="w-5 h-5 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center text-[10px]">⚙️</div>;
      case 'Plugin': return <div className="w-5 h-5 rounded-md bg-rose-100 text-rose-600 flex items-center justify-center text-[10px]">🔌</div>;
      case 'SecurityRole': return <div className="w-5 h-5 rounded-md bg-orange-100 text-orange-600 flex items-center justify-center text-[10px]">🛡️</div>;
      case 'Sitemap': return <div className="w-5 h-5 rounded-md bg-cyan-100 text-cyan-600 flex items-center justify-center text-[10px]">🗺️</div>;
      case 'ConnectionRef': return <div className="w-5 h-5 rounded-md bg-lime-100 text-lime-600 flex items-center justify-center text-[10px]">🔗</div>;
      case 'CustomControl': return <div className="w-5 h-5 rounded-md bg-fuchsia-100 text-fuchsia-600 flex items-center justify-center text-[10px]">🎨</div>;
      default: return <div className="w-5 h-5 rounded-md bg-slate-100 text-slate-400 flex items-center justify-center text-[10px]">📦</div>;
    }
  };

  const getSectionTitle = (type: string) => {
    switch (type) {
        case 'EnvVar': return 'Environment Variables';
        case 'ModelApp': return 'Model-Driven Apps';
        case 'ConnectionRef': return 'Connection References';
        case 'SecurityRole': return 'Security Roles';
        case 'Other': return 'Miscellaneous Resources';
        default: return type + 's';
    }
  }

  const filteredGroups = useMemo(() => {
      const lower = searchTerm.toLowerCase();
      const filtered: Record<string, LogicalComponent[]> = {};
      (Object.entries(grouped) as [string, LogicalComponent[]][]).forEach(([type, comps]) => {
          const matched = comps.filter(c => 
            c.displayName.toLowerCase().includes(lower) || 
            c.logicalName.toLowerCase().includes(lower)
          );
          if (matched.length > 0) filtered[type] = matched;
      });
      return filtered;
  }, [grouped, searchTerm]);

  // Defined order for primary components
  const sectionOrder = ['App', 'ModelApp', 'Flow', 'Table', 'WebResource', 'EnvVar', 'Plugin', 'SecurityRole', 'Sitemap', 'ConnectionRef', 'CustomControl', 'Other'];

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="p-4 border-b border-slate-100">
        <div className="relative group">
          <input
            type="text"
            placeholder="Filter solution components..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all font-medium placeholder:text-slate-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute left-3 top-2.5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-3 space-y-1">
        {sectionOrder.map(type => {
          const comps = filteredGroups[type];
          if (!comps) return null;

          const isExpanded = expandedSections.has(type) || searchTerm.length > 0;
          return (
            <div key={type} className="px-2">
              <button 
                onClick={() => toggleSection(type)}
                className="w-full flex items-center px-3 py-1.5 text-slate-400 hover:text-slate-600 transition-colors group rounded-lg hover:bg-slate-50"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`h-3 w-3 mr-2 transform transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-[10px] font-extrabold uppercase tracking-[0.1em] flex-1 text-left">{getSectionTitle(type)}</span>
                <span className="text-[9px] bg-slate-100 px-1.5 py-0.5 rounded-full font-black text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">{comps.length}</span>
              </button>

              {isExpanded && (
                <div className="mt-1 space-y-0.5">
                  {comps.sort((a,b) => a.displayName.localeCompare(b.displayName)).map(comp => {
                    const isSelected = selectedId === comp.id;
                    const isAnyFileBuggy = comp.files.some(f => buggyFiles.has(f));
                    const isAnyFileScanned = comp.files.some(f => scannedFiles.has(f));

                    return (
                      <div
                        key={comp.id}
                        onClick={() => onSelectComponent(comp)}
                        className={`group flex items-center py-2.5 px-3 ml-4 rounded-xl cursor-pointer transition-all ${
                          isSelected 
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
                            : 'hover:bg-slate-50 text-slate-600 border-transparent'
                        }`}
                      >
                        <div className="mr-3 shrink-0 relative">
                          {getSectionIcon(comp.type)}
                          {isAnyFileScanned && (
                              <div className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-white flex items-center justify-center ${
                                isAnyFileBuggy ? 'bg-rose-500' : 'bg-emerald-500'
                              }`} />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className={`text-xs font-bold truncate leading-tight ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                            {comp.displayName}
                          </p>
                          <p className={`text-[9px] truncate mt-0.5 font-medium tracking-tight ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>
                            {comp.logicalName}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Catch-all for components that might not have a filtered group (unlikely with filteredGroups logic but good for robust safety) */}
        {searchTerm && Object.keys(filteredGroups).length === 0 && (
            <div className="text-center py-10 px-6">
                <p className="text-xs font-bold text-slate-400 italic">No components match your search.</p>
            </div>
        )}
      </div>
      
      <div className="p-4 border-t border-slate-50 bg-slate-50/30">
         <div className="flex items-center gap-3 opacity-60">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Intelligent Map Ready</span>
         </div>
      </div>
    </div>
  );
};

export default Explorer;
