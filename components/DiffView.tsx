
import React, { useState, useEffect } from 'react';
import { FileDiff, LogicalDiff } from '../types';
import { GeminiService, DiffAnalysis } from '../services/geminiService';

interface DiffViewProps {
  diff: FileDiff | null;
  gemini?: GeminiService | null;
}

const DiffView: React.FC<DiffViewProps> = ({ diff, gemini }) => {
  const [mode, setMode] = useState<'visual' | 'source'>('visual');
  const [analysis, setAnalysis] = useState<DiffAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    if (diff && gemini && (diff.status === 'modified' || diff.status === 'added')) {
      performAnalysis();
    } else {
      setAnalysis(null);
    }
  }, [diff]);

  const performAnalysis = async () => {
    if (!diff || !gemini) return;
    setIsAnalyzing(true);
    setAnalysis(null);
    try {
      const result = await gemini.analyzeDiff(
        diff.name, 
        diff.oldContent || '', 
        diff.newContent || ''
      );
      setAnalysis(result);
    } catch (e) {
      console.error(e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!diff) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-slate-50 text-slate-400">
        <div className="text-6xl mb-6">🔍</div>
        <h3 className="text-xl font-black text-slate-900">Select a component to compare</h3>
        <p className="text-sm italic">Review logical deltas and source code changes.</p>
      </div>
    );
  }

  const isText = diff.type !== 'other';

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden animate-slide-up">
      <div className="h-16 border-b border-slate-100 flex items-center px-8 bg-slate-50/50 justify-between shrink-0">
        <div className="flex items-center gap-4">
           <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-xs ${
             diff.status === 'added' ? 'bg-emerald-500' : diff.status === 'removed' ? 'bg-rose-500' : 'bg-amber-500'
           }`}>
             {diff.status === 'added' ? '+' : diff.status === 'removed' ? '-' : 'Δ'}
           </div>
           <div>
              <h3 className="text-sm font-black text-slate-900 leading-none mb-1">{diff.name}</h3>
              <p className="text-[10px] font-mono text-slate-400 truncate max-w-[300px]">{diff.path}</p>
           </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
             <button onClick={() => setMode('visual')} className={`px-4 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${mode === 'visual' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-600'}`}>Visual Impact</button>
             <button onClick={() => setMode('source')} className={`px-4 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${mode === 'source' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-600'}`}>Source Diff</button>
          </div>
          <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
             {diff.status} • {diff.type}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-slate-50 p-8 custom-scrollbar">
        {mode === 'visual' ? (
           <VisualImpactDashboard 
            analysis={analysis} 
            isAnalyzing={isAnalyzing} 
            onRetry={performAnalysis} 
            diff={diff}
           />
        ) : isText ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
            <DiffPanel label="Base (Old)" content={diff.oldContent} status="removed" />
            <DiffPanel label="Target (New)" content={diff.newContent} status={diff.status} />
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-20 text-center border-4 border-dashed border-slate-200 rounded-[3rem]">
             <div className="text-5xl mb-6">📦</div>
             <h4 className="text-xl font-black text-slate-900 mb-2">Binary Content Diff</h4>
             <p className="text-sm text-slate-500 italic">Line-by-line comparison is unavailable for compiled resources.</p>
          </div>
        )}
      </div>

      <div className="p-6 border-t border-slate-100 bg-white shrink-0 flex items-center justify-between">
         <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Intelligent Delta Analysis Active</p>
         </div>
         <p className="text-[9px] font-bold text-slate-300">Analysis provided by Gemini 3 Flash</p>
      </div>
    </div>
  );
};

const DiffPanel = ({ label, content, status }: { label: string, content?: string, status: string }) => (
  <div className="flex flex-col h-full min-h-[500px]">
    <span className="text-[9px] font-black uppercase text-slate-400 mb-2 px-4 tracking-widest">{label}</span>
    <div className={`flex-1 bg-slate-900 rounded-[2rem] p-6 overflow-hidden border shadow-xl ${
      status === 'added' ? 'border-emerald-500/20' : status === 'removed' ? 'border-rose-500/20' : 'border-amber-500/20'
    }`}>
      <pre className={`text-[10px] font-mono h-full overflow-auto scrollbar-hide ${
        status === 'added' ? 'text-emerald-400' : status === 'removed' ? 'text-rose-400' : 'text-amber-400'
      }`}>
        {content || `--- FILE DOES NOT EXIST IN THIS VERSION ---`}
      </pre>
    </div>
  </div>
);

