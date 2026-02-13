
import React, { useState, useMemo } from 'react';
import { SolutionFile, CanvasAppMetadata, LogicalComponent, ModelAppMetadata, SecurityRoleMetadata } from '../types';
import { GeminiService } from '../services/geminiService';
import FlowVisualizer from './FlowVisualizer';
import CanvasAppDashboard from './CanvasAppDashboard';
import ModelAppDashboard from './ModelAppDashboard';
import SecurityRoleDashboard from './SecurityRoleDashboard';

interface FileViewProps {
  file: SolutionFile;
  canvasApps?: CanvasAppMetadata[];
  component?: LogicalComponent;
  gemini?: GeminiService | null;
}

const FileView: React.FC<FileViewProps> = ({ file, canvasApps = [], component, gemini }) => {
  const [viewMode, setViewMode] = useState<'code' | 'designer' | 'dashboard' | 'table'>('code');

  const flowDefinition = useMemo(() => {
    if (file.type !== 'json') return null;
    try {
      const parsed = JSON.parse(file.content);
      return parsed?.properties?.definition || (parsed?.triggers && parsed?.actions ? parsed : null);
    } catch { return null; }
  }, [file]);

  const xamlWorkflow = useMemo(() => {
    if (file.type !== 'xml' && file.type !== 'xaml') return null;
    return (file.content.includes('Workflow') || file.content.includes('Activity')) ? file.content : null;
  }, [file]);

  const isFlow = !!flowDefinition || !!xamlWorkflow;
  const canvasApp = component?.type === 'App' ? component.metadata as CanvasAppMetadata : null;
  const modelApp = component?.type === 'ModelApp' ? component.metadata as ModelAppMetadata : null;
  const securityRole = component?.type === 'SecurityRole' ? component.metadata as SecurityRoleMetadata : null;

  React.useEffect(() => {
    if (component?.type === 'App' || component?.type === 'ModelApp' || component?.type === 'SecurityRole') setViewMode('dashboard');
    else if (component?.type === 'Table') setViewMode('table');
    else if (isFlow) setViewMode('designer');
    else setViewMode('code');
  }, [component, isFlow]);

  const getComponentIcon = (type?: string) => {
    switch (type) {
      case 'App': return '📱';
      case 'ModelApp': return '🏢';
      case 'Flow': return '🌊';
      case 'Table': return '📊';
      case 'Plugin': return '🔌';
      case 'SecurityRole': return '🛡️';
      case 'Sitemap': return '🗺️';
      default: return '📄';
    }
  };

  const getComponentTheme = (type?: string) => {
    switch (type) {
      case 'App': return 'bg-indigo-100 text-indigo-600';
      case 'ModelApp': return 'bg-violet-100 text-violet-600';
      case 'Flow': return 'bg-sky-100 text-sky-600';
      case 'Table': return 'bg-emerald-100 text-emerald-600';
      case 'Plugin': return 'bg-rose-100 text-rose-600';
      case 'SecurityRole': return 'bg-orange-100 text-orange-600';
      case 'Sitemap': return 'bg-cyan-100 text-cyan-600';
      default: return 'bg-slate-100 text-slate-500';
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white relative overflow-hidden">
      <div className="h-16 bg-white border-b border-slate-100 flex items-center px-6 shrink-0 z-20">
        <div className="flex items-center gap-3 min-w-0">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shadow-sm ${getComponentTheme(component?.type)}`}>
                {getComponentIcon(component?.type)}
            </div>
            <div className="flex flex-col min-w-0">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-1">{component?.type || 'Source'}</span>
                <span className="text-sm font-extrabold text-slate-900 truncate">{component?.displayName || file.name}</span>
            </div>
        </div>
        
        <div className="ml-auto flex items-center">
          <div className="flex bg-slate-100/80 p-1 rounded-xl border border-slate-200 shadow-sm">
            {component?.type === 'Table' && (
                <ViewToggle active={viewMode === 'table'} onClick={() => setViewMode('table')} label="Schema" />
            )}
            {(canvasApp || modelApp || securityRole) && (
               <ViewToggle active={viewMode === 'dashboard'} onClick={() => setViewMode('dashboard')} label="Studio" />
            )}
            {isFlow && (
              <ViewToggle active={viewMode === 'designer'} onClick={() => setViewMode('designer')} label="Visualizer" />
            )}
            <ViewToggle active={viewMode === 'code'} onClick={() => setViewMode('code')} label="Source" />
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto bg-slate-50/50 custom-scrollbar">
        {viewMode === 'dashboard' && canvasApp ? (
          <CanvasAppDashboard app={canvasApp} />
        ) : viewMode === 'dashboard' && modelApp ? (
          <ModelAppDashboard app={modelApp} />
        ) : viewMode === 'dashboard' && securityRole ? (
          <SecurityRoleDashboard role={securityRole} />
        ) : viewMode === 'designer' && isFlow ? (
          <FlowVisualizer definition={flowDefinition} xmlContent={xamlWorkflow || undefined} gemini={gemini} />
        ) : viewMode === 'table' && component?.type === 'Table' ? (
           <TableDetails component={component} />
        ) : (
          <div className="p-8 lg:p-12 animate-slide-up">
            {file.content === '[Binary Content]' || !file.content ? (
               <div className="flex flex-col items-center justify-center py-32 text-slate-400">
                  <div className="w-20 h-20 bg-slate-100 rounded-[2rem] flex items-center justify-center text-4xl mb-6 shadow-inner">📦</div>
                  <p className="text-lg font-black text-slate-900">Resource Preview</p>
                  <p className="text-sm font-medium italic opacity-60">Source inspection not available or not linked for this component.</p>
               </div>
            ) : (
              <div className="bg-slate-900 rounded-[2rem] shadow-2xl p-8 overflow-hidden border border-slate-800">
                <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-4">
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">{file.path}</span>
                    <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest">{file.type}</span>
                </div>
                <pre className="font-mono text-xs text-indigo-200/80 leading-relaxed whitespace-pre-wrap break-all scrollbar-hide">
                  {file.content || "[No Content]"}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const ViewToggle = ({ active, onClick, label }: { active: boolean, onClick: () => void, label: string }) => (
    <button 
        onClick={onClick} 
        className={`px-5 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
            active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'
        }`}
    >
        {label}
    </button>
);

const TableDetails = ({ component }: { component: LogicalComponent }) => {
    const fields = component.metadata?.fields || [];
    return (
        <div className="p-8 lg:p-12 bg-slate-50/50 min-h-full animate-slide-up">
            <div className="max-w-5xl mx-auto">
                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
                    <div className="p-10 border-b border-slate-50 flex flex-col gap-2">
                        <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest leading-none">Table Definition</span>
                        <h3 className="text-3xl font-black text-slate-900">{component.displayName}</h3>
                        <p className="text-slate-400 font-mono text-xs">{component.logicalName}</p>
                    </div>
                    <div className="overflow-x-auto px-10 pb-10">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-slate-100">
                                    <th className="py-6 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Display Name</th>
                                    <th className="py-6 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Logical Name</th>
                                    <th className="py-6 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Data Type</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {fields.length > 0 ? fields.map((f: any, i: number) => (
                                    <tr key={i} className="hover:bg-slate-50/80 transition-colors group">
                                        <td className="py-5 text-sm font-extrabold text-slate-700">{f.displayName}</td>
                                        <td className="py-5 text-xs font-mono text-slate-400">{f.name}</td>
                                        <td className="py-5">
                                            <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-indigo-100">
                                                {f.type}
                                            </span>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={3} className="py-20 text-center text-slate-400 italic font-medium">No logical attributes indexed for this entity.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FileView;
