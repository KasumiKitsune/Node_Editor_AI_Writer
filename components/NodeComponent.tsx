import React from 'react';
import { Node, NodeType, PlotNodeData, CharacterNodeData, SettingNodeData, StyleNodeData, KeyValueField, StructureNodeData, StructureCategory, WorkNodeData, EnvironmentNodeData } from '../types';
import { PlusIcon, TrashIcon, XIcon, BookOpenIcon, SparklesIcon, ChevronUpIcon, ChevronDownIcon } from './icons';

const ProgressDisplay: React.FC<{ progress: number }> = ({ progress }) => (
    <div className="relative w-full h-full flex items-center justify-center text-xs">
        <div className="absolute top-0 left-0 h-full bg-cyan-500/50 rounded-md" style={{ width: `${progress}%` }} />
        <span className="relative z-10">{`处理中... ${progress}%`}</span>
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
}

const stopPropagationEvents = {
    onMouseDown: (e: React.MouseEvent) => e.stopPropagation(),
    onTouchStart: (e: React.TouchEvent) => e.stopPropagation(),
    onWheel: (e: React.WheelEvent) => e.stopPropagation(),
};

const PlotNode: React.FC<{ node: Node<PlotNodeData>, onUpdateData: (data: PlotNodeData) => void, isCollapsed?: boolean }> = ({ node, onUpdateData, isCollapsed }) => {
    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onUpdateData({ ...node.data, userInput: e.target.value });
    };

    return (
        <>
            <div className="bg-cyan-700 p-2 rounded-t-lg">
                <h3 className="font-bold text-white">{node.data.title}</h3>
            </div>
            {!isCollapsed && (
                <div className="p-3 space-y-2 text-sm">
                    <p className="text-gray-600 dark:text-gray-300">{node.data.description}</p>
                    <textarea
                        placeholder="添加额外需求..."
                        value={node.data.userInput || ''}
                        onChange={handleInputChange}
                        className="w-full bg-gray-200 dark:bg-gray-700 text-xs p-1 rounded focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none transition-colors"
                        rows={2}
                        {...stopPropagationEvents}
                    />
                </div>
            )}
        </>
    );
};

const StructureNode: React.FC<{ node: Node<StructureNodeData>, onUpdateData: (data: StructureNodeData) => void, isCollapsed?: boolean }> = ({ node, onUpdateData, isCollapsed }) => {
    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onUpdateData({ ...node.data, userInput: e.target.value });
    };

    return (
        <>
            <div className="bg-yellow-700 p-2 rounded-t-lg">
                <h3 className="font-bold text-white">{node.data.title}</h3>
            </div>
            {!isCollapsed && (
                <div className="p-3 space-y-2 text-sm">
                    <p className="text-gray-600 dark:text-gray-300 italic">{node.data.description}</p>
                    <textarea
                        placeholder="添加额外需求..."
                        value={node.data.userInput || ''}
                        onChange={handleInputChange}
                        className="w-full bg-gray-200 dark:bg-gray-700 text-xs p-1 rounded focus:outline-none focus:ring-2 focus:ring-yellow-500 resize-none transition-colors"
                        rows={2}
                        {...stopPropagationEvents}
                    />
                </div>
            )}
        </>
    );
};


