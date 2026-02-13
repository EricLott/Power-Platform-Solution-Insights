
import React from 'react';
import { JsBug } from '../types';

interface BugModalProps {
  isOpen: boolean;
  onClose: () => void;
  bugs: JsBug[];
}

const BugModal: React.FC<BugModalProps> = ({ isOpen, onClose, bugs }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden border border-slate-200 flex flex-col max-h-[85vh]">
        <div className="p-8 border-b border-slate-100 flex justify-between items-start shrink-0 bg-rose-50/30">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-rose-100 text-rose-700 rounded-full text-[10px] font-black uppercase tracking-widest mb-3 border border-rose-200">
              <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse"></span>
              Gemini Code Scan
            </div>
            <h3 className="text-3xl font-black text-slate-900 tracking-tight">Issues Found</h3>
            <p className="text-sm text-slate-500 font-medium mt-1">We analyzed the JavaScript Web Resources in this solution and found {bugs.length} potential issues.</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {bugs.map((bug, idx) => (
            <div key={idx} className="bg-slate-50 rounded-2xl border border-slate-100 p-6 hover:border-rose-200 transition-colors group">
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 shadow-sm ${
                  bug.severity === 'critical' ? 'bg-rose-600 text-white' : 
                  bug.severity === 'warning' ? 'bg-amber-500 text-white' : 
                  'bg-blue-500 text-white'
                }`}>
                  {bug.severity === 'critical' ? '🚫' : bug.severity === 'warning' ? '⚠️' : 'ℹ️'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-4 mb-2">
                    <h4 className="text-lg font-bold text-slate-900 leading-tight truncate">{bug.issue}</h4>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${
                      bug.severity === 'critical' ? 'bg-rose-100 text-rose-700' : 
                      bug.severity === 'warning' ? 'bg-amber-100 text-amber-700' : 
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {bug.severity}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400 mb-4 bg-white/50 p-1.5 rounded border border-slate-100">
                    <span className="shrink-0 opacity-50">FILE:</span>
                    <span className="truncate">{bug.filePath}</span>
                  </div>
                  <div className="bg-white border border-slate-100 rounded-xl p-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Gemini's Fix</p>
                    <p className="text-sm text-slate-700 leading-relaxed italic">"{bug.suggestion}"</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-slate-50 p-6 border-t border-slate-100 flex justify-end shrink-0">
          <button 
            onClick={onClose} 
            className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-black uppercase tracking-widest shadow-lg shadow-indigo-100 transition-all active:scale-95"
          >
            Acknowledge & Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};

export default BugModal;
