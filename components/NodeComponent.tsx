import React, { useState, useRef, useEffect } from 'react';
import { Node, NodeType, PlotNodeData, CharacterNodeData, SettingNodeData, StyleNodeData, KeyValueField, StructureNodeData, StructureCategory, WorkNodeData, EnvironmentNodeData } from '../types';
import { PlusIcon, TrashIcon, XIcon, BookOpenIcon, SparklesIcon, ChevronUpIcon, ChevronDownIcon, CustomSelect, CustomSelectOption } from './icons';

const ProgressDisplay: React.FC<{ progress: number }> = ({ progress }) => (
    <div className="relative w-full h-full flex items-center justify-center text-xs font-semibold">
        <div className="absolute top-0 left-0 h-full bg-blue-400/50 rounded-full" style={{ width: `${progress}%` }} />
        <span className="relative z-10">{`${progress}%`}</span>
    </div>
);

interface NodeComponentProps {
  node: Node;
  onUpdateData: (nodeId: string, data: any) => void;
  onDeleteNode: (nodeId: string) => void;
  onToggleNodeCollapse: (nodeId: string) => void;
  onAnalyzeWork?: (nodeId: string, content: string) => void;
  onExpandSetting?: (nodeId: string) => void;
  connectableTargetType?: 'style' | 'flow' | null;
  activeProgressTask?: string | null;
  progress?: number;
  isDragging?: boolean;
  highlightedNodeId?: string | null;
}

const Header: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className }) => (
    <div className={`p-4 rounded-t-3xl ${className}`} style={{ cursor: 'grab' }}>
        <h3 className="font-bold text-lg">{children}</h3>
    </div>
);

const PlotNode: React.FC<{ node: Node<PlotNodeData>, onUpdateData: (data: PlotNodeData) => void, isCollapsed?: boolean }> = ({ node, onUpdateData, isCollapsed }) => {
    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onUpdateData({ ...node.data, userInput: e.target.value });
    };

    return (
        <>
            <Header className="bg-blue-200 text-blue-900 dark:bg-blue-950 dark:text-blue-200 node-drag-handle">{node.data.title}</Header>
            <div className={`grid transition-[grid-template-rows] duration-200 ease-in-out`} style={{ gridTemplateRows: isCollapsed ? '0fr' : '1fr' }}>
                <div className="overflow-hidden">
                    <div className="p-4 space-y-3 text-sm">
                        <p className="text-slate-600 dark:text-slate-400/80 text-base max-h-48 overflow-y-auto transition-colors duration-200 hover:text-slate-800 dark:hover:text-slate-200 whitespace-pre-line">{node.data.description}</p>
                        <textarea
                            placeholder="添加额外需求..."
                            value={node.data.userInput || ''}
                            onChange={handleInputChange}
                            draggable="false"
                            className="w-full bg-slate-200 dark:bg-slate-700/50 text-sm p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none transition-colors"
                            rows={2}
                        />
                    </div>
                </div>
            </div>
        </>
    );
};

const StructureNode: React.FC<{ node: Node<StructureNodeData>, onUpdateData: (data: StructureNodeData) => void, isCollapsed?: boolean }> = ({ node, onUpdateData, isCollapsed }) => {
    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onUpdateData({ ...node.data, userInput: e.target.value });
    };

    return (
        <>
            <Header className="bg-amber-200 text-amber-900 dark:bg-amber-950 dark:text-amber-200 node-drag-handle">{node.data.title}</Header>
            <div className={`grid transition-[grid-template-rows] duration-200 ease-in-out`} style={{ gridTemplateRows: isCollapsed ? '0fr' : '1fr' }}>
                <div className="overflow-hidden">
                    <div className="p-4 space-y-3 text-sm">
                        <p className="text-slate-600 dark:text-slate-400/80 text-base max-h-48 overflow-y-auto transition-colors duration-200 hover:text-slate-800 dark:hover:text-slate-200 whitespace-pre-line">{node.data.description}</p>
                        <textarea
                            placeholder="添加额外需求..."
                            value={node.data.userInput || ''}
                            onChange={handleInputChange}
                            draggable="false"
                            className="w-full bg-slate-200 dark:bg-slate-700/50 text-sm p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none transition-colors"
                            rows={2}
                        />
                    </div>
                </div>
            </div>
        </>
    );
};