const StyleNode: React.FC<{ node: Node<StyleNodeData>, onUpdateData: (data: StyleNodeData) => void, isCollapsed?: boolean }> = ({ node, onUpdateData, isCollapsed }) => {
    const handleMethodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        onUpdateData({ ...node.data, applicationMethod: e.target.value as 'appropriate' | 'full_section' });
    };

    return (
        <>
            <div className="bg-pink-700 p-2 rounded-t-lg">
                <h3 className="font-bold text-white">{node.data.title}</h3>
            </div>
            {!isCollapsed && (
                <div className="p-3 space-y-2 text-sm">
                    <p className="text-gray-600 dark:text-gray-300 italic text-xs">{node.data.description}</p>
                    <div className="flex items-center space-x-2 pt-1">
                        <label htmlFor={`style-method-${node.id}`} className="text-xs font-medium text-gray-500 dark:text-gray-300">应用方式:</label>
                        <select
                            id={`style-method-${node.id}`}
                            value={node.data.applicationMethod}
                            onChange={handleMethodChange}
                            className="bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-xs rounded-md focus:ring-pink-500 focus:border-pink-500 block w-full p-1 transition-colors"
                            {...stopPropagationEvents}
                        >
                            <option value="appropriate">适当插入</option>
                            <option value="full_section">整个部分</option>
                        </select>
                    </div>
                </div>
            )}
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
  
  const handleFieldChange = (fieldId: string, keyOrValue: 'key' | 'value', value: string) => {
    const newFields = node.data.fields.map(f =>
      f.id === fieldId ? { ...f, [keyOrValue]: value } : f
    );
    onUpdateData({ ...node.data, fields: newFields });
  };

  const addField = () => {
    const newField: KeyValueField = { id: `field_${Date.now()}`, key: '', value: '' };
    onUpdateData({ ...node.data, fields: [...node.data.fields, newField] });
  };

  const removeField = (fieldId: string) => {
    const newFields = node.data.fields.filter(f => f.id !== fieldId);
    onUpdateData({ ...node.data, fields: newFields });
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateData({ ...node.data, title: e.target.value });
  };

  const handleStructureChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdateData({ ...node.data, narrativeStructure: e.target.value });
  };
  
  return (
    <>
      <div className={`p-2 rounded-t-lg flex justify-between items-center ${headerColor}`}>
        <input
            type="text"
            value={node.data.title}
            onChange={handleTitleChange}
            className="bg-transparent text-white font-bold w-5/6 focus:outline-none focus:ring-1 focus:ring-white rounded px-1"
            placeholder="未命名"
            {...stopPropagationEvents}
        />
      </div>
      {!isCollapsed && (
        <div className="p-3 space-y-2">
            {node.type === NodeType.SETTING && (
                <div className="flex items-center space-x-2 pb-2">
                <label htmlFor={`structure-select-${node.id}`} className="text-xs font-medium text-gray-500 dark:text-gray-300 whitespace-nowrap">叙事脉络:</label>
                <select
                    id={`structure-select-${node.id}`}
                    value={(node.data as SettingNodeData).narrativeStructure}
                    onChange={handleStructureChange}
                    className="bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-xs rounded-md focus:ring-purple-500 focus:border-purple-500 block w-full p-1 transition-colors"
                    {...stopPropagationEvents}
                >
                    <option value="single">单线</option>
                    <option value="dual">双线</option>
                    <option value="light_dark">明暗线</option>
                </select>
                </div>
            )}
            {node.data.fields.map(field => (
            <div key={field.id} className="flex items-center space-x-1">
                <input
                type="text"
                placeholder="属性"
                value={field.key}
                onChange={(e) => handleFieldChange(field.id, 'key', e.target.value)}
                className="bg-gray-200 dark:bg-gray-700 text-sm p-1 rounded w-1/3 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-colors"
                {...stopPropagationEvents}
                />
                <span className="text-gray-400 dark:text-gray-400">:</span>
                <input
                type="text"
                placeholder="值"
                value={field.value}
                onChange={(e) => handleFieldChange(field.id, 'value', e.target.value)}
                className="bg-gray-200 dark:bg-gray-700 text-sm p-1 rounded w-2/3 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-colors"
                {...stopPropagationEvents}
                />
                <button onClick={() => removeField(field.id)} className="text-gray-400 dark:text-gray-500 hover:text-red-400">
                <TrashIcon className="h-4 w-4" />
                </button>
            </div>
            ))}
            <div className="flex items-center space-x-2 pt-1">
                <button onClick={addField} className="w-full flex items-center justify-center text-xs p-1 rounded-md bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors">
                <PlusIcon className="h-4 w-4 mr-1" />
                添加项目
                </button>
                {node.type === NodeType.SETTING && (
                    <button 
                        onClick={onExpand}
                        disabled={isAnyTaskRunning}
                        className="w-full flex items-center justify-center text-xs p-1 rounded-md bg-purple-600 hover:bg-purple-500 text-white transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
                    >
                        {isExpandingThisNode ? (
                            <ProgressDisplay progress={progress} />
                        ) : (
                            <>
                                <SparklesIcon className="h-4 w-4 mr-1" />
                                AI 扩展
                            </>
                        )}
                    </button>
                )}
            </div>
        </div>
      )}
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
    
    const handleDataChange = (field: keyof WorkNodeData, value: string) => {
        onUpdateData({ ...node.data, [field]: value });
    };

    return (
        <>
            <div className="bg-emerald-700 p-2 rounded-t-lg flex items-center text-white">
                <BookOpenIcon className="h-5 w-5 mr-2" />
                <input
                    type="text"
                    value={node.data.title}
                    onChange={(e) => handleDataChange('title', e.target.value)}
                    className="bg-transparent font-bold w-5/6 focus:outline-none focus:ring-1 focus:ring-white rounded px-1"
                    placeholder="导入的作品"
                    {...stopPropagationEvents}
                />
            </div>
            {!isCollapsed && (
                <div className="p-3 space-y-3">
                    <textarea
                        placeholder="在此处粘贴您的作品..."
                        value={node.data.content}
                        onChange={(e) => handleDataChange('content', e.target.value)}
                        className="w-full bg-gray-200 dark:bg-gray-700 text-sm p-2 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-y transition-colors"
                        rows={8}
                        {...stopPropagationEvents}
                    />
                    <div className="flex items-center justify-around text-sm">
                        <label className="flex items-center space-x-2 cursor-pointer" {...stopPropagationEvents}>
                            <input type="radio" name={`mode-${node.id}`} value="rewrite" checked={node.data.mode === 'rewrite'} onChange={(e) => handleDataChange('mode', e.target.value)} className="form-radio text-emerald-500 bg-gray-600" />
                            <span>改写</span>
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer" {...stopPropagationEvents}>
                            <input type="radio" name={`mode-${node.id}`} value="continue" checked={node.data.mode === 'continue'} onChange={(e) => handleDataChange('mode', e.target.value)} className="form-radio text-emerald-500 bg-gray-600" />
                            <span>续写</span>
                        </label>
                    </div>
                    {node.data.mode === 'rewrite' && (
                        <button 
                            onClick={onAnalyze} 
                            disabled={isAnyTaskRunning || !node.data.content}
                            className="w-full flex items-center justify-center text-sm p-2 mt-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
                        >
                            {isAnalyzingThisNode ? <ProgressDisplay progress={progress} /> : 'AI 解析生成节点'}
                        </button>
                    )}
                </div>
            )}
        </>
    );
};


