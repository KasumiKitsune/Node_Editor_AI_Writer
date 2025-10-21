// services/layout.ts
import * as dagre from 'dagre';
// FIX: Added React import for React.RefObject type.
import React from 'react';
import { Node, Edge, NodeType, StructureCategory, StructureNodeData } from '../types';

interface NodeDimensions {
    width: number;
    height: number;
}

type NodePositions = Map<string, { x: number; y: number }>;
export type Transform = { x: number; y: number; scale: number };
export type LayoutMode = 'hierarchical' | 'circular';

const getNodeDimensions = async (nodes: Node[], editorRef: React.RefObject<HTMLDivElement>): Promise<Map<string, NodeDimensions>> => {
    const nodeDimensions = new Map<string, NodeDimensions>();
    if (!editorRef.current) return nodeDimensions;

    const nodeElements: HTMLElement[] = Array.from(editorRef.current.querySelectorAll('[data-node-id]'));
    
    await new Promise(resolve => requestAnimationFrame(resolve));
    
    nodeElements.forEach(el => {
        const nodeId = el.getAttribute('data-node-id');
        if (nodeId) {
            nodeDimensions.set(nodeId, {
                width: el.offsetWidth,
                height: el.offsetHeight,
            });
        }
    });

    nodes.forEach(node => {
        if (!nodeDimensions.has(node.id)) {
            nodeDimensions.set(node.id, { width: 320, height: 200 });
        }
    });

    return nodeDimensions;
};

const zoomToFit = (
    nodes: Node[],
    positions: NodePositions,
    dimensions: Map<string, NodeDimensions>,
    editorRef: React.RefObject<HTMLDivElement>
): Transform => {
    if (nodes.length === 0 || !editorRef.current) {
        return { x: 100, y: 100, scale: 1 };
    }

    const bounds = {
        minX: Infinity, minY: Infinity,
        maxX: -Infinity, maxY: -Infinity,
    };

    nodes.forEach(node => {
        const pos = positions.get(node.id) || node.position;
        const dim = dimensions.get(node.id) || { width: 320, height: 200 };
        bounds.minX = Math.min(bounds.minX, pos.x);
        bounds.minY = Math.min(bounds.minY, pos.y);
        bounds.maxX = Math.max(bounds.maxX, pos.x + dim.width);
        bounds.maxY = Math.max(bounds.maxY, pos.y + dim.height);
    });

    const graphWidth = bounds.maxX - bounds.minX;
    const graphHeight = bounds.maxY - bounds.minY;

    if (!isFinite(graphWidth) || !isFinite(graphHeight) || graphWidth <= 0 || graphHeight <= 0) {
        return { x: 100, y: 100, scale: 1 };
    }
    
    const editorWidth = editorRef.current.clientWidth;
    const editorHeight = editorRef.current.clientHeight;
    const viewPadding = 100;

    const scaleX = editorWidth / (graphWidth + viewPadding * 2);
    const scaleY = editorHeight / (graphHeight + viewPadding * 2);
    const newScale = Math.min(1.0, scaleX, scaleY);

    const newX = (editorWidth / 2) - ((graphWidth / 2) + bounds.minX) * newScale;
    const newY = (editorHeight / 2) - ((graphHeight / 2) + bounds.minY) * newScale;

    return { x: newX, y: newY, scale: newScale };
};

