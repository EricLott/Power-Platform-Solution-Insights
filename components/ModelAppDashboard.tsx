
import React from 'react';
import { ModelAppMetadata } from '../types';

interface ModelAppDashboardProps {
  app: ModelAppMetadata;
}

const ModelAppDashboard: React.FC<ModelAppDashboardProps> = ({ app }) => {
  // Fix: Explicitly type the result of the reduce operation and wrap in useMemo to prevent inference as 'unknown' during Object.entries
  const componentGroups = React.useMemo(() => {
    return app.components.reduce((acc, c) => {
      const type = c.type;
      if (!acc[type]) acc[type] = [];
      acc[type].push(c);
      return acc;
    }, {} as Record<string, { type: string; schemaName?: string; id?: string }[]>);
  }, [app.components]);

  const getTypeName = (type: string) => {
      switch(type) {
          case "1": return "Entities";
          case "60": return "Forms/Views";
          case "62": return "Sitemaps";
          case "26": return "Web Resources";
          default: return `Type ${type}`;
      }
  };

  return (
    <div className="p-10 bg-slate-50 min-h-full font-sans animate-slide-up">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden mb-8">
          <div className="bg-gradient-to-br from-violet-600 to-indigo-700 p-10 text-white relative">
            <div className="relative z-10">
              <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-[10px] font-black uppercase tracking-widest mb-4 border border-white/20">
                Model-Driven Application
              </span>
              <h2 className="text-4xl font-black mb-2 tracking-tight">{app.displayName || app.uniqueName}</h2>
              <p className="text-violet-100 text-lg max-w-2xl">Unique Name: <span className="font-mono text-sm bg-black/20 px-2 py-0.5 rounded">{app.uniqueName}</span></p>
            </div>
            <div className="absolute top-10 right-10 text-white/10">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-32 w-32" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
          
          <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                 <Metric label="Version" value={app.version} icon="🏷️" isString />
                 <Metric label="Roles" value={app.roles.length} icon="🛡️" />
                 <Metric label="Components" value={app.components.length} icon="🧩" />
              </div>

              <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                  <span className="text-violet-500">📂</span> App Module Components
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {Object.entries(componentGroups).map(([type, items]) => {
                    // Fix: Explicitly cast items to resolve unknown type errors on length and map
                    const typedItems = items as { type: string; schemaName?: string; id?: string }[];
                    return (
                      <div key={type} className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm">
                         <div className="flex justify-between items-center mb-4">
                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">{getTypeName(type)}</span>
                            <span className="bg-violet-100 text-violet-700 text-[10px] font-black px-2 py-0.5 rounded-full">{typedItems.length}</span>
                         </div>
                         <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                            {typedItems.map((item, idx) => (
                               <div key={idx} className="text-xs font-mono text-slate-600 truncate py-1 border-b border-slate-50 last:border-0" title={item.schemaName || item.id}>
                                  {item.schemaName || item.id}
                               </div>
                            ))}
                         </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {app.elements.length > 0 && (
                 <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">App Elements</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                       {app.elements.map((el, i) => (
                         <div key={i} className="flex flex-col bg-white p-4 rounded-xl border border-slate-200">
                            <span className="text-sm font-bold text-slate-800">{el.name}</span>
                            <span className="text-[9px] font-mono text-slate-400 truncate">{el.uniqueName}</span>
                         </div>
                       ))}
                    </div>
                 </div>
              )}
            </div>
            
            <div className="space-y-6">
              <div className="bg-violet-50 rounded-3xl p-8 border border-violet-100">
                <h4 className="font-black text-violet-900 mb-6 text-sm uppercase tracking-widest">Client Settings</h4>
                <div className="space-y-4">
                  <LayoutDetail label="Form Factor" value={app.formFactor} />
                  <LayoutDetail label="Client Type" value={app.clientType} />
                  <LayoutDetail label="Nav Type" value={app.navigationType} />
                </div>
              </div>

              {app.settings.length > 0 && (
                  <div className="bg-slate-900 rounded-3xl p-8 text-white">
                    <h4 className="text-xs font-black uppercase tracking-widest mb-6 text-violet-400">Environment Settings</h4>
                    <div className="space-y-3">
                       {app.settings.map((s, i) => (
                         <div key={i} className="flex justify-between items-center text-xs">
                            <span className="text-slate-400 font-medium truncate mr-4" title={s.name}>{s.name}</span>
                            <span className="text-violet-300 font-black shrink-0">{s.value}</span>
                         </div>
                       ))}
                    </div>
                  </div>
              )}

              <div className="p-8 bg-indigo-600 rounded-3xl text-white shadow-xl shadow-indigo-100/50">
                <h4 className="text-xs font-black uppercase tracking-widest mb-4">Security Mappings</h4>
                <p className="text-xs text-indigo-100 leading-relaxed mb-6">
                  This app is shared with {app.roles.length} security roles.
                </p>
                <div className="space-y-2 max-h-40 overflow-y-auto scrollbar-hide">
                  {app.roles.map((rid, i) => (
                    <div key={i} className="text-[9px] font-mono bg-white/10 p-2 rounded truncate border border-white/5">
                      {rid}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Metric = ({ label, value, icon, isString }: { label: string, value: number | string, icon: string, isString?: boolean }) => (
  <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm">
    <div className="text-xl mb-2">{icon}</div>
    <p className={`text-slate-900 leading-none ${isString ? 'text-lg font-bold' : 'text-2xl font-black'}`}>{value}</p>
    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-2">{label}</p>
  </div>
);

const LayoutDetail = ({ label, value }: { label: string, value: string }) => (
  <div className="flex justify-between items-center text-xs">
    <span className="text-violet-600/70 font-bold uppercase tracking-tighter">{label}</span>
    <span className="text-violet-900 font-mono font-black">{value}</span>
  </div>
);

export default ModelAppDashboard;
