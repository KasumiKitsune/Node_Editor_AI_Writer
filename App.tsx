import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Node, Edge, NodeType, CharacterNodeData, SettingNodeData, PlotNodeData, StyleNodeData, StructureNodeData, WorkNodeData, KeyValueField, StructureCategory, EnvironmentNodeData, StructuredOutline } from './types';
import { generateOutline, generateStoryChapter, generateShortStory, analyzeWork, expandSetting, reviseOutline, reviseStory, modifyGraphWithAssistant } from './services/geminiService';
import { calculateLayout, LayoutMode } from './services/layout';
import { STORY_PLOTS, STORY_STYLES, STORY_STRUCTURES } from './constants';
import { generalExample, expansionExample, rewriteExample } from './exampleData';
import Sidebar from './components/Sidebar';
import NodeEditor from './components/NodeEditor';
import Toolbar from './components/Toolbar';
import AlertModal from './components/AlertModal';
import ConfirmModal from './components/ConfirmModal';
import HelpModal, { ExampleName } from './components/HelpModal';
import GenerationControls from './components/GenerationControls';
import ResultModals from './components/ResultModals';
import AIAssistant from './components/AIAssistant';
import { useProgress } from './hooks/useProgress';
// FIX: Added Modal and DownloadIcon to imports to resolve reference errors.
import Modal from './components/Modal';
import { MenuIcon, XIcon, DownloadIcon, PencilIcon, CheckIcon, DocumentAddIcon, TrashIcon, EyeIcon, ArchiveIcon, ChevronDownIcon } from './components/icons';

// Declare global variables from CDN scripts
declare var JSZip: any;
declare var docx: any;

// Error Boundary Component to prevent white screens
// FIX: Refactored to use an explicit constructor to ensure `this.props` and `this.state` are correctly initialized, resolving a potential "property does not exist" error in some environments.
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  // FIX: Added constructor to initialize state and props.
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-screen h-screen flex flex-col items-center justify-center bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 p-8">
          <h1 className="text-4xl font-bold mb-4">应用出错了</h1>
          <p className="text-lg mb-6 text-center">很抱歉，程序遇到了一个无法恢复的错误。<br />请尝试刷新页面。如果问题仍然存在，您可以尝试清除画布或导入一个有效的文件。</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-red-600 text-white font-semibold rounded-full hover:bg-red-500 transition-colors"
          >
            刷新页面
          </button>
           <pre className="mt-4 p-4 bg-red-100 dark:bg-red-900/50 rounded-lg text-xs max-w-full overflow-auto">
            {this.state.error?.toString()}
          </pre>
        </div>
      );
    }

    return this.props.children;
  }
}

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

interface DownloadDropdownProps {
  asset: Asset;
  onSelectFormat: (asset: Asset, format: 'txt' | 'json' | 'md' | 'docx') => void;
  isMobile?: boolean;
}

