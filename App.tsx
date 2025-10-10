import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Node, Edge, NodeType, CharacterNodeData, SettingNodeData, PlotNodeData, StyleNodeData, StructureNodeData, WorkNodeData, KeyValueField, StructureCategory, EnvironmentNodeData, StructuredOutline } from './types';
import { generateOutline, generateStoryChapter, generateShortStory, analyzeWork, expandSetting } from './services/geminiService';
import { STORY_PLOTS, STORY_STYLES, STORY_STRUCTURES } from './constants';
import { generalExample, expansionExample, rewriteExample } from './exampleData';
import Sidebar from './components/Sidebar';
import NodeEditor from './components/NodeEditor';
import Toolbar from './components/Toolbar';
import Modal from './components/Modal';
import AlertModal from './components/AlertModal';
import ConfirmModal from './components/ConfirmModal';
import MarkdownRenderer from './components/MarkdownRenderer';
import { CopyIcon, DownloadIcon, MenuIcon, XIcon, LibraryIcon, QuestionMarkCircleIcon } from './components/icons';
import HelpModal, { ExampleName } from './components/HelpModal';

interface Asset {
    type: 'outline' | 'story';
    content: string | StructuredOutline;
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
  const [targetWordCount, setTargetWordCount] = useState<string>('');

  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [activeProgressTask, setActiveProgressTask] = useState<string | null>(null);

  const [modalContent, setModalContent] = useState<'outline' | 'story' | null>(null);
  const [outline, setOutline] = useState<StructuredOutline | null>(null);
  const [story, setStory] = useState<string>('');
  const [storyHeadings, setStoryHeadings] = useState<Heading[]>([]);

