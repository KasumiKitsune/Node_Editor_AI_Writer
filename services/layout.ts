// services/layout.ts
// FIX: Added React import for React.RefObject type.
import React from 'react';
import { Node, Edge, NodeType } from '../types';

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

const placeSatelliteNodes = (
    satelliteNodes: Node[],
    edges: Edge[],
    positions: NodePositions,
    dimensions: Map<string, NodeDimensions>,
    fallbackStartPosition: { x: number; y: number }
) => {
    const targetAttachments: { [key: string]: Node[] } = {};
    const unattachedNodes: Node[] = [];
    const verticalPadding = 20;

    // Group satellite nodes by target or as unattached
    satelliteNodes.forEach(sNode => {
        const styleEdge = edges.find(e => e.source === sNode.id);
        const targetNodeId = styleEdge?.target;
        if (targetNodeId && positions.has(targetNodeId)) {
            if (!targetAttachments[targetNodeId]) {
                targetAttachments[targetNodeId] = [];
            }
            targetAttachments[targetNodeId].push(sNode);
        } else {
            unattachedNodes.push(sNode);
        }
    });

    // Position attached nodes
    for (const targetNodeId in targetAttachments) {
        const attachedNodes = targetAttachments[targetNodeId];
        const targetPos = positions.get(targetNodeId)!;
        const targetDim = dimensions.get(targetNodeId)!;
        
        const totalHeight = attachedNodes.reduce((sum, node) => sum + dimensions.get(node.id)!.height, 0) + (attachedNodes.length - 1) * verticalPadding;
        let startY = targetPos.y + (targetDim.height / 2) - (totalHeight / 2);

        attachedNodes.forEach(sNode => {
            const sNodeDim = dimensions.get(sNode.id)!;
            const x = targetPos.x - sNodeDim.width - 60;
            positions.set(sNode.id, { x: x, y: startY });
            startY += sNodeDim.height + verticalPadding;
        });
    }

    // Position unattached nodes
    let unattachedY = fallbackStartPosition.y;
    unattachedNodes.forEach(sNode => {
        const sNodeDim = dimensions.get(sNode.id)!;
        positions.set(sNode.id, { x: fallbackStartPosition.x, y: unattachedY });
        unattachedY += sNodeDim.height + verticalPadding;
    });
};

const calculateHierarchicalLayout = (
    nodes: Node[],
    edges: Edge[],
    dimensions: Map<string, NodeDimensions>,
    editorWidth: number
): NodePositions => {
    const positions = new Map<string, { x: number; y: number }>();
    const flowNodeTypes: NodeType[] = [NodeType.PLOT, NodeType.STRUCTURE, NodeType.SETTING, NodeType.WORK, NodeType.CHARACTER, NodeType.ENVIRONMENT];
    const satelliteNodeTypes: NodeType[] = [NodeType.STYLE];

    const flowNodes = nodes.filter(n => flowNodeTypes.includes(n.type));
    const satelliteNodes = nodes.filter(n => satelliteNodeTypes.includes(n.type));

    if (flowNodes.length === 0) {
        // If no flow nodes, just position satellites
        placeSatelliteNodes(satelliteNodes, edges, positions, dimensions, { x: 50, y: 50 });
        nodes.forEach(n => {
            if (!positions.has(n.id)) positions.set(n.id, n.position);
        });
        return positions;
    }

    const nodeMap = new Map<string, { node: Node; parents: string[]; children: string[]; }>();
    flowNodes.forEach(node => {
        nodeMap.set(node.id, { node, parents: [], children: [] });
    });

    edges.forEach(edge => {
        if (nodeMap.has(edge.source) && nodeMap.has(edge.target)) {
            nodeMap.get(edge.source)!.children.push(edge.target);
            nodeMap.get(edge.target)!.parents.push(edge.source);
        }
    });
    
    const ranks = new Map<string, number>();
    const queue: string[] = [];
    nodeMap.forEach((data, id) => {
        if (data.parents.length === 0) {
            queue.push(id);
            ranks.set(id, 0);
        }
    });

    let head = 0;
    while(head < queue.length) {
        const uId = queue[head++];
        const uRank = ranks.get(uId)!;
        
        nodeMap.get(uId)?.children.forEach(vId => {
            const currentVRank = ranks.get(vId) || 0;
            ranks.set(vId, Math.max(currentVRank, uRank + 1));
            // Check if all parents of vId have been ranked
            if(nodeMap.get(vId)?.parents.every(pId => ranks.has(pId))) {
                if(!queue.includes(vId)) {
                    queue.push(vId);
                }
            }
        });
    }

    const layers = new Map<number, string[]>();
    let maxRank = 0;
    ranks.forEach((rank, id) => {
        if (!layers.has(rank)) layers.set(rank, []);
        layers.get(rank)!.push(id);
        maxRank = Math.max(maxRank, rank);
    });

    const xSpacing = 120;
    const ySpacing = 100;
    const nodePadding = 50;
    const layoutWidth = editorWidth > 800 ? editorWidth * 0.9 : editorWidth * 1.5;

    let currentX = nodePadding;
    let currentY = nodePadding;
    let maxRowHeight = 0;
    
    const sortedRanks = Array.from(layers.keys()).sort((a,b) => a - b);

    for (const rank of sortedRanks) {
        const layerNodeIds = layers.get(rank) || [];
        if (layerNodeIds.length === 0) continue;

        let maxNodeWidthInLayer = 0;
        let totalLayerHeight = 0;
        layerNodeIds.forEach(id => {
            const dim = dimensions.get(id)!;
            maxNodeWidthInLayer = Math.max(maxNodeWidthInLayer, dim.width);
            totalLayerHeight += dim.height;
        });
        totalLayerHeight += (layerNodeIds.length - 1) * ySpacing;

        if (currentX + maxNodeWidthInLayer > layoutWidth && rank > 0) {
            currentX = nodePadding;
            currentY += maxRowHeight + ySpacing;
            maxRowHeight = 0;
        }
        
        let yPosForNode = currentY;
        layerNodeIds.forEach(id => {
            const dim = dimensions.get(id)!;
            positions.set(id, { x: currentX, y: yPosForNode });
            yPosForNode += dim.height + ySpacing;
        });

        maxRowHeight = Math.max(maxRowHeight, totalLayerHeight);
        currentX += maxNodeWidthInLayer + xSpacing;
    }

    placeSatelliteNodes(satelliteNodes, edges, positions, dimensions, { x: -400, y: 50 });

    nodes.forEach(node => {
        if (!positions.has(node.id)) {
            positions.set(node.id, node.position);
        }
    });

    return positions;
};

