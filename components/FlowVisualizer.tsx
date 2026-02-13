
import React, { useMemo, useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { GeminiService } from '../services/geminiService';

interface NormalizedStep {
  id: string;
  name: string;
  type: string;
  icon: string;
  color: string;
  details?: string;
  raw: string; // Captured raw definition for Gemini
  children?: NormalizedStep[];
  branches?: { label: string; color: string; actions: NormalizedStep[] }[];
}

interface FlowVisualizerProps {
  definition?: any;
  xmlContent?: string;
  gemini?: GeminiService | null;
}

const parseJsonFlow = (definition: any): NormalizedStep[] => {
  const actions = definition?.actions || {};
  
  const getIcon = (type: string) => {
    switch (type) {
      case 'If': return '❓';
      case 'Foreach': return '🔄';
      case 'OpenApiConnection': return '⚡';
      case 'Workflow': return '🌊';
      case 'Scope': return '📦';
      case 'Terminate': return '🛑';
      default: return '⚙️';
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case 'If': return 'border-amber-400 bg-amber-50';
      case 'Foreach': return 'border-pink-400 bg-pink-50';
      case 'OpenApiConnection': return 'border-blue-500 bg-blue-50';
      default: return 'border-slate-300 bg-white';
    }
  };

  const transformAction = (name: string, action: any): NormalizedStep => {
    const step: NormalizedStep = {
      id: name, // In JSON flows, the key is unique within the flow
      name: name.replace(/_/g, ' '),
      type: action.type,
      icon: getIcon(action.type),
      color: getColor(action.type),
      details: action.inputs?.host?.operationId || action.type,
      raw: JSON.stringify(action, null, 2)
    };

    if (action.type === 'If') {
      step.branches = [
        { label: 'True', color: 'emerald', actions: Object.entries(action.actions || {}).map(([n, a]) => transformAction(n, a)) },
        { label: 'False', color: 'rose', actions: Object.entries(action.else?.actions || {}).map(([n, a]) => transformAction(n, a)) }
      ];
    } else if (action.actions) {
      step.children = Object.entries(action.actions).map(([n, a]) => transformAction(n, a));
    }

    return step;
  };

  return Object.entries(actions).map(([name, action]) => transformAction(name, action));
};

const parseXamlFlow = (xml: string): NormalizedStep[] => {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xml, 'text/xml');
  
  let workflow = xmlDoc.getElementsByTagName('mxswa:Workflow')[0] || xmlDoc.querySelector('Workflow');
  if (!workflow) {
    const allElements = xmlDoc.getElementsByTagName('*');
    for (let i = 0; i < allElements.length; i++) {
        if (allElements[i].localName === 'Workflow') {
            workflow = allElements[i];
            break;
        }
    }
  }

  if (!workflow) return [];

  const transformNode = (node: Element, depth = 0, index = 0): NormalizedStep | null => {
    const tagName = node.localName;
    const displayName = node.getAttribute('DisplayName') || tagName;
    
    if (['Variables', 'Arguments', 'ReferenceLiteral', 'InArgument', 'OutArgument', 'Collection', 'Property'].includes(tagName)) return null;

    // Create a deterministic ID based on depth, tag, and name for stable caching
    const stableId = `xaml-${depth}-${tagName}-${displayName}-${index}`;

    const step: NormalizedStep = {
      id: stableId,
      name: displayName,
      type: tagName,
      icon: '⚙️',
      color: 'border-slate-300 bg-white',
      raw: node.outerHTML
    };

    if (tagName === 'ConditionSequence' || tagName === 'ConditionBranch' || tagName === 'EvaluateCondition') {
      step.icon = '❓';
      step.color = 'border-amber-400 bg-amber-50';
    } else if (tagName === 'Sequence' || tagName === 'Composite') {
      step.icon = '📦';
      step.color = 'border-slate-400 bg-slate-50';
    } else if (tagName === 'SetFieldRequiredLevel' || tagName === 'SetState' || tagName === 'UpdateEntity') {
      step.icon = '🔒';
      step.color = 'border-indigo-400 bg-indigo-50';
    } else if (tagName === 'Assign') {
      step.icon = '📝';
      step.color = 'border-emerald-300 bg-emerald-50';
    } else if (tagName === 'ActivityReference') {
      step.icon = '🔗';
      step.color = 'border-blue-300 bg-blue-50';
    }

    const children: NormalizedStep[] = [];
    const activityCollections = node.querySelectorAll(':scope > Collection[x\\:Key="Activities"], :scope > Activities');
    if (activityCollections.length > 0) {
        activityCollections.forEach(coll => {
            Array.from(coll.children).forEach((c, idx) => {
                const child = transformNode(c as Element, depth + 1, idx);
                if (child) children.push(child);
            });
        });
    } else {
        Array.from(node.children).forEach((c, idx) => {
            const child = transformNode(c as Element, depth + 1, idx);
            if (child) children.push(child);
        });
    }

    if (children.length > 0) step.children = children;

    if (tagName === 'ConditionBranch') {
        const thenNode = node.querySelector('ActivityReference[x\\:Key="Then"]');
        if (thenNode) {
            const thenChild = transformNode(thenNode as Element, depth + 1, 0);
            if (thenChild) step.children = [thenChild];
        }
        const description = node.querySelector('String[x\\:Key="Description"]')?.textContent;
        if (description) step.details = description;
    }

    return step;
  };

  return Array.from(workflow.children)
    .map((c, idx) => transformNode(c as Element, 0, idx))
    .filter(Boolean) as NormalizedStep[];
};