  const [assetLibrary, setAssetLibrary] = useState<Asset[]>([]);
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '' });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const storyContentRef = useRef<HTMLDivElement>(null);
  const progressIntervalRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const progressRef = useRef<number>(0);

  const showAlert = (title: string, message: string) => {
    setAlertModal({ isOpen: true, title, message });
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({ isOpen: true, title, message, onConfirm });
  };

  const closeAlert = () => setAlertModal({ ...alertModal, isOpen: false });
  const closeConfirm = () => setConfirmModal({ ...confirmModal, isOpen: false });

  const handleConfirm = () => {
    confirmModal.onConfirm();
    closeConfirm();
  };


  const updateProgress = useCallback(() => {
    const elapsed = (Date.now() - startTimeRef.current) / 1000; // in seconds
    let currentProgress = 0;
    if (elapsed < 60) {
      // Non-linear progress from 0 to 80 in the first 60 seconds (cubic ease-out)
      currentProgress = 80 * (1 - Math.pow(1 - elapsed / 60, 3));
    } else if (elapsed < 120) {
      // Non-linear progress from 80 to 95 in the next 60 seconds
      currentProgress = 80 + 15 * (1 - Math.pow(1 - (elapsed - 60) / 60, 3));
    } else {
      // Hold at 95 after 2 minutes
      currentProgress = 95;
    }
    const finalProgress = Math.min(95, Math.floor(currentProgress));
    setProgress(finalProgress);
    progressRef.current = finalProgress;
  }, []);

  const startProgressIndicator = useCallback((taskIdentifier: string) => {
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    setActiveProgressTask(taskIdentifier);
    setProgress(0);
    setProgressMessage('正在初始化...');
    progressRef.current = 0;
    startTimeRef.current = Date.now();
    progressIntervalRef.current = window.setInterval(updateProgress, 200);
  }, [updateProgress]);

  const stopProgressIndicator = useCallback((onComplete: () => void) => {
    if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
    }
    
    const startProgress = progressRef.current;
    const duration = 1000; // 1 second
    const startTime = Date.now();

    const animationInterval = window.setInterval(() => {
        const elapsed = Date.now() - startTime;
        if (elapsed >= duration) {
            clearInterval(animationInterval);
            progressIntervalRef.current = null;
            setProgress(100);
            progressRef.current = 100;
            setTimeout(() => {
                onComplete();
                setActiveProgressTask(null);
                setProgress(0); 
                setProgressMessage('');
                progressRef.current = 0;
            }, 500); // Show 100% for a moment before disappearing.
        } else {
            // Linear interpolation for smooth animation to 100%
            const newProgress = Math.round(startProgress + (100 - startProgress) * (elapsed / duration));
            setProgress(newProgress);
            progressRef.current = newProgress;
        }
    }, 16); // ~60fps
    progressIntervalRef.current = animationInterval;
  }, []);

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
            showAlert("操作受限", "目前只支持添加一个作品节点。");
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
    showConfirm(
        '确认清除',
        '您确定要清除画布上的所有节点和连接吗？此操作无法撤销。',
        () => {
            setNodes([]);
            setEdges([]);
        }
    );
  }, []);
  
  const handleExportNodes = useCallback(() => {
    if (nodes.length === 0 && edges.length === 0) {
        showAlert("导出失败", "画布上没有可导出的内容。");
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
        
        const importAction = () => {
            setNodes(data.nodes);
            setEdges(data.edges);
        };
        
        if (nodes.length > 0 || edges.length > 0) {
            showConfirm(
                '确认导入',
                '导入新节点将覆盖当前画布，确定要继续吗?',
                importAction
            );
        } else {
            importAction();
        }

      } catch (error) {
        showAlert("导入失败", error instanceof Error ? error.message : '未知错误');
      } finally {
        if (inputElement) {
          inputElement.value = '';
        }
      }
    };
    reader.onerror = () => {
      showAlert("读取失败", '读取文件时出错。');
      if (inputElement) {
        inputElement.value = '';
      }
    };
    reader.readAsText(file);
  };

  const triggerImport = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleLoadExample = useCallback((exampleName: ExampleName) => {
    const loadAction = () => {
        let exampleData: { nodes: Node[], edges: Edge[] };

        switch (exampleName) {
            case 'general':
                exampleData = generalExample;
                break;
            case 'expand':
                exampleData = expansionExample;
                break;
            case 'rewrite':
                exampleData = rewriteExample;
                break;
            default:
                return;
        }
        
        // Use JSON stringify/parse to create deep copies to prevent mutation of original example data
        setNodes(JSON.parse(JSON.stringify(exampleData.nodes)));
        setEdges(JSON.parse(JSON.stringify(exampleData.edges)));
        setIsHelpModalOpen(false);
    };

    if (nodes.length > 0 || edges.length > 0) {
        showConfirm(
            '加载示例',
            '加载示例将会覆盖当前画布上的所有内容，您确定要继续吗？',
            loadAction
        );
    } else {
        loadAction();
    }
  }, [nodes, edges]);


  const handleAnalyzeWork = async (nodeId: string, content: string) => {
    startProgressIndicator(`analyze_${nodeId}`);
    try {
        const result = await analyzeWork(content, nodes, model);
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
        
        stopProgressIndicator(() => {
            setNodes(prev => [...prev, ...createdNodes]);
            setEdges(prev => [...prev, ...createdEdges]);
        });

    } catch (error) {
        stopProgressIndicator(() => {
            console.error(error);
            showAlert("解析失败", error instanceof Error ? error.message : '发生未知错误');
        });
    }
  };

  const handleExpandSetting = async (nodeId: string) => {
    startProgressIndicator(`expand_${nodeId}`);
    try {
        const sourceNode = nodes.find(n => n.id === nodeId) as Node<SettingNodeData>;
        if (!sourceNode) {
            stopProgressIndicator(() => {});
            return;
        };
        
        const result = await expandSetting(sourceNode.data, nodes, model);
        
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
        const allPossibleNodes = [...nodes, ...createdNodes];
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

        stopProgressIndicator(() => {
            setNodes(prev => [...prev, ...createdNodes]);
            setEdges(prev => [...prev, ...createdEdges]);
        });
    } catch (error) {
        stopProgressIndicator(() => {
            console.error(error);
            showAlert("扩展失败", error instanceof Error ? error.message : '发生未知错误');
        });
    }
  };

  const handleGenerateOutline = async () => {
    startProgressIndicator('outline');
    try {
        const wordCount = targetWordCount ? parseInt(targetWordCount, 10) : undefined;
        if (wordCount && isNaN(wordCount)) {
            showAlert("输入无效", "目标字数必须是一个数字。");
            stopProgressIndicator(() => {});
            return;
        }
        const result = await generateOutline(nodes, edges, language, model, wordCount);
        stopProgressIndicator(() => {
            setOutline(result);
            setAssetLibrary(prev => [...prev, { type: 'outline', content: result, title: `大纲: ${result.title}`, timestamp: new Date() }]);
            setModalContent('outline');
        });
    } catch (err) {
        stopProgressIndicator(() => {
            showAlert("生成大纲失败", `${err instanceof Error ? err.message : '未知错误'}`);
        });
    }
  };

  const handleGenerateStory = async () => {
    if (!outline || !outline.segments || outline.segments.length === 0) {
        showAlert("无法生成", "请先生成一个有效的故事大纲。");
        return;
    }

    setModalContent(null); // Close outline modal
    
    const isShortForm = outline.segments.length > 0 && outline.segments[0].key_events && !outline.segments[0].chapters;

    if (isShortForm) {
        // --- Short Story Generation ---
        startProgressIndicator('story');
        setProgressMessage('正在创作短篇故事...');
        try {
            const finalStory = await generateShortStory(nodes, edges, outline, language, model);
            stopProgressIndicator(() => {
                setStory(finalStory);
                setAssetLibrary(prev => [...prev, { type: 'story', content: finalStory, title: `故事: ${outline.title}`, timestamp: new Date() }]);
                setModalContent('story');
            });
        } catch (err) {
            stopProgressIndicator(() => {
                showAlert("故事创作失败", `${err instanceof Error ? err.message : '未知错误'}`);
            });
        }
    } else {
        // --- Long Story (Chapter-based) Generation ---
        setActiveProgressTask('story');
        setProgress(0);
        setProgressMessage('正在准备创作...');

        let accumulatedStory = "";
        const storyParts: string[] = [];
        const totalChapters = outline.segments.reduce((acc, s) => acc + (s.chapters?.length || 0), 0);
        let chaptersDone = 0;

        try {
            for (let i = 0; i < outline.segments.length; i++) {
                const segment = outline.segments[i];
                if (!segment.chapters) continue;

                for (let j = 0; j < segment.chapters.length; j++) {
                    chaptersDone++;
                    const progressPercentage = Math.floor(((chaptersDone -1) / totalChapters) * 100);
                    setProgress(progressPercentage);
                    setProgressMessage(`正在创作第 ${chaptersDone} / ${totalChapters} 章...`);

                    const newChapterText = await generateStoryChapter(
                        nodes,
                        edges,
                        outline,
                        accumulatedStory,
                        i,
                        j,
                        language,
                        model
                    );
                    
                    storyParts.push(newChapterText);
                    accumulatedStory += (accumulatedStory ? "\n\n" : "") + newChapterText;
                }
            }

            setProgress(100);
            setProgressMessage('创作完成！');
            const finalStory = storyParts.join('\n\n');
            setStory(finalStory);
            setAssetLibrary(prev => [...prev, { type: 'story', content: finalStory, title: `故事: ${outline.title}`, timestamp: new Date() }]);
            
            setTimeout(() => {
                setModalContent('story');
                setActiveProgressTask(null);
                setProgress(0);
                setProgressMessage('');
            }, 500);

        } catch (err) {
            showAlert("故事创作失败", `在创作第 ${chaptersDone} 章时出错: ${err instanceof Error ? err.message : '未知错误'}`);
            setActiveProgressTask(null);
            setProgress(0);
            setProgressMessage('');
        }
    }
  };


  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content).then(() => {
        showAlert('复制成功', '已复制到剪贴板！');
    }, (err) => {
        console.error('无法复制文本: ', err);
        showAlert('复制失败', '无法将内容复制到剪贴板。');
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

  const isAnyTaskRunning = !!activeProgressTask;

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
            onExpandSetting={handleExpandSetting}
            activeProgressTask={activeProgressTask}
            progress={progress}
        />
        <Toolbar
          language={language}
          setLanguage={setLanguage}
          model={model}
          setModel={setModel}
          isGenerating={isAnyTaskRunning}
          onClearAllNodes={handleClearAllNodes}
          onImportNodes={triggerImport}
          onExportNodes={handleExportNodes}
          theme={theme}
          setTheme={setTheme}
        />
        
        {/* Progress Card */}
        {isAnyTaskRunning && (activeProgressTask === 'outline' || activeProgressTask === 'story') && (
            <div className="absolute bottom-24 right-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-4 rounded-lg shadow-lg z-20 w-72 border border-gray-200 dark:border-gray-700 animate-fade-in-up">
                <h4 className="font-semibold text-gray-800 dark:text-gray-200">{activeProgressTask === 'outline' ? '正在生成大纲...' : '正在创作故事...'}</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 h-4">{progressMessage || '正在构思中，请稍候...'}</p>
                <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                    <div className="bg-cyan-600 h-2.5 rounded-full" style={{ width: `${progress}%`, transition: 'width 0.3s ease-in-out' }}></div>
                </div>
                <p className="text-right text-sm font-semibold mt-1 text-gray-600 dark:text-gray-300">{progress}%</p>
            </div>
        )}

        {/* Action Toolbar */}
        <div className="absolute bottom-4 right-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-3 rounded-lg shadow-lg z-20 flex flex-wrap items-center gap-2 md:gap-4 border border-gray-200 dark:border-gray-700">
             <button
                onClick={() => setIsHelpModalOpen(true)}
                className="p-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded-lg hover:bg-cyan-500 hover:text-white dark:hover:bg-cyan-600 transition-colors flex items-center font-semibold"
                title="帮助与示例"
            >
                <QuestionMarkCircleIcon className="h-5 w-5" />
            </button>
            <button
                onClick={() => setIsAssetModalOpen(true)}
                className="p-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded-lg hover:bg-cyan-500 hover:text-white dark:hover:bg-cyan-600 transition-colors flex items-center font-semibold"
                title="资产库"
            >
                <LibraryIcon className="h-5 w-5" />
            </button>
            
            <div className="flex items-center space-x-2">
                <label htmlFor="word-count-input" className="text-sm font-medium text-gray-600 dark:text-gray-300">目标字数:</label>
                <input
                    id="word-count-input"
                    type="number"
                    value={targetWordCount}
                    onChange={(e) => setTargetWordCount(e.target.value)}
                    placeholder="约 2000"
                    className="bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block w-24 p-2 transition-colors"
                    disabled={isAnyTaskRunning}
                    step="500"
                />
            </div>

            <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>

            <button
                onClick={handleGenerateOutline}
                disabled={isAnyTaskRunning}
                className="px-4 py-2 bg-cyan-600 text-white font-semibold rounded-lg hover:bg-cyan-500 transition-colors disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center"
            >
                生成大纲
            </button>

            <button
                onClick={handleGenerateStory}
                disabled={isAnyTaskRunning || !outline}
                className="px-4 py-2 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-500 transition-colors disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center"
            >
                生成故事
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

      <HelpModal isOpen={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} onLoadExample={handleLoadExample} />

      <Modal isOpen={modalContent === 'outline' && !!outline} onClose={() => setModalContent(null)} title={`故事大纲: ${outline?.title || ''}`}>
         <div className="w-full max-h-[70vh] bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 p-4 rounded-md border border-gray-200 dark:border-gray-700 overflow-y-auto">
                <div className="space-y-6">
                    {outline?.segments.map((segment, index) => (
                        <div key={index} className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                            <h3 className="text-xl font-bold text-cyan-600 dark:text-cyan-400 mb-3 border-b border-cyan-500/30 pb-2">
                                {segment.chapters ? `第 ${index + 1} 部分: ` : ''}{segment.segment_title}
                                <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-3">(预计 {segment.estimated_word_count} 字)</span>
                            </h3>
                            <div className="space-y-4 pl-4">
                                {segment.chapters ? (
                                    segment.chapters.map(chapter => (
                                        <div key={chapter.chapter_number}>
                                            <h4 className="font-semibold text-gray-800 dark:text-gray-200">{`第 ${chapter.chapter_number} 章: ${chapter.chapter_title}`}</h4>
                                            {(chapter.point_of_view || chapter.setting) && (
                                                <p className="text-xs text-gray-500 dark:text-gray-400 italic mb-1">
                                                {chapter.point_of_view && `视角: ${chapter.point_of_view}`}
                                                {chapter.point_of_view && chapter.setting && ' | '}
                                                {chapter.setting && `场景: ${chapter.setting}`}
                                                </p>
                                            )}
                                            <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-1 text-sm">
                                                {chapter.key_events.map((event, eventIdx) => (
                                                    <li key={eventIdx}>{event}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    ))
                                ) : segment.key_events ? (
                                    <div>
                                        <h4 className="font-semibold text-gray-800 dark:text-gray-200">关键情节</h4>
                                        <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-1 text-sm">
                                            {segment.key_events.map((event, eventIdx) => (
                                                <li key={eventIdx}>{event}</li>
                                            ))}
                                        </ul>
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        <div className="mt-4 flex justify-between items-center">
             <div>
                <button
                    onClick={() => handleCopy(JSON.stringify(outline, null, 2))}
                    className="p-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-white rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors mr-2"
                    title="复制大纲 (JSON)"
                >
                    <CopyIcon className="h-5 w-5"/>
                </button>
                <button
                    onClick={() => handleDownload(JSON.stringify(outline, null, 2), `${outline?.title || 'story-outline'}`)}
                    className="p-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-white rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
                    title="下载大纲 (JSON)"
                >
                    <DownloadIcon className="h-5 w-5"/>
                </button>
            </div>
            <button 
                onClick={handleGenerateStory}
                disabled={isAnyTaskRunning || !outline}
                className="px-5 py-2 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-500 transition-colors disabled:bg-gray-400 dark:disabled:bg-gray-600"
            >
                 {activeProgressTask === 'story' ? '生成中...' : '开始创作'}
            </button>
        </div>
      </Modal>

      <Modal isOpen={modalContent === 'story'} onClose={() => setModalContent(null)} title={`故事: ${outline?.title || ''}`}>
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
                onClick={() => handleDownload(story, `故事-${outline?.title || 'story'}`)}
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
                                            setOutline(asset.content as StructuredOutline);
                                            setModalContent('outline');
                                        } else {
                                            setStory(asset.content as string);
                                            setModalContent('story');
                                        }
                                        setIsAssetModalOpen(false);
                                    }}
                                    className="px-3 py-1 bg-cyan-600 text-white text-sm font-semibold rounded-lg hover:bg-cyan-500 transition-colors"
                                >
                                    预览
                                </button>
                                <button
                                    onClick={() => {
                                        const content = typeof asset.content === 'string' ? asset.content : JSON.stringify(asset.content, null, 2);
                                        handleDownload(content, asset.title);
                                    }}
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
      
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={closeAlert}
        title={alertModal.title}
      >
        <p>{alertModal.message}</p>
      </AlertModal>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onCancel={closeConfirm}
        onConfirm={handleConfirm}
        title={confirmModal.title}
      >
        <p>{confirmModal.message}</p>
      </ConfirmModal>

    </div>
  );
};

export default App;