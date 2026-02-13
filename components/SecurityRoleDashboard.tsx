
import React from 'react';
import { SecurityRoleMetadata } from '../types';

interface SecurityRoleDashboardProps {
  role: SecurityRoleMetadata;
}

const SecurityRoleDashboard: React.FC<SecurityRoleDashboardProps> = ({ role }) => {
  // Group privileges by entity
  const entityGroups = React.useMemo(() => {
    return role.privileges.reduce((acc, p) => {
      const entity = p.entity || 'Miscellaneous';
      if (!acc[entity]) acc[entity] = {};
      const actionKey = p.action || 'Unknown';
      acc[entity][actionKey] = p;
      return acc;
    }, {} as Record<string, Record<string, (typeof role.privileges)[0]>>);
  }, [role.privileges]);

  const ACTIONS = ['Create', 'Read', 'Write', 'Delete', 'Append', 'AppendTo', 'Assign', 'Share'];

  const getLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'global': return 'bg-rose-500';
      case 'deep': return 'bg-orange-500';
      case 'local': return 'bg-emerald-500';
      case 'basic': return 'bg-sky-500';
      case 'none': return 'bg-slate-200';
      default: return 'bg-slate-300';
    }
  };

  const getLevelIndicator = (priv?: (typeof role.privileges)[0]) => {
    if (!priv) return <div className="w-3 h-3 rounded-full bg-slate-100 border border-slate-200" title="None" />;
    return (
      <div 
        className={`w-3.5 h-3.5 rounded-full ${getLevelColor(priv.level)} shadow-sm border border-white/20`} 
        title={`${priv.action}: ${priv.level}`}
      />
    );
  };

  const sortedEntities = Object.entries(entityGroups).sort(([a], [b]) => {
      if (a === 'Global System') return -1;
      if (b === 'Global System') return 1;
      if (a === 'Miscellaneous') return 1;
      if (b === 'Miscellaneous') return -1;
      return a.localeCompare(b);
  });

  return (
    <div className="p-10 bg-slate-50 min-h-full font-sans animate-slide-up">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden mb-8">
          <div className="bg-gradient-to-br from-slate-800 to-rose-900 p-10 text-white relative">
            <div className="relative z-10">
              <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-[10px] font-black uppercase tracking-widest mb-4 border border-white/20">
                Security Architecture
              </span>
              <h2 className="text-4xl font-black mb-2 tracking-tight">{role.name}</h2>
              <div className="flex items-center gap-3 mt-4">
                 <span className="text-[10px] font-black uppercase tracking-widest bg-black/20 px-3 py-1 rounded-full border border-white/10">ID: {role.id}</span>
                 {role.isManaged && (
                    <span className="text-[10px] font-black uppercase tracking-widest bg-emerald-500/30 px-3 py-1 rounded-full border border-emerald-400/30">Managed Role</span>
                 )}
              </div>
            </div>
            <div className="absolute top-10 right-10 text-white/10">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-32 w-32" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
          </div>

          <div className="p-8">
            <div className="mb-10 flex flex-wrap gap-4 items-center">
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">Legend:</span>
               <LegendItem color="bg-rose-500" label="Global (Org)" />
               <LegendItem color="bg-orange-500" label="Deep (Parent: Child)" />
               <LegendItem color="bg-emerald-500" label="Local (Business Unit)" />
               <LegendItem color="bg-sky-500" label="Basic (User)" />
               <LegendItem color="bg-slate-100" label="None" />
            </div>

            <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] sticky left-0 bg-slate-50 z-20">Table / Resource</th>
                    {ACTIONS.map(action => (
                      <th key={action} className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">
                        {action.replace('To', ' To')}
                      </th>
                    ))}
                    <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Others</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {sortedEntities.map(([entity, privs]) => (
                    <tr key={entity} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="p-6 sticky left-0 bg-white group-hover:bg-slate-50/50 transition-colors z-10 border-r border-slate-50">
                        <div className="flex flex-col min-w-[200px]">
                           <span className="text-sm font-extrabold text-slate-800">{entity}</span>
                           <span className="text-[9px] font-mono text-slate-400 opacity-60">
                             {entity === 'Miscellaneous' ? 'System Settings' : 'Dataverse Entity'}
                           </span>
                        </div>
                      </td>
                      {ACTIONS.map(action => (
                        <td key={action} className="p-6">
                           <div className="flex justify-center items-center">
                              {getLevelIndicator(privs[action])}
                           </div>
                        </td>
                      ))}
                      <td className="p-6 text-right">
                         <div className="flex flex-wrap gap-1 justify-end max-w-[120px] ml-auto">
                            {Object.entries(privs)
                              .filter(([action]) => !ACTIONS.includes(action))
                              .map(([action, p]) => (
                                <div key={action} className="group/other relative cursor-help">
                                   {getLevelIndicator(p)}
                                   <div className="absolute bottom-full right-0 mb-2 hidden group-hover/other:block z-30">
                                      <div className="bg-slate-900 text-white text-[9px] font-black uppercase px-2 py-1 rounded whitespace-nowrap">
                                        {action}: {p.level}
                                      </div>
                                   </div>
                                </div>
                              ))
                            }
                            {Object.entries(privs).filter(([action]) => !ACTIONS.includes(action)).length === 0 && (
                                <span className="text-[10px] text-slate-200 font-black">—</span>
                            )}
                         </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-12 p-8 bg-slate-900 rounded-[2.5rem] text-white flex flex-col md:flex-row items-center gap-10">
               <div className="flex-1">
                  <h4 className="text-2xl font-black mb-4 tracking-tight">Logical Security Map</h4>
                  <p className="text-slate-400 text-sm leading-relaxed mb-6">
                    This automated audit maps complex solution privileges back to logical entity actions. 
                    Ask Gemini to identify gaps between this role and the <strong>System Customizer</strong> or to perform a 
                    Least Privilege analysis.
                  </p>
                  <div className="flex gap-4">
                    <button className="px-6 py-3 bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-rose-700 shadow-xl shadow-rose-900/40 transition-all active:scale-95">
                      Identify High-Risk Table Access
                    </button>
                    <button className="px-6 py-3 bg-white/10 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-white/20 transition-colors">
                      Copy Audit Text
                    </button>
                  </div>
               </div>
               <div className="w-48 h-48 bg-white/5 rounded-[3rem] border border-white/10 flex items-center justify-center shrink-0">
                  <div className="text-6xl">🔒</div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const LegendItem = ({ color, label }: { color: string, label: string }) => (
  <div className="flex items-center gap-2">
    <div className={`w-3 h-3 rounded-full ${color}`} />
    <span className="text-[10px] font-bold text-slate-500">{label}</span>
  </div>
);

export default SecurityRoleDashboard;
