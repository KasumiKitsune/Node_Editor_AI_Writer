import React, { useState, useEffect, useRef } from 'react';
import { NodeType } from '../types';
import { PlusIcon, XIcon } from './icons';
import { nodeMeta } from '../constants';

interface TrayNode {
    type: NodeType;
    data?: any;
}

interface NodeTrayProps {
    nodes: TrayNode[];
    onRemove: (index: number) => void;
    onInsert: () => void;
}

const NodeTray: React.FC<NodeTrayProps> = ({ nodes, onRemove, onInsert }) => {
    const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
    const timerRef = useRef<number | null>(null);
    const prevNodesLengthRef = useRef(nodes.length);

    useEffect(() => {
        const prevLength = prevNodesLengthRef.current;
        prevNodesLengthRef.current = nodes.length;

        // Clear any lingering timers
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }

        // Case 1: A node was added (new node is always at index 0)
        if (nodes.length > prevLength) {
            const newNodeIndex = 0;
            setExpandedIndex(newNodeIndex);

            // Set a timer to auto-collapse the new node
            timerRef.current = window.setTimeout(() => {
                setExpandedIndex(current => (current === newNodeIndex ? null : current));
            }, 2000);
        } 
        // Case 2: A node was removed
        else if (nodes.length < prevLength) {
            // If the currently expanded node's index is now out of bounds, collapse all.
            if (expandedIndex !== null && expandedIndex >= nodes.length) {
                setExpandedIndex(null);
            }
        }
        
        // Cleanup function for the effect
        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, [nodes]);

    const handleItemClick = (index: number) => {
        // Manually clicking should cancel any auto-collapse timer
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        setExpandedIndex(current => (current === index ? null : index));
    };


    return (
        <div className="flex-shrink-0 w-full bg-slate-200/80 dark:bg-slate-900/80 backdrop-blur-lg border-t border-slate-300/50 dark:border-slate-800/50 p-3 flex items-center gap-3 animate-scale-in">
            <div className="flex-grow overflow-x-auto overflow-y-hidden whitespace-nowrap h-16 flex items-center gap-2 pr-4 custom-tray-scroll">
                {nodes.map((node, index) => {
                    const meta = nodeMeta[node.type];
                    const Icon = meta?.icon;
                    if (!Icon) return null;

                    const title = node.data?.title || meta?.label || '新节点';
                    const isExpanded = expandedIndex === index;

                    return (
                        <div 
                            key={`${node.type}-${node.data?.title || ''}-${index}`}
                            onClick={() => handleItemClick(index)}
                            className="inline-flex items-center bg-white dark:bg-slate-700 rounded-full h-12 shadow-md animate-scale-in cursor-pointer"
                            style={{animationDuration: '150ms'}}
                        >
                            <div className={`w-10 h-10 flex items-center justify-center ${meta?.color} text-white rounded-full m-1 flex-shrink-0`}>
                                <Icon className="h-5 w-5" />
                            </div>
                            <div 
                                className="flex items-center overflow-hidden transition-all duration-300 ease-in-out"
                                style={{ maxWidth: isExpanded ? '200px' : '0px', paddingRight: isExpanded ? '0.5rem' : '0' }}
                            >
                                <span className="pl-3 pr-2 text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{title}</span>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onRemove(index); }} 
                                    className="p-1 text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition-colors btn-material rounded-full flex-shrink-0"
                                >
                                    <XIcon className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
            <button 
                onClick={onInsert}
                className="relative flex-shrink-0 w-28 h-14 bg-monet-dark text-white font-bold rounded-2xl hover:bg-monet-dark-hover transition-colors shadow-lg flex items-center justify-center text-lg gap-2 btn-material"
            >
                <PlusIcon className="h-6 w-6" />
                <span>插入</span>
            </button>
            <style>{`
                .custom-tray-scroll::-webkit-scrollbar {
                    height: 4px;
                }
                .custom-tray-scroll::-webkit-scrollbar-thumb {
                    background-color: #94a3b8;
                    border-radius: 2px;
                }
                html.dark .custom-tray-scroll::-webkit-scrollbar-thumb {
                    background-color: #475569;
                }
            `}</style>
        </div>
    );
};

export default NodeTray;