const placeHierarchicalSatellites = (
    satelliteNodes: Node[],
    flowNodes: Node[],
    edges: Edge[],
    positions: NodePositions,
    dimensions: Map<string, NodeDimensions>
) => {
    const verticalPadding = 20;
    const horizontalPadding = 60;
    const flowNodeIds = new Set(flowNodes.map(n => n.id));

    const attachments = new Map<string, { above: Node[], below: Node[], left: Node[] }>();
    flowNodeIds.forEach(id => attachments.set(id, { above: [], below: [], left: [] }));

    const unattachedSatellites: Node[] = [];

    satelliteNodes.forEach(sNode => {
        const connectedFlowEdges = edges.filter(e =>
            (e.source === sNode.id && flowNodeIds.has(e.target)) ||
            (e.target === sNode.id && flowNodeIds.has(e.source))
        );

        if (connectedFlowEdges.length > 0) {
            const anchorEdge = connectedFlowEdges[0];
            const anchorId = anchorEdge.source === sNode.id ? anchorEdge.target : anchorEdge.source;
            
            if (sNode.type === NodeType.STYLE) {
                attachments.get(anchorId)!.left.push(sNode);
            } else {
                const aboveCount = attachments.get(anchorId)!.above.length;
                const belowCount = attachments.get(anchorId)!.below.length;
                if (aboveCount <= belowCount) {
                    attachments.get(anchorId)!.above.push(sNode);
                } else {
                    attachments.get(anchorId)!.below.push(sNode);
                }
            }
        } else {
            unattachedSatellites.push(sNode);
        }
    });

    attachments.forEach((groups, anchorId) => {
        const anchorPos = positions.get(anchorId)!;
        const anchorDim = dimensions.get(anchorId)!;

        let currentY = anchorPos.y - verticalPadding;
        groups.above.reverse().forEach(node => {
            const nodeDim = dimensions.get(node.id)!;
            currentY -= nodeDim.height;
            positions.set(node.id, { x: anchorPos.x + (anchorDim.width - nodeDim.width) / 2, y: currentY });
            currentY -= verticalPadding;
        });

        currentY = anchorPos.y + anchorDim.height + verticalPadding;
        groups.below.forEach(node => {
            const nodeDim = dimensions.get(node.id)!;
            positions.set(node.id, { x: anchorPos.x + (anchorDim.width - nodeDim.width) / 2, y: currentY });
            currentY += nodeDim.height + verticalPadding;
        });
        
        // --- MODIFIED ---
        // Stack style nodes vertically to the left instead of horizontally
        if (groups.left.length > 0) {
            const maxWidth = Math.max(...groups.left.map(node => dimensions.get(node.id)!.width));
            const startX = anchorPos.x - horizontalPadding - maxWidth;
            
            const totalHeight = groups.left.reduce((sum, node) => sum + dimensions.get(node.id)!.height + verticalPadding, 0) - verticalPadding;
            let currentY = anchorPos.y + (anchorDim.height / 2) - (totalHeight / 2);

            groups.left.forEach(node => {
                const nodeDim = dimensions.get(node.id)!;
                positions.set(node.id, { x: startX + (maxWidth - nodeDim.width) / 2, y: currentY });
                currentY += nodeDim.height + verticalPadding;
            });
        }
    });

    if (unattachedSatellites.length > 0) {
        let minX = Infinity;
        positions.forEach(pos => { minX = Math.min(minX, pos.x); });
        
        let startX = (minX !== Infinity) ? minX - 400 : 50;
        let currentY = 50;

        unattachedSatellites.forEach(node => {
            const nodeDim = dimensions.get(node.id)!;
            positions.set(node.id, { x: startX, y: currentY });
            currentY += nodeDim.height + verticalPadding;
        });
    }
};

const calculateHierarchicalLayout = (
    nodes: Node[],
    edges: Edge[],
    dimensions: Map<string, NodeDimensions>
): NodePositions => {
    const g = new dagre.graphlib.Graph();
    g.setGraph({
        rankdir: 'LR',
        nodesep: 70,
        ranksep: 120,
        marginx: 50,
        marginy: 50,
    });
    g.setDefaultEdgeLabel(() => ({}));

    const positions = new Map<string, { x: number; y: number }>();
    const flowNodeTypes: NodeType[] = [NodeType.PLOT, NodeType.STRUCTURE, NodeType.SETTING, NodeType.WORK];
    const satelliteNodeTypes: NodeType[] = [NodeType.STYLE, NodeType.CHARACTER, NodeType.ENVIRONMENT];

    const flowNodes = nodes.filter(n => flowNodeTypes.includes(n.type));
    const satelliteNodes = nodes.filter(n => satelliteNodeTypes.includes(n.type));

    flowNodes.forEach(node => {
        const dim = dimensions.get(node.id) || { width: 320, height: 200 };
        g.setNode(node.id, { width: dim.width, height: dim.height });
    });

    edges.forEach(edge => {
        if (g.hasNode(edge.source) && g.hasNode(edge.target)) {
            g.setEdge(edge.source, edge.target);
        }
    });

    dagre.layout(g);

    g.nodes().forEach(nodeId => {
        const node = g.node(nodeId);
        if (node) {
            positions.set(nodeId, { x: node.x - node.width / 2, y: node.y - node.height / 2 });
        }
    });

    if (flowNodes.length === 0 && satelliteNodes.length > 0) {
        let currentY = 50;
        satelliteNodes.forEach(node => {
            const dim = dimensions.get(node.id) || { width: 320, height: 200 };
            positions.set(node.id, { x: 50, y: currentY });
            currentY += dim.height + 20;
        });
    } else {
        placeHierarchicalSatellites(satelliteNodes, flowNodes, edges, positions, dimensions);
    }

    nodes.forEach(node => {
        if (!positions.has(node.id)) {
            const existingPos = nodes.find(n => n.id === node.id)?.position || { x: 50, y: 50 };
            positions.set(node.id, existingPos);
        }
    });

    return positions;
};