const StyleNode: React.FC<{ node: Node<StyleNodeData>, onUpdateData: (data: StyleNodeData) => void, isCollapsed?: boolean }> = ({ node, onUpdateData, isCollapsed }) => {
    const [isSelectOpen, setIsSelectOpen] = useState(false);

    const handleMethodChange = (value: string) => {
        onUpdateData({ ...node.data, applicationMethod: value as 'appropriate' | 'full_section' });
    };

    const styleMethodOptions: CustomSelectOption[] = [
        { value: 'appropriate', label: '适当插入' },
        { value: 'full_section', label: '整个部分' },
    ];

    return (
        <>
            <Header className="bg-pink-200 text-pink-900 dark:bg-pink-950 dark:text-pink-200 node-drag-handle">{node.data.title}</Header>
            <div className={`grid transition-[grid-template-rows] duration-200 ease-in-out`} style={{ gridTemplateRows: isCollapsed ? '0fr' : '1fr' }}>
                <div className={isSelectOpen ? 'overflow-visible' : 'overflow-hidden'}>
                    <div className="p-4 space-y-3 text-sm">
                        <p className="text-slate-600 dark:text-slate-400/80 text-base max-h-48 overflow-y-auto transition-colors duration-200 hover:text-slate-800 dark:hover:text-slate-200 whitespace-pre-line">{node.data.description}</p>
                        <div className="flex items-center space-x-2 pt-2">
                            <label htmlFor={`style-method-${node.id}`} className="text-sm font-medium text-slate-500 dark:text-slate-300">应用方式:</label>
                            <CustomSelect
                                id={`style-method-${node.id}`}
                                options={styleMethodOptions}
                                value={node.data.applicationMethod}
                                onChange={handleMethodChange}
                                onToggleOpen={setIsSelectOpen}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};


const EditableNode: React.FC<{ 
    node: Node<CharacterNodeData | SettingNodeData | EnvironmentNodeData>, 
    onUpdateData: (data: any) => void, 
    headerColor: string, 
    isCollapsed?: boolean,
    onExpand?: () => void,
    isAnyTaskRunning: boolean,
    isExpandingThisNode: boolean,
    progress: number,
}> = ({ node, onUpdateData, headerColor, isCollapsed, onExpand, isAnyTaskRunning, isExpandingThisNode, progress }) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditingTitle) {
        titleInputRef.current?.focus();
        titleInputRef.current?.select();
    }
  }, [isEditingTitle]);
  
  const handleFieldChange = (fieldId: string, keyOrValue: 'key' | 'value', value: string) => {
    const newFields = (node.data.fields || []).map(f =>
      f.id === fieldId ? { ...f, [keyOrValue]: value } : f
    );
    onUpdateData({ ...node.data, fields: newFields });
  };

  const addField = () => {
    const newField: KeyValueField = { id: `field_${Date.now()}`, key: '', value: '' };
    onUpdateData({ ...node.data, fields: [...(node.data.fields || []), newField] });
  };

  const removeField = (fieldId: string) => {
    const newFields = (node.data.fields || []).filter(f => f.id !== fieldId);
    onUpdateData({ ...node.data, fields: newFields });
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateData({ ...node.data, title: e.target.value });
  };

  const handleStructureChange = (value: string) => {
    onUpdateData({ ...node.data, narrativeStructure: value });
  };

  const narrativeStructureOptions: CustomSelectOption[] = [
    { value: 'single', label: '单线' },
    { value: 'dual', label: '双线' },
    { value: 'light_dark', label: '明暗线' },
  ];
  
  return (
    <>
      <div 
        className={`p-4 rounded-t-3xl flex justify-between items-center node-drag-handle ${headerColor}`} 
        style={{ cursor: 'grab' }}
        onDoubleClick={() => setIsEditingTitle(true)}
      >
        <input
            ref={titleInputRef}
            type="text"
            value={node.data.title}
            onChange={handleTitleChange}
            onBlur={() => setIsEditingTitle(false)}
            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
            draggable="false"
            className={`bg-transparent text-lg font-bold w-full focus:outline-none focus:ring-1 focus:ring-white/50 rounded-lg px-2 py-1 -ml-2 ${!isEditingTitle ? 'pointer-events-none' : ''}`}
            placeholder="未命名"
        />
      </div>
       <div className={`grid transition-[grid-template-rows] duration-200 ease-in-out`} style={{ gridTemplateRows: isCollapsed ? '0fr' : '1fr' }}>
            <div className="overflow-hidden">
                <div className="p-4 space-y-3">
                    {node.type === NodeType.SETTING && (
                        <div className="flex items-center space-x-2 pb-2">
                            <label htmlFor={`structure-select-${node.id}`} className="text-sm font-medium text-slate-500 dark:text-slate-300 whitespace-nowrap">叙事脉络:</label>
                            <CustomSelect
                                id={`structure-select-${node.id}`}
                                options={narrativeStructureOptions}
                                value={(node.data as SettingNodeData).narrativeStructure}
                                onChange={handleStructureChange}
                            />
                        </div>
                    )}
                    {(node.data.fields || []).map(field => (
                    <div key={field.id} className="flex items-center space-x-2">
                        <input
                        type="text"
                        placeholder="属性"
                        value={field.key}
                        onChange={(e) => handleFieldChange(field.id, 'key', e.target.value)}
                        draggable="false"
                        className="bg-slate-200 dark:bg-slate-700/50 text-sm p-2.5 rounded-xl w-1/3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                        />
                        <input
                        type="text"
                        placeholder="值"
                        value={field.value}
                        onChange={(e) => handleFieldChange(field.id, 'value', e.target.value)}
                        draggable="false"
                        className="bg-slate-200 dark:bg-slate-700/50 text-sm p-2.5 rounded-xl w-2/3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                        />
                        <button onClick={() => removeField(field.id)} className="text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition-colors flex-shrink-0">
                          <TrashIcon className="h-5 w-5" />
                        </button>
                    </div>
                    ))}
                    <div className="flex items-center space-x-3 pt-2">
                        <button onClick={addField} className="w-full h-11 flex items-center justify-center text-sm p-2 rounded-full bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors font-semibold">
                            <PlusIcon className="h-5 w-5 mr-1" />
                            添加项目
                        </button>
                        {node.type === NodeType.SETTING && (
                            <button 
                                onClick={onExpand}
                                disabled={isAnyTaskRunning}
                                className="w-full h-11 flex items-center justify-center text-sm p-2 rounded-full bg-purple-600 hover:bg-purple-500 text-white transition-colors disabled:bg-slate-500 disabled:cursor-not-allowed font-semibold"
                            >
                                {isExpandingThisNode ? (
                                    <ProgressDisplay progress={progress} />
                                ) : (
                                    <>
                                        <SparklesIcon className="h-5 w-5 mr-1" />
                                        AI 扩展
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    </>
  );
};

const WorkNode: React.FC<{ 
    node: Node<WorkNodeData>, 
    onUpdateData: (data: WorkNodeData) => void, 
    onAnalyze: () => void, 
    isCollapsed?: boolean,
    isAnyTaskRunning: boolean,
    isAnalyzingThisNode: boolean,
    progress: number,
}> = ({ node, onUpdateData, onAnalyze, isCollapsed, isAnyTaskRunning, isAnalyzingThisNode, progress }) => {
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const titleInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isEditingTitle) {
            titleInputRef.current?.focus();
            titleInputRef.current?.select();
        }
    }, [isEditingTitle]);
    
    const handleDataChange = (field: keyof WorkNodeData, value: string | 'reference' | 'imitation' | '套作') => {
        const newData: WorkNodeData = { ...node.data, [field]: value as any };
        if (field === 'mode') {
            if (value === 'parody') {
                newData.parodyLevel = node.data.parodyLevel || 'reference';
            } else {
                delete newData.parodyLevel;
            }
        }
        onUpdateData(newData);
    };


    return (
        <>
            <div 
                className="bg-emerald-200 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200 p-4 rounded-t-3xl flex items-center node-drag-handle" 
                style={{ cursor: 'grab' }}
                onDoubleClick={() => setIsEditingTitle(true)}
            >
                <BookOpenIcon className="h-6 w-6 mr-3 flex-shrink-0" />
                <input
                    ref={titleInputRef}
                    type="text"
                    value={node.data.title}
                    onChange={(e) => handleDataChange('title', e.target.value)}
                    onBlur={() => setIsEditingTitle(false)}
                    onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                    draggable="false"
                    className={`bg-transparent text-lg font-bold w-full focus:outline-none focus:ring-1 focus:ring-emerald-500/50 rounded-lg px-2 py-1 -ml-2 ${!isEditingTitle ? 'pointer-events-none' : ''}`}
                    placeholder="导入的作品"
                />
            </div>
            <div className={`grid transition-[grid-template-rows] duration-200 ease-in-out`} style={{ gridTemplateRows: isCollapsed ? '0fr' : '1fr' }}>
                <div className="overflow-hidden">
                    <div className="p-4 space-y-4">
                        <textarea
                            placeholder="在此处粘贴您的作品..."
                            value={node.data.content}
                            onChange={(e) => handleDataChange('content', e.target.value)}
                            draggable="false"
                            className="w-full bg-slate-200 dark:bg-slate-700/50 text-sm p-3 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-y transition-colors"
                            rows={8}
                            onWheel={(e) => e.stopPropagation()}
                        />
                        <div className="flex w-full bg-slate-200 dark:bg-slate-800/80 rounded-full p-1 space-x-1">
                            {(['rewrite', 'continue', 'parody'] as const).map(mode => (
                                <button
                                    key={mode}
                                    onClick={() => handleDataChange('mode', mode)}
                                    className={`w-full text-center text-sm px-2 py-2 rounded-full transition-all duration-300 font-semibold ${node.data.mode === mode ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-300/70 dark:hover:bg-slate-700/70'}`}
                                >
                                    {mode === 'rewrite' ? '改写' : mode === 'continue' ? '续写' : '仿写'}
                                </button>
                            ))}
                        </div>

                        {node.data.mode === 'parody' && (
                            <div className="pt-2">
                                <label className="block text-sm font-medium text-slate-500 dark:text-slate-300 mb-2">仿写程度:</label>
                                <div className="flex w-full bg-slate-200 dark:bg-slate-800/80 rounded-full p-1 space-x-1">
                                    {(['reference', 'imitation', '套作'] as const).map(level => (
                                         <button
                                            key={level}
                                            onClick={() => handleDataChange('parodyLevel', level)}
                                            className={`w-full text-center text-xs px-2 py-2 rounded-full transition-all duration-300 font-semibold ${node.data.parodyLevel === level ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-300/70 dark:hover:bg-slate-700/70'}`}
                                        >
                                            {level === 'reference' ? '参考' : level === 'imitation' ? '模仿' : '套作'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {node.data.mode === 'rewrite' && (
                            <button 
                                onClick={onAnalyze} 
                                disabled={isAnyTaskRunning || !node.data.content}
                                className="w-full h-11 flex items-center justify-center text-sm p-2 mt-1 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:bg-slate-500 disabled:cursor-not-allowed font-semibold"
                            >
                                {isAnalyzingThisNode ? <ProgressDisplay progress={progress} /> : 'AI 解析生成节点'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};


const NodeComponent: React.FC<NodeComponentProps> = ({ node, onUpdateData, onDeleteNode, onToggleNodeCollapse, onAnalyzeWork, onExpandSetting, connectableTargetType, activeProgressTask, progress = 0, isDragging = false, highlightedNodeId }) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = () => {
    setIsDeleting(true);
    setTimeout(() => {
        onDeleteNode(node.id);
    }, 200); // Animation duration
  };

  const renderNodeContent = () => {
    const isAnyTaskRunning = !!activeProgressTask;
    const headerColors = {
        CHARACTER: "bg-indigo-200 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-200",
        SETTING: "bg-purple-200 text-purple-900 dark:bg-purple-950 dark:text-purple-200",
        ENVIRONMENT: "bg-green-200 text-green-900 dark:bg-green-950 dark:text-green-200"
    };

    switch (node.type) {
      case NodeType.PLOT:
        return <PlotNode node={node as Node<PlotNodeData>} onUpdateData={(data) => onUpdateData(node.id, data)} isCollapsed={node.isCollapsed} />;
      case NodeType.CHARACTER:
        return <EditableNode node={node as Node<CharacterNodeData>} onUpdateData={(data) => onUpdateData(node.id, data)} headerColor={headerColors.CHARACTER} isCollapsed={node.isCollapsed} isAnyTaskRunning={isAnyTaskRunning} isExpandingThisNode={false} progress={0} />;
      case NodeType.SETTING:
        return <EditableNode node={node as Node<SettingNodeData>} onUpdateData={(data) => onUpdateData(node.id, data)} headerColor={headerColors.SETTING} onExpand={() => onExpandSetting?.(node.id)} isCollapsed={node.isCollapsed} isAnyTaskRunning={isAnyTaskRunning} isExpandingThisNode={activeProgressTask === `expand_${node.id}`} progress={progress} />;
      case NodeType.ENVIRONMENT:
        return <EditableNode node={node as Node<EnvironmentNodeData>} onUpdateData={(data) => onUpdateData(node.id, data)} headerColor={headerColors.ENVIRONMENT} isCollapsed={node.isCollapsed} isAnyTaskRunning={isAnyTaskRunning} isExpandingThisNode={false} progress={0} />;
      case NodeType.STYLE:
        return <StyleNode node={node as Node<StyleNodeData>} onUpdateData={(data) => onUpdateData(node.id, data)} isCollapsed={node.isCollapsed} />;
      case NodeType.STRUCTURE:
        return <StructureNode node={node as Node<StructureNodeData>} onUpdateData={(data) => onUpdateData(node.id, data)} isCollapsed={node.isCollapsed} />;
      case NodeType.WORK:
        return <WorkNode node={node as Node<WorkNodeData>} onUpdateData={(data) => onUpdateData(node.id, data)} onAnalyze={() => onAnalyzeWork?.(node.id, (node.data as WorkNodeData).content)} isCollapsed={node.isCollapsed} isAnyTaskRunning={isAnyTaskRunning} isAnalyzingThisNode={activeProgressTask === `analyze_${node.id}`} progress={progress} />;
      default:
        return <div>未知节点</div>;
    }
  };

  const renderSourceHandles = () => {
    const baseHandleClasses = "absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 border-2 border-white dark:border-slate-800 cursor-crosshair transition-transform hover:scale-125";
    const flowHandleColor = "bg-blue-500 dark:bg-blue-400";

    switch (node.type) {
        case NodeType.STYLE:
            return <div data-handle="source" className={`${baseHandleClasses} ${"bg-pink-500 dark:bg-pink-400"} rounded-md`} />;
        
        case NodeType.SETTING:
            const data = node.data as SettingNodeData;
            if (data.narrativeStructure === 'single' || node.isCollapsed) {
                return <div data-handle="source" className={`${baseHandleClasses} ${flowHandleColor} rounded-full`} />;
            }
            const handleBColor = data.narrativeStructure === 'light_dark' ? 'bg-slate-500' : `${flowHandleColor}`;
            return <>
                <div data-handle="source" data-handle-id="source_a" className={`absolute -right-3 top-1/3 -translate-y-1/2 w-6 h-6 ${flowHandleColor} rounded-full border-2 border-white dark:border-slate-800 cursor-crosshair transition-transform hover:scale-125`} title="故事线 A / 明线" />
                <div data-handle="source" data-handle-id="source_b" className={`absolute -right-3 top-2/3 -translate-y-1/2 w-6 h-6 ${handleBColor} rounded-full border-2 border-white dark:border-slate-800 cursor-crosshair transition-transform hover:scale-125`} title="故事线 B / 暗线" />
            </>;

        case NodeType.PLOT:
        case NodeType.CHARACTER:
        case NodeType.ENVIRONMENT:
             return <div data-handle="source" className={`${baseHandleClasses} ${flowHandleColor} rounded-full`} />;
        
        case NodeType.WORK:
            if ((node.data as WorkNodeData).mode === 'parody') {
                return <div data-handle="source" className={`${baseHandleClasses} ${"bg-pink-500 dark:bg-pink-400"} rounded-md`} />;
            }
            return <div data-handle="source" className={`${baseHandleClasses} ${flowHandleColor} rounded-full`} />;
        
        case NodeType.STRUCTURE:
            if ((node.data as StructureNodeData).category === StructureCategory.STARTING) {
                return <div data-handle="source" className={`${baseHandleClasses} ${flowHandleColor} rounded-full`} />;
            }
            return null; // End nodes have no source

        default: return null;
    }
  };

  const renderTargetHandles = () => {
    const isFlowConnectable = connectableTargetType === 'flow';
    const isStyleConnectable = connectableTargetType === 'style';

    const baseTargetClasses = "absolute -left-5 top-1/2 -translate-y-1/2 w-10 h-10 cursor-crosshair flex items-center justify-center group";
    const flowTargetColor = "bg-emerald-500 dark:bg-emerald-400";
    const styleTargetColor = "bg-pink-500 dark:bg-pink-400";

    switch (node.type) {
        case NodeType.PLOT:
             if (node.isCollapsed) {
                return <div data-handle="target" data-handle-id="flow" title="流程/风格" className={`${baseTargetClasses}`}>
                    <div className="w-6 h-6 bg-slate-400 rounded-lg border-2 border-white dark:border-slate-800 pointer-events-none" />
                </div>
             }
            return <>
                <div data-handle="target" data-handle-id="flow" title="流程" className="absolute -left-5 top-1/3 -translate-y-1/2 w-10 h-10 cursor-crosshair flex items-center justify-center group">
                    <div className={`w-6 h-6 ${flowTargetColor} rounded-full border-2 border-white dark:border-slate-800 pointer-events-none group-hover:scale-125 transition-transform ${isFlowConnectable ? 'scale-125 ring-2 ring-emerald-400' : ''}`} />
                </div>
                <div data-handle="target" data-handle-id="style" title="风格" className="absolute -left-5 top-2/3 -translate-y-1/2 w-10 h-10 cursor-crosshair flex items-center justify-center group">
                    <div className={`w-6 h-6 ${styleTargetColor} rounded-md border-2 border-white dark:border-slate-800 pointer-events-none group-hover:scale-125 transition-transform ${isStyleConnectable ? 'scale-125 ring-2 ring-pink-400' : ''}`} />
                </div>
            </>;
        
        case NodeType.SETTING:
             return (
                <div data-handle="target" data-handle-id="style" title="风格" className={baseTargetClasses}>
                    <div className={`w-6 h-6 ${styleTargetColor} rounded-md border-2 border-white dark:border-slate-800 pointer-events-none group-hover:scale-125 transition-transform ${isStyleConnectable ? 'scale-125 ring-2 ring-pink-400' : ''}`} />
                </div>
             );
        
        case NodeType.STRUCTURE:
        case NodeType.CHARACTER:
        case NodeType.ENVIRONMENT:
            return (
                <div data-handle="target" data-handle-id="flow" title="流程" className={baseTargetClasses}>
                    <div className={`w-6 h-6 ${flowTargetColor} rounded-full border-2 border-white dark:border-slate-800 pointer-events-none group-hover:scale-125 transition-transform ${isFlowConnectable ? 'scale-125 ring-2 ring-emerald-400' : ''}`} />
                </div>
            );

        default: return null;
    }
  };


  return (
    <div 
      className="w-80 absolute select-none pointer-events-auto"
      style={{
        transform: `translate(${node.position.x}px, ${node.position.y}px)`,
      }}
      data-node-id={node.id}
    >
      <div 
        className={`bg-white/70 dark:bg-slate-800/70 backdrop-blur-md rounded-3xl shadow-lg border border-slate-200 dark:border-slate-700/80 relative hover:shadow-2xl ${isDeleting ? 'animate-scale-out' : ''} ${!isDragging ? 'transition-transform duration-700 ease-out' : ''} ${highlightedNodeId === node.id ? 'node-highlight' : ''}`}
      >
        <div className="node-content-wrapper relative">
            <button onClick={handleDelete} className="absolute -top-2.5 -right-2.5 w-7 h-7 flex items-center justify-center bg-slate-300 dark:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-full hover:bg-red-500 hover:text-white dark:hover:bg-red-500 z-10 transition-all duration-200 hover:scale-110">
                <XIcon className="h-4 w-4"/>
            </button>
            {renderNodeContent()}
            <button onClick={() => onToggleNodeCollapse(node.id)} className="absolute -bottom-2.5 -right-2.5 w-7 h-7 flex items-center justify-center bg-slate-300 dark:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-full hover:bg-slate-400 dark:hover:bg-slate-500 z-10 transition-all duration-200 hover:scale-110">
                {node.isCollapsed ? <ChevronDownIcon className="h-4 w-4"/> : <ChevronUpIcon className="h-4 w-4" />}
            </button>
        </div>
      
        {renderSourceHandles()}
        {renderTargetHandles()}
      </div>
    </div>
  );
};

export default NodeComponent;