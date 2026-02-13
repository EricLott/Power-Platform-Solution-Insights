
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { parseSolutionZip } from './services/zipService';
import { GeminiService, QuotaError } from './services/geminiService';
import { 
  SolutionFile, 
  SolutionMetadata, 
  ChatMessage, 
  LogicalComponent, 
  SolutionDiff, 
  FileDiff, 
  DiffStatus, 
  LogicalDiff,
  SecurityRoleMetadata
} from './types';
import Explorer from './components/Explorer';
import FileView from './components/FileView';
import Chat from './components/Chat';
import SolutionSummary from './components/SolutionSummary';
import SchemaVisualizer from './components/SchemaVisualizer';
import DiffView from './components/DiffView';

type AppMode = 'home' | 'explore' | 'compare';

const App: React.FC = () => {
  const [appMode, setAppMode] = useState<AppMode>('home');
  const [baseSolution, setBaseSolution] = useState<{ files: SolutionFile[], metadata: SolutionMetadata } | null>(null);
  const [targetSolution, setTargetSolution] = useState<{ files: SolutionFile[], metadata: SolutionMetadata } | null>(null);
  
  // Navigation State
  const [viewMode, setViewMode] = useState<'summary' | 'schema' | 'diff' | 'component'>('summary');
  const [selectedFileDiff, setSelectedFileDiff] = useState<FileDiff | null>(null);
  const [selectedComponent, setSelectedComponent] = useState<LogicalComponent | null>(null);
  
  // System State
  const [isLoading, setIsLoading] = useState(false);
  const [gemini, setGemini] = useState<GeminiService | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isQuotaExhausted, setIsQuotaExhausted] = useState(false);

  // Layout State
  const [leftWidth, setLeftWidth] = useState(320);
  const [rightWidth, setRightWidth] = useState(400);
  const [isResizingLeft, setIsResizingLeft] = useState(false);
  const [isResizingRight, setIsResizingRight] = useState(false);
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
  const [isRightCollapsed, setIsRightCollapsed] = useState(false);

  // Derived State
  const isActive = (appMode === 'explore' && baseSolution) || (appMode === 'compare' && baseSolution && targetSolution && viewMode !== 'summary' && viewMode !== 'schema' && selectedFileDiff === null && selectedComponent === null) ? false : (baseSolution && (appMode === 'explore' || targetSolution)); 
  // Simplified: Are we past the upload screen?
  const isWorkspaceActive = (appMode === 'explore' && baseSolution) || (appMode === 'compare' && baseSolution && targetSolution && viewMode !== 'summary'); 
  // Actually, we use a separate check for rendering the workspace vs upload

  const solutionDiff = useMemo((): SolutionDiff | null => {
    if (appMode !== 'compare' || !baseSolution || !targetSolution) return null;

    const fileDiffs: FileDiff[] = [];
    const baseFiles = new Map<string, SolutionFile>(baseSolution.files.map(f => [f.path, f]));
    const targetFiles = new Map<string, SolutionFile>(targetSolution.files.map(f => [f.path, f]));

    const baseComps = new Map<string, LogicalComponent>(baseSolution.metadata.components.map(c => [c.id, c]));
    const targetComps = new Map<string, LogicalComponent>(targetSolution.metadata.components.map(c => [c.id, c]));

    const allPaths = Array.from(new Set([...baseFiles.keys(), ...targetFiles.keys()]));
    let added = 0, removed = 0, modified = 0;

    allPaths.forEach(path => {
      const base = baseFiles.get(path);
      const target = targetFiles.get(path);
      let status: DiffStatus = 'unchanged';

      if (!base && target) { status = 'added'; added++; }
      else if (base && !target) { status = 'removed'; removed++; }
      else if (base && target && base.content !== target.content) { status = 'modified'; modified++; }

      if (status !== 'unchanged') {
        const file = (target || base) as SolutionFile;
        const baseComp = Array.from(baseComps.values()).find(c => c.files.includes(path));
        const targetComp = Array.from(targetComps.values()).find(c => c.files.includes(path));

        let logicalDiff: LogicalDiff | undefined = undefined;

        if (baseComp?.type === 'Table' && targetComp?.type === 'Table') {
          const oldFields = baseComp.metadata?.fields || [];
          const newFields = targetComp.metadata?.fields || [];
          logicalDiff = {
            type: 'Table',
            added: newFields.filter((nf: any) => !oldFields.some((of: any) => of.name === nf.name)),
            removed: oldFields.filter((of: any) => !newFields.some((nf: any) => nf.name === of.name)),
          };
        }

        if (baseComp?.type === 'SecurityRole' && targetComp?.type === 'SecurityRole') {
          const oldPrivs = (baseComp.metadata as SecurityRoleMetadata).privileges || [];
          const newPrivs = (targetComp.metadata as SecurityRoleMetadata).privileges || [];
          logicalDiff = {
            type: 'SecurityRole',
            added: newPrivs.filter(np => !oldPrivs.some(op => op.name === np.name)),
            removed: oldPrivs.filter(op => !newPrivs.some(np => np.name === op.name)),
            modified: newPrivs.filter(np => {
               const op = oldPrivs.find(o => o.name === np.name);
               return op && (op.level !== np.level || op.depth !== np.depth);
            }).map(np => ({ name: np.name, old: oldPrivs.find(o => o.name === np.name), new: np }))
          };
        }

        fileDiffs.push({
          path,
          name: file.name,
          status,
          oldContent: base?.content,
          newContent: target?.content,
          type: file.type,
          logicalDiff,
          oldMetadata: baseComp?.metadata,
          newMetadata: targetComp?.metadata
        });
      }
    });

    return {
      oldMetadata: baseSolution.metadata,
      newMetadata: targetSolution.metadata,
      fileDiffs: fileDiffs.sort((a, b) => a.path.localeCompare(b.path)),
      stats: { added, removed, modified }
    };
  }, [baseSolution, targetSolution, appMode]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, slot: 'base' | 'target') => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsLoading(true);
    try {
      const parsed = await parseSolutionZip(file);
      if (slot === 'base') setBaseSolution(parsed);
      else setTargetSolution(parsed);

      // Auto-start exploration if in explore mode
      if (appMode === 'explore') {
        if (!gemini) setGemini(new GeminiService());
        setViewMode('summary');
      }
    } catch (error) {
      console.error(error);
      alert('Failed to process solution.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartComparison = () => {
    if (baseSolution && targetSolution) {
      if (!gemini) setGemini(new GeminiService());
      setViewMode('summary');
    }
  };

  const handleSendMessage = async (message: string) => {
    if (!gemini || !message.trim()) return;
    setChatHistory(prev => [...prev, { role: 'user', text: message }]);
    setIsChatLoading(true);
    try {
      let prompt = message;
      if (appMode === 'compare' && solutionDiff) {
        prompt = `Comparing ${solutionDiff.oldMetadata?.localizedName} vs ${solutionDiff.newMetadata?.localizedName}.
        Changes: ${solutionDiff.stats.added} added, ${solutionDiff.stats.removed} removed, ${solutionDiff.stats.modified} modified.
        Question: ${message}`;
      } else if (baseSolution) {
        prompt = `Analyzing solution ${baseSolution.metadata.localizedName}. Context: ${selectedComponent ? selectedComponent.displayName : 'Global'}. Question: ${message}`;
      }
      const response = await gemini.sendMessage(prompt);
      setChatHistory(prev => [...prev, { role: 'model', text: response.text || 'No response' }]);
    } catch (error) {
      if (error instanceof QuotaError) setIsQuotaExhausted(true);
      setChatHistory(prev => [...prev, { role: 'model', text: 'Communication error.' }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleSelectComponent = (comp: LogicalComponent) => {
    setSelectedComponent(comp);
    setViewMode('component');
  };

  const getActiveFile = (): SolutionFile | undefined => {
    if (!selectedComponent || !baseSolution) return undefined;
    // Try to find a meaningful file to display
    const mainPath = selectedComponent.files[0]; 
    return baseSolution.files.find(f => f.path === mainPath) || {
      name: selectedComponent.displayName,
      path: 'logical-component',
      content: '',
      type: 'other'
    };
  };

  // Resizing logic
  const startResizingLeft = useCallback((e: React.MouseEvent) => { e.preventDefault(); setIsResizingLeft(true); }, []);
  const startResizingRight = useCallback((e: React.MouseEvent) => { e.preventDefault(); setIsResizingRight(true); }, []);
  const stopResizing = useCallback(() => { setIsResizingLeft(false); setIsResizingRight(false); }, []);
  const resize = useCallback((e: MouseEvent) => {
    if (isResizingLeft) setLeftWidth(Math.max(240, Math.min(600, e.clientX)));
    else if (isResizingRight) setRightWidth(Math.max(300, Math.min(800, window.innerWidth - e.clientX)));
  }, [isResizingLeft, isResizingRight]);

  useEffect(() => {
    if (isResizingLeft || isResizingRight) {
      window.addEventListener('mousemove', resize);
      window.addEventListener('mouseup', stopResizing);
    } else {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    }
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [isResizingLeft, isResizingRight, resize, stopResizing]);

  // Determine which screen to show
  const showHome = appMode === 'home';
  const showExploreUpload = appMode === 'explore' && !baseSolution;
  const showCompareUpload = appMode === 'compare' && (!baseSolution || !targetSolution || viewMode === 'summary' && !gemini); // simplified check for "started"
  
  // Real check for workspace active:
  const isWorkspaceReady = (appMode === 'explore' && baseSolution) || (appMode === 'compare' && baseSolution && targetSolution && gemini);

  const activeMetadata = appMode === 'compare' ? targetSolution?.metadata : baseSolution?.metadata;
  const activeFiles = appMode === 'compare' ? targetSolution?.files : baseSolution?.files;

  return (
    <div className="h-screen flex flex-col bg-slate-50 overflow-hidden text-slate-900">
      {/* Header */}
      <header className="h-16 border-b border-slate-200 bg-white/80 backdrop-blur-md flex items-center justify-between px-6 shrink-0 z-40">
        <div className="flex items-center gap-4 cursor-pointer" onClick={() => window.location.reload()}>
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight leading-none">Power Platform</h1>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600">Insights & Diff</p>
          </div>
        </div>
        
        {isWorkspaceReady && (
          <div className="flex items-center gap-4">
            <nav className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button onClick={() => setViewMode('summary')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'summary' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>Overview</button>
              <button onClick={() => setViewMode('schema')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'schema' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>Schema</button>
            </nav>
            <button onClick={() => window.location.reload()} className="text-[10px] font-black uppercase text-slate-400 hover:text-rose-500 transition-colors tracking-widest px-4">Exit</button>
          </div>
        )}
      </header>

      {/* Mode Selection (Home) */}
      {showHome && (
        <div className="flex-1 flex flex-col items-center justify-center p-12 bg-slate-50 space-y-12 animate-in fade-in zoom-in-95 duration-500">
          <div className="text-center max-w-2xl">
            <h2 className="text-5xl font-black text-slate-900 mb-6 tracking-tighter">Choose Your Workflow</h2>
            <p className="text-slate-500 text-lg">Analyze a single unmanaged solution or perform a deep delta comparison between two versions.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
            <button 
              onClick={() => setAppMode('explore')}
              className="group relative bg-white p-10 rounded-[2.5rem] shadow-xl border border-slate-100 hover:border-indigo-400 hover:shadow-2xl hover:-translate-y-1 transition-all text-left overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-40 w-40 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform">🚀</div>
              <h3 className="text-2xl font-black text-slate-900 mb-2">Solution Explorer</h3>
              <p className="text-slate-500 font-medium">Deep dive into a single ZIP. Visualize ERDs, Cloud Flows, and audit Security Roles with AI.</p>
            </button>

            <button 
              onClick={() => setAppMode('compare')}
              className="group relative bg-white p-10 rounded-[2.5rem] shadow-xl border border-slate-100 hover:border-emerald-400 hover:shadow-2xl hover:-translate-y-1 transition-all text-left overflow-hidden"
            >
               <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-40 w-40 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform">⚖️</div>
              <h3 className="text-2xl font-black text-slate-900 mb-2">Diff Engine</h3>
              <p className="text-slate-500 font-medium">Compare Base vs Target. Detect logical drift, schema changes, and source code modifications.</p>
            </button>
          </div>
        </div>
      )}

      {/* Upload Screens */}
      {!showHome && !isWorkspaceReady && (
        <div className="flex-1 flex flex-col items-center justify-center p-12 bg-slate-50 space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
           <div className="text-center max-w-2xl">
              <button onClick={() => setAppMode('home')} className="mb-6 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition-colors">← Back to Menu</button>
              <h2 className="text-5xl font-black text-slate-900 mb-4 tracking-tighter">
                {appMode === 'explore' ? 'Upload Solution' : 'Select Versions'}
              </h2>
              <p className="text-slate-500 text-lg">
                {appMode === 'explore' ? 'Upload an unmanaged solution ZIP to begin analysis.' : 'Provide both baseline and target solution files.'}
              </p>
           </div>
           
           <div className={`grid grid-cols-1 ${appMode === 'compare' ? 'md:grid-cols-2' : 'md:grid-cols-1 max-w-lg'} gap-8 w-full max-w-4xl`}>
              <UploadSlot label={appMode === 'compare' ? "1. Base Solution (Old)" : "Solution File"} onUpload={(e) => handleFileUpload(e, 'base')} data={baseSolution} isLoading={isLoading} />
              {appMode === 'compare' && (
                <UploadSlot label="2. Target Solution (New)" onUpload={(e) => handleFileUpload(e, 'target')} data={targetSolution} isLoading={isLoading} />
              )}
           </div>

           {appMode === 'compare' && (
             <div className={`transition-all duration-500 transform ${baseSolution && targetSolution ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-4 opacity-0 scale-95 pointer-events-none'}`}>
                <button 
                  onClick={handleStartComparison}
                  className="px-12 py-5 bg-indigo-600 text-white rounded-[2rem] text-sm font-black uppercase tracking-[0.2em] shadow-2xl shadow-indigo-200 hover:bg-indigo-700 hover:scale-105 active:scale-95 transition-all flex items-center gap-4"
                >
                  Start Comparison
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                     <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
             </div>
           )}
        </div>
      )}

      {/* Main Workspace */}
      {isWorkspaceReady && activeMetadata && (
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar: Explorer (Mode A) or Diff List (Mode B) */}
          <aside 
            className={`border-r border-slate-200 bg-white flex flex-col shrink-0 transition-[width] duration-300 relative ${isLeftCollapsed ? 'w-0' : ''}`} 
            style={{ width: isLeftCollapsed ? '0px' : `${leftWidth}px` }}
          >
            {!isLeftCollapsed && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                   <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                     {appMode === 'explore' ? 'Component Explorer' : 'Delta Explorer'}
                   </span>
                   <button onClick={() => setIsLeftCollapsed(true)} className="p-1 text-slate-300 hover:text-slate-500"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></button>
                </div>
                
                {appMode === 'explore' ? (
                  <Explorer 
                    metadata={activeMetadata} 
                    files={activeFiles || []} 
                    onSelectComponent={handleSelectComponent} 
                    onSelectFile={() => {}} // Not strictly used yet as we infer file from component
                    selectedId={selectedComponent?.id || null} 
                  />
                ) : (
                  <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                    {solutionDiff?.fileDiffs.map(diff => (
                      <button 
                        key={diff.path}
                        onClick={() => { setSelectedFileDiff(diff); setViewMode('diff'); }}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                          selectedFileDiff?.path === diff.path ? 'bg-indigo-600 text-white shadow-lg' : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <DiffBadge status={diff.status} />
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate leading-none mb-1">{diff.name}</p>
                          <p className={`text-[9px] font-mono truncate opacity-60 ${selectedFileDiff?.path === diff.path ? 'text-indigo-100' : ''}`}>{diff.path}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div onMouseDown={startResizingLeft} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-indigo-400 z-50" />
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 overflow-hidden bg-white">
            {viewMode === 'summary' ? (
              <SolutionSummary 
                metadata={activeMetadata} 
                files={activeFiles || []} 
                onViewSchema={() => setViewMode('schema')} 
                onSelectComponent={handleSelectComponent} 
                diff={appMode === 'compare' ? solutionDiff : null}
              />
            ) : viewMode === 'schema' ? (
              <SchemaVisualizer entities={activeMetadata.entities} />
            ) : viewMode === 'diff' ? (
              <DiffView diff={selectedFileDiff} gemini={gemini} />
            ) : (
              // Component/File View (Explore Mode)
              getActiveFile() ? (
                <FileView 
                  file={getActiveFile()!} 
                  component={selectedComponent || undefined} 
                  gemini={gemini}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400">Select a component</div>
              )
            )}
          </main>

          {/* Right Sidebar: Chat */}
          <aside 
            className={`border-l border-slate-200 bg-white flex flex-col shrink-0 transition-[width] duration-300 relative ${isRightCollapsed ? 'w-0' : ''}`} 
            style={{ width: isRightCollapsed ? '0px' : `${rightWidth}px` }}
          >
            {!isRightCollapsed && (
               <Chat 
                 history={chatHistory} 
                 onSendMessage={handleSendMessage} 
                 isLoading={isChatLoading} 
                 contextFile={getActiveFile() || null} 
                 isQuotaExhausted={isQuotaExhausted} 
               />
            )}
            <div onMouseDown={startResizingRight} className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-indigo-400 z-50" />
          </aside>
        </div>
      )}
    </div>
  );
};

const UploadSlot = ({ label, onUpload, data, isLoading }: { label: string, onUpload: (e: any) => void, data: any, isLoading: boolean }) => (
  <div className={`p-10 rounded-[2.5rem] border-2 border-dashed flex flex-col items-center justify-center transition-all min-h-[300px] ${
    data ? 'bg-white border-indigo-500 shadow-xl shadow-indigo-100' : 'bg-white border-slate-200 hover:border-indigo-400'
  }`}>
    <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center text-3xl mb-6 shadow-xl transition-transform ${
      data ? 'bg-indigo-600 text-white scale-110 shadow-indigo-200' : 'bg-slate-100 text-slate-400'
    }`}>
      {data ? '✓' : '📁'}
    </div>
    <h3 className="text-xl font-black text-slate-900 mb-2">{label}</h3>
    {data ? (
      <div className="text-center animate-in fade-in slide-in-from-top-2">
        <p className="text-sm font-bold text-indigo-600">{data.metadata.localizedName}</p>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Version {data.metadata.version}</p>
        <label className="mt-6 inline-block cursor-pointer px-4 py-2 border border-slate-200 rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 hover:text-indigo-600 hover:border-indigo-600 transition-all">
          Change ZIP
          <input type="file" accept=".zip" className="hidden" onChange={onUpload} disabled={isLoading} />
        </label>
      </div>
    ) : (
      <label className="cursor-pointer px-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all active:scale-95 shadow-lg shadow-slate-200">
        {isLoading ? 'Reading Archive...' : 'Select Solution ZIP'}
        <input type="file" accept=".zip" className="hidden" onChange={onUpload} disabled={isLoading} />
      </label>
    )}
  </div>
);

const DiffBadge = ({ status }: { status: DiffStatus }) => {
  const styles = { added: 'bg-emerald-500', removed: 'bg-rose-500', modified: 'bg-amber-500', unchanged: 'bg-slate-300' };
  return <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${styles[status]}`} />;
};

export default App;