const getStoryChain = (nodes: Node[], edges: Edge[]): string[] => {
    const flowNodes = nodes.filter(n => [NodeType.PLOT, NodeType.STRUCTURE].includes(n.type));
    if (flowNodes.length === 0) return [];

    const adj = new Map<string, string[]>();
    const inDegree = new Map<string, number>();

    flowNodes.forEach(node => {
        adj.set(node.id, []);
        inDegree.set(node.id, 0);
    });

    edges.forEach(edge => {
        const sourceNode = nodes.find(n => n.id === edge.source);
        const targetNode = nodes.find(n => n.id === edge.target);
        const isFlowEdge = sourceNode && targetNode && 
                           [NodeType.PLOT, NodeType.STRUCTURE].includes(sourceNode.type) &&
                           [NodeType.PLOT, NodeType.STRUCTURE].includes(targetNode.type);

        if (isFlowEdge) {
            adj.get(edge.source)!.push(edge.target);
            inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
        }
    });

    let startNodeIds = flowNodes
        .filter(n => n.type === NodeType.STRUCTURE && (n.data as StructureNodeData).category === StructureCategory.STARTING)
        .map(n => n.id);

    if (startNodeIds.length === 0) {
        startNodeIds = flowNodes.filter(n => inDegree.get(n.id) === 0).map(n => n.id);
    }
    
    if (startNodeIds.length === 0 && flowNodes.length > 0) {
        startNodeIds.push(flowNodes[0].id);
    }

    const chain: string[] = [];
    const visited = new Set<string>();
    
    function dfs(nodeId: string) {
        if (!nodeId || visited.has(nodeId)) return;
        
        visited.add(nodeId);
        chain.push(nodeId);

        const children = adj.get(nodeId) || [];
        const sortedChildren = children.sort((a, b) => {
            const nodeA = nodes.find(n => n.id === a);
            const nodeB = nodes.find(n => n.id === b);
            const isAEnd = nodeA?.type === NodeType.STRUCTURE && (nodeA.data as StructureNodeData).category === StructureCategory.ENDING;
            const isBEnd = nodeB?.type === NodeType.STRUCTURE && (nodeB.data as StructureNodeData).category === StructureCategory.ENDING;
            if (isAEnd) return 1;
            if (isBEnd) return -1;
            return 0;
        });

        for (const childId of sortedChildren) {
            dfs(childId);
        }
    }
    
    if (startNodeIds[0]) {
        dfs(startNodeIds[0]);
    }

    flowNodes.forEach(node => {
        if (!visited.has(node.id)) {
            chain.push(node.id);
        }
    });

    return chain;
};

