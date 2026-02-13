
import React from 'react';
import { CanvasAppMetadata } from '../types';

interface CanvasAppDashboardProps {
  app: CanvasAppMetadata;
}

const CanvasAppDashboard: React.FC<CanvasAppDashboardProps> = ({ app }) => {
  const totalControls = app.controlCount ? (Object.values(app.controlCount) as number[]).reduce((a, b) => a + b, 0) : 0;
  const screens = (app.controlCount?.screen as number) || 0;

  // Extract connection details from ConnectionReferences and DatabaseReferences
  const connections = React.useMemo(() => {
    const list: { name: string, type: string, icon?: string }[] = [];
    
    if (app.connectionReferences) {
      Object.entries(app.connectionReferences).forEach(([id, ref]: [string, any]) => {
        list.push({
          name: ref.displayName || id,
          type: 'Connector',
          icon: ref.iconUri
        });
      });
    }

    if (app.databaseReferences) {
      Object.entries(app.databaseReferences).forEach(([id, ref]: [string, any]) => {
        if (id === 'default.cds') {
          list.push({ name: 'Dataverse (Environment)', type: 'CDS' });
        }
      });
    }
    
    return list;
  }, [app.connectionReferences, app.databaseReferences]);

  return (
    <div className="p-10 bg-slate-50 min-h-full font-sans animate-slide-up">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden mb-8">
          <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-10 text-white relative">
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/20">
                  {app.isPage ? 'Dataverse Custom Page' : 'Canvas Application'}
                </span>
                {app.canvasAppType && (
                   <span className="inline-block px-3 py-1 bg-indigo-500/30 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10">
                    Type {app.canvasAppType}
                  </span>
                )}
              </div>
              <h2 className="text-4xl font-black mb-2 tracking-tight">{app.displayName || app.name}</h2>
              <p className="text-indigo-100 text-lg max-w-2xl">{app.description || `Logical UI component for ${app.isPage ? 'model-driven apps' : 'standalone usage'}.`}</p>
              
              <div className="mt-6 flex flex-wrap gap-4 text-[10px] font-black uppercase tracking-widest opacity-80">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  Last Saved: {app.appVersion ? new Date(app.appVersion).toLocaleDateString() : 'N/A'}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-sky-400"></span>
                  Min SDK: {app.minClientVersion || 'N/A'}
                </div>
              </div>
            </div>
            <div className="absolute top-10 right-10 text-white/10">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-32 w-32" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          
          <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                 <Metric label="Screens" value={screens} icon="🖼️" />
                 <Metric label="Controls" value={totalControls} icon="🕹️" />
                 <Metric label="Tables" value={app.dataSources?.length || 0} icon="📊" />
                 <Metric label="Connectors" value={connections.length} icon="🔌" />
              </div>

              {connections.length > 0 && (
                <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <span className="text-indigo-500">🔗</span> Active Connections
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {connections.map((conn, idx) => (
                      <div key={idx} className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
                          {conn.icon ? <img src={conn.icon} alt="" className="w-6 h-6 object-contain" /> : <span className="text-lg">🔌</span>}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">{conn.name}</p>
                          <p className="text-[9px] font-black uppercase text-slate-400">{conn.type}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {app.dataSources && app.dataSources.length > 0 && (
                 <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Logical Data Sources</h4>
                    <div className="flex flex-wrap gap-2">
                       {app.dataSources.map(ds => (
                         <span key={ds} className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-sm hover:border-indigo-300 transition-colors">
                            {ds}
                         </span>
                       ))}
                    </div>
                 </div>
              )}

              {app.tags && (
                 <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Device Capabilities</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                       <TagItem label="Resolution" value={`${app.tags.primaryDeviceWidth}x${app.tags.primaryDeviceHeight}`} />
                       <TagItem label="Form Factor" value={app.tags.primaryFormFactor} />
                       <TagItem label="Portrait" value={app.tags.supportsPortrait} />
                       <TagItem label="Landscape" value={app.tags.supportsLandscape} />
                       <TagItem label="Publisher" value={app.tags.publisherVersion} />
                       <TagItem label="Min API" value={app.tags.minimumRequiredApiVersion} />
                    </div>
                 </div>
              )}
            </div>
            
            <div className="space-y-6">
              <div className="bg-indigo-50 rounded-3xl p-8 border border-indigo-100">
                <h4 className="font-black text-indigo-900 mb-6 text-sm uppercase tracking-widest">SDK Environment</h4>
                <div className="space-y-4">
                  <LayoutDetail label="Created With" value={app.createdClientVersion || 'N/A'} />
                  <LayoutDetail label="Min Required" value={app.minClientVersion || 'N/A'} />
                  <LayoutDetail label="Siena Build" value={app.tags?.sienaVersion?.split('-')[0] || 'N/A'} />
                </div>
              </div>

              {app.controlCount && (
                 <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Control Breakdown</h4>
                    <div className="space-y-3">
                       {Object.entries(app.controlCount).sort((a,b) => (b[1] as number) - (a[1] as number)).slice(0, 8).map(([key, val]) => (
                         <div key={key} className="flex justify-between items-center text-xs">
                            <span className="text-slate-500 font-bold capitalize">{key}</span>
                            <span className="bg-slate-100 px-2 py-0.5 rounded-lg font-black text-slate-900">{val as number}</span>
                         </div>
                       ))}
                    </div>
                 </div>
              )}

              <div className="p-8 bg-slate-900 rounded-3xl text-white shadow-xl shadow-slate-100">
                <h4 className="text-xs font-black uppercase tracking-widest mb-4 text-indigo-400">AI Component Analysis</h4>
                <p className="text-xs text-slate-400 leading-relaxed mb-6">
                  Extracting logic from internal .msapp zip. Ask Gemini to map complex data source dependencies or audit control naming conventions.
                </p>
                <button className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-[10px] font-black uppercase rounded-xl transition-all active:scale-95 shadow-lg shadow-indigo-900/40">
                  Analyze UI Logic
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Metric = ({ label, value, icon }: { label: string, value: number, icon: string }) => (
  <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm text-center">
    <div className="text-xl mb-2">{icon}</div>
    <p className="text-2xl font-black text-slate-900 leading-none">{value}</p>
    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-2">{label}</p>
  </div>
);

const TagItem = ({ label, value }: { label: string, value: string }) => (
    <div>
        <p className="text-[9px] font-black text-slate-300 uppercase tracking-tighter mb-1">{label}</p>
        <p className="text-xs font-bold text-slate-700 truncate">{value}</p>
    </div>
);

const LayoutDetail = ({ label, value }: { label: string, value: string }) => (
  <div className="flex justify-between items-center text-xs">
    <span className="text-indigo-600/70 font-bold uppercase tracking-tighter shrink-0 mr-4">{label}</span>
    <span className="text-indigo-900 font-mono font-black truncate">{value}</span>
  </div>
);

export default CanvasAppDashboard;
