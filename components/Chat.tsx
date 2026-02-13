
import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChatMessage, SolutionFile } from '../types';

interface ChatProps {
  history: ChatMessage[];
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  contextFile: SolutionFile | null;
  isQuotaExhausted?: boolean;
  onSelectKey?: () => void;
}

const QUICK_ACTIONS = [
  { label: 'Summarize logic', icon: '🧠' },
  { label: 'Security audit', icon: '🔒' },
  { label: 'Optimization', icon: '⚡' },
  { label: 'Cross-refs', icon: '🔗' },
];

const Chat: React.FC<ChatProps> = ({ history, onSendMessage, isLoading, contextFile, isQuotaExhausted, onSelectKey }) => {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input);
      setInput('');
    }
  };

  const handleQuickAction = (action: string) => {
    if (!isLoading) {
      onSendMessage(action);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      <div className="p-5 border-b border-slate-200 bg-white/80 backdrop-blur-md shrink-0 z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-3 h-3 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(79,70,229,0.5)] animate-pulse"></div>
              <div className="absolute inset-0 w-3 h-3 rounded-full bg-indigo-500 animate-ping opacity-25"></div>
            </div>
            <h3 className="text-sm font-black text-slate-900 tracking-tight">Gemini Assistant</h3>
          </div>
          <div className="px-2 py-0.5 bg-slate-900 rounded text-[8px] font-black text-white uppercase tracking-widest">v3.0 Pro</div>
        </div>
        
        {isQuotaExhausted && (
          <div className="mb-3 p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-center justify-between gap-3 animate-in slide-in-from-top-2 duration-300">
             <div className="flex items-center gap-2">
                <span className="text-lg">⚠️</span>
                <span className="text-[10px] font-bold text-rose-700 leading-tight">API quota reached. Use your own key for higher limits.</span>
             </div>
             <button onClick={onSelectKey} className="px-2 py-1 bg-rose-600 text-white text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-rose-700 transition-colors shrink-0">Switch Key</button>
          </div>
        )}

        {contextFile ? (
          <div className="flex items-center gap-2 text-[10px] bg-indigo-50 text-indigo-700 px-3 py-2 rounded-xl border border-indigo-100 font-bold animate-in fade-in slide-in-from-top-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <span className="truncate">Context: {contextFile.name}</span>
          </div>
        ) : (
          <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Global Context Active</div>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
        {history.length === 0 && !isLoading && (
          <div className="text-center py-20 px-6">
            <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 text-3xl shadow-xl shadow-slate-200">🤖</div>
            <h4 className="text-slate-900 font-black mb-2">Solution Insights AI</h4>
            <p className="text-slate-400 text-xs font-medium leading-relaxed">
              Ask me about table relationships, Cloud Flow logic, or JavaScript potential bugs. Select a component to narrow my context.
            </p>
          </div>
        )}
        
        {history.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
            <div className={`max-w-[92%] p-5 rounded-[1.5rem] text-sm leading-relaxed shadow-sm transition-all ${
              msg.role === 'user' 
                ? 'bg-slate-900 text-white rounded-tr-none' 
                : 'bg-white border border-slate-100 text-slate-700 rounded-tl-none ring-1 ring-slate-200/5'
            }`}>
              {msg.role === 'model' ? (
                <div className="prose prose-sm prose-slate max-w-none 
                  prose-headings:font-black prose-headings:tracking-tight 
                  prose-p:font-medium prose-p:leading-relaxed 
                  prose-a:text-indigo-600 prose-a:no-underline hover:prose-a:underline
                  prose-pre:bg-slate-900 prose-pre:rounded-2xl prose-pre:p-4
                  prose-code:bg-slate-50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-indigo-600 prose-code:font-bold prose-code:before:content-none prose-code:after:content-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.text}
                  </ReactMarkdown>
                </div>
              ) : (
                <p className="font-bold tracking-tight">{msg.text}</p>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-100 px-6 py-4 rounded-[1.5rem] shadow-sm rounded-tl-none ring-1 ring-slate-200/5">
              <div className="flex gap-2">
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-duration:0.6s]"></div>
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-duration:0.6s] [animation-delay:0.1s]"></div>
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-duration:0.6s] [animation-delay:0.2s]"></div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-5 bg-white border-t border-slate-100 shrink-0">
        <div className="flex flex-wrap gap-2 mb-4">
          {QUICK_ACTIONS.map(action => (
            <button
              key={action.label}
              onClick={() => handleQuickAction(action.label)}
              className="text-[9px] font-black text-slate-500 bg-slate-50 hover:bg-indigo-600 hover:text-white px-3 py-1.5 rounded-full transition-all border border-slate-100 hover:border-indigo-600 flex items-center gap-1.5 uppercase tracking-widest"
            >
              <span>{action.icon}</span>
              {action.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="relative group">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isQuotaExhausted}
            placeholder={isQuotaExhausted ? "Quota exceeded..." : (contextFile ? `Question about ${contextFile.name}...` : "Analyze solution structure...")}
            className={`w-full pl-5 pr-14 py-4 border rounded-3xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/30 transition-all resize-none h-28 scrollbar-hide shadow-inner ${
              isQuotaExhausted ? 'bg-slate-100 border-slate-200 cursor-not-allowed opacity-50' : 'bg-slate-50 border-slate-200 focus:bg-white'
            }`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading || isQuotaExhausted}
            className="absolute right-3 bottom-3 p-3 bg-slate-900 text-white rounded-2xl hover:bg-indigo-600 disabled:opacity-30 disabled:bg-slate-200 transition-all shadow-xl active:scale-90"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
          </button>
        </form>
        <div className="mt-4 flex items-center justify-between opacity-30 px-2">
          <span className="text-[8px] font-black uppercase tracking-[0.2em]">Gemini Pro Engine</span>
          <span className="text-[8px] font-black uppercase tracking-[0.2em]">Solution Aware</span>
        </div>
      </div>
    </div>
  );
};

export default Chat;