const calculateCircularLayout = (
    nodes: Node[],
    edges: Edge[],
    dimensions: Map<string, NodeDimensions>
): NodePositions => {
    const positions = new Map<string, { x: number; y: number }>();
    
    let centerNodes = nodes.filter(n => n.type === NodeType.SETTING);
    if (centerNodes.length === 0) centerNodes = nodes.filter(n => n.type === NodeType.WORK);
    
    const ring1Nodes = nodes.filter(n => n.type === NodeType.PLOT || n.type === NodeType.STRUCTURE);
    const ring2Nodes = nodes.filter(n => n.type === NodeType.CHARACTER || n.type === NodeType.ENVIRONMENT);
    const satelliteNodes = nodes.filter(n => n.type === NodeType.STYLE);

    const placedNodeIds = new Set<string>();

    const placeNodesInCircle = (nodesToPlace: Node[], radius: number, angleOffset = 0) => {
        if (nodesToPlace.length === 0) return;
        const angleStep = (2 * Math.PI) / nodesToPlace.length;
        nodesToPlace.forEach((node, i) => {
            const angle = i * angleStep + angleOffset;
            const x = radius * Math.cos(angle);
            const y = radius * Math.sin(angle);
            positions.set(node.id, { x, y });
            placedNodeIds.add(node.id);
        });
    };
    
    if (centerNodes.length > 0) {
        placeNodesInCircle(centerNodes, centerNodes.length > 1 ? 150 : 0);
    }
    
    const ring1Radius = 500;
    placeNodesInCircle(ring1Nodes, ring1Radius);
    
    const ring2Radius = 950;
    placeNodesInCircle(ring2Nodes, ring2Radius, Math.PI / ring2Nodes.length);

    placeSatelliteNodes(satelliteNodes, edges, positions, dimensions, { x: -ring2Radius - 400, y: -ring2Radius / 2 });
    satelliteNodes.forEach(sNode => placedNodeIds.add(sNode.id));

    nodes.forEach(node => {
        if (!placedNodeIds.has(node.id)) {
            positions.set(node.id, node.position);
        }
    });
    
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    let nodeCount = 0;
    positions.forEach((pos, id) => {
        const dim = dimensions.get(id) || { width: 0, height: 0 };
        minX = Math.min(minX, pos.x);
        minY = Math.min(minY, pos.y);
        maxX = Math.max(maxX, pos.x + dim.width);
        maxY = Math.max(maxY, pos.y + dim.height);
        nodeCount++;
    });

    if (nodeCount > 0 && isFinite(minX)) {
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        positions.forEach((pos, id) => {
            positions.set(id, { x: pos.x - centerX, y: pos.y - centerY });
        });
    }

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
    const editorWidth = editorRef.current?.clientWidth || 1024;

    if (mode === 'hierarchical') {
        positions = calculateHierarchicalLayout(nodes, edges, dimensions, editorWidth);
    } else {
        positions = calculateCircularLayout(nodes, edges, dimensions);
    }
    
    const transform = zoomToFit(nodes, positions, dimensions, editorRef);
    
    return { positions, transform };
};