const VisualImpactDashboard = ({ analysis, isAnalyzing, onRetry, diff }: { analysis: DiffAnalysis | null, isAnalyzing: boolean, onRetry: () => void, diff: FileDiff }) => {
  if (isAnalyzing) {
    return (
      <div className="max-w-4xl mx-auto space-y-8 py-12">
        <div className="text-center space-y-4">
           <div className="w-16 h-16 bg-white rounded-3xl shadow-xl flex items-center justify-center mx-auto mb-6">
              <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
           </div>
           <h4 className="text-xl font-black text-slate-900">Synthesizing Delta Impact...</h4>
           <p className="text-sm text-slate-500 italic">Gemini is parsing the difference between versions to determine functional changes.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="h-32 shimmer rounded-3xl"></div>
           <div className="h-32 shimmer rounded-3xl"></div>
           <div className="h-32 shimmer rounded-3xl"></div>
        </div>
      </div>
    );
  }

  if (!analysis) {
     return (
        <div className="h-full flex flex-col items-center justify-center text-slate-400">
           <p className="mb-4">No AI analysis generated yet.</p>
           <button onClick={onRetry} className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">Request Analysis</button>
        </div>
     );
  }

  const riskColors = {
    Low: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    Medium: 'bg-amber-50 text-amber-600 border-amber-100',
    High: 'bg-rose-50 text-rose-600 border-rose-100'
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-slide-up pb-12">
      {/* Executive Summary Header */}
      <div className="bg-white rounded-[2.5rem] p-10 shadow-xl border border-slate-100 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
           <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                 <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${riskColors[analysis.riskLevel]}`}>
                    {analysis.riskLevel} Risk Change
                 </span>
                 <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Impact Analysis</span>
              </div>
              <h3 className="text-2xl font-black text-slate-900 leading-tight mb-4">{analysis.summary}</h3>
              <div className="flex items-center gap-6">
                 <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500">Impact Magnitude:</span>
                    <div className="flex items-center gap-1">
                       {[...Array(10)].map((_, i) => (
                         <div key={i} className={`w-3 h-3 rounded-sm ${i < analysis.impactScore ? (analysis.impactScore > 7 ? 'bg-rose-500' : analysis.impactScore > 4 ? 'bg-amber-500' : 'bg-emerald-500') : 'bg-slate-100'}`} />
                       ))}
                    </div>
                    <span className="text-xs font-black ml-1">{analysis.impactScore}/10</span>
                 </div>
              </div>
           </div>
           
           <div className="shrink-0 flex items-center justify-center">
              <div className="w-24 h-24 bg-slate-50 rounded-full border-4 border-white shadow-inner flex items-center justify-center text-3xl">
                 {analysis.riskLevel === 'High' ? '🔥' : analysis.riskLevel === 'Medium' ? '⚖️' : '✅'}
              </div>
           </div>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50/50 rounded-full blur-3xl -z-10 translate-x-1/2 -translate-y-1/2"></div>
      </div>

      {/* Detailed Changes Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {analysis.keyChanges.map((change, idx) => (
          <div key={idx} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-lg transition-all group">
             <div className="flex items-start gap-4 mb-6">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black shrink-0">
                   {idx + 1}
                </div>
                <div>
                   <h4 className="text-lg font-black text-slate-900 mb-1">{change.title}</h4>
                   <p className="text-xs text-slate-500 font-medium leading-relaxed">{change.description}</p>
                </div>
             </div>
             <div className="pt-6 border-t border-slate-50">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Likely Impact</p>
                <div className="p-3 bg-slate-50 rounded-xl text-xs font-bold text-slate-700 italic">
                   "{change.impact}"
                </div>
             </div>
          </div>
        ))}
      </div>

      {/* Logical Context Footer */}
      {diff.logicalDiff && (
        <div className="bg-slate-900 text-white rounded-[2.5rem] p-10 shadow-2xl">
           <h4 className="text-xl font-black mb-6 flex items-center gap-3">
              <span className="text-indigo-400">⚛️</span> Logical Manifest Deviations
           </h4>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-4">
                 <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Added</p>
                 <div className="space-y-2">
                    {diff.logicalDiff.added?.map((item, i) => (
                       <div key={i} className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5 text-xs font-bold">
                          <span className="text-emerald-400">+</span> {item.displayName || item.name}
                       </div>
                    ))}
                    {(!diff.logicalDiff.added || diff.logicalDiff.added.length === 0) && <p className="text-xs italic opacity-30">None</p>}
                 </div>
              </div>
              <div className="space-y-4">
                 <p className="text-[10px] font-black uppercase tracking-widest text-rose-400">Removed</p>
                 <div className="space-y-2">
                    {diff.logicalDiff.removed?.map((item, i) => (
                       <div key={i} className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5 text-xs font-bold opacity-60">
                          <span className="text-rose-400">-</span> {item.displayName || item.name}
                       </div>
                    ))}
                    {(!diff.logicalDiff.removed || diff.logicalDiff.removed.length === 0) && <p className="text-xs italic opacity-30">None</p>}
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default DiffView;
