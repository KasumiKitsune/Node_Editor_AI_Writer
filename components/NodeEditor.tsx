import React, { useState, useRef, useCallback, MouseEvent, TouchEvent, useEffect } from 'react';
import { Node, Edge, NodeType, SettingNodeData, WorkNodeData } from '../types';
import NodeComponent from './NodeComponent';
import { XIcon } from './icons';

interface NodeEditorProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: (nodes: Node[]) => void;
  onEdgesChange: (edges: Edge[]) => void;
  onUpdateNodeData: (nodeId: string, data: any) => void;
  onDeleteNode: (nodeId: string) => void;
  onToggleNodeCollapse: (nodeId: string) => void;
  onAnalyzeWork: (nodeId: string, content: string) => void;
  onExpandSetting: (nodeId: string) => void;
  activeProgressTask: string | null;
  progress: number;
}

const getDistance = (touches: React.TouchList) => {
    const [t1, t2] = [touches[0], touches[1]];
    return Math.sqrt(Math.pow(t1.clientX - t2.clientX, 2) + Math.pow(t1.clientY - t2.clientY, 2));
}

const getMidpoint = (touches: React.TouchList) => {
    const [t1, t2] = [touches[0], touches[1]];
    return { x: (t1.clientX + t2.clientX) / 2, y: (t1.clientY + t2.clientY) / 2 };
}

