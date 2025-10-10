import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Node, Edge, NodeType, CharacterNodeData, SettingNodeData, PlotNodeData, StyleNodeData, StructureNodeData, WorkNodeData, KeyValueField, StructureCategory, EnvironmentNodeData } from './types';
import { generateOutline, generateStory, analyzeWork, expandSetting } from './services/geminiService';
import { STORY_PLOTS, STORY_STYLES, STORY_STRUCTURES } from './constants';
import Sidebar from './components/Sidebar';
import NodeEditor from './components/NodeEditor';
import Toolbar from './components/Toolbar';
import Modal from './components/Modal';
import MarkdownRenderer from './components/MarkdownRenderer';
import { CopyIcon, DownloadIcon, MenuIcon, XIcon, LibraryIcon } from './components/icons';

interface Asset {
    type: 'outline' | 'story';
    content: string;
    title: string;
    timestamp: Date;
}

interface Heading {
  id: string;
  text: string;
  level: number;
}


const App: React.FC = () => {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [language, setLanguage] = useState<string>('中文');
  const [model, setModel] = useState<string>('gemini-2.5-flash');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('theme') as 'light' | 'dark') || 'dark');

  const [generatingTask, setGeneratingTask] = useState<'outline' | 'story' | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isExpandingSetting, setIsExpandingSetting] = useState<{ [nodeId: string]: boolean }>({});
  const [modalContent, setModalContent] = useState<'outline' | 'story' | null>(null);
  const [outline, setOutline] = useState<string>('');
  const [story, setStory] = useState<string>('');
  const [isEditingOutline, setIsEditingOutline] = useState(true);
  const [storyHeadings, setStoryHeadings] = useState<Heading[]>([]);

  const [assetLibrary, setAssetLibrary] = useState<Asset[]>([]);
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const storyContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);


  const addNode = useCallback((type: NodeType, data?: any) => {
    const newNode: Node = {
      id: `${type}_${Date.now()}`,
      type,
      position: { x: Math.random() * 400 + 50, y: Math.random() * 300 + 50 },
      data: {} as any,
      isCollapsed: false,
    };

    switch (type) {
      case NodeType.PLOT:
        if(data?.isCustom) {
            newNode.data = { plotId: -1, title: data.title, description: '自定义情节', userInput: '' } as PlotNodeData;
        } else {
            newNode.data = { ...data, userInput: '' } as PlotNodeData;
        }
        break;
      case NodeType.CHARACTER:
        newNode.data = { title: '新人物', fields: [{id: 'f1', key: '姓名', value:''}, {id:'f2', key:'性格', value:''}] } as CharacterNodeData;
        break;
      case NodeType.SETTING:
        newNode.data = { title: '新作品设定', fields: [{id: 'f1', key:'体裁', value:''}, {id:'f2', key:'核心概念', value:''}], narrativeStructure: 'single' } as SettingNodeData;
        break;
      case NodeType.ENVIRONMENT:
        newNode.data = {
            title: data?.title || '新环境',
            fields: data?.fields || [{ id: 'f1', key: '位置', value: '' }, { id: 'f2', key: '特点', value: '' }]
        } as EnvironmentNodeData;
        break;
      case NodeType.STYLE:
        if(data?.isCustom) {
            newNode.data = { styleId: -1, title: data.title, description: '自定义风格', applicationMethod: 'appropriate' } as StyleNodeData;
        } else {
            newNode.data = { ...data, applicationMethod: 'appropriate' } as StyleNodeData;
        }
        break;
      case NodeType.STRUCTURE:
        newNode.data = { ...data, userInput: '' } as StructureNodeData;
        break;
      case NodeType.WORK:
        // Only allow one work node at a time
        if (nodes.some(n => n.type === NodeType.WORK)) {
            alert("目前只支持添加一个作品节点。");
            return;
        }
        newNode.data = { title: '导入作品', content: '', mode: 'rewrite' } as WorkNodeData;
        break;
    }

    setNodes(nds => [...nds, newNode]);
  }, [nodes]);

  const updateNodeData = useCallback((nodeId: string, data: any) => {
    setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data } : n));
  }, []);

  const deleteNode = useCallback((nodeId: string) => {
    setNodes(nds => nds.filter(n => n.id !== nodeId));
    setEdges(eds => eds.filter(e => e.source !== nodeId && e.target !== nodeId));
  }, []);
  
  const handleToggleNodeCollapse = useCallback((nodeId: string) => {
    setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, isCollapsed: !n.isCollapsed } : n));
  }, []);

  const handleClearAllNodes = useCallback(() => {
    if (window.confirm('您确定要清除画布上的所有节点和连接吗？此操作无法撤销。')) {
        setNodes([]);
        setEdges([]);
    }
  }, []);
  
  const handleExportNodes = useCallback(() => {
    if (nodes.length === 0 && edges.length === 0) {
        alert("画布上没有可导出的内容。");
        return;
    }
    const dataToExport = { nodes, edges };
    const jsonString = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'story-nodes.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [nodes, edges]);

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const inputElement = event.target;
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') throw new Error("无法读取文件。");
        const data = JSON.parse(text);

        if (!Array.isArray(data.nodes) || !Array.isArray(data.edges)) {
          throw new Error("文件格式无效。");
        }
        
        if (nodes.length > 0 || edges.length > 0) {
            if (!window.confirm('导入新节点将覆盖当前画布，确定要继续吗?')) {
                return; 
            }
        }

        setNodes(data.nodes);
        setEdges(data.edges);
      } catch (error) {
        alert(`导入失败: ${error instanceof Error ? error.message : '未知错误'}`);
      } finally {
        if (inputElement) {
          inputElement.value = '';
        }
      }
    };
    reader.onerror = () => {
      alert('读取文件时出错。');
      if (inputElement) {
        inputElement.value = '';
      }
    };
    reader.readAsText(file);
  };

  const triggerImport = useCallback(() => {
    fileInputRef.current?.click();
  }, []);


  const handleAnalyzeWork = async (nodeId: string, content: string) => {
    setIsAnalyzing(true);
    try {
        const result = await analyzeWork(content, model);
        const sourceNode = nodes.find(n => n.id === nodeId);
        if (!sourceNode) return;

        const createdNodes: Node[] = [];
        const createdEdges: Edge[] = [];

        // Create Character Nodes
        const characterNodes: Node<CharacterNodeData>[] = (result.characters || []).map((char: any, index: number) => {
            const charFields: KeyValueField[] = (char.fields || []).map((f: any, i: number) => ({ id: `cf_${index}_${i}`, key: f.key, value: f.value }));
            return {
                id: `CHAR_analyzed_${Date.now()}_${index}`,
                type: NodeType.CHARACTER,
                position: { x: sourceNode.position.x - 400, y: sourceNode.position.y + index * 180 },
                data: { title: char.title, fields: charFields },
                isCollapsed: false,
            };
        });
        createdNodes.push(...characterNodes);

        // Create Setting Nodes
        const settingNodes: Node<SettingNodeData>[] = (result.settings || []).map((setting: any, index: number) => {
             const settingFields: KeyValueField[] = (setting.fields || []).map((f: any, i: number) => ({ id: `sf_${index}_${i}`, key: f.key, value: f.value }));
            return {
                id: `SETTING_analyzed_${Date.now()}_${index}`,
                type: NodeType.SETTING,
                position: { x: sourceNode.position.x, y: sourceNode.position.y - 250 - (index * 200) },
                data: { title: setting.title, fields: settingFields, narrativeStructure: 'single' },
                isCollapsed: false,
            };
        });
        createdNodes.push(...settingNodes);
        
        // Create Environment Nodes
        const environmentNodes: Node<EnvironmentNodeData>[] = (result.environments || []).map((env: any, index: number) => {
             const envFields: KeyValueField[] = (env.fields || []).map((f: any, i: number) => ({ id: `ef_${index}_${i}`, key: f.key, value: f.value }));
            return {
                id: `ENV_analyzed_${Date.now()}_${index}`,
                type: NodeType.ENVIRONMENT,
                position: { x: sourceNode.position.x - 200, y: sourceNode.position.y - 450 - (index * 200) },
                data: { title: env.title, fields: envFields },
                isCollapsed: false,
            };
        });
        createdNodes.push(...environmentNodes);
        
        // Create Style Nodes
        const styleNodes = (result.styles || []).map((style: any, index: number) => {
            const libraryStyle = style.id ? STORY_STYLES.find(s => s.id === style.id) : null;
            const styleNode: Node<StyleNodeData> = {
                id: `STYLE_analyzed_${Date.now()}_${index}`,
                type: NodeType.STYLE,
                position: { x: sourceNode.position.x - 400, y: sourceNode.position.y - 250 - (index * 150) },
                data: {
                    styleId: style.id ?? -1,
                    title: libraryStyle?.name || style.title,
                    description: libraryStyle?.description || style.description || '自定义风格',
                    applicationMethod: 'appropriate'
                },
                isCollapsed: false,
            };
            return styleNode;
        });
        createdNodes.push(...styleNodes);
        
        // Connect style nodes to the first setting node
        if (settingNodes.length > 0) {
            const mainSettingNodeId = settingNodes[0].id;
            styleNodes.forEach(styleNode => {
                createdEdges.push({
                    id: `edge_style_${styleNode.id}_${mainSettingNodeId}`,
                    source: styleNode.id,
                    target: mainSettingNodeId,
                    targetHandle: 'style'
                });
            });
        }

        // Create Structure Nodes
        const structureNodes: Node<StructureNodeData>[] = [];
        if (result.structures?.start) {
            const start = result.structures.start;
            const libraryStart = start.id ? STORY_STRUCTURES.find(s => s.id === start.id) : null;
            const startNode: Node<StructureNodeData> = {
                id: `STRUCTURE_start_${Date.now()}`,
                type: NodeType.STRUCTURE,
                position: {x: sourceNode.position.x + 400, y: sourceNode.position.y - 180 },
                data: {
                    structureId: start.id ?? -1,
                    title: libraryStart?.name || start.title,
                    description: libraryStart?.description || start.description || '',
                    category: StructureCategory.STARTING,
                    userInput: start.userInput || ''
                },
                isCollapsed: false,
            };
            createdNodes.push(startNode);
            structureNodes.push(startNode);
        }
         if (result.structures?.end) {
            const end = result.structures.end;
            const libraryEnd = end.id ? STORY_STRUCTURES.find(s => s.id === end.id) : null;
            const endNode: Node<StructureNodeData> = {
                id: `STRUCTURE_end_${Date.now()}`,
                type: NodeType.STRUCTURE,
                position: {x: sourceNode.position.x + 400, y: sourceNode.position.y + 350 + (result.plots.length * 180) },
                data: {
                    structureId: end.id ?? -1,
                    title: libraryEnd?.name || end.title,
                    description: libraryEnd?.description || end.description || '',
                    category: StructureCategory.ENDING,
                    userInput: end.userInput || ''
                },
                isCollapsed: false,
            };
            createdNodes.push(endNode);
            structureNodes.push(endNode);
        }


        // Create Plot Nodes
        let yOffset = sourceNode.position.y;
        const plotNodes: Node<PlotNodeData>[] = (result.plots || []).map((plot: any, index: number) => {
            const libraryPlot = plot.id ? STORY_PLOTS.find(p => p.id === plot.id) : null;
            const plotNode: Node<PlotNodeData> = {
                id: `PLOT_analyzed_${Date.now()}_${index}`,
                type: NodeType.PLOT,
                position: { x: sourceNode.position.x + 400, y: yOffset },
                data: { 
                    plotId: plot.id ?? -1,
                    title: libraryPlot?.name || plot.title,
                    description: libraryPlot?.description || plot.description || '自定义情节',
                    userInput: plot.userInput || '' 
                },
                isCollapsed: false,
            };
            yOffset += 180;
            return plotNode;
        });
        createdNodes.push(...plotNodes);
        
        // --- Start of Edge Creation Logic ---

        // 1. Create the main plot flow: Work -> Start -> Plot(s) -> End
        let lastNodeInFlow: string = nodeId; // The chain starts from the source Work Node.

        const startNode = structureNodes.find(n => n.data.category === StructureCategory.STARTING);
        if (startNode) {
            createdEdges.push({
                id: `edge_analyzed_work_to_start_${Date.now()}`,
                source: lastNodeInFlow,
                target: startNode.id,
            });
            lastNodeInFlow = startNode.id; // The chain now continues from the start node.
        }

        plotNodes.forEach(plotNode => {
            createdEdges.push({
                id: `edge_analyzed_flow_${lastNodeInFlow}_${plotNode.id}`,
                source: lastNodeInFlow,
                target: plotNode.id,
            });
            lastNodeInFlow = plotNode.id;
        });

        const endNode = structureNodes.find(n => n.data.category === StructureCategory.ENDING);
        if (endNode) {
            createdEdges.push({
                id: `edge_analyzed_flow_${lastNodeInFlow}_${endNode.id}`,
                source: lastNodeInFlow,
                target: endNode.id,
            });
        }

        // 2. Connect side nodes (Character, Setting, Environment) to the main flow.
        // They will connect to the first plot node, or the start node if no plots exist.
        const connectTargetId = plotNodes.length > 0 ? plotNodes[0].id : startNode?.id;
        if (connectTargetId) {
            const nodesToConnect = [...characterNodes, ...settingNodes, ...environmentNodes];
            nodesToConnect.forEach(nodeToConnect => {
                createdEdges.push({
                    id: `edge_analyzed_side_${nodeToConnect.id}_${connectTargetId}_${Date.now()}`,
                    source: nodeToConnect.id,
                    target: connectTargetId,
                    targetHandle: 'flow'
                });
            });
        }
        
        setNodes(prev => [...prev, ...createdNodes]);
        setEdges(prev => [...prev, ...createdEdges]);

    } catch (error) {
        console.error(error);
        alert(error instanceof Error ? error.message : '发生未知错误');
    } finally {
        setIsAnalyzing(false);
    }
  };

  const handleExpandSetting = async (nodeId: string) => {
    setIsExpandingSetting(prev => ({ ...prev, [nodeId]: true }));
    try {
        const sourceNode = nodes.find(n => n.id === nodeId) as Node<SettingNodeData>;
        if (!sourceNode) return;
        
        const result = await expandSetting(sourceNode.data, model);
        
        const createdNodes: Node[] = [];
        const createdEdges: Edge[] = [];

        // Create Character Nodes
        (result.characters || []).forEach((char: any, index: number) => {
            const charFields: KeyValueField[] = (char.fields || []).map((f: any, i: number) => ({ id: `cf_exp_${index}_${i}`, key: f.key, value: f.value }));
            createdNodes.push({
                id: `CHAR_expanded_${Date.now()}_${index}`, type: NodeType.CHARACTER,
                position: { x: sourceNode.position.x - 400, y: sourceNode.position.y + index * 180 },
                data: { title: char.title, fields: charFields },
                isCollapsed: false,
            });
        });

        // Create Environment Nodes
        (result.environments || []).forEach((env: any, index: number) => {
             const envFields: KeyValueField[] = (env.fields || []).map((f: any, i: number) => ({ id: `ef_exp_${index}_${i}`, key: f.key, value: f.value }));
            createdNodes.push({
                id: `ENV_expanded_${Date.now()}_${index}`, type: NodeType.ENVIRONMENT,
                position: { x: sourceNode.position.x, y: sourceNode.position.y + 250 + (index * 200) },
                data: { title: env.title, fields: envFields },
                isCollapsed: false,
            });
        });

        // Create Plot Nodes
        (result.plots || []).forEach((plot: { id: number }, index: number) => {
             const libraryPlot = STORY_PLOTS.find(p => p.id === plot.id);
             if (libraryPlot) {
                createdNodes.push({
                    id: `PLOT_expanded_${Date.now()}_${index}`, type: NodeType.PLOT,
                    position: { x: sourceNode.position.x + 400, y: sourceNode.position.y + index * 180 },
                    data: { 
                        plotId: libraryPlot.id,
                        title: libraryPlot.name,
                        description: libraryPlot.description,
                        userInput: '' 
                    },
                    isCollapsed: false,
                });
             }
        });

        // Create Style Nodes
        (result.styles || []).forEach((style: { id: number }, index: number) => {
            const libraryStyle = STORY_STYLES.find(s => s.id === style.id);
            if (libraryStyle) {
                const styleNode: Node<StyleNodeData> = {
                    id: `STYLE_expanded_${Date.now()}_${index}`,
                    type: NodeType.STYLE,
                    position: { x: sourceNode.position.x - 400, y: sourceNode.position.y - 250 - index * 150 },
                    data: {
                        styleId: libraryStyle.id,
                        title: libraryStyle.name,
                        description: libraryStyle.description,
                        applicationMethod: 'appropriate'
                    },
                    isCollapsed: false,
                };
                createdNodes.push(styleNode);
                createdEdges.push({
                    id: `edge_expanded_style_${styleNode.id}_${sourceNode.id}`,
                    source: styleNode.id,
                    target: sourceNode.id,
                    targetHandle: 'style'
                });
            }
        });

        // Create Structure Nodes
        if (result.structures?.start?.id) {
            const libraryStart = STORY_STRUCTURES.find(s => s.id === result.structures.start.id);
            if (libraryStart) {
                createdNodes.push({
                    id: `STRUCTURE_start_expanded_${Date.now()}`,
                    type: NodeType.STRUCTURE,
                    position: { x: sourceNode.position.x + 400, y: sourceNode.position.y - 180 },
                    data: {
                        structureId: libraryStart.id,
                        title: libraryStart.name,
                        description: libraryStart.description,
                        category: StructureCategory.STARTING,
                        userInput: ''
                    },
                    isCollapsed: false,
                });
            }
        }
        if (result.structures?.end?.id) {
            const libraryEnd = STORY_STRUCTURES.find(s => s.id === result.structures.end.id);
            if (libraryEnd) {
                createdNodes.push({
                    id: `STRUCTURE_end_expanded_${Date.now()}`,
                    type: NodeType.STRUCTURE,
                    position: { x: sourceNode.position.x + 400, y: sourceNode.position.y + 350 + ((result.plots?.length || 0) * 180) },
                    data: {
                        structureId: libraryEnd.id,
                        title: libraryEnd.name,
                        description: libraryEnd.description,
                        category: StructureCategory.ENDING,
                        userInput: ''
                    },
                    isCollapsed: false,
                });
            }
        }

        // Create Connections
        const allPossibleNodes = [sourceNode, ...createdNodes];
        (result.connections || []).forEach((conn: {sourceTitle: string, targetTitle: string}) => {
            const source = allPossibleNodes.find(n => (n.data as any).title === conn.sourceTitle);
            const target = allPossibleNodes.find(n => (n.data as any).title === conn.targetTitle);
            if (source && target && target.type !== NodeType.STYLE) {
                 createdEdges.push({
                    id: `edge_expanded_${source.id}_${target.id}_${Date.now()}`,
                    source: source.id,
                    target: target.id,
                });
            }
        });

        setNodes(prev => [...prev, ...createdNodes]);
        setEdges(prev => [...prev, ...createdEdges]);

    } catch (error) {
        console.error(error);
        alert(error instanceof Error ? error.message : '发生未知错误');
    } finally {
        setIsExpandingSetting(prev => ({ ...prev, [nodeId]: false }));
    }
  };

  const handleGenerateOutline = async () => {
    setGeneratingTask('outline');
    try {
        const result = await generateOutline(nodes, edges, language, model);
        setOutline(result);
        setAssetLibrary(prev => [...prev, { type: 'outline', content: result, title: `大纲 - ${new Date().toLocaleString()}`, timestamp: new Date() }]);
        setModalContent('outline');
        setIsEditingOutline(false); // Default to preview mode after generating
    } finally {
        setGeneratingTask(null);
    }
  };

  const handleGenerateStory = async () => {
    setGeneratingTask('story');
    setModalContent(null); // Close outline modal before generating story
    try {
        const result = await generateStory(nodes, edges, outline, language, model);
        setStory(result);
        setAssetLibrary(prev => [...prev, { type: 'story', content: result, title: `故事 - ${new Date().toLocaleString()}`, timestamp: new Date() }]);
        setModalContent('story');
    } finally {
        setGeneratingTask(null);
    }
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content).then(() => {
        alert('已复制到剪贴板！');
    }, (err) => {
        console.error('无法复制文本: ', err);
        alert('复制失败！');
    });
  };

  const handleDownload = (content: string, filename: string) => {
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename.replace(/[:/]/g, '-')}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
  };
  
  const handleTocClick = (id: string) => {
    storyContentRef.current?.querySelector(`#${id}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
    });
  };

  return (
    <div className="w-screen h-screen font-sans flex overflow-hidden">
      <Sidebar onAddNode={addNode} isOpen={isSidebarOpen} />
      <main className="relative flex-1 h-full">
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="md:hidden fixed top-4 left-4 z-40 p-2 bg-gray-100/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-md text-gray-800 dark:text-white"
        >
          {isSidebarOpen ? <XIcon /> : <MenuIcon />}
        </button>
        {isSidebarOpen && <div onClick={() => setIsSidebarOpen(false)} className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-20"></div>}

        <NodeEditor 
            nodes={nodes}
            edges={edges}
            onNodesChange={setNodes}
            onEdgesChange={setEdges}
            onUpdateNodeData={updateNodeData}
            onDeleteNode={deleteNode}
            onToggleNodeCollapse={handleToggleNodeCollapse}
            onAnalyzeWork={handleAnalyzeWork}
            isAnalyzing={isAnalyzing}
            onExpandSetting={handleExpandSetting}
            isExpandingSetting={isExpandingSetting}
        />
        <Toolbar
          language={language}
          setLanguage={setLanguage}
          model={model}
          setModel={setModel}
          generatingTask={generatingTask}
          onClearAllNodes={handleClearAllNodes}
          onImportNodes={triggerImport}
          onExportNodes={handleExportNodes}
          theme={theme}
          setTheme={setTheme}
        />
        
        {/* Action Toolbar */}
        <div className="absolute bottom-4 right-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-3 rounded-lg shadow-lg z-20 flex items-center gap-4 border border-gray-200 dark:border-gray-700">
            <button
                onClick={() => setIsAssetModalOpen(true)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded-lg hover:bg-cyan-500 hover:text-white dark:hover:bg-cyan-600 transition-colors flex items-center font-semibold"
                title="资产库"
            >
                <LibraryIcon className="h-5 w-5 mr-2" />
                资产库
            </button>
            <button
                onClick={handleGenerateOutline}
                disabled={!!generatingTask}
                className="px-4 py-2 bg-cyan-600 text-white font-semibold rounded-lg hover:bg-cyan-500 transition-colors disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center"
            >
                {generatingTask === 'outline' ? (
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                ) : '生成大纲'}
            </button>

            <button
                onClick={handleGenerateStory}
                disabled={!!generatingTask || !outline}
                className="px-4 py-2 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-500 transition-colors disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center"
            >
                {generatingTask === 'story' ? (
                 <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                ) : '生成故事'}
            </button>
        </div>

        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileImport} 
          style={{ display: 'none' }} 
          accept=".json" 
        />
      </main>

      <Modal isOpen={modalContent === 'outline'} onClose={() => setModalContent(null)} title="生成的故事大纲">
        {isEditingOutline ? (
            <textarea
                className="w-full h-96 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 p-4 rounded-md border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono"
                value={outline}
                onChange={(e) => setOutline(e.target.value)}
            />
        ) : (
            <div className="w-full h-96 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 p-4 rounded-md border border-gray-200 dark:border-gray-700 overflow-y-auto">
                <MarkdownRenderer content={outline} />
            </div>
        )}
        <div className="mt-4 flex justify-between items-center">
             <div>
                <button
                    onClick={() => setIsEditingOutline(prev => !prev)}
                    className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-white font-semibold rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors mr-2"
                >
                    {isEditingOutline ? '预览' : '编辑'}
                </button>
                <button
                    onClick={() => handleCopy(outline)}
                    className="p-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-white rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors mr-2"
                    title="复制"
                >
                    <CopyIcon className="h-5 w-5"/>
                </button>
                <button
                    onClick={() => handleDownload(outline, 'story-outline')}
                    className="p-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-white rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
                    title="下载"
                >
                    <DownloadIcon className="h-5 w-5"/>
                </button>
            </div>
            <button 
                onClick={handleGenerateStory}
                disabled={!!generatingTask || !outline}
                className="px-5 py-2 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-500 transition-colors disabled:bg-gray-400 dark:disabled:bg-gray-600"
            >
                 {generatingTask === 'story' ? '生成中...' : '开始创作'}
            </button>
        </div>
      </Modal>

      <Modal isOpen={modalContent === 'story'} onClose={() => setModalContent(null)} title="生成的故事">
        <div className="flex w-full max-h-[70vh]">
            {storyHeadings.length > 0 && (
                <nav className="w-64 flex-shrink-0 pr-4 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
                    <p className="text-lg font-semibold mb-2 text-cyan-600 dark:text-cyan-400">目录</p>
                    <ul className="space-y-1">
                        {storyHeadings.map(h => (
                            <li key={h.id} style={{ paddingLeft: `${(h.level - 1) * 1}rem`}}>
                                <button 
                                    onClick={() => handleTocClick(h.id)}
                                    className="text-left text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors text-sm w-full truncate"
                                    title={h.text}
                                >
                                    {h.text}
                                </button>
                            </li>
                        ))}
                    </ul>
                </nav>
            )}
            <div 
                ref={storyContentRef} 
                className={`bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 rounded-md overflow-y-auto ${storyHeadings.length > 0 ? 'pl-4 flex-grow' : 'w-full'}`}
                style={{ scrollBehavior: 'smooth' }}
            >
                <MarkdownRenderer content={story} onHeadingsParse={setStoryHeadings} />
            </div>
        </div>
        <div className="mt-4 flex justify-end items-center space-x-2">
            <button
                onClick={() => handleCopy(story)}
                className="p-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-white rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
                title="复制"
            >
                <CopyIcon className="h-5 w-5"/>
            </button>
            <button
                onClick={() => handleDownload(story, 'story')}
                className="p-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-white rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
                title="下载"
            >
                <DownloadIcon className="h-5 w-5"/>
            </button>
        </div>
      </Modal>
      
      <Modal isOpen={isAssetModalOpen} onClose={() => setIsAssetModalOpen(false)} title="资产库">
        <div className="w-full max-h-[70vh] bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 rounded-md overflow-y-auto">
            {assetLibrary.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">资产库为空。请先生成大纲或故事。</p>
            ) : (
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                    {assetLibrary.slice().reverse().map((asset) => (
                        <li key={asset.timestamp.toISOString()} className="p-4 flex justify-between items-center hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
                            <div>
                                <p className="font-semibold">{asset.title}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{asset.type === 'outline' ? '大纲' : '故事'}</p>
                            </div>
                            <div className="flex items-center space-x-2">
                                <button
                                    onClick={() => {
                                        if (asset.type === 'outline') {
                                            setOutline(asset.content);
                                            setModalContent('outline');
                                        } else {
                                            setStory(asset.content);
                                            setModalContent('story');
                                        }
                                        setIsAssetModalOpen(false);
                                    }}
                                    className="px-3 py-1 bg-cyan-600 text-white text-sm font-semibold rounded-lg hover:bg-cyan-500 transition-colors"
                                >
                                    预览
                                </button>
                                <button
                                    onClick={() => handleDownload(asset.content, asset.title)}
                                    className="p-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-white rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
                                    title="下载"
                                >
                                    <DownloadIcon className="h-5 w-5"/>
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
      </Modal>

    </div>
  );
};

export default App;