const StepCard: React.FC<{ 
    step: NormalizedStep, 
    isSelected: boolean, 
    onSelect: (step: NormalizedStep) => void 
}> = ({ step, isSelected, onSelect }) => {
  return (
    <div className="flex flex-col items-center w-full max-w-2xl mx-auto my-2">
      <div className="w-0.5 h-4 bg-slate-200"></div>
      
      <div 
        onClick={() => onSelect(step)}
        className={`w-full border-2 rounded-[1.25rem] shadow-sm p-4 cursor-pointer transition-all duration-300 ${
            isSelected 
                ? 'border-indigo-600 bg-indigo-50/50 ring-4 ring-indigo-50 shadow-indigo-100 scale-105 z-10' 
                : `${step.color} hover:border-indigo-300 hover:shadow-md`
        } relative`}
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-xl shrink-0">
            {step.icon}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-extrabold text-slate-800 truncate text-sm leading-tight">{step.name}</h4>
            <div className="flex items-center gap-2 mt-1">
                <span className="text-[9px] uppercase font-black text-slate-400 tracking-widest">
                    {step.type}
                </span>
                {step.details && (
                    <span className="text-[8px] bg-white px-1.5 py-0.5 rounded border border-slate-100 text-slate-500 font-bold truncate">{step.details}</span>
                )}
            </div>
          </div>
          {isSelected && <div className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />}
        </div>

        {step.branches && (
          <div className="mt-4 grid grid-cols-2 gap-4">
            {step.branches.map(branch => (
              <div key={branch.label} className={`border-2 border-dashed border-slate-200 rounded-[1.25rem] bg-slate-50/30 p-3`}>
                <span className={`text-[9px] font-black uppercase mb-3 block text-center py-1 rounded-lg tracking-[0.2em] border border-slate-100 bg-white`}>
                  {branch.label}
                </span>
                {branch.actions.map(action => (
                  <StepCard key={action.id} step={action} isSelected={isSelected} onSelect={onSelect} />
                ))}
              </div>
            ))}
          </div>
        )}

        {step.children && step.children.length > 0 && !step.branches && (
          <div className="mt-4 border-t border-slate-200/50 pt-3">
            <div className="bg-slate-100/50 rounded-xl p-2 space-y-1">
              {step.children.map(child => (
                <StepCard key={child.id} step={child} isSelected={isSelected} onSelect={onSelect} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const FlowVisualizer: React.FC<FlowVisualizerProps> = ({ definition, xmlContent, gemini }) => {
  const [selectedStep, setSelectedStep] = useState<NormalizedStep | null>(null);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  // Cache for step summaries to avoid redundant API calls
  const [analysisCache, setAnalysisCache] = useState<Record<string, string>>({});

  const steps = useMemo(() => {
    if (xmlContent) return parseXamlFlow(xmlContent);
    if (definition) return parseJsonFlow(definition);
    return [];
  }, [definition, xmlContent]);

  const handleSelectStep = async (step: NormalizedStep) => {
    setSelectedStep(step);
    
    // Check if we have a cached result
    if (analysisCache[step.id]) {
      setAnalysis(analysisCache[step.id]);
      setIsAnalyzing(false);
      return;
    }

    if (!gemini) return;
    
    setIsAnalyzing(true);
    setAnalysis(null);
    try {
      const flowContext = xmlContent || JSON.stringify(definition, null, 2);
      const result = await gemini.analyzeFlowStep(step.name, step.type, step.raw, flowContext);
      const output = result || 'No analysis available.';
      setAnalysis(output);
      // Update cache
      setAnalysisCache(prev => ({ ...prev, [step.id]: output }));
    } catch (e) {
      setAnalysis('Failed to analyze step.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Reset selected step if components change
  useEffect(() => {
    setSelectedStep(null);
    setAnalysis(null);
    setAnalysisCache({});
  }, [definition, xmlContent]);

  return (
    <div className="h-full flex relative font-sans overflow-hidden">
      <div className="flex-1 overflow-auto p-10 bg-slate-50/50 flex flex-col items-center custom-scrollbar">
        <div className="inline-flex items-center gap-4 px-6 py-3 bg-white border border-slate-200 rounded-[2rem] shadow-xl mb-8 group transition-all hover:border-indigo-400">
          <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center text-xl shadow-lg shadow-indigo-100 group-hover:scale-110 transition-transform">🚀</div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-1">
              {xmlContent ? 'Classic XAML Workflow' : 'Power Automate Flow'}
            </p>
            <p className="text-sm font-extrabold text-slate-900">Process Trigger & Initiation</p>
          </div>
        </div>

        <div className="w-full">
          {steps.length > 0 ? (
              steps.map(step => (
                  <StepCard key={step.id} step={step} isSelected={selectedStep?.id === step.id} onSelect={handleSelectStep} />
              ))
          ) : (
              <div className="text-center py-32 text-slate-400">
                  <div className="text-5xl mb-6">📉</div>
                  <p className="text-lg font-black text-slate-900">Logic Undetectable</p>
                  <p className="text-sm italic font-medium opacity-60">This component has no visual actions defined.</p>
              </div>
          )}
        </div>

        <div className="mt-12 flex flex-col items-center">
          <div className="w-0.5 h-10 bg-slate-200"></div>
          <div className="w-8 h-8 rounded-full bg-white border-2 border-slate-200 shadow-inner flex items-center justify-center">
             <div className="w-2.5 h-2.5 rounded-full bg-slate-300"></div>
          </div>
          <p className="text-[10px] font-black text-slate-400 mt-3 uppercase tracking-[0.2em]">End of Process</p>
        </div>
      </div>

      {/* Step Detail Panel */}
      <div className={`absolute right-0 top-0 bottom-0 w-[400px] bg-white border-l border-slate-200 shadow-2xl z-30 transition-transform duration-500 ease-out flex flex-col ${
        selectedStep ? 'translate-x-0' : 'translate-x-full'
      }`}>
        {selectedStep && (
          <>
            <div className="p-6 border-b border-slate-100 shrink-0">
               <div className="flex justify-between items-start mb-6">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center text-xl">{selectedStep.icon}</div>
                    <div>
                        <h3 className="text-lg font-black text-slate-900 tracking-tight leading-none mb-1">{selectedStep.name}</h3>
                        <p className="text-[10px] font-black uppercase text-indigo-500 tracking-widest">{selectedStep.type}</p>
                    </div>
                 </div>
                 <button onClick={() => setSelectedStep(null)} className="p-2 hover:bg-slate-50 rounded-xl transition-colors text-slate-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                 </button>
               </div>
               
               <div className="flex gap-2">
                  <div className="px-3 py-1 bg-slate-100 rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-500">Fast Analysis</div>
                  <div className={`px-3 py-1 bg-indigo-50 rounded-lg text-[9px] font-black uppercase tracking-widest text-indigo-600 border border-indigo-100 transition-opacity ${analysisCache[selectedStep.id] ? 'opacity-100' : 'opacity-40'}`}>
                    {analysisCache[selectedStep.id] ? 'Cached' : 'Context-Aware'}
                  </div>
               </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-slate-50/30">
               {isAnalyzing ? (
                 <div className="space-y-6">
                    <div className="h-32 shimmer rounded-2xl" />
                    <div className="space-y-3">
                       <div className="h-4 shimmer w-3/4 rounded-full" />
                       <div className="h-4 shimmer w-1/2 rounded-full" />
                       <div className="h-4 shimmer w-5/6 rounded-full" />
                    </div>
                    <div className="text-center">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] animate-pulse">Consulting Gemini 3 Flash...</p>
                    </div>
                 </div>
               ) : (
                 <div className="prose prose-sm prose-slate max-w-none animate-slide-up">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {analysis || ''}
                    </ReactMarkdown>
                 </div>
               )}
            </div>
            
            <div className="p-6 border-t border-slate-100 bg-white shrink-0">
               <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-4">Raw Definition Preview</p>
               <div className="bg-slate-900 rounded-xl p-4 overflow-hidden">
                  <pre className="text-[10px] font-mono text-indigo-300/70 whitespace-pre overflow-x-auto h-32 scrollbar-hide">
                    {selectedStep.raw}
                  </pre>
               </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default FlowVisualizer;