const NodeEditor: React.FC<NodeEditorProps> = ({ nodes, edges, onNodesChange, onEdgesChange, onUpdateNodeData, onDeleteNode, onToggleNodeCollapse, onAnalyzeWork, onExpandSetting, activeProgressTask, progress }) => {
  const [draggingNode, setDraggingNode] = useState<{ id: string; offset: { x: number; y: number } } | null>(null);
  const [connecting, setConnecting] = useState<{ sourceId: string; sourceHandleId?: string; targetPos: { x: number; y: number } } | null>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);

  const editorRef = useRef<HTMLDivElement>(null);
  const isSpacePressedRef = useRef(false);
  const pinchStateRef = useRef({
      isPinching: false,
      startDistance: 0,
      startTransform: { x: 0, y: 0, scale: 1 },
      startMidpoint: { x: 0, y: 0 },
  });


  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        isSpacePressedRef.current = true;
        document.body.style.cursor = 'grab';
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        isSpacePressedRef.current = false;
        document.body.style.cursor = 'default';
        if (isPanning) {
            setIsPanning(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isPanning]);
  
  const getTransformedPoint = (clientX: number, clientY: number) => {
    if (!editorRef.current) return { x: 0, y: 0 };
    const editorRect = editorRef.current.getBoundingClientRect();
    const x = (clientX - editorRect.left - transform.x) / transform.scale;
    const y = (clientY - editorRect.top - transform.y) / transform.scale;
    return { x, y };
  }

  const handleInteractionStart = useCallback((e: MouseEvent<HTMLDivElement> | TouchEvent<HTMLDivElement>) => {
    const isTouchEvent = 'touches' in e;

    if (isTouchEvent && e.touches.length === 2) {
        e.preventDefault();
        pinchStateRef.current = {
            isPinching: true,
            startDistance: getDistance(e.touches),
            startTransform: { ...transform },
            startMidpoint: getMidpoint(e.touches),
        };
        return;
    }
    
    const evt = isTouchEvent ? e.touches[0] : e;
    
    const target = evt.target as HTMLElement;
    const nodeId = target.closest('[data-node-id]')?.getAttribute('data-node-id');
    const handle = target.closest('[data-handle]');
    const dragHandle = target.closest('.node-drag-handle');

    if (isSpacePressedRef.current && !nodeId) {
        setIsPanning(true);
        setPanStart({
            x: evt.clientX - transform.x,
            y: evt.clientY - transform.y,
        });
        document.body.style.cursor = 'grabbing';
        return;
    }

    if (nodeId) {
      document.body.style.userSelect = 'none';
    }

    if (handle && nodeId) {
      if(isTouchEvent) e.stopPropagation();
      document.body.style.cursor = 'crosshair';
      if (handle.getAttribute('data-handle') === 'source') {
        const sourceHandleId = handle.getAttribute('data-handle-id') || undefined;
        const transformedPos = getTransformedPoint(evt.clientX, evt.clientY);
        setConnecting({ sourceId: nodeId, sourceHandleId, targetPos: transformedPos });
      }
    } else if (nodeId && dragHandle) {
      const node = nodes.find(n => n.id === nodeId);
      if (!node) return;
      
      const transformedPos = getTransformedPoint(evt.clientX, evt.clientY);
      setDraggingNode({
        id: nodeId,
        offset: { x: transformedPos.x - node.position.x, y: transformedPos.y - node.position.y },
      });
      // Set cursor on the drag handle itself via CSS, so no need to set body cursor
    }
  }, [nodes, transform]);

  const handleInteractionMove = useCallback((e: MouseEvent<HTMLDivElement> | TouchEvent<HTMLDivElement>) => {
    const isTouchEvent = 'touches' in e;
    
    if (isTouchEvent && pinchStateRef.current.isPinching && e.touches.length === 2) {
        e.preventDefault();
        const { startDistance, startTransform } = pinchStateRef.current;
        const currentDistance = getDistance(e.touches);
        const scaleRatio = currentDistance / startDistance;
        const newScale = Math.max(0.1, Math.min(startTransform.scale * scaleRatio, 3));

        const currentMidpoint = getMidpoint(e.touches);
        const editorRect = editorRef.current!.getBoundingClientRect();
        const mousePoint = { x: currentMidpoint.x - editorRect.left, y: currentMidpoint.y - editorRect.top };

        const worldPoint = {
            x: (mousePoint.x - startTransform.x) / startTransform.scale,
            y: (mousePoint.y - startTransform.y) / startTransform.scale,
        };

        const newX = mousePoint.x - worldPoint.x * newScale;
        const newY = mousePoint.y - worldPoint.y * newScale;

        setTransform({ x: newX, y: newY, scale: newScale });
        return;
    }
    
    if (isTouchEvent && (draggingNode || connecting || isPanning)) {
        if (e.cancelable) e.preventDefault();
    }
    const evt = isTouchEvent ? e.touches[0] : e;
    if (!evt) return;

    if (isPanning) {
        const newX = evt.clientX - panStart.x;
        const newY = evt.clientY - panStart.y;
        setTransform(t => ({...t, x: newX, y: newY}));
        return;
    }
    
    const transformedPos = getTransformedPoint(evt.clientX, evt.clientY);
    
    if (draggingNode) {
      const newX = transformedPos.x - draggingNode.offset.x;
      const newY = transformedPos.y - draggingNode.offset.y;
      
      const newNodes = nodes.map(n =>
        n.id === draggingNode.id ? { ...n, position: { x: newX, y: newY } } : n
      );
      onNodesChange(newNodes);
    }
    if (connecting) {
        setConnecting({ ...connecting, targetPos: transformedPos });
    }
  }, [draggingNode, connecting, nodes, onNodesChange, isPanning, panStart]);

  const handleInteractionEnd = useCallback((e: MouseEvent<HTMLDivElement> | TouchEvent<HTMLDivElement>) => {
    document.body.style.userSelect = 'auto';
    if(document.body.style.cursor !== 'grab') document.body.style.cursor = 'default';
    
    pinchStateRef.current.isPinching = false;

    if (isPanning) {
        setIsPanning(false);
        if(isSpacePressedRef.current) document.body.style.cursor = 'grab';
    }

    if (connecting) {
        const isTouchEvent = 'changedTouches' in e;
        const evt = isTouchEvent ? e.changedTouches[0] : e;
        const target = (isTouchEvent && evt ? document.elementFromPoint(evt.clientX, evt.clientY) : e.target) as HTMLElement;

        const targetHandle = target?.closest('[data-handle="target"]');
        const targetNodeEl = target?.closest('[data-node-id]');
        const targetNodeId = targetNodeEl?.getAttribute('data-node-id');

        if (targetHandle && targetNodeId && targetNodeId !== connecting.sourceId) {
            const sourceNode = nodes.find(n => n.id === connecting.sourceId);
            const targetNode = nodes.find(n => n.id === targetNodeId);
            const targetHandleId = targetHandle.getAttribute('data-handle-id') || 'flow';
            
            let isValidConnection = false;
            const isStyleSource = sourceNode?.type === NodeType.STYLE || (sourceNode?.type === NodeType.WORK && (sourceNode.data as WorkNodeData).mode === 'parody');

            if (isStyleSource && (targetNode?.type === NodeType.PLOT || targetNode?.type === NodeType.SETTING) && targetHandleId === 'style') {
                isValidConnection = true;
            } else if (!isStyleSource && targetHandleId === 'flow') {
                isValidConnection = true;
            }

            if (isValidConnection) {
                const newEdge: Edge = {
                    id: `edge_${connecting.sourceId}_${targetNodeId}_${Date.now()}`,
                    source: connecting.sourceId,
                    sourceHandle: connecting.sourceHandleId,
                    target: targetNodeId,
                    targetHandle: targetHandleId,
                };
                // Avoid duplicate edges for the same handles
                if (!edges.some(edge => edge.source === newEdge.source && edge.sourceHandle === newEdge.sourceHandle && edge.target === newEdge.target && edge.targetHandle === newEdge.targetHandle)) {
                    onEdgesChange([...edges, newEdge]);
                }
            }
        }
    }

    setDraggingNode(null);
    setConnecting(null);
  }, [connecting, edges, onEdgesChange, nodes, isPanning]);

  const getSourceHandlePosition = (node: Node, el: HTMLElement, handleId?: string) => {
    let yOffset = el.offsetHeight / 2;
    if (!node.isCollapsed && node.type === NodeType.SETTING && (node.data as SettingNodeData).narrativeStructure !== 'single') {
        yOffset = handleId === 'source_b' ? (el.offsetHeight * 2/3) : (el.offsetHeight * 1/3);
    }
    return {
        x: node.position.x + el.offsetWidth,
        y: node.position.y + yOffset
    };
  };

  const getTargetHandlePosition = (node: Node, el: HTMLElement, handleId?: string) => {
      let yOffset = el.offsetHeight / 2;
      if (!node.isCollapsed && node.type === NodeType.PLOT) {
          yOffset = handleId === 'style' ? (el.offsetHeight * 2/3) : (el.offsetHeight * 1/3);
      }
      return {
          x: node.position.x,
          y: node.position.y + yOffset,
      };
  };

  const getEdgeParams = (edge: Edge) => {
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);
    const sourceEl = editorRef.current?.querySelector(`[data-node-id="${edge.source}"]`) as HTMLElement;
    const targetEl = editorRef.current?.querySelector(`[data-node-id="${edge.target}"]`) as HTMLElement;
    
    if (!sourceNode || !targetNode || !sourceEl || !targetEl) return null;

    const sourcePos = getSourceHandlePosition(sourceNode, sourceEl, edge.sourceHandle);
    const targetPos = getTargetHandlePosition(targetNode, targetEl, edge.targetHandle);
    
    return { sourcePos, targetPos };
  }
  
  const getEdgePath = (edge: Edge): string => {
    const params = getEdgeParams(edge);
    if (!params) return '';
    const { sourcePos, targetPos } = params;
    
    const dx = targetPos.x - sourcePos.x;
    const curve = ` C ${sourcePos.x + dx * 0.5} ${sourcePos.y}, ${targetPos.x - dx * 0.5} ${targetPos.y},`;
    return `M ${sourcePos.x} ${sourcePos.y}${curve} ${targetPos.x} ${targetPos.y}`;
  };

  const getCurveMidpoint = (edge: Edge) => {
    const params = getEdgeParams(edge);
    if (!params) return { x: 0, y: 0 };
    const { sourcePos, targetPos } = params;

    const dx = targetPos.x - sourcePos.x;
    const p0 = sourcePos;
    const p1 = { x: sourcePos.x + dx * 0.5, y: sourcePos.y };
    const p2 = { x: targetPos.x - dx * 0.5, y: targetPos.y };
    const p3 = targetPos;
    
    const t = 0.5;
    const x = Math.pow(1 - t, 3) * p0.x + 3 * Math.pow(1 - t, 2) * t * p1.x + 3 * (1 - t) * Math.pow(t, 2) * p2.x + Math.pow(t, 3) * p3.x;
    const y = Math.pow(1 - t, 3) * p0.y + 3 * Math.pow(1 - t, 2) * t * p1.y + 3 * (1 - t) * Math.pow(t, 2) * p2.y + Math.pow(t, 3) * p3.y;
    
    return { x, y };
  };
  
  const getConnectingPath = (): string => {
    if (!connecting) return '';
    const sourceNode = nodes.find(n => n.id === connecting.sourceId);
    const sourceEl = editorRef.current?.querySelector(`[data-node-id="${connecting.sourceId}"]`) as HTMLElement;
    if (!sourceNode || !sourceEl) return '';

    const sourcePos = getSourceHandlePosition(sourceNode, sourceEl, connecting.sourceHandleId);
    const targetPos = connecting.targetPos;

    const dx = targetPos.x - sourcePos.x;
    const curve = ` C ${sourcePos.x + dx * 0.5} ${sourcePos.y}, ${targetPos.x - dx * 0.5} ${targetPos.y},`;
    return `M ${sourcePos.x} ${sourcePos.y}${curve} ${targetPos.x} ${targetPos.y}`;
  };
  
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const scaleAmount = 1.1;
    const newScale = e.deltaY > 0 ? transform.scale / scaleAmount : transform.scale * scaleAmount;
    
    const worldPoint = getTransformedPoint(e.clientX, e.clientY);
    const editorRect = editorRef.current!.getBoundingClientRect();
    const mousePoint = { x: e.clientX - editorRect.left, y: e.clientY - editorRect.top };

    const newX = mousePoint.x - worldPoint.x * newScale;
    const newY = mousePoint.y - worldPoint.y * newScale;

    setTransform({ x: newX, y: newY, scale: newScale });
  }, [transform.scale]);

  const handleContextMenu = (e: MouseEvent<HTMLDivElement>) => {
    if (connecting) {
      e.preventDefault();
      setConnecting(null);
    }
  };

  const handleDeleteEdge = (edgeId: string) => {
    onEdgesChange(edges.filter(e => e.id !== edgeId));
  };

  const transformStyle = {
    transformOrigin: '0 0',
    transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
  };

  const sourceNodeWhenConnecting = connecting ? nodes.find(n => n.id === connecting.sourceId) : null;

  return (
    <div
      ref={editorRef}
      className="absolute inset-0 bg-gray-100 dark:bg-gray-900 overflow-hidden"
      style={{
        backgroundImage: 'radial-gradient(hsla(220, 13%, 70%, 0.5) 1px, transparent 0)',
        backgroundSize: '20px 20px',
        touchAction: 'none',
      }}
      onMouseDown={handleInteractionStart}
      onMouseMove={handleInteractionMove}
      onMouseUp={handleInteractionEnd}
      onTouchStart={handleInteractionStart}
      onTouchMove={handleInteractionMove}
      onTouchEnd={handleInteractionEnd}
      onWheel={handleWheel}
      onContextMenu={handleContextMenu}
    >
      <div className="dark-grid"></div>
      <div className="absolute top-0 left-0 w-full h-full" style={transformStyle}>
        {nodes.map(node => {
            let connectableTargetType: 'style' | 'flow' | null = null;
            if (sourceNodeWhenConnecting && sourceNodeWhenConnecting.id !== node.id) {
                const isStyleSource = sourceNodeWhenConnecting.type === NodeType.STYLE ||
                                      (sourceNodeWhenConnecting.type === NodeType.WORK && (sourceNodeWhenConnecting.data as WorkNodeData).mode === 'parody');

                if (isStyleSource) {
                    if ([NodeType.PLOT, NodeType.SETTING].includes(node.type)) {
                        connectableTargetType = 'style';
                    }
                } else { // Source is a flow source
                    if ([NodeType.PLOT, NodeType.STRUCTURE, NodeType.CHARACTER, NodeType.ENVIRONMENT].includes(node.type)) {
                        connectableTargetType = 'flow';
                    }
                }
            }
            return (
              <NodeComponent 
                key={node.id} 
                node={node} 
                onUpdateData={onUpdateNodeData} 
                onDeleteNode={onDeleteNode}
                onToggleNodeCollapse={onToggleNodeCollapse}
                onAnalyzeWork={onAnalyzeWork}
                onExpandSetting={onExpandSetting}
                connectableTargetType={connectableTargetType}
                activeProgressTask={activeProgressTask}
                progress={progress}
              />
            )
        })}
      </div>
      <svg className="absolute top-0 left-0 w-full h-full pointer-events-none">
          <g style={transformStyle}>
              {edges.map(edge => {
                  const path = getEdgePath(edge);
                  if (!path) return null;
                  const midPoint = getCurveMidpoint(edge);

                  return (
                      <g key={edge.id} className="pointer-events-auto" onMouseEnter={() => setHoveredEdgeId(edge.id)} onMouseLeave={() => setHoveredEdgeId(null)}>
                          <path
                              d={path}
                              className="stroke-gray-400 dark:stroke-gray-600"
                              strokeWidth="2"
                              fill="none"
                          />
                          <path d={path} stroke="transparent" strokeWidth="15" fill="none" />
                          {hoveredEdgeId === edge.id && (
                              <g transform={`translate(${midPoint.x}, ${midPoint.y})`} style={{ cursor: 'pointer' }} onClick={() => handleDeleteEdge(edge.id)}>
                                  <circle r="8" className="fill-red-500 hover:fill-red-600" />
                              </g>
                          )}
                      </g>
                  )
              })}
              {connecting && (
                  <path
                      d={getConnectingPath()}
                      stroke="#38bdf8"
                      strokeWidth="2"
                      fill="none"
                      strokeDasharray="5,5"
                      className="pointer-events-none"
                  />
              )}
          </g>
      </svg>
      <style>{`
        .dark .dark-grid {
          background-image: radial-gradient(hsla(220, 13%, 40%, 0.5) 1px, transparent 0);
          background-size: 20px 20px;
          position: absolute;
          inset: 0;
        }
      `}</style>
    </div>
  );
};

export default NodeEditor;