const calculateCircularLayout = (
    nodes: Node[],
    edges: Edge[],
    dimensions: Map<string, NodeDimensions>
): NodePositions => {
    const positions = new Map<string, { x: number; y: number }>();
    const centralNode = nodes.find(n => n.type === NodeType.SETTING);

    if (centralNode) {
        // --- NEW LOGIC: Layout around a central SETTING node ---
        const placedIds = new Set<string>();
        const mainChainIds = getStoryChain(nodes, edges).filter(id => id !== centralNode.id);

        const mainRadius = Math.max(500, mainChainIds.length * 100);
        const centerX = mainRadius;
        const centerY = mainRadius;

        // 1. Place central node
        const centralNodeDim = dimensions.get(centralNode.id)!;
        positions.set(centralNode.id, {
            x: centerX - centralNodeDim.width / 2,
            y: centerY - centralNodeDim.height / 2
        });
        placedIds.add(centralNode.id);

        // 2. Place main story chain on the outer ring
        if (mainChainIds.length > 0) {
            const angleStep = (2 * Math.PI) / mainChainIds.length;
            mainChainIds.forEach((nodeId, i) => {
                const nodeDim = dimensions.get(nodeId)!;
                const angle = i * angleStep - (Math.PI / 2);
                const x = centerX + mainRadius * Math.cos(angle) - nodeDim.width / 2;
                const y = centerY + mainRadius * Math.sin(angle) - nodeDim.height / 2;
                positions.set(nodeId, { x, y });
                placedIds.add(nodeId);
            });
        }
        
        // 3. Iteratively place all other satellite nodes
        const parentMap = new Map<string, string[]>();
        nodes.forEach(n => parentMap.set(n.id, []));
        edges.forEach(edge => {
            parentMap.get(edge.target)?.push(edge.source);
            parentMap.get(edge.source)?.push(edge.target);
        });

        let unplacedNodes = nodes.filter(n => !placedIds.has(n.id));
        let iterations = 0;
        while (unplacedNodes.length > 0 && iterations < nodes.length) {
            const placableNodes = unplacedNodes.filter(node => {
                const connectedNodes = parentMap.get(node.id) || [];
                return connectedNodes.length > 0 && connectedNodes.some(pId => placedIds.has(pId));
            });

            if (placableNodes.length === 0) break;

            const nodesByAnchor = new Map<string, Node[]>();
            placableNodes.forEach(node => {
                const anchorId = (parentMap.get(node.id) || []).find(pId => placedIds.has(pId));
                if (anchorId) {
                    if (!nodesByAnchor.has(anchorId)) nodesByAnchor.set(anchorId, []);
                    nodesByAnchor.get(anchorId)!.push(node);
                }
            });

            nodesByAnchor.forEach((satellites, anchorId) => {
                const anchorPos = positions.get(anchorId)!;
                const anchorDim = dimensions.get(anchorId)!;

                if (anchorId === centralNode.id) {
                    // Satellites of the central node go in a tight inner circle
                    const innerRadius = Math.max(centralNodeDim.width, centralNodeDim.height) / 2 + 120;
                    const angleStep = (2 * Math.PI) / satellites.length;
                    satellites.forEach((node, i) => {
                        const nodeDim = dimensions.get(node.id)!;
                        const angle = i * angleStep + (Math.PI / 6); 
                        const x = centerX + innerRadius * Math.cos(angle) - nodeDim.width / 2;
                        const y = centerY + innerRadius * Math.sin(angle) - nodeDim.height / 2;
                        positions.set(node.id, { x, y });
                    });
                } else {
                    // Satellites of ring nodes go radially outward
                    const baseVector = { x: anchorPos.x + anchorDim.width / 2 - centerX, y: anchorPos.y + anchorDim.height / 2 - centerY };
                    const baseAngle = Math.atan2(baseVector.y, baseVector.x);
                    const radialPadding = 60;
                    const arcRadius = Math.max(anchorDim.width, anchorDim.height) / 2 + radialPadding;
                    const totalArcAngle = Math.PI / 4;
                    const angleStep = satellites.length > 1 ? totalArcAngle / (satellites.length - 1) : 0;
                    const startAngle = baseAngle - totalArcAngle / 2;
                    
                    satellites.forEach((node, i) => {
                        const nodeDim = dimensions.get(node.id)!;
                        const angle = satellites.length === 1 ? baseAngle : startAngle + i * angleStep;
                        const satelliteRadius = arcRadius + Math.max(nodeDim.width, nodeDim.height) / 2;
                        const x = (anchorPos.x + anchorDim.width / 2) + satelliteRadius * Math.cos(angle) - nodeDim.width / 2;
                        const y = (anchorPos.y + anchorDim.height / 2) + satelliteRadius * Math.sin(angle) - nodeDim.height / 2;
                        positions.set(node.id, { x, y });
                    });
                }
            });

            placableNodes.forEach(node => placedIds.add(node.id));
            unplacedNodes = unplacedNodes.filter(n => !placedIds.has(n.id));
            iterations++;
        }

        // Place orphans
        if (unplacedNodes.length > 0) {
             let currentY = centerY + mainRadius + 150;
             unplacedNodes.forEach(node => {
                 const nodeDim = dimensions.get(node.id)!;
                 positions.set(node.id, { x: centerX - nodeDim.width / 2, y: currentY });
                 currentY += nodeDim.height + 20;
             });
        }

    } else {
        // --- FALLBACK LOGIC: No central SETTING node, use previous circular layout ---
        const mainChainIds = getStoryChain(nodes, edges);
        const radius = Math.max(250, mainChainIds.length * 90);
        const centerX = radius;
        const centerY = radius;

        if (mainChainIds.length > 0) {
            const angleStep = (2 * Math.PI) / mainChainIds.length;
            mainChainIds.forEach((nodeId, i) => {
                const nodeDim = dimensions.get(nodeId)!;
                const angle = i * angleStep - (Math.PI / 2);
                const x = centerX + radius * Math.cos(angle) - nodeDim.width / 2;
                const y = centerY + radius * Math.sin(angle) - nodeDim.height / 2;
                positions.set(nodeId, { x, y });
            });
        }

        const placedNodeIds = new Set<string>(mainChainIds);
        const parentMap = new Map<string, string[]>();
        nodes.forEach(n => parentMap.set(n.id, []));
        edges.forEach(edge => {
            parentMap.get(edge.target)?.push(edge.source);
            parentMap.get(edge.source)?.push(edge.target);
        });

        let unplacedNodes = nodes.filter(n => !placedNodeIds.has(n.id));
        let iterations = 0;
        while (unplacedNodes.length > 0 && iterations < nodes.length) {
            const placableNodes = unplacedNodes.filter(node => {
                const connectedNodes = parentMap.get(node.id) || [];
                return connectedNodes.length > 0 && connectedNodes.some(pId => placedNodeIds.has(pId));
            });

            if (placableNodes.length === 0) break;

            const nodesByAnchor = new Map<string, Node[]>();
            placableNodes.forEach(node => {
                const anchorId = (parentMap.get(node.id) || []).find(pId => placedNodeIds.has(pId));
                if (anchorId) {
                    if (!nodesByAnchor.has(anchorId)) nodesByAnchor.set(anchorId, []);
                    nodesByAnchor.get(anchorId)!.push(node);
                }
            });

            nodesByAnchor.forEach((satellites, anchorId) => {
                const anchorPos = positions.get(anchorId)!;
                const anchorDim = dimensions.get(anchorId)!;
                const baseVector = { x: anchorPos.x + anchorDim.width / 2 - centerX, y: anchorPos.y + anchorDim.height / 2 - centerY };
                const baseAngle = Math.atan2(baseVector.y, baseVector.x);
                const radialPadding = 60;
                const arcRadius = Math.max(anchorDim.width, anchorDim.height) / 2 + radialPadding;
                const totalArcAngle = Math.PI / 4;
                const angleStep = satellites.length > 1 ? totalArcAngle / (satellites.length - 1) : 0;
                const startAngle = baseAngle - totalArcAngle / 2;

                satellites.forEach((node, i) => {
                    const nodeDim = dimensions.get(node.id)!;
                    const angle = satellites.length === 1 ? baseAngle : startAngle + i * angleStep;
                    const satelliteRadius = arcRadius + Math.max(nodeDim.width, nodeDim.height) / 2;
                    const x = (anchorPos.x + anchorDim.width / 2) + satelliteRadius * Math.cos(angle) - nodeDim.width / 2;
                    const y = (anchorPos.y + anchorDim.height / 2) + satelliteRadius * Math.sin(angle) - nodeDim.height / 2;
                    positions.set(node.id, { x, y });
                });
            });

            placableNodes.forEach(node => placedNodeIds.add(node.id));
            unplacedNodes = unplacedNodes.filter(n => !placedNodeIds.has(n.id));
            iterations++;
        }

        if (unplacedNodes.length > 0) {
            let currentY = centerY + radius + 150;
            unplacedNodes.forEach(node => {
                const nodeDim = dimensions.get(node.id)!;
                positions.set(node.id, { x: centerX - nodeDim.width / 2, y: currentY });
                currentY += nodeDim.height + 20;
            });
        }
    }

    // Normalize coordinates for both cases
    let minX = Infinity, minY = Infinity;
    positions.forEach(pos => {
        minX = Math.min(minX, pos.x);
        minY = Math.min(minY, pos.y);
    });

    if (isFinite(minX) && isFinite(minY)) {
        positions.forEach((pos, id) => {
            positions.set(id, { x: pos.x - minX + 50, y: pos.y - minY + 50 });
        });
    }

    // Add any nodes that somehow missed placement (should not happen, but safe)
    nodes.forEach(node => {
        if (!positions.has(node.id)) {
            positions.set(node.id, node.position);
        }
    });

    return positions;
};


export const calculateLayout = async (
    nodes: Node[],
    edges: Edge[],
    editorRef: React.RefObject<HTMLDivElement>,
    mode: LayoutMode
): Promise<{ positions: NodePositions; transform: Transform }> => {
    
    const dimensions = await getNodeDimensions(nodes, editorRef);
    
    let positions: NodePositions;

    if (mode === 'hierarchical') {
        positions = calculateHierarchicalLayout(nodes, edges, dimensions);
    } else {
        positions = calculateCircularLayout(nodes, edges, dimensions);
    }
    
    const transform = zoomToFit(nodes, positions, dimensions, editorRef);
    
    return { positions, transform };
};