const NodeComponent: React.FC<NodeComponentProps> = ({ node, onUpdateData, onDeleteNode, onToggleNodeCollapse, onAnalyzeWork, onExpandSetting, connectableTargetType, activeProgressTask, progress = 0 }) => {
  const renderNodeContent = () => {
    const isAnyTaskRunning = !!activeProgressTask;
    switch (node.type) {
      case NodeType.PLOT:
        return <PlotNode node={node as Node<PlotNodeData>} onUpdateData={(data) => onUpdateData(node.id, data)} isCollapsed={node.isCollapsed} />;
      case NodeType.CHARACTER:
        return <EditableNode node={node as Node<CharacterNodeData>} onUpdateData={(data) => onUpdateData(node.id, data)} headerColor="bg-indigo-700" isCollapsed={node.isCollapsed} isAnyTaskRunning={isAnyTaskRunning} isExpandingThisNode={false} progress={0} />;
      case NodeType.SETTING:
        return <EditableNode node={node as Node<SettingNodeData>} onUpdateData={(data) => onUpdateData(node.id, data)} headerColor="bg-purple-700" onExpand={() => onExpandSetting?.(node.id)} isCollapsed={node.isCollapsed} isAnyTaskRunning={isAnyTaskRunning} isExpandingThisNode={activeProgressTask === `expand_${node.id}`} progress={progress} />;
      case NodeType.ENVIRONMENT:
        return <EditableNode node={node as Node<EnvironmentNodeData>} onUpdateData={(data) => onUpdateData(node.id, data)} headerColor="bg-green-700" isCollapsed={node.isCollapsed} isAnyTaskRunning={isAnyTaskRunning} isExpandingThisNode={false} progress={0} />;
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
    const baseHandleClasses = "absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white dark:border-gray-800 cursor-crosshair";
    const flowHandleColor = "bg-cyan-500 dark:bg-cyan-400 hover:bg-cyan-400 dark:hover:bg-cyan-300";

    switch (node.type) {
        case NodeType.STYLE:
            return <div data-handle="source" className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-pink-500 dark:bg-pink-400 rounded-sm border-2 border-white dark:border-gray-800 cursor-crosshair hover:bg-pink-400 dark:hover:bg-pink-300" />;
        
        case NodeType.SETTING:
            const data = node.data as SettingNodeData;
            if (data.narrativeStructure === 'single' || node.isCollapsed) {
                return <div data-handle="source" className={`${baseHandleClasses} ${flowHandleColor}`} />;
            }
            const handleBColor = data.narrativeStructure === 'light_dark' ? 'bg-gray-500 hover:bg-gray-400' : `${flowHandleColor}`;
            return <>
                <div data-handle="source" data-handle-id="source_a" className={`absolute -right-2 top-1/3 -translate-y-1/2 w-4 h-4 ${flowHandleColor} rounded-full border-2 border-white dark:border-gray-800 cursor-crosshair`} title="故事线 A / 明线" />
                <div data-handle="source" data-handle-id="source_b" className={`absolute -right-2 top-2/3 -translate-y-1/2 w-4 h-4 ${handleBColor} rounded-full border-2 border-white dark:border-gray-800 cursor-crosshair`} title="故事线 B / 暗线" />
            </>;

        case NodeType.PLOT:
        case NodeType.CHARACTER:
        case NodeType.ENVIRONMENT:
        case NodeType.WORK:
             return <div data-handle="source" className={`${baseHandleClasses} ${flowHandleColor}`} />;
        
        case NodeType.STRUCTURE:
            if ((node.data as StructureNodeData).category === StructureCategory.STARTING) {
                return <div data-handle="source" className={`${baseHandleClasses} ${flowHandleColor}`} />;
            }
            return null; // End nodes have no source

        default: return null;
    }
  };

  const renderTargetHandles = () => {
    const isFlowConnectable = connectableTargetType === 'flow';
    const isStyleConnectable = connectableTargetType === 'style';

    const baseTargetClasses = "absolute -left-4 top-1/2 -translate-y-1/2 w-8 h-8 cursor-crosshair flex items-center justify-center group";
    const flowTargetColor = "bg-emerald-500 dark:bg-emerald-400 group-hover:bg-emerald-400 dark:group-hover:bg-emerald-300";
    const styleTargetColor = "bg-pink-500 dark:bg-pink-400 group-hover:bg-pink-400 dark:group-hover:bg-pink-300";

    switch (node.type) {
        case NodeType.PLOT:
             if (node.isCollapsed) {
                return <div data-handle="target" data-handle-id="flow" title="流程/风格" className={`${baseTargetClasses}`}>
                    <div className="w-4 h-4 bg-gray-400 rounded-md border-2 border-white dark:border-gray-800 pointer-events-none" />
                </div>
             }
            return <>
                <div data-handle="target" data-handle-id="flow" title="流程" className="absolute -left-4 top-1/3 -translate-y-1/2 w-8 h-8 cursor-crosshair flex items-center justify-center group">
                    {isFlowConnectable && <div className="absolute w-full h-full rounded-full border-2 border-dashed border-gray-600 dark:border-white animate-pulse pointer-events-none" />}
                    <div className={`w-4 h-4 ${flowTargetColor} rounded-full border-2 border-white dark:border-gray-800 pointer-events-none`} />
                </div>
                <div data-handle="target" data-handle-id="style" title="风格" className="absolute -left-4 top-2/3 -translate-y-1/2 w-8 h-8 cursor-crosshair flex items-center justify-center group">
                    {isStyleConnectable && <div className="absolute w-full h-full rounded-full border-2 border-dashed border-gray-600 dark:border-white animate-pulse pointer-events-none" />}
                    <div className={`w-4 h-4 ${styleTargetColor} rounded-sm border-2 border-white dark:border-gray-800 pointer-events-none`} />
                </div>
            </>;
        
        case NodeType.SETTING:
             return (
                <div data-handle="target" data-handle-id="style" title="风格" className={baseTargetClasses}>
                    {isStyleConnectable && <div className="absolute w-full h-full rounded-full border-2 border-dashed border-gray-600 dark:border-white animate-pulse pointer-events-none" />}
                    <div className={`w-4 h-4 ${styleTargetColor} rounded-sm border-2 border-white dark:border-gray-800 pointer-events-none`} />
                </div>
             );
        
        case NodeType.STRUCTURE:
        case NodeType.CHARACTER:
        case NodeType.ENVIRONMENT:
            return (
                <div data-handle="target" data-handle-id="flow" title="流程" className={baseTargetClasses}>
                    {isFlowConnectable && <div className="absolute w-full h-full rounded-full border-2 border-dashed border-gray-600 dark:border-white animate-pulse pointer-events-none" />}
                    <div className={`w-4 h-4 ${flowTargetColor} rounded-full border-2 border-white dark:border-gray-800 pointer-events-none`} />
                </div>
            );

        default: return null;
    }
  };


  return (
    <div 
      className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 w-80 absolute select-none transition-colors duration-300"
      style={{
        transform: `translate(${node.position.x}px, ${node.position.y}px)`,
      }}
      data-node-id={node.id}
    >
        <div 
          className="node-drag-handle"
          style={{ cursor: 'grab' }}
        >
          <div className="node-content-wrapper relative">
              <button onClick={() => onDeleteNode(node.id)} className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-0.5 hover:bg-red-500 z-10 transition-transform hover:scale-110">
                  <XIcon className="h-3 w-3"/>
              </button>
              {renderNodeContent()}
               <button onClick={() => onToggleNodeCollapse(node.id)} className="absolute -bottom-2 -right-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-full p-0.5 hover:bg-gray-400 dark:hover:bg-gray-500 z-10 transition-transform hover:scale-110">
                  {node.isCollapsed ? <ChevronDownIcon className="h-3 w-3"/> : <ChevronUpIcon className="h-3 w-3" />}
              </button>
          </div>
        </div>
      
        {renderSourceHandles()}
        {renderTargetHandles()}
    </div>
  );
};

export default NodeComponent;