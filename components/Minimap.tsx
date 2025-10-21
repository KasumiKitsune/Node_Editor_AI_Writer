import React, { useRef, useMemo, useCallback, useState, useEffect } from 'react';
import { Node, Edge } from '../types';
import { nodeMeta } from '../constants';
import { XIcon } from './icons';

interface MinimapProps {
    nodes: Node[];
    edges: Edge[];
    transform: { x: number; y: number; scale: number };
    editorRef: React.RefObject<HTMLDivElement>;
    onNodeClick: (nodeId: string) => void;
    onPan: (newTransform: { x: number; y: number; scale: number }) => void;
    onClose: () => void;
    minimapState: { top: number; right: number; width: number; height: number; };
    setMinimapState: React.Dispatch<React.SetStateAction<{ top: number; right: number; width: number; height: number; }>>;
}

const PADDING = 20;

const Minimap: React.FC<MinimapProps> = ({ nodes, edges, transform, editorRef, onNodeClick, onPan, onClose, minimapState, setMinimapState }) => {
    const [zoom, setZoom] = useState(1.0);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const minimapRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    const dragRef = useRef<{ type: 'move' | 'resize'; startX: number; startY: number; startState: typeof minimapState } | null>(null);
    const viewportPanRef = useRef<{ startX: number; startY: number; startTransform: typeof transform } | null>(null);
    const minimapPanRef = useRef<{ startX: number; startY: number; startPan: typeof pan } | null>(null);

    const { bounds, mapScale } = useMemo(() => {
        if (nodes.length === 0) {
            return { bounds: { minX: 0, minY: 0, width: 0, height: 0 }, mapScale: 1 };
        }
        
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        nodes.forEach(node => {
            minX = Math.min(minX, node.position.x);
            minY = Math.min(minY, node.position.y);
            maxX = Math.max(maxX, node.position.x + 320); // Approx node width
            maxY = Math.max(maxY, node.position.y + 200); // Approx node height
        });

        const width = maxX - minX;
        const height = maxY - minY;
        
        if (width <= 0 || height <= 0 || !isFinite(width) || !isFinite(height)) {
            return { bounds: { minX, minY, width: 0, height: 0 }, mapScale: zoom };
        }
        
        const mapWidth = minimapState.width - PADDING * 2;
        const mapHeight = minimapState.height - 32 - PADDING * 2; // Adjust for header height

        const baseScale = Math.min(mapWidth / width, mapHeight / height);
        
        return {
            bounds: { minX, minY, width, height },
            mapScale: baseScale * zoom,
        };
    }, [nodes, minimapState.width, minimapState.height, zoom]);

    const viewport = useMemo(() => {
        if (!editorRef.current) return null;
        const { clientWidth, clientHeight } = editorRef.current;
        const viewWidth = clientWidth / transform.scale;
        const viewHeight = clientHeight / transform.scale;
        const viewX = -transform.x / transform.scale;
        const viewY = -transform.y / transform.scale;
        
        return {
            x: (viewX - bounds.minX) * mapScale + PADDING + pan.x,
            y: (viewY - bounds.minY) * mapScale + PADDING + pan.y,
            width: viewWidth * mapScale,
            height: viewHeight * mapScale,
        };
    }, [transform, bounds, mapScale, pan, editorRef]);

    const handleWindowDragStart = useCallback((e: React.MouseEvent, type: 'move' | 'resize') => {
        e.stopPropagation();
        dragRef.current = { type, startX: e.clientX, startY: e.clientY, startState: { ...minimapState } };
        document.body.style.userSelect = 'none';
        document.body.style.cursor = type === 'move' ? 'move' : 'se-resize';
    }, [minimapState]);
    
    const handleContentMouseDown = useCallback((e: React.MouseEvent) => {
        if (viewport && contentRef.current) {
            const contentRect = contentRef.current.getBoundingClientRect();
            const clickX = e.clientX - contentRect.left;
            const clickY = e.clientY - contentRect.top;
            const isInsideViewport = (clickX >= viewport.x && clickX <= viewport.x + viewport.width && clickY >= viewport.y && clickY <= viewport.y + viewport.height);
            
            document.body.style.userSelect = 'none';
            document.body.style.cursor = 'grabbing';

            if (isInsideViewport) {
                e.stopPropagation();
                viewportPanRef.current = { startX: e.clientX, startY: e.clientY, startTransform: { ...transform } };
            } else {
                minimapPanRef.current = { startX: e.clientX, startY: e.clientY, startPan: { ...pan } };
            }
        }
    }, [transform, viewport, pan]);
    
    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!contentRef.current) return;

        if (e.ctrlKey) { // Pinch-to-zoom gesture
            const rect = contentRef.current.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            const oldZoom = zoom;
            const newZoom = Math.max(0.1, Math.min(oldZoom - e.deltaY * 0.005, 5)); // Increased sensitivity

            const { width, height } = bounds;
            const mapWidth = minimapState.width - PADDING * 2;
            const mapHeight = minimapState.height - 32 - PADDING * 2;
            const baseScale = Math.min(mapWidth / width, mapHeight / height);

            const oldMapScale = isFinite(baseScale) ? baseScale * oldZoom : oldZoom;
            const newMapScale = isFinite(baseScale) ? baseScale * newZoom : newZoom;

            const worldX = (mouseX - PADDING - pan.x) / oldMapScale;
            const worldY = (mouseY - PADDING - pan.y) / oldMapScale;

            const newPanX = mouseX - PADDING - worldX * newMapScale;
            const newPanY = mouseY - PADDING - worldY * newMapScale;

            setZoom(newZoom);
            setPan({ x: newPanX, y: newPanY });
        } else { // Two-finger pan/scroll
            setPan(prevPan => ({
                x: prevPan.x - e.deltaX,
                y: prevPan.y - e.deltaY,
            }));
        }
    }, [zoom, pan, bounds, minimapState.width, minimapState.height]);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (dragRef.current) {
                const dx = e.clientX - dragRef.current.startX;
                const dy = e.clientY - dragRef.current.startY;
                const { startState, type } = dragRef.current;

                if (type === 'move') {
                    setMinimapState(s => ({ ...s, top: startState.top + dy, right: startState.right - dx }));
                } else if (type === 'resize') {
                    setMinimapState(s => ({
                        ...s,
                        width: Math.max(200, startState.width + dx),
                        height: Math.max(150, startState.height + dy),
                    }));
                }
            } else if (viewportPanRef.current) {
                const dx = e.clientX - viewportPanRef.current.startX;
                const dy = e.clientY - viewportPanRef.current.startY;
                const worldDx = (dx / mapScale);
                const worldDy = (dy / mapScale);
                onPan({
                    ...viewportPanRef.current.startTransform,
                    x: viewportPanRef.current.startTransform.x - worldDx * transform.scale,
                    y: viewportPanRef.current.startTransform.y - worldDy * transform.scale,
                });
            } else if (minimapPanRef.current) {
                 const dx = e.clientX - minimapPanRef.current.startX;
                 const dy = e.clientY - minimapPanRef.current.startY;
                 setPan({
                     x: minimapPanRef.current.startPan.x + dx,
                     y: minimapPanRef.current.startPan.y + dy,
                 });
            }
        };

        const handleMouseUp = () => {
            dragRef.current = null;
            viewportPanRef.current = null;
            minimapPanRef.current = null;
            document.body.style.userSelect = '';
            document.body.style.cursor = '';
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [mapScale, transform.scale, onPan, setMinimapState]);

    return (
        <div 
            ref={minimapRef}
            className="fixed flex flex-col bg-slate-200/60 dark:bg-slate-900/60 backdrop-blur-lg p-2 rounded-2xl shadow-lg z-20 border border-slate-300/50 dark:border-slate-800/50 animate-scale-in" 
            style={{ 
                top: minimapState.top, 
                right: minimapState.right, 
                width: minimapState.width, 
                height: minimapState.height,
                animationDuration: '150ms' 
            }}
        >
            <div 
                className="flex justify-between items-center px-1 cursor-move"
                onMouseDown={(e) => handleWindowDragStart(e, 'move')}
            >
                <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300 select-none">导航图</h3>
                <button onClick={onClose} className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-slate-300/70 dark:hover:bg-slate-700/70 cursor-pointer btn-material">
                    <XIcon className="h-4 w-4" />
                </button>
            </div>
            <div 
                ref={contentRef}
                className="relative bg-slate-100 dark:bg-slate-900 rounded-lg overflow-hidden mt-1 flex-grow cursor-grab"
                onWheel={handleWheel}
                onMouseDown={handleContentMouseDown}
            >
                <div 
                    className="absolute top-0 left-0"
                    style={{ transform: `translate(${pan.x}px, ${pan.y}px)`}}
                >
                    <svg className="absolute top-0 left-0 pointer-events-none" style={{ width: bounds.width * mapScale + PADDING * 2, height: bounds.height * mapScale + PADDING * 2}}>
                        {edges.map(edge => {
                            const sourceNode = nodes.find(n => n.id === edge.source);
                            const targetNode = nodes.find(n => n.id === edge.target);
                            if (!sourceNode || !targetNode) return null;

                            const iconCenterOffset = 12; // Half of the 24px icon size (w-6 h-6)

                            const x1 = (sourceNode.position.x - bounds.minX) * mapScale + PADDING + iconCenterOffset;
                            const y1 = (sourceNode.position.y - bounds.minY) * mapScale + PADDING + iconCenterOffset;
                            const x2 = (targetNode.position.x - bounds.minX) * mapScale + PADDING + iconCenterOffset;
                            const y2 = (targetNode.position.y - bounds.minY) * mapScale + PADDING + iconCenterOffset;

                            return (
                                <line key={edge.id} x1={x1} y1={y1} x2={x2} y2={y2} className="stroke-slate-400 dark:stroke-slate-600" strokeWidth="3" />
                            );
                        })}
                    </svg>

                    {nodes.map(node => {
                        const meta = nodeMeta[node.type];
                        if (!meta) return null;
                        const Icon = meta.icon;
                        const nodeX = (node.position.x - bounds.minX) * mapScale + PADDING;
                        const nodeY = (node.position.y - bounds.minY) * mapScale + PADDING;
                        
                        return (
                            <div
                                key={node.id}
                                className={`absolute w-6 h-6 rounded-full flex items-center justify-center ${meta.color}`}
                                style={{ 
                                    left: nodeX, 
                                    top: nodeY,
                                    cursor: 'pointer'
                                }}
                                onClick={(e) => { e.stopPropagation(); onNodeClick(node.id); }}
                                title={(node.data as any).title}
                            >
                                <Icon className="h-4 w-4 text-white" />
                            </div>
                        );
                    })}
                </div>

                {viewport && (
                    <div
                        className="absolute border-2 border-blue-500 bg-blue-500/20 rounded pointer-events-none"
                        style={{
                            left: viewport.x,
                            top: viewport.y,
                            width: viewport.width,
                            height: viewport.height,
                        }}
                    ></div>
                )}
            </div>
             <div 
                className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
                onMouseDown={(e) => handleWindowDragStart(e, 'resize')}
            >
                <div className="w-2 h-2 absolute bottom-0 right-0 border-r-2 border-b-2 border-slate-400 dark:border-slate-600"></div>
            </div>
        </div>
    );
};

export default Minimap;