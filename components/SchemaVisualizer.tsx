
import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { EntityMetadata, EntityRelationship } from '../types';

interface SchemaVisualizerProps {
  entities: EntityMetadata[];
}

const SchemaVisualizer: React.FC<SchemaVisualizerProps> = ({ entities }) => {
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null);
  
  // Pan and Zoom State
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 0.8 });
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const dragStartTime = useRef(0);

  // Layout entities in a grid
  const layout = useMemo(() => {
    const cols = Math.max(3, Math.ceil(Math.sqrt(entities.length)));
    const spacingX = 400;
    const spacingY = 300;
    
    return entities.reduce((acc, entity, i) => {
      acc[entity.logicalName] = {
        x: (i % cols) * spacingX,
        y: Math.floor(i / cols) * spacingY
      };
      return acc;
    }, {} as Record<string, { x: number; y: number }>);
  }, [entities]);

  const allRelationships = useMemo(() => {
    const rels: EntityRelationship[] = [];
    const seen = new Set<string>();
    
    entities.forEach(entity => {
      entity.relationships.forEach(rel => {
        if (layout[rel.from] && layout[rel.to]) {
          const key = [rel.from, rel.to, rel.name].sort().join('-');
          if (!seen.has(key)) {
            rels.push(rel);
            seen.add(key);
          }
        }
      });
    });
    return rels;
  }, [entities, layout]);

  // Event Handlers for Pan
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    setIsDragging(true);
    lastMousePos.current = { x: e.clientX, y: e.clientY };
    dragStartTime.current = Date.now();
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - lastMousePos.current.x;
    const dy = e.clientY - lastMousePos.current.y;
    setTransform(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Handle Zoom
  const handleWheel = (e: React.WheelEvent) => {
    const zoomIntensity = 0.1;
    const delta = e.deltaY > 0 ? -zoomIntensity : zoomIntensity;
    const newScale = Math.max(0.2, Math.min(2, transform.scale + delta));
    setTransform(prev => ({ ...prev, scale: newScale }));
  };

  const handleRecenter = () => {
    setTransform({ x: 100, y: 100, scale: 0.7 });
  };

  const handleEntityClick = (e: React.MouseEvent, logicalName: string) => {
    // Only select if it wasn't a drag (brief click)
    const dragDuration = Date.now() - dragStartTime.current;
    if (dragDuration < 200) {
      e.stopPropagation();
      setSelectedEntity(selectedEntity === logicalName ? null : logicalName);
    }
  };

  if (entities.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 bg-slate-50 text-slate-400">
        <div className="text-6xl mb-4">🗺️</div>
        <p className="text-xl font-bold">No Entities Indexed</p>
        <p className="text-sm text-center max-w-md">We couldn't find table definitions in customizations.xml.</p>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`flex-1 overflow-hidden bg-slate-50 relative h-full select-none cursor-grab ${isDragging ? 'cursor-grabbing' : ''}`}
      onMouseDown={handleMouseDown}
      onWheel={handleWheel}
    >
      {/* HUD Info */}
      <div className="absolute top-8 left-8 z-40 space-y-4">
        <div className="bg-white/90 backdrop-blur-md border border-slate-200 p-6 rounded-3xl shadow-xl">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Dataverse ERD</h2>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Interactive Map</p>
          <div className="flex gap-4 mt-4">
             <div className="flex items-center gap-2">
               <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(79,70,229,0.4)]"></div>
               <span className="text-[10px] font-black uppercase text-slate-600">{allRelationships.length} Connections</span>
             </div>
             <div className="flex items-center gap-2">
               <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"></div>
               <span className="text-[10px] font-black uppercase text-slate-600">{entities.length} Tables</span>
             </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 bg-white/90 backdrop-blur-md border border-slate-200 p-2 rounded-2xl shadow-lg w-fit">
           <button onClick={handleRecenter} className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-indigo-600" title="Recenter View">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
             </svg>
           </button>
           <div className="w-px h-6 bg-slate-200 mx-1"></div>
           <span className="text-[10px] font-black text-slate-400 px-2">{Math.round(transform.scale * 100)}%</span>
        </div>
      </div>

      {/* Control Hint */}
      <div className="absolute bottom-8 left-8 z-40 bg-slate-900/10 backdrop-blur-sm text-slate-500 px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-[0.2em]">
        Drag to Pan • Scroll to Zoom • Click Table to Highlight
      </div>

      {/* Transform Container */}
      <div 
        className="absolute inset-0 transition-transform duration-75"
        style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`, transformOrigin: '0 0' }}
      >
        {/* SVG Connections Layer */}
        <svg className="absolute inset-0 w-[5000px] h-[4000px] pointer-events-none overflow-visible">
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#6366f1" />
            </marker>
          </defs>
          {allRelationships.map((rel, i) => {
            const from = layout[rel.from];
            const to = layout[rel.to];
            if (!from || !to) return null;

            const isHighlighted = selectedEntity === rel.from || selectedEntity === rel.to;
            const isDirectlySelected = selectedEntity === rel.from;
            const opacity = selectedEntity ? (isHighlighted ? 1 : 0.05) : 0.3;

            const startX = from.x + 140;
            const startY = from.y + 60;
            const endX = to.x + 140;
            const endY = to.y + 60;
            
            // Bezier curve calculations
            const dx = Math.abs(endX - startX);
            const dy = Math.abs(endY - startY);
            const midY = startY + (endY - startY) / 2;
            
            return (
              <g key={`${rel.name}-${i}`} className="transition-opacity duration-300" style={{ opacity }}>
                <path
                  d={`M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`}
                  stroke={isHighlighted ? "#4f46e5" : "#6366f1"}
                  strokeWidth={isHighlighted ? 5 : 2}
                  fill="none"
                  markerEnd="url(#arrowhead)"
                  className="transition-all duration-300"
                />
                {isHighlighted && (
                  <g transform={`translate(${(startX + endX) / 2}, ${midY})`}>
                    <rect x="-70" y="-12" width="140" height="24" rx="12" fill="white" stroke="#6366f1" strokeWidth="1.5" className="shadow-lg" />
                    <text 
                      textAnchor="middle" 
                      y="4"
                      className="text-[10px] font-black fill-indigo-600 uppercase tracking-tighter"
                    >
                      {rel.name.length > 25 ? rel.name.substring(0, 22) + '...' : rel.name}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>

        {/* Entities Layer */}
        {entities.map(entity => (
          <div
            key={entity.logicalName}
            className={`absolute w-[280px] bg-white border-2 rounded-3xl p-6 shadow-xl cursor-pointer transition-all duration-300 ${
              selectedEntity === entity.logicalName 
                ? 'border-indigo-600 ring-[16px] ring-indigo-50 shadow-indigo-100/50 z-30 scale-105' 
                : 'border-slate-200 hover:border-indigo-300 z-10 hover:shadow-2xl'
            } ${selectedEntity && selectedEntity !== entity.logicalName ? 'opacity-20 grayscale scale-[0.98]' : ''}`}
            style={{ left: layout[entity.logicalName].x, top: layout[entity.logicalName].y }}
            onMouseDown={(e) => e.stopPropagation()} // Prevent dragging from triggering when clicking entity
            onClick={(e) => handleEntityClick(e, entity.logicalName)}
          >
            <div className="flex items-start gap-4 mb-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-inner shrink-0 ${selectedEntity === entity.logicalName ? 'bg-indigo-600 text-white' : 'bg-slate-50 border border-slate-100'}`}>
                📊
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-black text-slate-900 text-sm truncate leading-tight">{entity.displayName}</h4>
                <p className="text-[10px] font-mono text-slate-400 truncate mt-1">{entity.logicalName}</p>
              </div>
            </div>
            
            <div className="space-y-2 mb-6">
               <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Key Fields</p>
               {entity.fields?.slice(0, 4).map((f, idx) => (
                 <div key={idx} className="flex items-center justify-between gap-3 text-[10px]">
                    <span className="text-slate-600 font-bold truncate">{f.displayName}</span>
                    <span className="text-[8px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded uppercase font-black shrink-0 border border-slate-200/50">{f.type}</span>
                 </div>
               ))}
               {entity.fields && entity.fields.length > 4 && (
                 <p className="text-[9px] font-black text-indigo-400 mt-3 tracking-wide">+{entity.fields.length - 4} More Attributes</p>
               )}
            </div>

            <div className="pt-4 border-t border-slate-50 flex justify-between items-center">
               <div className="flex items-center gap-1.5">
                 <div className={`w-2 h-2 rounded-full ${entity.relationships.length > 0 ? 'bg-indigo-400' : 'bg-slate-200'}`} />
                 <span className="text-[10px] font-black uppercase text-slate-400 tracking-tight">
                   {entity.relationships.length} Relationships
                 </span>
               </div>
               {selectedEntity === entity.logicalName && (
                 <div className="flex items-center gap-1">
                   <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-ping" />
                   <span className="text-[9px] font-black text-indigo-600 uppercase">Selected</span>
                 </div>
               )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SchemaVisualizer;