const DownloadDropdown: React.FC<DownloadDropdownProps> = ({ asset, onSelectFormat, isMobile = false }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            // FIX: The type cast `event.target as Node` was incorrect due to a name collision with a custom type.
            // Changed to `HTMLElement` which is a valid DOM Node and correct for a mouse event target.
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as HTMLElement)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const options = asset.type === 'outline'
        ? [{ label: '纯文本 (.txt)', format: 'txt' }, { label: '源数据 (.json)', format: 'json' }]
        : [{ label: '纯文本 (.txt)', format: 'txt' }, { label: 'Markdown (.md)', format: 'md' }, { label: 'Word (.docx)', format: 'docx' }];

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`h-11 flex items-center justify-center bg-teal-200 text-teal-800 dark:bg-teal-900/80 dark:text-teal-200 rounded-full hover:bg-teal-300 dark:hover:bg-teal-800 transition-colors ${isMobile ? 'px-4' : 'w-11'}`}
                title="下载"
            >
                <DownloadIcon className="h-6 w-6" />
                {isMobile && <span className="ml-2 font-medium text-sm">下载</span>}
            </button>
            {isOpen && (
                <div className="absolute z-10 top-full right-0 mt-2 w-48 bg-slate-50 dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 animate-scale-in" style={{ animationDuration: '150ms' }}>
                    <ul className="p-2 space-y-1">
                        {options.map(option => (
                            <li
                                key={option.format}
                                onClick={() => { onSelectFormat(asset, option.format as any); setIsOpen(false); }}
                                className="px-3 py-2 text-sm rounded-xl cursor-pointer text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                            >
                                {option.label}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};


const App: React.FC = () => {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [model, setModel] = useState<string>('gemini-2.5-flash');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('theme') as 'light' | 'dark') || 'light');
  const [targetWordCount, setTargetWordCount] = useState<string>('');
  const [transform, setTransform] = useState({ x: 100, y: 100, scale: 1 });
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(null);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('hierarchical');

  const { progress, progressMessage, activeProgressTask, isAnyTaskRunning, setProgressMessage, startProgress, stopProgress, startSteppedProgress, completeStepAndAdvance, cancelProgress } = useProgress();

  const [modalContent, setModalContent] = useState<'outline' | 'story' | null>(null);
  
  const [outlineHistory, setOutlineHistory] = useState<StructuredOutline[]>([]);
  const [currentOutlineIndex, setCurrentOutlineIndex] = useState(0);
  const [storyHistory, setStoryHistory] = useState<string[]>([]);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);

  const [storyHeadings, setStoryHeadings] = useState<Heading[]>([]);
  const [revisionPrompt, setRevisionPrompt] = useState('');

  const [assetLibrary, setAssetLibrary] = useState<Asset[]>([]);
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [renamingState, setRenamingState] = useState<{ id: string | null; name: string }>({ id: null, name: '' });
  
  const [isAssistantProcessing, setIsAssistantProcessing] = useState(false);
  const [assistantMessage, setAssistantMessage] = useState<string | null>(null);
  const [isAssistantPanelOpen, setIsAssistantPanelOpen] = useState(false);
  const [previousGraphState, setPreviousGraphState] = useState<{ nodes: Node[], edges: Edge[] } | null>(null);
  const [isAwaitingAIAssistantConfirmation, setIsAwaitingAIAssistantConfirmation] = useState(false);

  const [cameFromAssetLibrary, setCameFromAssetLibrary] = useState(false);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '' });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const storyContentRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  
  // Sidebar drag state
  const sidebarWidth = 320; // from w-80
  const [sidebarDragOffset, setSidebarDragOffset] = useState<number | null>(null);
  const dragStartRef = useRef<{ x: number, wasOpen: boolean } | null>(null);
  const mobileWarningShownRef = useRef(false);

  const currentOutline = outlineHistory[currentOutlineIndex] || null;
  const previousOutline = outlineHistory[currentOutlineIndex - 1] || null;
  const canUndoOutline = currentOutlineIndex > 0;
  const canRedoOutline = currentOutlineIndex < outlineHistory.length - 1;

  const currentStory = storyHistory[currentStoryIndex] || '';
  const previousStory = storyHistory[currentStoryIndex - 1] || null;
  const canUndoStory = currentOutlineIndex > 0;
  const canRedoStory = currentOutlineIndex < storyHistory.length - 1;

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

  const modelDisplayNames: { [key: string]: string } = {
      'gemini-2.5-flash-no-thinking': '最快',
      'gemini-2.5-flash': '均衡',
  };

  const getNextModelForRetry = (current: string): string => {
      if (current === 'gemini-2.5-flash') {
          return 'gemini-2.5-flash-no-thinking';
      }
      return 'gemini-2.5-flash';
  };

  const withRetry = async <T,>(
      apiCall: (currentModel: string) => Promise<T>
  ): Promise<T> => {
      let currentModelAttempt = model;
      try {
          const result = await apiCall(currentModelAttempt);
          return result;
      } catch (error) {
          console.warn(`API call with model ${currentModelAttempt} failed. Retrying...`, error);
          
          const nextModel = getNextModelForRetry(currentModelAttempt);
          const nextModelName = modelDisplayNames[nextModel] || nextModel;
          setProgressMessage(`操作失败，正在使用“${nextModelName}”模型重试...`);
          setModel(nextModel);
          
          try {
              const result = await apiCall(nextModel);
              return result;
          } catch (retryError) {
              console.error(`Retry with model ${nextModel} also failed.`, retryError);
              throw retryError;
          }
      }
  };

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    if (highlightedNodeId) {
        const timer = setTimeout(() => setHighlightedNodeId(null), 3000);
        return () => clearTimeout(timer);
    }
  }, [highlightedNodeId]);


  const addNode = useCallback((type: NodeType, data?: any) => {
    const editor = editorRef.current;
    const { x: viewX, y: viewY, scale } = transform;
    let worldX = 0;
    let worldY = 0;

    if (editor) {
        const editorRect = editor.getBoundingClientRect();
        worldX = (editorRect.width / 2 - viewX) / scale;
        worldY = (editorRect.height / 2 - viewY) / scale;
    } else {
        worldX = (window.innerWidth / 2 - viewX) / scale;
        worldY = (window.innerHeight / 2 - viewY) / scale;
    }

    const newNode: Node = {
      id: `${type}_${Date.now()}`,
      type,
      position: { x: worldX - 160, y: worldY - 80 },
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
        newNode.data = { title: data?.title || '导入作品', content: data?.content || '', mode: 'rewrite' } as WorkNodeData;
        break;
    }

    const DESCRIPTION_COLLAPSE_THRESHOLD = 180;
    let description = '';
    if (type === NodeType.PLOT || type === NodeType.STYLE || type === NodeType.STRUCTURE) {
        description = (newNode.data as PlotNodeData | StyleNodeData | StructureNodeData).description || '';
    }

    if (description.length > DESCRIPTION_COLLAPSE_THRESHOLD) {
        newNode.isCollapsed = true;
    }

    setNodes(nds => [...nds, newNode]);
    setHighlightedNodeId(newNode.id);
  }, [transform]);

  const updateNodeData = useCallback((nodeId: string, data: any) => {
    setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data } : n));
    if (highlightedNodeId && nodeId === highlightedNodeId) {
        setHighlightedNodeId(null);
    }
  }, [highlightedNodeId]);

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
  
    const handleLayoutNodes = useCallback(async () => {
        if (nodes.length === 0) return;

        const { positions, transform: newTransform } = await calculateLayout(nodes, edges, editorRef, layoutMode);

        const laidOutNodes = nodes.map(node => {
            const newPos = positions.get(node.id);
            // Create a mutable copy of the node to modify
            const newNode = newPos ? { ...node, position: newPos } : { ...node };

            // As requested, collapse all STYLE nodes during layout to prevent clutter.
            if (newNode.type === NodeType.STYLE) {
                newNode.isCollapsed = true;
            }
            
            return newNode;
        });
        setNodes(laidOutNodes);

        setTransform(newTransform);
        
        // This state determines which layout is applied *next*, so we toggle it after applying the current one.
        setLayoutMode(prev => prev === 'hierarchical' ? 'circular' : 'hierarchical');
    }, [nodes, edges, editorRef, layoutMode]);

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


  const processAiGeneratedGraph = (result: any, sourceNodePosition: { x: number; y: number }) => {
    const createdNodes: Node[] = [];
    const createdEdges: Edge[] = [];

    // Create Character Nodes
    (result.characters || []).forEach((char: any, index: number) => {
        const charFields: KeyValueField[] = (char.fields || []).map((f: any, i: number) => ({ id: `cf_${index}_${i}`, key: f.key, value: f.value }));
        createdNodes.push({
            id: `CHAR_ai_${Date.now()}_${index}`, type: NodeType.CHARACTER,
            position: { x: sourceNodePosition.x - 450, y: sourceNodePosition.y + index * 220 },
            data: { title: char.title, fields: charFields }, isCollapsed: false,
        });
    });

    // Create Setting Nodes
    (result.settings || []).forEach((setting: any, index: number) => {
        const settingFields: KeyValueField[] = (setting.fields || []).map((f: any, i: number) => ({ id: `sf_${index}_${i}`, key: f.key, value: f.value }));
        createdNodes.push({
            id: `SETTING_ai_${Date.now()}_${index}`, type: NodeType.SETTING,
            position: { x: sourceNodePosition.x, y: sourceNodePosition.y - 280 - (index * 240) },
            data: { title: setting.title, fields: settingFields, narrativeStructure: 'single' }, isCollapsed: false,
        });
    });

    // Create Environment Nodes
    (result.environments || []).forEach((env: any, index: number) => {
        const envFields: KeyValueField[] = (env.fields || []).map((f: any, i: number) => ({ id: `ef_${index}_${i}`, key: f.key, value: f.value }));
        createdNodes.push({
            id: `ENV_ai_${Date.now()}_${index}`, type: NodeType.ENVIRONMENT,
            position: { x: sourceNodePosition.x - 450, y: sourceNodePosition.y - 480 - (index * 240) },
            data: { title: env.title, fields: envFields }, isCollapsed: false,
        });
    });

    // Create Style Nodes
    (result.styles || []).forEach((style: any, index: number) => {
        const libraryStyle = style.id ? STORY_STYLES.find(s => s.id === style.id) : null;
        createdNodes.push({
            id: `STYLE_ai_${Date.now()}_${index}`, type: NodeType.STYLE,
            position: { x: sourceNodePosition.x - 450, y: sourceNodePosition.y - 280 - (index * 180) },
            data: {
                styleId: style.id ?? -1, title: libraryStyle?.name || style.title,
                description: libraryStyle?.description || style.description || '自定义风格',
                applicationMethod: 'appropriate'
            }, isCollapsed: false,
        });
    });

    // Create Structure Nodes
    if (result.structures?.start) {
        const start = result.structures.start;
        const libraryStart = start.id ? STORY_STRUCTURES.find(s => s.id === start.id) : null;
        createdNodes.push({
            id: `STRUCTURE_start_${Date.now()}`, type: NodeType.STRUCTURE,
            position: {x: sourceNodePosition.x + 450, y: sourceNodePosition.y - 220 },
            data: {
                structureId: start.id ?? -1, title: libraryStart?.name || start.title,
                description: libraryStart?.description || start.description || '',
                category: StructureCategory.STARTING, userInput: start.userInput || ''
            }, isCollapsed: false,
        });
    }
    if (result.structures?.end) {
        const end = result.structures.end;
        const libraryEnd = end.id ? STORY_STRUCTURES.find(s => s.id === end.id) : null;
        const totalPlots = (result.plots?.length || 0) + (result.plots_a?.length || 0); // Approx
        createdNodes.push({
            id: `STRUCTURE_end_${Date.now()}`, type: NodeType.STRUCTURE,
            position: {x: sourceNodePosition.x + 450, y: sourceNodePosition.y + 220 + (totalPlots * 220) },
            data: {
                structureId: end.id ?? -1, title: libraryEnd?.name || end.title,
                description: libraryEnd?.description || end.description || '',
                category: StructureCategory.ENDING, userInput: end.userInput || ''
            }, isCollapsed: false,
        });
    }

    // Create Plot Nodes (for single and multi-line)
    const processPlots = (plotList: any[], line: 'a' | 'b' | 'single', yOffsetStart: number, xOffset: number) => {
        (plotList || []).forEach((plot: any, index: number) => {
            const libraryPlot = plot.id ? STORY_PLOTS.find(p => p.id === plot.id) : null;
            createdNodes.push({
                id: `PLOT_ai_${line}_${Date.now()}_${index}`, type: NodeType.PLOT,
                position: { x: sourceNodePosition.x + xOffset, y: yOffsetStart + index * 220 },
                data: {
                    plotId: plot.id ?? -1, title: libraryPlot?.name || plot.title,
                    description: libraryPlot?.description || plot.description || '自定义情节',
                    userInput: plot.userInput || ''
                }, isCollapsed: false,
            });
        });
    };
    processPlots(result.plots, 'single', sourceNodePosition.y, 450);
    processPlots(result.plots_a, 'a', sourceNodePosition.y, 450);
    processPlots(result.plots_b, 'b', sourceNodePosition.y + 400, 450);


    // Create Connections
    const allPossibleNodes = [...nodes, ...createdNodes];
    (result.connections || []).forEach((conn: { sourceTitle: string, targetTitle: string, sourceHandle?: string, targetHandle?: string }) => {
        const source = allPossibleNodes.find(n => (n.data as any).title === conn.sourceTitle);
        const target = allPossibleNodes.find(n => (n.data as any).title === conn.targetTitle);
        if (source && target) {
            createdEdges.push({
                id: `edge_ai_${source.id}_${target.id}_${Date.now()}`,
                source: source.id,
                target: target.id,
                sourceHandle: conn.sourceHandle,
                targetHandle: conn.targetHandle
            });
        }
    });

    setNodes(prev => [...prev, ...createdNodes]);
    setEdges(prev => [...prev, ...createdEdges]);
  }

  const handleAnalyzeWork = async (nodeId: string, content: string) => {
    startProgress(`analyze_${nodeId}`);
    try {
        const result = await analyzeWork(content, nodes, model);
        const sourceNode = nodes.find(n => n.id === nodeId);
        if (!sourceNode) return;

        stopProgress(() => {
            processAiGeneratedGraph(result, sourceNode.position);
        });

    } catch (error) {
        stopProgress(() => {
            console.error(error);
            showAlert("解析失败", error instanceof Error ? error.message : '发生未知错误');
        });
    }
  };

  const handleExpandSetting = async (nodeId: string) => {
    startProgress(`expand_${nodeId}`);
    try {
        const sourceNode = nodes.find(n => n.id === nodeId) as Node<SettingNodeData>;
        if (!sourceNode) {
            stopProgress(() => {});
            return;
        };
        
        const result = await expandSetting(sourceNode.data, nodes, model);
        
        stopProgress(() => {
            processAiGeneratedGraph(result, sourceNode.position);
        });
    } catch (error) {
        stopProgress(() => {
            console.error(error);
            showAlert("扩展失败", error instanceof Error ? error.message : '发生未知错误');
        });
    }
  };

  const handleGenerateOutline = async () => {
    startProgress('outline', '正在生成大纲...');
    try {
        const wordCount = targetWordCount ? parseInt(targetWordCount, 10) : undefined;
        if (targetWordCount && (isNaN(wordCount) || wordCount < 0)) {
            showAlert("输入无效", "目标字数必须是一个有效的正数。");
            stopProgress();
            return;
        }

        const result = await withRetry(
            (currentModel) => generateOutline(nodes, edges, '中文', currentModel, wordCount)
        );

        stopProgress(() => {
            setOutlineHistory([result]);
            setCurrentOutlineIndex(0);
            setAssetLibrary(prev => [...prev, { type: 'outline', content: result, title: `大纲: ${result.title}`, timestamp: new Date() }]);
            setModalContent('outline');
        });
    } catch (err) {
        stopProgress(() => {
            showAlert("生成大纲失败", `${err instanceof Error ? err.message : '未知错误'}`);
        });
    }
  };

  const handleGenerateStoryFromOutline = async () => {
        if (!currentOutline || !currentOutline.segments || currentOutline.segments.length === 0) {
            showAlert("无法生成", "请先生成一个有效的故事大纲。");
            return;
        }

        setModalContent(null); // Close outline modal
        
        const isShortForm = currentOutline.segments.length > 0 && currentOutline.segments[0].key_events && !currentOutline.segments[0].chapters;

        if (isShortForm) {
            startProgress('story', '正在创作短篇故事...');
            try {
                const finalStory = await withRetry(
                    (currentModel) => generateShortStory(nodes, edges, currentOutline, '中文', currentModel)
                );
                stopProgress(() => {
                    setStoryHistory([finalStory]);
                    setCurrentStoryIndex(0);
                    setAssetLibrary(prev => [...prev, { type: 'story', content: finalStory, title: `故事: ${currentOutline.title}`, timestamp: new Date() }]);
                    setModalContent('story');
                });
            } catch (err) {
                stopProgress(() => {
                    showAlert("故事创作失败", `${err instanceof Error ? err.message : '未知错误'}`);
                });
            }
        } else {
            // --- Long Story (Chapter-based) Generation ---
            const totalChapters = currentOutline.segments.reduce((acc, s) => acc + (s.chapters?.length || 0), 0);
            startSteppedProgress('story', `正在准备创作 (共 ${totalChapters} 章)...`, totalChapters);
            
            let accumulatedStory = "";
            const storyParts: string[] = [];
            let chaptersDone = 0;
            let currentModelForLoop = model;

            try {
                for (let i = 0; i < currentOutline.segments.length; i++) {
                    const segment = currentOutline.segments[i];
                    if (!segment.chapters) continue;

                    for (let j = 0; j < segment.chapters.length; j++) {
                        chaptersDone++;
                        setProgressMessage(`正在创作第 ${chaptersDone} / ${totalChapters} 章...`);
                        
                        let success = false;
                        let attempts = 0;
                        while (!success && attempts < 2) {
                            try {
                                const newChapterText = await generateStoryChapter(
                                    nodes, edges, currentOutline, accumulatedStory, i, j, '中文', currentModelForLoop
                                );
                                
                                storyParts.push(newChapterText);
                                accumulatedStory += (accumulatedStory ? "\n\n" : "") + newChapterText;
                                success = true;

                                // Complete the progress for this step
                                completeStepAndAdvance();

                            } catch (err) {
                                attempts++;
                                if (attempts >= 2) throw err;

                                const nextModel = getNextModelForRetry(currentModelForLoop);
                                const nextModelName = modelDisplayNames[nextModel] || nextModel;
                                setProgressMessage(`创作第 ${chaptersDone} 章失败，正在使用“${nextModelName}”模型重试...`);
                                setModel(nextModel);
                                currentModelForLoop = nextModel;
                            }
                        }
                    }
                }
                
                stopProgress(() => {
                    const finalStory = storyParts.join('\n\n');
                    setStoryHistory([finalStory]);
                    setCurrentStoryIndex(0);
                    setAssetLibrary(prev => [...prev, { type: 'story', content: finalStory, title: `故事: ${currentOutline.title}`, timestamp: new Date() }]);
                    setModalContent('story');
                });

            } catch (err) {
                stopProgress(() => {
                    showAlert("故事创作失败", `在创作第 ${chaptersDone} 章时出错: ${err instanceof Error ? err.message : '未知错误'}`);
                });
            }
        }
  }

  const handleGenerateStoryDirectly = async () => {
    startProgress('story', '正在构思大纲...');
    try {
        const wordCount = parseInt(targetWordCount, 10);
        
        const tempOutline = await withRetry(
            (currentModel) => generateOutline(nodes, edges, '中文', currentModel, wordCount)
        );
        
        setOutlineHistory([tempOutline]);
        setCurrentOutlineIndex(0);

        setProgressMessage('正在创作故事...');
        
        const finalStory = await withRetry(
            (currentModel) => generateShortStory(nodes, edges, tempOutline, '中文', currentModel)
        );

        stopProgress(() => {
            setStoryHistory([finalStory]);
            setCurrentStoryIndex(0);
            setAssetLibrary(prev => [...prev, { type: 'outline', content: tempOutline, title: `大纲: ${tempOutline.title}`, timestamp: new Date() }]);
            setAssetLibrary(prev => [...prev, { type: 'story', content: finalStory, title: `故事: ${tempOutline.title}`, timestamp: new Date() }]);
            setModalContent('story');
        });
    } catch (err) {
        stopProgress(() => {
            showAlert("故事创作失败", `${err instanceof Error ? err.message : '未知错误'}`);
        });
    }
  }

  const handleGenerateStory = () => {
    const targetWordCountInt = parseInt(targetWordCount, 10);
    const canGenerateStoryDirectly = !isNaN(targetWordCountInt) && targetWordCountInt > 0 && targetWordCountInt <= 2000;

    if (currentOutline) {
        handleGenerateStoryFromOutline();
    } else if (canGenerateStoryDirectly) {
        handleGenerateStoryDirectly();
    } else {
        showAlert("无法生成", "请先生成一个故事大纲，或设定一个低于2000的目标字数以直接生成短篇故事。");
    }
  };

    const handleRevise = async () => {
        if (modalContent === 'outline') await handleReviseOutline();
        if (modalContent === 'story') await handleReviseStory();
    };

    const handleReviseOutline = async () => {
        if (!currentOutline || !revisionPrompt.trim()) return;
        startProgress('revise_outline', '正在修改大纲...');
        try {
            const revisedOutline = await withRetry(
                (currentModel) => reviseOutline(currentOutline, revisionPrompt, '中文', currentModel)
            );

            stopProgress(() => {
                const newHistory = [...outlineHistory.slice(0, currentOutlineIndex + 1), revisedOutline];
                setOutlineHistory(newHistory);
                setCurrentOutlineIndex(newHistory.length - 1);
                // Update asset library if this was the latest version
                // FIX: Replaced findLastIndex with a reverse for-loop for broader compatibility.
                let oldAssetIndex = -1;
                for (let i = assetLibrary.length - 1; i >= 0; i--) {
                    if (assetLibrary[i].type === 'outline' && JSON.stringify(assetLibrary[i].content) === JSON.stringify(currentOutline)) {
                        oldAssetIndex = i;
                        break;
                    }
                }
                if (oldAssetIndex > -1) {
                    setAssetLibrary(prev => {
                        const newAssets = [...prev];
                        newAssets[oldAssetIndex] = { ...newAssets[oldAssetIndex], content: revisedOutline, title: `大纲: ${revisedOutline.title}`};
                        return newAssets;
                    });
                }
                setRevisionPrompt('');
            });
        } catch (err) {
            stopProgress(() => {
                showAlert("修改大纲失败", `${err instanceof Error ? err.message : '未知错误'}`);
            });
        }
    };

    const handleReviseStory = async () => {
        if (!currentStory || !revisionPrompt.trim()) return;
        startProgress('revise_story', '正在修改故事...');
        try {
            const revisedStory = await withRetry(
                (currentModel) => reviseStory(currentStory, revisionPrompt, '中文', currentModel)
            );
            stopProgress(() => {
                const newHistory = [...storyHistory.slice(0, currentStoryIndex + 1), revisedStory];
                setStoryHistory(newHistory);
                setCurrentStoryIndex(newHistory.length - 1);
                // Update asset library
                // FIX: Replaced findLastIndex with a reverse for-loop for broader compatibility.
                let oldAssetIndex = -1;
                for (let i = assetLibrary.length - 1; i >= 0; i--) {
                    if (assetLibrary[i].type === 'story' && assetLibrary[i].content === currentStory) {
                        oldAssetIndex = i;
                        break;
                    }
                }
                 if (oldAssetIndex > -1) {
                    setAssetLibrary(prev => {
                        const newAssets = [...prev];
                        newAssets[oldAssetIndex] = { ...newAssets[oldAssetIndex], content: revisedStory };
                        return newAssets;
                    });
                }
                setRevisionPrompt('');
            });
        } catch (err) {
            stopProgress(() => {
                showAlert("修改故事失败", `${err instanceof Error ? err.message : '未知错误'}`);
            });
        }
    };

    const updateAssetOnUndoRedo = (oldContent: StructuredOutline | string, newContent: StructuredOutline | string, type: 'outline' | 'story') => {
        setAssetLibrary(prev => {
            let assetIndex = -1;
            for (let i = prev.length - 1; i >= 0; i--) {
                if (prev[i].type === type) {
                    const contentMatches = type === 'outline'
                        ? JSON.stringify(prev[i].content) === JSON.stringify(oldContent)
                        : prev[i].content === oldContent;
                    if (contentMatches) {
                        assetIndex = i;
                        break;
                    }
                }
            }

            if (assetIndex > -1) {
                const newAssets = [...prev];
                const updatedAsset = { ...newAssets[assetIndex], content: newContent };
                if (type === 'outline') {
                    updatedAsset.title = `大纲: ${(newContent as StructuredOutline).title}`;
                }
                newAssets[assetIndex] = updatedAsset;
                return newAssets;
            }
            return prev;
        });
    };

    const handleUndoRedo = (type: 'outline' | 'story', action: 'undo' | 'redo') => {
        if (type === 'outline') {
            const newIndex = action === 'undo' ? currentOutlineIndex - 1 : currentOutlineIndex + 1;
            if (newIndex >= 0 && newIndex < outlineHistory.length) {
                updateAssetOnUndoRedo(outlineHistory[currentOutlineIndex], outlineHistory[newIndex], 'outline');
                setCurrentOutlineIndex(newIndex);
            }
        } else {
            const newIndex = action === 'undo' ? currentStoryIndex - 1 : currentStoryIndex + 1;
            if (newIndex >= 0 && newIndex < storyHistory.length) {
                updateAssetOnUndoRedo(storyHistory[currentStoryIndex], storyHistory[newIndex], 'story');
                setCurrentStoryIndex(newIndex);
            }
        }
    };

    const sanitizeAIGraphState = (graph: { nodes: Node[], edges: Edge[] }): { nodes: Node[], edges: Edge[] } => {
        if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
            throw new Error("AI did not return a valid graph object with nodes and edges.");
        }
        
        let lastPosition = { x: 200, y: 200 };
        if (nodes.length > 0) {
             nodes.forEach(n => {
                if (n.position && n.position.x > lastPosition.x) {
                    lastPosition.x = n.position.x;
                }
            });
            lastPosition.x += 400;
        }

        const sanitizedNodes = graph.nodes.map(node => {
            if (!node.position || typeof node.position.x !== 'number' || typeof node.position.y !== 'number') {
                node.position = { x: lastPosition.x, y: lastPosition.y };
                lastPosition.y += 220;
            }
            if (!node.data) node.data = {} as any;
            switch (node.type) {
                case NodeType.CHARACTER:
                case NodeType.SETTING:
                case NodeType.ENVIRONMENT:
                    if (!Array.isArray((node.data as any).fields)) {
                        (node.data as any).fields = [];
                    }
                    break;
                case NodeType.PLOT:
                     if (typeof (node.data as PlotNodeData).title !== 'string') (node.data as PlotNodeData).title = '无标题情节';
                     if (typeof (node.data as PlotNodeData).description !== 'string') (node.data as PlotNodeData).description = '';
                    break;
            }
            return node;
        });

        const allNodeIds = new Set(sanitizedNodes.map(n => n.id));
        
        const sanitizedEdges = graph.edges.filter(edge => 
            edge && 
            typeof edge.source === 'string' && 
            typeof edge.target === 'string' &&
            allNodeIds.has(edge.source) && 
            allNodeIds.has(edge.target)
        );

        return { nodes: sanitizedNodes, edges: sanitizedEdges };
    };

    const handleAssistantSubmit = async (prompt: string) => {
        const currentState = { nodes, edges };
        setPreviousGraphState(currentState); // Store state before modification
        
        setIsAssistantProcessing(true);
        setAssistantMessage("正在执行操作...");

        try {
            const newGraphState = await modifyGraphWithAssistant(
                prompt,
                currentState.nodes,
                currentState.edges,
                model
            );
            const sanitizedGraph = sanitizeAIGraphState(newGraphState);

            setNodes(sanitizedGraph.nodes);
            setEdges(sanitizedGraph.edges);
            setAssistantMessage("操作完成！请确认或回退。");
            setIsAwaitingAIAssistantConfirmation(true); // Enter confirmation mode on success
        } catch (error) {
            console.error("AI Assistant Error:", error);
            const errorMessage = error instanceof Error ? error.message : "发生未知错误。";
            setAssistantMessage(`错误: ${errorMessage}`);
            showAlert("AI 助手出错", errorMessage);
            setPreviousGraphState(null); // Clear backup state on error, no changes were applied
            setTimeout(() => setAssistantMessage(null), 5000);
        } finally {
            setIsAssistantProcessing(false);
        }
    };
    
    const handleAcceptChanges = () => {
        setPreviousGraphState(null);
        setIsAwaitingAIAssistantConfirmation(false);
        setAssistantMessage("更改已接受。");
        setTimeout(() => setAssistantMessage(null), 3000);
    };

    const handleRevertChanges = () => {
        if (previousGraphState) {
            setNodes(previousGraphState.nodes);
            setEdges(previousGraphState.edges);
        }
        setPreviousGraphState(null);
        setIsAwaitingAIAssistantConfirmation(false);
        setAssistantMessage("操作已撤销。");
        setTimeout(() => setAssistantMessage(null), 3000);
    };


  const handleCopy = async (content: string) => {
    if (!content) {
        showAlert('复制失败', '没有可复制的内容。');
        return;
    }
    try {
        await navigator.clipboard.writeText(content);
        showAlert('复制成功', '内容已复制到剪贴板！');
    } catch (err) {
        console.error('无法复制文本: ', err);
        showAlert('复制失败', '无法将内容复制到剪贴板。请检查浏览器权限。');
    }
  };
  
  const handleTocClick = (id: string) => {
    storyContentRef.current?.querySelector(`#${id}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
    });
  };

  const handleWordCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      if (val === '') {
          setTargetWordCount('');
          return;
      }
      const num = parseInt(val, 10);
      // When a user types "-", `parseInt` results in NaN, so we do nothing,
      // allowing them to continue typing a negative number.
      if (isNaN(num)) {
          return;
      }
      // Once a valid negative number is formed, reset to auto.
      if (num < 0) {
          setTargetWordCount('');
      } else {
          // Otherwise, update with the valid non-negative number string.
          setTargetWordCount(val);
      }
  };

  const adjustWordCount = (amount: number) => {
      const current = parseInt(targetWordCount, 10) || 0;
      const newValue = Math.max(0, current + amount);
      setTargetWordCount(String(newValue));
  };
    
    const handleDeleteAsset = (timestamp: Date) => {
        showConfirm('删除资产', '您确定要删除这个项目吗？此操作无法撤销。', () => {
            setAssetLibrary(prev => prev.filter(asset => asset.timestamp !== timestamp));
        });
    };

    const handleStartRenameAsset = (asset: Asset) => {
        setRenamingState({ id: asset.timestamp.toISOString(), name: asset.title });
    };

    const handleConfirmRenameAsset = () => {
        if (!renamingState.id || !renamingState.name.trim()) return;
        setAssetLibrary(prev => prev.map(asset => 
            asset.timestamp.toISOString() === renamingState.id 
            ? { ...asset, title: renamingState.name.trim() } 
            : asset
        ));
        setRenamingState({ id: null, name: '' });
    };

    const handleCancelRenameAsset = () => {
        setRenamingState({ id: null, name: '' });
    };
    
    const handleImportAssetAsNode = (asset: Asset) => {
        const content = typeof asset.content === 'string' ? asset.content : JSON.stringify(asset.content, null, 2);
        addNode(NodeType.WORK, { title: asset.title, content });
        setIsAssetModalOpen(false);
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        if (window.innerWidth >= 768) { // On md screens and up, sidebar is visible, so disable touch gestures.
            dragStartRef.current = null;
            return;
        }

        const x = e.targetTouches[0].clientX;
        const target = e.target as HTMLElement;

        // Check if the touch event originated from within the sidebar
        const isTouchingSidebar = sidebarRef.current?.contains(target);
        const isEdgeArea = x < 80;

        if (isSidebarOpen && isTouchingSidebar) {
            // Only start a close-drag if touching the sidebar itself
            dragStartRef.current = { x, wasOpen: true };
        } else if (!isSidebarOpen && isEdgeArea) {
            // Only start an open-drag if touching the screen edge
            dragStartRef.current = { x, wasOpen: false };
            setSidebarDragOffset(-sidebarWidth);
        } else {
            dragStartRef.current = null;
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!dragStartRef.current) return;
        
        // Prevent default browser actions like scrolling when our drag is active
        if (e.cancelable) e.preventDefault();

        const x = e.targetTouches[0].clientX;
        const deltaX = x - dragStartRef.current.x;
        const startPosition = dragStartRef.current.wasOpen ? 0 : -sidebarWidth;
        const newPosition = Math.max(-sidebarWidth, Math.min(0, startPosition + deltaX));
        setSidebarDragOffset(newPosition);
    };

    const handleTouchEnd = () => {
        if (dragStartRef.current === null || sidebarDragOffset === null) return;
        
        const { wasOpen } = dragStartRef.current;
        const threshold = sidebarWidth / 4; // Drag distance required to change state

        if (wasOpen) {
            // If it was open, check if dragged far enough left to close
            if (sidebarDragOffset < -threshold) {
                setIsSidebarOpen(false);
            } else {
                setIsSidebarOpen(true); // Snap back
            }
        } else {
            // If it was closed, check if dragged far enough right to open
            if (sidebarDragOffset > -sidebarWidth + threshold) {
                setIsSidebarOpen(true);
            } else {
                setIsSidebarOpen(false); // Snap back
            }
        }
        
        dragStartRef.current = null;
        setSidebarDragOffset(null);
    };

    const handleCancel = () => {
      cancelProgress();
    };

    // --- Start of Export Logic ---
    const sanitizeFilename = (name: string) => name.replace(/[:/\\?*|"<>]/g, '_').trim() || 'Untitled';
    
    const markdownToPlainText = (markdown: string): string => {
        return markdown
            .replace(/^(#{1,6})\s/gm, '') // headings
            .replace(/(\*\*|__)(.*?)\1/g, '$2') // bold
            .replace(/(\*|_)(.*?)\1/g, '$2')   // italic
            .replace(/~~(.*?)~~/g, '$1')       // strikethrough
            .replace(/`([^`]+)`/g, '$1')       // inline code
            .replace(/^> (.*$)/gm, '$1')       // blockquotes
            .replace(/^(\*|\+|-)\s/gm, '')     // list items
            .replace(/!\[(.*?)\]\(.*?\)/g, '$1') // images
            .replace(/\[(.*?)\]\(.*?\)/g, '$1') // links
            .replace(/(\r\n|\n|\r)/gm, "\n")    // normalize line breaks
            .trim();
    };

    const outlineToPlainText = (outline: StructuredOutline): string => {
        let text = `标题: ${outline.title}\n\n`;
        outline.segments.forEach((segment, sIndex) => {
            text += `第 ${sIndex + 1} 部分: ${segment.segment_title} (预计 ${segment.estimated_word_count} 字)\n`;
            text += '------------------------------------------\n';
            if (segment.chapters) {
                segment.chapters.forEach(chapter => {
                    text += `  第 ${chapter.chapter_number} 章: ${chapter.chapter_title}\n`;
                    if (chapter.point_of_view) text += `    视角: ${chapter.point_of_view}\n`;
                    if (chapter.setting) text += `    场景: ${chapter.setting}\n`;
                    text += `    关键情节:\n`;
                    chapter.key_events.forEach(event => { text += `      - ${event}\n`; });
                    text += '\n';
                });
            } else if (segment.key_events) {
                text += `  关键情节:\n`;
                segment.key_events.forEach(event => { text += `    - ${event}\n`; });
                text += '\n';
            }
        });
        return text;
    };

    const markdownToDocx = async (markdown: string, title: string) => {
        const { Document, Packer, Paragraph, TextRun, HeadingLevel } = docx;
        const children = [];
        const lines = markdown.split('\n');

        for (const line of lines) {
            if (line.trim() === '') {
                children.push(new Paragraph({ text: '' }));
                continue;
            }
            const headingMatch = line.match(/^(#{1,3})\s(.+)/);
            if (headingMatch) {
                const level = headingMatch[1].length;
                const text = headingMatch[2];
                const headingLevel = level === 1 ? HeadingLevel.HEADING_1 : level === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3;
                children.push(new Paragraph({ text, heading: headingLevel }));
                continue;
            }
            const textRuns = [];
            const parts = line.split(/(\*\*.*?\*\*|\*.*?\*)/g).filter(p => p);
            for (const part of parts) {
                if (part.startsWith('**') && part.endsWith('**')) {
                    textRuns.push(new TextRun({ text: part.slice(2, -2), bold: true }));
                } else if (part.startsWith('*') && part.endsWith('*')) {
                    textRuns.push(new TextRun({ text: part.slice(1, -1), italics: true }));
                } else {
                    textRuns.push(new TextRun({ text: part }));
                }
            }
            children.push(new Paragraph({ children: textRuns }));
        }

        const doc = new Document({ sections: [{ children }] });
        const blob = await Packer.toBlob(doc);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${sanitizeFilename(title)}.docx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleDownloadAsset = async (asset: Asset, format: 'txt' | 'json' | 'md' | 'docx') => {
        const filename = sanitizeFilename(asset.title);
        let contentStr = '';
        let blobType = 'text/plain;charset=utf-8';
        let extension = format;

        if (asset.type === 'outline') {
            const outline = asset.content as StructuredOutline;
            if (format === 'json') {
                contentStr = JSON.stringify(outline, null, 2);
                blobType = 'application/json;charset=utf-8';
            } else { // txt
                contentStr = outlineToPlainText(outline);
            }
        } else { // story
            const story = asset.content as string;
            if (format === 'md') {
                contentStr = story;
            } else if (format === 'txt') {
                contentStr = markdownToPlainText(story);
            } else if (format === 'docx') {
                await markdownToDocx(story, filename);
                return; // DOCX handles its own download
            }
        }
        
        const blob = new Blob([contentStr], { type: blobType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.${extension}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };
    
    const handleDownloadFromResultModal = (type: 'outline' | 'story', format: 'txt' | 'json' | 'md' | 'docx') => {
        const asset: Asset = type === 'outline'
            ? { type: 'outline', content: currentOutline!, title: currentOutline?.title || '大纲', timestamp: new Date() }
            : { type: 'story', content: currentStory, title: currentOutline?.title || '故事', timestamp: new Date() };
        handleDownloadAsset(asset, format);
    };
    
    const handleExportAllAssets = async () => {
        if (assetLibrary.length === 0) {
            showAlert("导出失败", "资产库中没有内容可以导出。");
            return;
        }
        const zip = new JSZip();
        for (const asset of assetLibrary) {
            const filename = sanitizeFilename(asset.title);
            if (asset.type === 'outline') {
                zip.file(`${filename}.txt`, outlineToPlainText(asset.content as StructuredOutline));
            } else {
                zip.file(`${filename}.txt`, markdownToPlainText(asset.content as string));
            }
        }
        const zipBlob = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Genodel_Assets_Export.zip';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // --- End of Export Logic ---
    
    const assetModalMobileFooter = (
      <button onClick={() => setIsAssetModalOpen(false)} className="w-full px-6 py-3 bg-indigo-500 dark:bg-indigo-600 text-white font-semibold rounded-full hover:bg-indigo-600 dark:hover:bg-indigo-500 transition-colors">
        返回
      </button>
    );
    
    const assetModalHeaderActions = (
      <button onClick={handleExportAllAssets} className="flex items-center space-x-2 px-4 h-10 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100 transition-colors" title="全部导出为ZIP">
        <ArchiveIcon className="h-5 w-5"/>
        <span className="text-sm font-medium">全部导出</span>
      </button>
    );

    const bringNodeToFront = useCallback((nodeId: string) => {
        setNodes(nds => {
            const nodeToMove = nds.find(n => n.id === nodeId);
            if (!nodeToMove) return nds;
            const otherNodes = nds.filter(n => n.id !== nodeId);
            return [...otherNodes, nodeToMove];
        });
    }, []);

  return (
    <ErrorBoundary>
        <div className="w-screen h-screen font-sans flex overflow-hidden" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
            <Sidebar sidebarRef={sidebarRef} onAddNode={addNode} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} dragOffset={sidebarDragOffset} />
            <main className="relative flex-1 h-full">
                {!isSidebarOpen && (
                <button 
                    onClick={() => setIsSidebarOpen(true)}
                    className="md:hidden fixed top-4 left-4 z-40 p-3 bg-slate-200/60 dark:bg-slate-900/60 backdrop-blur-md rounded-2xl text-slate-800 dark:text-white"
                    aria-label="Open sidebar"
                >
                    <MenuIcon />
                </button>
                )}
                {isSidebarOpen && <div onClick={() => setIsSidebarOpen(false)} className="md:hidden fixed inset-0 bg-black/40 z-20"></div>}

                <NodeEditor 
                    nodes={nodes}
                    edges={edges}
                    transform={transform}
                    setTransform={setTransform}
                    onNodesChange={setNodes}
                    onEdgesChange={setEdges}
                    onUpdateNodeData={updateNodeData}
                    onDeleteNode={deleteNode}
                    onToggleNodeCollapse={handleToggleNodeCollapse}
                    onAnalyzeWork={handleAnalyzeWork}
                    onExpandSetting={handleExpandSetting}
                    onNodeSelect={bringNodeToFront}
                    activeProgressTask={activeProgressTask}
                    progress={progress}
                    editorRef={editorRef}
                    highlightedNodeId={highlightedNodeId}
                    setHighlightedNodeId={setHighlightedNodeId}
                />
                <Toolbar
                model={model}
                setModel={setModel}
                isGenerating={isAnyTaskRunning}
                onClearAllNodes={handleClearAllNodes}
                onImportNodes={triggerImport}
                onExportNodes={handleExportNodes}
                onLayoutNodes={handleLayoutNodes}
                layoutMode={layoutMode}
                theme={theme}
                setTheme={setTheme}
                />
                
                {isAnyTaskRunning && (
                    <div className="absolute bottom-28 right-5 z-40 flex flex-row items-center md:flex-col md:items-end gap-3 md:gap-4 pointer-events-none">
                        {(activeProgressTask === 'outline' || activeProgressTask === 'story' || activeProgressTask?.startsWith('revise')) && (
                            <div className="bg-slate-200/60 dark:bg-slate-900/60 backdrop-blur-lg p-5 rounded-3xl shadow-lg w-64 md:w-80 border border-slate-300/50 dark:border-slate-800/50 animate-scale-in pointer-events-auto">
                                <h4 className="font-bold text-lg text-slate-800 dark:text-slate-200 truncate">{progressMessage || '正在处理...'}</h4>
                                <div className="w-full bg-slate-300/70 rounded-full h-2.5 dark:bg-slate-700/70 mt-3">
                                    <div className="bg-blue-500 h-2.5 rounded-full" style={{ width: `${progress}%`, transition: 'width 0.3s ease-in-out' }}></div>
                                </div>
                                <p className="text-right text-sm font-semibold mt-1 text-slate-600 dark:text-slate-300">{progress}%</p>
                            </div>
                        )}
                    </div>
                )}


                <GenerationControls
                    isAnyTaskRunning={isAnyTaskRunning}
                    outline={currentOutline}
                    targetWordCount={targetWordCount}
                    onWordCountChange={handleWordCountChange}
                    onAdjustWordCount={adjustWordCount}
                    onGenerateOutline={handleGenerateOutline}
                    onGenerateStory={handleGenerateStory}
                    onOpenHelp={() => setIsHelpModalOpen(true)}
                    onOpenAssets={() => setIsAssetModalOpen(true)}
                    onCancel={handleCancel}
                    onToggleAssistant={() => setIsAssistantPanelOpen(p => !p)}
                    isAssistantOpen={isAssistantPanelOpen}
                />

                <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileImport} 
                style={{ display: 'none' }} 
                accept=".json" 
                />
            </main>
        </div>
        
        <AIAssistant
            isOpen={isAssistantPanelOpen}
            onClose={() => setIsAssistantPanelOpen(false)}
            onSubmit={handleAssistantSubmit}
            isProcessing={isAssistantProcessing}
            message={assistantMessage}
            isAwaitingConfirmation={isAwaitingAIAssistantConfirmation}
            onAccept={handleAcceptChanges}
            onRevert={handleRevertChanges}
        />
        
        <HelpModal isOpen={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} onLoadExample={handleLoadExample} />

        <ResultModals
            modalContent={modalContent}
            outline={currentOutline}
            previousOutline={previousOutline}
            story={currentStory}
            previousStory={previousStory}
            storyHeadings={storyHeadings}
            storyContentRef={storyContentRef}
            isAnyTaskRunning={isAnyTaskRunning}
            activeProgressTask={activeProgressTask}
            progress={progress}
            revisionPrompt={revisionPrompt}
            onRevisionPromptChange={setRevisionPrompt}
            onRevise={handleRevise}
            isRevising={activeProgressTask === 'revise_outline' || activeProgressTask === 'revise_story'}
            onClose={() => {
                setModalContent(null);
                setCameFromAssetLibrary(false);
            }}
            onBack={cameFromAssetLibrary ? () => {
                setModalContent(null);
                setIsAssetModalOpen(true);
                setCameFromAssetLibrary(false);
            } : undefined}
            onGenerateStory={handleGenerateStoryFromOutline}
            onCopy={handleCopy}
            onDownload={handleDownloadFromResultModal}
            onTocClick={handleTocClick}
            onHeadingsParse={setStoryHeadings}
            canUndo={modalContent === 'outline' ? canUndoOutline : canUndoStory}
            canRedo={modalContent === 'outline' ? canRedoOutline : canRedoStory}
            onUndo={() => handleUndoRedo(modalContent!, 'undo')}
            onRedo={() => handleUndoRedo(modalContent!, 'redo')}
        />
        
        <Modal isOpen={isAssetModalOpen} onClose={() => setIsAssetModalOpen(false)} title="资产库" headerActions={assetModalHeaderActions} hideCloseButtonOnMobile mobileFooter={assetModalMobileFooter}>
            <div className="w-full max-h-[70vh] text-slate-800 dark:text-slate-200 rounded-md">
                {assetLibrary.length === 0 ? (
                    <p className="text-center text-slate-500 dark:text-slate-400 py-12 text-lg">资产库为空。请先生成大纲或故事。</p>
                ) : (
                    <ul className="space-y-3">
                        {assetLibrary.slice().reverse().map((asset) => {
                            const handlePreview = () => {
                                if (asset.type === 'outline') {
                                    setOutlineHistory([asset.content as StructuredOutline]);
                                    setCurrentOutlineIndex(0);
                                    setModalContent('outline');
                                } else {
                                    setStoryHistory([asset.content as string]);
                                    setCurrentStoryIndex(0);
                                    setModalContent('story');
                                }
                                setCameFromAssetLibrary(true);
                                setIsAssetModalOpen(false);
                            };
                            return (
                            <li key={asset.timestamp.toISOString()} className="p-4 bg-slate-200/50 dark:bg-slate-800/50 rounded-2xl hover:bg-slate-300/50 dark:hover:bg-slate-700/50 transition-colors"
                                onClick={(e) => {
                                    // FIX: The type cast `e.target as Node` was incorrect due to a name collision with a custom type.
                                    // Changed to `HTMLElement` which is a valid DOM Node and correct for a mouse event target.
                                    if (window.innerWidth < 768 && !(e.target as HTMLElement).closest('button, [role="button"], a')) {
                                        handlePreview();
                                    }
                                }}
                            >
                                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
                                    <div className="flex-grow min-w-0 md:mr-4">
                                        {renamingState.id === asset.timestamp.toISOString() ? (
                                            <div className="flex items-center space-x-2">
                                                <input
                                                    type="text"
                                                    value={renamingState.name}
                                                    onChange={(e) => setRenamingState(s => ({ ...s, name: e.target.value }))}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') handleConfirmRenameAsset();
                                                        if (e.key === 'Escape') handleCancelRenameAsset();
                                                    }}
                                                    className="w-full bg-slate-300 dark:bg-slate-700 text-sm p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                                                    autoFocus
                                                />
                                                <button onClick={handleConfirmRenameAsset} className="p-2 text-green-500 hover:text-green-400"><CheckIcon className="h-5 w-5"/></button>
                                                <button onClick={handleCancelRenameAsset} className="p-2 text-red-500 hover:text-red-400"><XIcon className="h-5 w-5"/></button>
                                            </div>
                                        ) : (
                                            <div className="flex justify-between items-center">
                                                <div className="min-w-0 mr-2">
                                                    <p className="font-semibold text-lg truncate" title={asset.title}>{asset.title}</p>
                                                    <p className="text-sm text-slate-500 dark:text-slate-400">{asset.type === 'outline' ? '大纲' : '故事'}</p>
                                                </div>
                                                <button
                                                    onClick={() => handleStartRenameAsset(asset)}
                                                    className="h-11 w-11 flex md:hidden items-center justify-center bg-indigo-200 text-indigo-800 dark:bg-indigo-900/80 dark:text-indigo-200 rounded-full hover:bg-indigo-300 dark:hover:bg-indigo-800 transition-colors flex-shrink-0"
                                                    title="重命名"
                                                >
                                                    <PencilIcon className="h-5 w-5"/>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {renamingState.id !== asset.timestamp.toISOString() && (
                                        <div className="flex items-center justify-start space-x-2 flex-shrink-0 w-full md:w-auto">
                                            <button
                                                onClick={handlePreview}
                                                className="h-11 hidden md:flex items-center justify-center bg-blue-200 text-blue-800 dark:bg-blue-900/80 dark:text-blue-200 rounded-full hover:bg-blue-300 dark:hover:bg-blue-800 transition-colors w-11"
                                                title="预览"
                                            >
                                                <EyeIcon className="h-6 w-6"/>
                                            </button>
                                            <button
                                                onClick={() => handleImportAssetAsNode(asset)}
                                                className="h-11 flex items-center justify-center bg-emerald-200 text-emerald-800 dark:bg-emerald-900/80 dark:text-emerald-200 rounded-full hover:bg-emerald-300 dark:hover:bg-emerald-800 transition-colors px-4 md:w-11 md:px-0"
                                                title="导入为作品节点"
                                            >
                                                <DocumentAddIcon className="h-6 w-6"/>
                                                <span className="md:hidden ml-2 font-medium text-sm">导入</span>
                                            </button>
                                            <DownloadDropdown asset={asset} onSelectFormat={handleDownloadAsset} isMobile={window.innerWidth < 768} />
                                            <button
                                                onClick={() => handleStartRenameAsset(asset)}
                                                className="h-11 w-11 hidden md:flex items-center justify-center bg-indigo-200 text-indigo-800 dark:bg-indigo-900/80 dark:text-indigo-200 rounded-full hover:bg-indigo-300 dark:hover:bg-indigo-800 transition-colors"
                                                title="重命名"
                                            >
                                                <PencilIcon className="h-5 w-5"/>
                                            </button>
                                            <button
                                                onClick={() => handleDeleteAsset(asset.timestamp)}
                                                className="h-11 flex items-center justify-center bg-red-500/10 text-red-700 dark:text-red-400 rounded-full hover:bg-red-500/20 transition-colors px-4 md:w-11 md:px-0"
                                                title="删除"
                                            >
                                                <TrashIcon className="h-5 w-5"/>
                                                <span className="md:hidden ml-2 font-medium text-sm">删除</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </li>
                        )})}
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
    </ErrorBoundary>
  );
};

export default App;