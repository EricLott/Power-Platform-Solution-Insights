
import React from 'react';
import { SolutionMetadata, SolutionFile, LogicalComponent, SolutionDiff } from '../types';

interface SolutionSummaryProps {
  metadata: SolutionMetadata;
  files: SolutionFile[];
  onViewSchema: () => void;
  onSelectComponent: (comp: LogicalComponent) => void;
  scanComplete?: boolean;
  bugCount?: number;
  diff?: SolutionDiff | null;
}

const SolutionSummary: React.FC<SolutionSummaryProps> = ({ 
  metadata, 
  files, 
  onViewSchema, 
  onSelectComponent,
  scanComplete,
  bugCount = 0,
  diff
}) => {
  const componentStats = {
    totalFiles: files.length,
    flows: metadata.components.filter(c => c.type === 'Flow').length,
    entities: metadata.entities.length,
    apps: metadata.components.filter(c => c.type === 'App').length,
    webResources: metadata.components.filter(c => c.type === 'WebResource').length,
  };

  // Logic to identify high-level logical additions/removals
  const logicalDeltas = React.useMemo(() => {
    if (!diff) return null;
    
    const baseIds = new Set(diff.oldMetadata?.components.map(c => c.id) || []);
    const targetIds = new Set(diff.newMetadata?.components.map(c => c.id) || []);
    
    const addedComps = diff.newMetadata?.components.filter(c => !baseIds.has(c.id)) || [];
    const removedComps = diff.oldMetadata?.components.filter(c => !targetIds.has(c.id)) || [];

    return { added: addedComps, removed: removedComps };
  }, [diff]);

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 custom-scrollbar animate-slide-up h-full">
      <div className="max-w-6xl mx-auto p-12">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-12">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white border border-slate-200 rounded-full shadow-sm">
              <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                {diff ? 'Comparison Mode Active' : 'Single Solution Mode'}
              </span>
            </div>
            <h1 className="text-5xl font-black text-slate-900 tracking-tight leading-tight">
              {diff ? 'Delta Report' : 'Overview'}
            </h1>
            <p className="text-slate-500 font-medium text-lg max-w-2xl">
              {diff 
                ? `Comparing ${diff.oldMetadata?.localizedName} (v${diff.oldMetadata?.version}) vs ${diff.newMetadata?.localizedName} (v${diff.newMetadata?.version}).`
                : `Analyzing ${metadata.localizedName} v${metadata.version}.`
              }
            </p>
          </div>
          
          <div className="flex flex-col gap-3">
             <div className="bg-slate-900 text-white px-8 py-5 rounded-[2rem] shadow-2xl flex flex-col min-w-[240px]">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50 mb-1">Impact Analysis</span>
                <span className="text-xl font-bold">{diff ? 'High Sensitivity' : 'Baseline Indexed'}</span>
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/10">
                   <div className={`w-2 h-2 rounded-full ${diff ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                   <span className={`text-[10px] font-bold uppercase tracking-widest ${diff ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {diff ? `${diff.fileDiffs.length} Delta Points` : 'No Deviations'}
                   </span>
                </div>
             </div>
          </div>
        </div>

        {diff ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <StatCard label="Added Assets" value={diff.stats.added} icon="➕" color="emerald" />
            <StatCard label="Modified Assets" value={diff.stats.modified} icon="📝" color="amber" />
            <StatCard label="Removed Assets" value={diff.stats.removed} icon="🗑️" color="rose" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
            <StatCard label="Apps & Pages" value={componentStats.apps} icon="📱" color="indigo" />
            <StatCard label="Automations" value={componentStats.flows} icon="🌊" color="sky" />
            <StatCard label="Data Tables" value={componentStats.entities} icon="📊" color="emerald" onClick={onViewSchema} clickable />
            <StatCard label="Solution Files" value={componentStats.totalFiles} icon="📦" color="slate" />
          </div>
        )}

        {diff && logicalDeltas && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
             <div className="bg-emerald-50/30 border border-emerald-100 rounded-[2.5rem] p-10">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-6">New Logical Components</h4>
                <div className="space-y-3">
                   {logicalDeltas.added.length > 0 ? logicalDeltas.added.map(c => (
                     <div key={c.id} className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-sm flex justify-between items-center">
                        <div>
                           <p className="text-xs font-black text-slate-800">{c.displayName}</p>
                           <p className="text-[9px] font-mono text-slate-400 uppercase">{c.type}</p>
                        </div>
                        <span className="text-xs">✨</span>
                     </div>
                   )) : <p className="text-xs italic text-slate-400">No new high-level components.</p>}
                </div>
             </div>
             <div className="bg-rose-50/30 border border-rose-100 rounded-[2.5rem] p-10">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-rose-600 mb-6">Deprecated Components</h4>
                <div className="space-y-3">
                   {logicalDeltas.removed.length > 0 ? logicalDeltas.removed.map(c => (
                     <div key={c.id} className="bg-white p-4 rounded-2xl border border-rose-100 shadow-sm flex justify-between items-center">
                        <div>
                           <p className="text-xs font-black text-slate-800">{c.displayName}</p>
                           <p className="text-[9px] font-mono text-slate-400 uppercase">{c.type}</p>
                        </div>
                        <span className="text-xs">🗑️</span>
                     </div>
                   )) : <p className="text-xs italic text-slate-400">No components removed.</p>}
                </div>
             </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-xl">
             <h3 className="text-2xl font-black text-slate-900 mb-8 flex items-center gap-4">
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-xl">🔍</div>
                Logical Architecture Drift
             </h3>
             <p className="text-slate-500 font-medium mb-10 leading-relaxed">
               We've indexed shifts in the solution manifest. Use the Delta Explorer to review granular code differences or schema adjustments in Dataverse entities.
             </p>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <ProgressItem label="Canvas Apps" count={componentStats.apps} percent={50} color="bg-indigo-600" />
                <ProgressItem label="Automations" count={componentStats.flows} percent={70} color="bg-sky-500" />
             </div>
          </div>

          <div className="space-y-8">
             <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
                <div className="relative z-10">
                   <h4 className="text-xl font-black mb-4">Gemini Delta Audit</h4>
                   <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                     The AI is aware of the solution drift. Ask "What logic was refactored in the main flow?" or "Check for security regressions."
                   </p>
                   <div className="flex flex-wrap gap-2">
                      <Badge label="Compare Intent" />
                      <Badge label="Risk Analysis" />
                   </div>
                </div>
                <div className="absolute top-[-20px] right-[-20px] w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition-all duration-700"></div>
             </div>
             <button onClick={onViewSchema} className="w-full p-8 bg-white border border-slate-200 rounded-[2.5rem] text-left hover:border-indigo-400 transition-all shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all">
                <div className="text-3xl mb-3">🗂️</div>
                <h4 className="text-lg font-black text-slate-900">Schema Delta Map</h4>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Drift in Data Structures</p>
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, icon, color, onClick, clickable }: { label: string, value: number, icon: string, color: string, onClick?: () => void, clickable?: boolean }) => {
  const colors: any = {
    indigo: 'from-indigo-50 to-indigo-100 text-indigo-600',
    sky: 'from-sky-50 to-sky-100 text-sky-600',
    emerald: 'from-emerald-50 to-emerald-100 text-emerald-600',
    amber: 'from-amber-50 to-amber-100 text-amber-600',
    rose: 'from-rose-50 to-rose-100 text-rose-600',
    slate: 'from-slate-50 to-slate-100 text-slate-600'
  };

  return (
    <div onClick={onClick} className={`bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm transition-all group ${clickable ? 'cursor-pointer hover:border-indigo-300' : ''}`}>
      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${colors[color]} text-2xl flex items-center justify-center mb-6`}>
        {icon}
      </div>
      <p className="text-4xl font-black text-slate-900 tracking-tighter">{value}</p>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2">{label}</p>
    </div>
  );
};

const ProgressItem = ({ label, count, percent, color }: { label: string, count: number, percent: number, color: string }) => (
  <div className="space-y-2">
    <div className="flex justify-between items-end text-xs font-bold">
      <span className="text-slate-800">{label}</span>
      <span className="text-slate-400">{count} items</span>
    </div>
    <div className="w-full h-1.5 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
      <div className={`h-full ${color} rounded-full`} style={{ width: `${percent}%` }}></div>
    </div>
  </div>
);

const Badge = ({ label }: { label: string }) => (
  <span className="px-3 py-1 bg-white/10 rounded-lg text-[9px] font-black uppercase border border-white/5">{label}</span>
);

export default SolutionSummary;
