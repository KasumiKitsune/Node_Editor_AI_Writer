import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Node, Edge, NodeType, CharacterNodeData, SettingNodeData, PlotNodeData, StyleNodeData, StructureNodeData, WorkNodeData, KeyValueField, StructureCategory, EnvironmentNodeData, StructuredOutline } from './types';
import { generateOutline, generateStoryChapter, generateShortStory, analyzeWork, expandSetting, reviseOutline, reviseStory, modifyGraphWithAssistant } from './services/geminiService';
import { calculateLayout, LayoutMode } from './services/layout';
import { STORY_PLOTS, STORY_STYLES, STORY_STRUCTURES } from './constants';
import { generalExample, expansionExample, rewriteExample, assistantExample, continuationExample, parodyExample } from './exampleData';
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
import Modal from './components/Modal';
import { MenuIcon, XIcon, DownloadIcon, PencilIcon, CheckIcon, DocumentAddIcon, TrashIcon, EyeIcon, ArchiveIcon, ChevronDownIcon } from './components/icons';
import BottomNavBar, { MobileView } from './components/BottomNavBar';
import NodeTray from './components/NodeTray';
import Minimap from './components/Minimap';

// Declare global variables from CDN scripts
declare var JSZip: any;
declare var docx: any;

// Error Boundary Component to prevent white screens
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  // FIX: Converted state initialization to a class property to resolve errors related to `this.state` and `this.props` not being defined.
  // The original constructor was removed as it was only used for state initialization and is redundant with this modern syntax.
  state = { hasError: false, error: null };

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
            className="px-6 py-3 bg-red-600 text-white font-semibold rounded-full hover:bg-red-500 transition-colors btn-material"
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
                className={`h-11 flex items-center justify-center bg-teal-200 text-teal-800 dark:bg-teal-900/80 dark:text-teal-200 rounded-full hover:bg-teal-300 dark:hover:bg-teal-800 transition-all btn-material ${isMobile ? 'px-4' : 'w-11'}`}
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
                                className="px-3 py-2 text-sm rounded-xl cursor-pointer text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors btn-material"
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
  const [pendingRevision, setPendingRevision] = useState<{ type: 'outline' | 'story', content: any } | null>(null);
  const [storyHeadings, setStoryHeadings] = useState<Heading[]>([]);
  const [revisionPrompt, setRevisionPrompt] = useState('');
  const [assetLibrary, setAssetLibrary] = useState<Asset[]>([]);
  const [renamingState, setRenamingState] = useState<{ id: string | null; name: string }>({ id: null, name: '' });
  const [assistantMessage, setAssistantMessage] = useState<string | null>(null);
  const [isAssistantPanelOpen, setIsAssistantPanelOpen] = useState(false);
  const [previousGraphState, setPreviousGraphState] = useState<{ nodes: Node[], edges: Edge[] } | null>(null);
  const [isAwaitingAIAssistantConfirmation, setIsAwaitingAIAssistantConfirmation] = useState(false);
  const [cameFromAssetLibrary, setCameFromAssetLibrary] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '' });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [mobileView, setMobileView] = useState<MobileView>('workspace');
  const [trayNodes, setTrayNodes] = useState<{ type: NodeType; data?: any }[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAssetLibraryOpen, setIsAssetLibraryOpen] = useState(false);
  const [isMinimapOpen, setIsMinimapOpen] = useState(false);
  const [minimapState, setMinimapState] = useState({ top: 96, right: 20, width: 280, height: 224 });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const storyContentRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  
  const sidebarWidth = 320;
  const [sidebarDragOffset, setSidebarDragOffset] = useState<number | null>(null);
  const dragStartRef = useRef<{ x: number, wasOpen: boolean } | null>(null);

  const currentOutline = outlineHistory[currentOutlineIndex] || null;
  const previousOutline = outlineHistory[currentOutlineIndex - 1] || null;
  const canUndoOutline = currentOutlineIndex > 0;
  const canRedoOutline = currentOutlineIndex < outlineHistory.length - 1;
  const currentStory = storyHistory[currentStoryIndex] || '';
  const previousStory = storyHistory[currentStoryIndex - 1] || null;
  const canUndoStory = currentStoryIndex > 0;
  const canRedoStory = currentStoryIndex < storyHistory.length - 1;

  // Helper to get language from setting nodes
  const getLanguageFromNodes = (nodes: Node[]): string => {
    const settingNodes = nodes.filter(n => n.type === NodeType.SETTING) as Node<SettingNodeData>[];
    for (const node of settingNodes) {
      const languageField = (node.data.fields || []).find(
        field => field.key === '语言' || field.key.toLowerCase() === 'language'
      );
      if (languageField && languageField.value.trim()) {
        return languageField.value.trim();
      }
    }
    return '中文'; // Default language
  };

  const showAlert = (title: string, message: string) => setAlertModal({ isOpen: true, title, message });
  const showConfirm = (title: string, message: string, onConfirm: () => void) => setConfirmModal({ isOpen: true, title, message, onConfirm });
  const closeAlert = () => setAlertModal({ ...alertModal, isOpen: false });
  const closeConfirm = () => setConfirmModal({ ...confirmModal, isOpen: false });
  const handleConfirm = () => { confirmModal.onConfirm(); closeConfirm(); };

  const modelDisplayNames: { [key: string]: string } = { 'gemini-2.5-flash-no-thinking': '最快', 'gemini-2.5-flash': '均衡', };
  const getNextModelForRetry = (current: string): string => current === 'gemini-2.5-flash' ? 'gemini-2.5-flash-no-thinking' : 'gemini-2.5-flash';

  const withRetry = async <T,>(apiCall: (currentModel: string) => Promise<T>): Promise<T> => {
      let currentModelAttempt = model;
      try { return await apiCall(currentModelAttempt); } catch (error) {
          console.warn(`API call with model ${currentModelAttempt} failed. Retrying...`, error);
          const nextModel = getNextModelForRetry(currentModelAttempt);
          setProgressMessage(`操作失败，正在使用“${modelDisplayNames[nextModel] || nextModel}”模型重试...`);
          setModel(nextModel);
          try { return await apiCall(nextModel); } catch (retryError) {
              console.error(`Retry with model ${nextModel} also failed.`, retryError); throw retryError;
          }
      }
  };

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') root.classList.add('dark'); else root.classList.remove('dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    if (highlightedNodeId) {
        const timer = setTimeout(() => setHighlightedNodeId(null), 3000);
        return () => clearTimeout(timer);
    }
  }, [highlightedNodeId]);

  const transformRef = useRef(transform);
  transformRef.current = transform;

  const addNode = useCallback((type: NodeType, data?: any, uniqueifier?: string | number) => {
    const editor = editorRef.current;
    const { x: viewX, y: viewY, scale } = transformRef.current;
    let worldX = 0, worldY = 0;
    if (editor) {
        const editorRect = editor.getBoundingClientRect();
        worldX = (editorRect.width / 2 - viewX) / scale;
        worldY = (editorRect.height / 2 - viewY) / scale;
    } else {
        worldX = (window.innerWidth / 2 - viewX) / scale;
        worldY = (window.innerHeight / 2 - viewY) / scale;
    }
    const newNode: Node = {
      id: `${type}_${Date.now()}` + (uniqueifier !== undefined ? `_${uniqueifier}` : ''),
      type, position: { x: worldX - 160, y: worldY - 80 }, data: {} as any, isCollapsed: false,
    };
    switch (type) {
      case NodeType.PLOT: newNode.data = data?.isCustom ? { plotId: -1, title: data.title, description: '自定义情节', userInput: '' } : { ...data, userInput: '' }; break;
      case NodeType.CHARACTER: newNode.data = { title: '新人物', fields: [{id: 'f1', key: '姓名', value:''}, {id:'f2', key:'性格', value:''}] }; break;
      case NodeType.SETTING: newNode.data = { title: '新作品设定', fields: [{id: 'f1', key:'体裁', value:''}, {id:'f2', key:'核心概念', value:''}], narrativeStructure: 'single' }; break;
      case NodeType.ENVIRONMENT: newNode.data = { title: data?.title || '新环境', fields: data?.fields || [{ id: 'f1', key: '位置', value: '' }, { id: 'f2', key: '特点', value: '' }] }; break;
      case NodeType.STYLE: newNode.data = data?.isCustom ? { styleId: -1, title: data.title, description: '自定义风格', applicationMethod: 'appropriate' } : { ...data, applicationMethod: 'appropriate' }; break;
      case NodeType.STRUCTURE: newNode.data = { ...data, userInput: '' }; break;
      case NodeType.WORK: newNode.data = { title: data?.title || '导入作品', content: data?.content || '', mode: 'rewrite' }; break;
    }
    const description = (newNode.data as PlotNodeData | StyleNodeData | StructureNodeData).description || '';
    if (description.length > 180) newNode.isCollapsed = true;
    setNodes(nds => [...nds, newNode]);
    setHighlightedNodeId(newNode.id);
  }, []);

  const addNodeToTray = useCallback((type: NodeType, data?: any) => setTrayNodes(prev => [{ type, data }, ...prev]), []);
  const removeNodeFromTray = useCallback((indexToRemove: number) => setTrayNodes(prev => prev.filter((_, index) => index !== indexToRemove)), []);
  const insertNodesFromTray = useCallback(() => {
    trayNodes.forEach((nodeInfo, index) => addNode(nodeInfo.type, nodeInfo.data, index));
    setTrayNodes([]);
    if (isMobile) setMobileView('workspace');
  }, [trayNodes, addNode, isMobile]);

  const handleAddNodeFromWorkspaceSidebar = useCallback((type: NodeType, data?: any) => {
    addNode(type, data);
    setIsSidebarOpen(false);
  }, [addNode]);

  const updateNodeData = useCallback((nodeId: string, data: any) => {
    setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data } : n));
    if (highlightedNodeId && nodeId === highlightedNodeId) setHighlightedNodeId(null);
  }, [highlightedNodeId]);

  const deleteNode = useCallback((nodeId: string) => {
    setNodes(nds => nds.filter(n => n.id !== nodeId));
    setEdges(eds => eds.filter(e => e.source !== nodeId && e.target !== nodeId));
  }, []);
  
  const handleToggleNodeCollapse = useCallback((nodeId: string) => setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, isCollapsed: !n.isCollapsed } : n)), []);
  const handleClearAllNodes = useCallback(() => showConfirm('确认清除', '您确定要清除画布上的所有节点和连接吗？此操作无法撤销。', () => { setNodes([]); setEdges([]); }), []);
  
  const handleLayoutNodes = useCallback(async () => {
    if (nodes.length === 0) return;
    const nextLayoutMode = layoutMode === 'hierarchical' ? 'circular' : 'hierarchical';
    const { positions, transform: newTransform } = await calculateLayout(nodes, edges, editorRef, nextLayoutMode);
    const laidOutNodes = nodes.map(node => {
        const newPos = positions.get(node.id);
        const newNode = newPos ? { ...node, position: newPos } : { ...node };
        if (newNode.type === NodeType.STYLE) newNode.isCollapsed = true;
        return newNode;
    });
    setNodes(laidOutNodes);
    setTransform(newTransform);
    setLayoutMode(nextLayoutMode);
  }, [nodes, edges, editorRef, layoutMode]);

  const handleExportNodes = useCallback(() => {
    if (nodes.length === 0 && edges.length === 0) { showAlert("导出失败", "画布上没有可导出的内容。"); return; }
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
        if (!Array.isArray(data.nodes) || !Array.isArray(data.edges)) throw new Error("文件格式无效。");
        const importAction = () => { setNodes(data.nodes); setEdges(data.edges); };
        if (nodes.length > 0 || edges.length > 0) showConfirm('确认导入', '导入新节点将覆盖当前画布，确定要继续吗?', importAction); else importAction();
      } catch (error) {
        showAlert("导入失败", error instanceof Error ? error.message : '未知错误');
      } finally { if (inputElement) inputElement.value = ''; }
    };
    reader.onerror = () => { showAlert("读取失败", '读取文件时出错。'); if (inputElement) inputElement.value = ''; };
    reader.readAsText(file);
  };
  const triggerImport = useCallback(() => fileInputRef.current?.click(), []);

  const handleLoadExample = useCallback((exampleName: ExampleName) => {
    const loadAction = () => {
        let exampleData: { nodes: Node[], edges: Edge[] };
        switch (exampleName) {
            case 'general': exampleData = generalExample; break;
            case 'expand': exampleData = expansionExample; break;
            case 'rewrite': exampleData = rewriteExample; break;
            case 'assistant': exampleData = assistantExample; break;
            case 'continuation': exampleData = continuationExample; break;
            case 'parody': exampleData = parodyExample; break;
            default: return;
        }
        setNodes(JSON.parse(JSON.stringify(exampleData.nodes)));
        setEdges(JSON.parse(JSON.stringify(exampleData.edges)));
        setIsHelpModalOpen(false);
    };
    if (nodes.length > 0 || edges.length > 0) showConfirm('加载示例', '加载示例将会覆盖当前画布上的所有内容，您确定要继续吗？', loadAction); else loadAction();
  }, [nodes, edges]);

  const processAiGeneratedGraph = (result: any, sourceNodePosition: { x: number; y: number }) => {
    const createdNodes: Node[] = []; const createdEdges: Edge[] = [];
    (result.characters || []).forEach((char: any, index: number) => {
        const charFields: KeyValueField[] = (char.fields || []).map((f: any, i: number) => ({ id: `cf_${index}_${i}`, key: f.key, value: f.value }));
        createdNodes.push({ id: `CHAR_ai_${Date.now()}_${index}`, type: NodeType.CHARACTER, position: { x: sourceNodePosition.x - 450, y: sourceNodePosition.y + index * 220 }, data: { title: char.title, fields: charFields }, isCollapsed: false, });
    });
    (result.settings || []).forEach((setting: any, index: number) => {
        const settingFields: KeyValueField[] = (setting.fields || []).map((f: any, i: number) => ({ id: `sf_${index}_${i}`, key: f.key, value: f.value }));
        createdNodes.push({ id: `SETTING_ai_${Date.now()}_${index}`, type: NodeType.SETTING, position: { x: sourceNodePosition.x, y: sourceNodePosition.y - 280 - (index * 240) }, data: { title: setting.title, fields: settingFields, narrativeStructure: 'single' }, isCollapsed: false, });
    });
    (result.environments || []).forEach((env: any, index: number) => {
        const envFields: KeyValueField[] = (env.fields || []).map((f: any, i: number) => ({ id: `ef_${index}_${i}`, key: f.key, value: f.value }));
        createdNodes.push({ id: `ENV_ai_${Date.now()}_${index}`, type: NodeType.ENVIRONMENT, position: { x: sourceNodePosition.x - 450, y: sourceNodePosition.y - 480 - (index * 240) }, data: { title: env.title, fields: envFields }, isCollapsed: false, });
    });
    (result.styles || []).forEach((style: any, index: number) => {
        const libraryStyle = style.id ? STORY_STYLES.find(s => s.id === style.id) : null;
        createdNodes.push({ id: `STYLE_ai_${Date.now()}_${index}`, type: NodeType.STYLE, position: { x: sourceNodePosition.x - 450, y: sourceNodePosition.y - 280 - (index * 180) }, data: { styleId: style.id ?? -1, title: libraryStyle?.name || style.title, description: libraryStyle?.description || style.description || '自定义风格', applicationMethod: 'appropriate' }, isCollapsed: false, });
    });
    if (result.structures?.start) {
        const start = result.structures.start; const libraryStart = start.id ? STORY_STRUCTURES.find(s => s.id === start.id) : null;
        createdNodes.push({ id: `STRUCTURE_start_${Date.now()}`, type: NodeType.STRUCTURE, position: {x: sourceNodePosition.x + 450, y: sourceNodePosition.y - 220 }, data: { structureId: start.id ?? -1, title: libraryStart?.name || start.title, description: libraryStart?.description || start.description || '', category: StructureCategory.STARTING, userInput: start.userInput || '' }, isCollapsed: false, });
    }
    if (result.structures?.end) {
        const end = result.structures.end; const libraryEnd = end.id ? STORY_STRUCTURES.find(s => s.id === end.id) : null;
        const totalPlots = (result.plots?.length || 0) + (result.plots_a?.length || 0);
        createdNodes.push({ id: `STRUCTURE_end_${Date.now()}`, type: NodeType.STRUCTURE, position: {x: sourceNodePosition.x + 450, y: sourceNodePosition.y + 220 + (totalPlots * 220) }, data: { structureId: end.id ?? -1, title: libraryEnd?.name || end.title, description: libraryEnd?.description || end.description || '', category: StructureCategory.ENDING, userInput: end.userInput || '' }, isCollapsed: false, });
    }
    const processPlots = (plotList: any[], line: 'a' | 'b' | 'single', yOffsetStart: number, xOffset: number) => {
        (plotList || []).forEach((plot: any, index: number) => {
            const libraryPlot = plot.id ? STORY_PLOTS.find(p => p.id === plot.id) : null;
            createdNodes.push({ id: `PLOT_ai_${line}_${Date.now()}_${index}`, type: NodeType.PLOT, position: { x: sourceNodePosition.x + xOffset, y: yOffsetStart + index * 220 }, data: { plotId: plot.id ?? -1, title: libraryPlot?.name || plot.title, description: libraryPlot?.description || plot.description || '自定义情节', userInput: plot.userInput || '' }, isCollapsed: false, });
        });
    };
    processPlots(result.plots, 'single', sourceNodePosition.y, 450); processPlots(result.plots_a, 'a', sourceNodePosition.y, 450); processPlots(result.plots_b, 'b', sourceNodePosition.y + 400, 450);
    const allPossibleNodes = [...nodes, ...createdNodes];
    (result.connections || []).forEach((conn: { sourceTitle: string, targetTitle: string, sourceHandle?: string, targetHandle?: string }) => {
        const source = allPossibleNodes.find(n => (n.data as any).title === conn.sourceTitle);
        const target = allPossibleNodes.find(n => (n.data as any).title === conn.targetTitle);
        if (source && target) createdEdges.push({ id: `edge_ai_${source.id}_${target.id}_${Date.now()}`, source: source.id, target: target.id, sourceHandle: conn.sourceHandle, targetHandle: conn.targetHandle });
    });
    setNodes(prev => [...prev, ...createdNodes]); setEdges(prev => [...prev, ...createdEdges]);
  }

  const handleAnalyzeWork = async (nodeId: string, content: string) => {
    startProgress(`analyze_${nodeId}`);
    try {
        const result = await analyzeWork(content, nodes, model);
        const sourceNode = nodes.find(n => n.id === nodeId);
        if (!sourceNode) return;
        stopProgress(() => processAiGeneratedGraph(result, sourceNode.position));
    } catch (error) {
        stopProgress(() => { console.error(error); showAlert("解析失败", error instanceof Error ? error.message : '发生未知错误'); });
    }
  };

  const handleExpandSetting = async (nodeId: string) => {
    startProgress(`expand_${nodeId}`);
    try {
        const sourceNode = nodes.find(n => n.id === nodeId) as Node<SettingNodeData>;
        if (!sourceNode) { stopProgress(() => {}); return; };
        const result = await expandSetting(sourceNode.data, nodes, model);
        stopProgress(() => processAiGeneratedGraph(result, sourceNode.position));
    } catch (error) {
        stopProgress(() => { console.error(error); showAlert("扩展失败", error instanceof Error ? error.message : '发生未知错误'); });
    }
  };

  const handleGenerateOutline = async () => {
    startProgress('outline', '正在生成大纲...');
    try {
        const language = getLanguageFromNodes(nodes);
        const wordCount = targetWordCount ? parseInt(targetWordCount, 10) : undefined;
        if (targetWordCount && (isNaN(wordCount) || wordCount < 0)) { showAlert("输入无效", "目标字数必须是一个有效的正数。"); stopProgress(); return; }
        const result = await withRetry((currentModel) => generateOutline(nodes, edges, language, currentModel, wordCount));
        stopProgress(() => {
            setOutlineHistory([result]); setCurrentOutlineIndex(0);
            setAssetLibrary(prev => [...prev, { type: 'outline', content: result, title: `大纲: ${result.title}`, timestamp: new Date() }]);
            setModalContent('outline');
        });
    } catch (err) { stopProgress(() => showAlert("生成大纲失败", `${err instanceof Error ? err.message : '未知错误'}`)); }
  };

  const handleGenerateStoryFromOutline = async () => {
    if (!currentOutline || !currentOutline.segments || currentOutline.segments.length === 0) { showAlert("无法生成", "请先生成一个有效的故事大纲。"); return; }
    setModalContent(null);
    const language = getLanguageFromNodes(nodes);
    const isShortForm = currentOutline.segments.length > 0 && currentOutline.segments[0].key_events && !currentOutline.segments[0].chapters;
    if (isShortForm) {
        startProgress('story', '正在创作短篇故事...');
        try {
            const finalStory = await withRetry((currentModel) => generateShortStory(nodes, edges, currentOutline, language, currentModel));
            stopProgress(() => {
                setStoryHistory([finalStory]); setCurrentStoryIndex(0);
                setAssetLibrary(prev => [...prev, { type: 'story', content: finalStory, title: `故事: ${currentOutline.title}`, timestamp: new Date() }]);
                setModalContent('story');
            });
        } catch (err) { stopProgress(() => showAlert("故事创作失败", `${err instanceof Error ? err.message : '未知错误'}`)); }
    } else {
        const totalChapters = currentOutline.segments.reduce((acc, s) => acc + (s.chapters?.length || 0), 0);
        startSteppedProgress('story', `正在准备创作 (共 ${totalChapters} 章)...`, totalChapters);
        let accumulatedStory = "", storyParts: string[] = [], chaptersDone = 0, currentModelForLoop = model;
        try {
            for (let i = 0; i < currentOutline.segments.length; i++) {
                const segment = currentOutline.segments[i];
                if (!segment.chapters) continue;
                for (let j = 0; j < segment.chapters.length; j++) {
                    chaptersDone++; setProgressMessage(`正在创作第 ${chaptersDone} / ${totalChapters} 章...`);
                    let success = false, attempts = 0;
                    while (!success && attempts < 2) {
                        try {
                            const newChapterText = await generateStoryChapter(nodes, edges, currentOutline, accumulatedStory, i, j, language, currentModelForLoop);
                            storyParts.push(newChapterText); accumulatedStory += (accumulatedStory ? "\n\n" : "") + newChapterText;
                            success = true; completeStepAndAdvance();
                        } catch (err) {
                            attempts++; if (attempts >= 2) throw err;
                            const nextModel = getNextModelForRetry(currentModelForLoop);
                            setProgressMessage(`创作第 ${chaptersDone} 章失败，正在使用“${modelDisplayNames[nextModel] || nextModel}”模型重试...`);
                            setModel(nextModel); currentModelForLoop = nextModel;
                        }
                    }
                }
            }
            stopProgress(() => {
                const finalStory = storyParts.join('\n\n');
                setStoryHistory([finalStory]); setCurrentStoryIndex(0);
                setAssetLibrary(prev => [...prev, { type: 'story', content: finalStory, title: `故事: ${currentOutline.title}`, timestamp: new Date() }]);
                setModalContent('story');
            });
        } catch (err) { stopProgress(() => showAlert("故事创作失败", `在创作第 ${chaptersDone} 章时出错: ${err instanceof Error ? err.message : '未知错误'}`)); }
    }
  }

  const handleGenerateStoryDirectly = async () => {
    startProgress('story', '正在构思大纲...');
    try {
        const language = getLanguageFromNodes(nodes);
        const wordCount = parseInt(targetWordCount, 10);
        const tempOutline = await withRetry((currentModel) => generateOutline(nodes, edges, language, currentModel, wordCount));
        setOutlineHistory([tempOutline]); setCurrentOutlineIndex(0);
        setProgressMessage('正在创作故事...');
        const finalStory = await withRetry((currentModel) => generateShortStory(nodes, edges, tempOutline, language, currentModel));
        stopProgress(() => {
            setStoryHistory([finalStory]); setCurrentStoryIndex(0);
            setAssetLibrary(prev => [...prev, { type: 'outline', content: tempOutline, title: `大纲: ${tempOutline.title}`, timestamp: new Date() }]);
            setAssetLibrary(prev => [...prev, { type: 'story', content: finalStory, title: `故事: ${tempOutline.title}`, timestamp: new Date() }]);
            setModalContent('story');
        });
    } catch (err) { stopProgress(() => showAlert("故事创作失败", `${err instanceof Error ? err.message : '未知错误'}`)); }
  }

  const handleGenerateStory = () => {
    const targetWordCountInt = parseInt(targetWordCount, 10);
    const canGenerateStoryDirectly = !isNaN(targetWordCountInt) && targetWordCountInt > 0 && targetWordCountInt <= 2000;
    if (currentOutline) handleGenerateStoryFromOutline(); else if (canGenerateStoryDirectly) handleGenerateStoryDirectly(); else showAlert("无法生成", "请先生成一个故事大纲，或设定一个低于2000的目标字数以直接生成短篇故事。");
  };

  const updateAssetOnUndoRedo = (oldContent: StructuredOutline | string, newContent: StructuredOutline | string, type: 'outline' | 'story') => {
    setAssetLibrary(prev => {
        let assetIndex = -1;
        for (let i = prev.length - 1; i >= 0; i--) {
            if (prev[i].type === type) {
                const contentMatches = type === 'outline' ? JSON.stringify(prev[i].content) === JSON.stringify(oldContent) : prev[i].content === oldContent;
                if (contentMatches) { assetIndex = i; break; }
            }
        }
        if (assetIndex > -1) {
            const newAssets = [...prev];
            const updatedAsset = { ...newAssets[assetIndex], content: newContent };
            if (type === 'outline') updatedAsset.title = `大纲: ${(newContent as StructuredOutline).title}`;
            newAssets[assetIndex] = updatedAsset; return newAssets;
        } return prev;
    });
  };

  const handleUndoRedo = (type: 'outline' | 'story', action: 'undo' | 'redo') => {
    if (type === 'outline') {
        const newIndex = action === 'undo' ? currentOutlineIndex - 1 : currentOutlineIndex + 1;
        if (newIndex >= 0 && newIndex < outlineHistory.length) { updateAssetOnUndoRedo(outlineHistory[currentOutlineIndex], outlineHistory[newIndex], 'outline'); setCurrentOutlineIndex(newIndex); }
    } else {
        const newIndex = action === 'undo' ? currentStoryIndex - 1 : currentStoryIndex + 1;
        if (newIndex >= 0 && newIndex < storyHistory.length) { updateAssetOnUndoRedo(storyHistory[currentStoryIndex], storyHistory[newIndex], 'story'); setCurrentStoryIndex(newIndex); }
    }
  };

  const handleRevise = async () => { if (modalContent === 'outline') await handleReviseOutline(); if (modalContent === 'story') await handleReviseStory(); };
  const handleReviseOutline = async () => {
    if (!currentOutline || !revisionPrompt.trim()) return;
    startProgress('revise_outline', '正在修改大纲...');
    try {
        const language = getLanguageFromNodes(nodes);
        const revisedOutline = await withRetry((currentModel) => reviseOutline(currentOutline, revisionPrompt, language, currentModel));
        stopProgress(() => {
            setPendingRevision({ type: 'outline', content: revisedOutline });
            setRevisionPrompt('');
        });
    } catch (err) { stopProgress(() => showAlert("修改大纲失败", `${err instanceof Error ? err.message : '未知错误'}`)); }
  };
  const handleReviseStory = async () => {
    if (!currentStory || !revisionPrompt.trim()) return;
    startProgress('revise_story', '正在修改故事...');
    try {
        const language = getLanguageFromNodes(nodes);
        const revisedStory = await withRetry((currentModel) => reviseStory(currentStory, revisionPrompt, language, currentModel));
        stopProgress(() => {
            setPendingRevision({ type: 'story', content: revisedStory });
            setRevisionPrompt('');
        });
    } catch (err) { stopProgress(() => showAlert("修改故事失败", `${err instanceof Error ? err.message : '未知错误'}`)); }
  };

  const handleAcceptRevision = () => {
    if (!pendingRevision) return;
    if (pendingRevision.type === 'outline') {
      const newContent = pendingRevision.content as StructuredOutline;
      const oldContent = currentOutline;
      const newHistory = [...outlineHistory.slice(0, currentOutlineIndex + 1), newContent];
      setOutlineHistory(newHistory);
      setCurrentOutlineIndex(newHistory.length - 1);
      updateAssetOnUndoRedo(oldContent, newContent, 'outline');
    } else { // 'story'
      const newContent = pendingRevision.content as string;
      const oldContent = currentStory;
      const newHistory = [...storyHistory.slice(0, currentStoryIndex + 1), newContent];
      setStoryHistory(newHistory);
      setCurrentStoryIndex(newHistory.length - 1);
      updateAssetOnUndoRedo(oldContent, newContent, 'story');
    }
    setPendingRevision(null);
  };
  
  const handleRevertRevision = () => {
    setPendingRevision(null);
  };

  const sanitizeAIGraphState = (graph: { nodes: Node[], edges: Edge[] }): { nodes: Node[], edges: Edge[] } => {
    if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) throw new Error("AI did not return a valid graph object with nodes and edges.");
    let lastPosition = { x: 200, y: 200 };
    if (nodes.length > 0) { nodes.forEach(n => { if (n.position && n.position.x > lastPosition.x) lastPosition.x = n.position.x; }); lastPosition.x += 400; }
    const sanitizedNodes = graph.nodes.map(node => {
        if (!node.position || typeof node.position.x !== 'number' || typeof node.position.y !== 'number') { node.position = { x: lastPosition.x, y: lastPosition.y }; lastPosition.y += 220; }
        if (!node.data) node.data = {} as any;
        switch (node.type) {
            case NodeType.CHARACTER: case NodeType.SETTING: case NodeType.ENVIRONMENT: if (!Array.isArray((node.data as any).fields)) (node.data as any).fields = []; break;
            case NodeType.PLOT: if (typeof (node.data as PlotNodeData).title !== 'string') (node.data as PlotNodeData).title = '无标题情节'; if (typeof (node.data as PlotNodeData).description !== 'string') (node.data as PlotNodeData).description = ''; break;
        } return node;
    });
    const allNodeIds = new Set(sanitizedNodes.map(n => n.id));
    const sanitizedEdges = graph.edges.filter(edge => edge && typeof edge.source === 'string' && typeof edge.target === 'string' && allNodeIds.has(edge.source) && allNodeIds.has(edge.target));
    return { nodes: sanitizedNodes, edges: sanitizedEdges };
  };

  const handleAssistantSubmit = async (prompt: string) => {
    const currentState = { nodes, edges }; 
    setPreviousGraphState(currentState);
    startProgress('assistant', "AI助手正在执行操作...");
    setAssistantMessage("AI助手正在执行操作...");
    try {
        const newGraphState = await modifyGraphWithAssistant(prompt, currentState.nodes, currentState.edges, model);
        const sanitizedGraph = sanitizeAIGraphState(newGraphState);
        stopProgress(() => {
            setNodes(sanitizedGraph.nodes); 
            setEdges(sanitizedGraph.edges);
            setAssistantMessage("操作完成！请确认或回退。"); 
            setIsAwaitingAIAssistantConfirmation(true);
        });
    } catch (error) {
        console.error("AI Assistant Error:", error);
        const errorMessage = error instanceof Error ? error.message : "发生未知错误。";
        cancelProgress();
        setAssistantMessage(`错误: ${errorMessage}`); 
        showAlert("AI 助手出错", errorMessage);
        setPreviousGraphState(null); 
        setTimeout(() => setAssistantMessage(null), 5000);
    }
  };
  
  const handleAcceptChanges = () => {
    setPreviousGraphState(null); setIsAwaitingAIAssistantConfirmation(false);
    setAssistantMessage("更改已接受。"); setTimeout(() => setAssistantMessage(null), 3000);
  };

  const handleRevertChanges = () => {
    if (previousGraphState) { setNodes(previousGraphState.nodes); setEdges(previousGraphState.edges); }
    setPreviousGraphState(null); setIsAwaitingAIAssistantConfirmation(false);
    setAssistantMessage("操作已撤销。"); setTimeout(() => setAssistantMessage(null), 3000);
  };

  const handleCopy = async (content: string) => {
    if (!content) { showAlert('复制失败', '没有可复制的内容。'); return; }
    try { await navigator.clipboard.writeText(content); showAlert('复制成功', '内容已复制到剪贴板！'); } catch (err) { console.error('无法复制文本: ', err); showAlert('复制失败', '无法将内容复制到剪贴板。请检查浏览器权限。'); }
  };
  
  const handleTocClick = (id: string) => storyContentRef.current?.querySelector(`#${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const handleWordCountChange = (e: React.ChangeEvent<HTMLInputElement>) => { const val = e.target.value; if (val === '') { setTargetWordCount(''); return; } const num = parseInt(val, 10); if (isNaN(num)) return; if (num < 0) setTargetWordCount(''); else setTargetWordCount(val); };
  const adjustWordCount = (amount: number) => { const current = parseInt(targetWordCount, 10) || 0; const newValue = Math.max(0, current + amount); setTargetWordCount(String(newValue)); };
  const handleDeleteAsset = (timestamp: Date) => showConfirm('删除资产', '您确定要删除这个项目吗？此操作无法撤销。', () => setAssetLibrary(prev => prev.filter(asset => asset.timestamp !== timestamp)));
  const handleStartRenameAsset = (asset: Asset) => setRenamingState({ id: asset.timestamp.toISOString(), name: asset.title });
  const handleConfirmRenameAsset = () => { if (!renamingState.id || !renamingState.name.trim()) return; setAssetLibrary(prev => prev.map(asset => asset.timestamp.toISOString() === renamingState.id ? { ...asset, title: renamingState.name.trim() } : asset )); setRenamingState({ id: null, name: '' }); };
  const handleCancelRenameAsset = () => setRenamingState({ id: null, name: '' });
  const handleImportAssetAsNode = (asset: Asset) => { 
    const content = typeof asset.content === 'string' ? asset.content : JSON.stringify(asset.content, null, 2); 
    addNode(NodeType.WORK, { title: asset.title, content }); 
    if (isMobile) {
        setMobileView('workspace');
    } else {
        setIsAssetLibraryOpen(false);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isMobile && mobileView !== 'workspace') { dragStartRef.current = null; return; }
    if (!isMobile && window.innerWidth >= 768) { dragStartRef.current = null; return; } // On md screens and up, sidebar is visible, so disable touch gestures.

    const x = e.targetTouches[0].clientX; const target = e.target as HTMLElement;
    const isTouchingSidebar = sidebarRef.current?.contains(target);
    const isEdgeArea = x < 80;
    if (isSidebarOpen && isTouchingSidebar) dragStartRef.current = { x, wasOpen: true }; else if (!isSidebarOpen && isEdgeArea) { dragStartRef.current = { x, wasOpen: false }; setSidebarDragOffset(-sidebarWidth); } else dragStartRef.current = null;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!dragStartRef.current) return;
    if (e.cancelable) e.preventDefault();
    const x = e.targetTouches[0].clientX; const deltaX = x - dragStartRef.current.x;
    const startPosition = dragStartRef.current.wasOpen ? 0 : -sidebarWidth;
    const newPosition = Math.max(-sidebarWidth, Math.min(0, startPosition + deltaX));
    setSidebarDragOffset(newPosition);
  };
  const handleTouchEnd = () => {
    if (dragStartRef.current === null || sidebarDragOffset === null) return;
    const { wasOpen } = dragStartRef.current; const threshold = sidebarWidth / 4;
    if (wasOpen) { if (sidebarDragOffset < -threshold) setIsSidebarOpen(false); else setIsSidebarOpen(true); } else { if (sidebarDragOffset > -sidebarWidth + threshold) setIsSidebarOpen(true); else setIsSidebarOpen(false); }
    dragStartRef.current = null; setSidebarDragOffset(null);
  };

  const handleCancel = () => showConfirm('确认取消', '您确定要取消当前正在进行的 AI 任务吗？此操作无法撤销。', cancelProgress);
  const sanitizeFilename = (name: string) => name.replace(/[:/\\?*|"<>]/g, '_').trim() || 'Untitled';
  const markdownToPlainText = (markdown: string): string => markdown.replace(/^(#{1,6})\s/gm, '').replace(/(\*\*|__)(.*?)\1/g, '$2').replace(/(\*|_)(.*?)\1/g, '$2').replace(/~~(.*?)~~/g, '$1').replace(/`([^`]+)`/g, '$1').replace(/^> (.*$)/gm, '$1').replace(/^(\*|\+|-)\s/gm, '').replace(/!\[(.*?)\]\(.*?\)/g, '$1').replace(/\[(.*?)\]\(.*?\)/g, '$1').replace(/(\r\n|\n|\r)/gm, "\n").trim();
  const outlineToPlainText = (outline: StructuredOutline): string => { let text = `标题: ${outline.title}\n\n`; outline.segments.forEach((segment, sIndex) => { text += `第 ${sIndex + 1} 部分: ${segment.segment_title} (预计 ${segment.estimated_word_count} 字)\n------------------------------------------\n`; if (segment.chapters) segment.chapters.forEach(chapter => { text += `  第 ${chapter.chapter_number} 章: ${chapter.chapter_title}\n`; if (chapter.point_of_view) text += `    视角: ${chapter.point_of_view}\n`; if (chapter.setting) text += `    场景: ${chapter.setting}\n`; text += `    关键情节:\n`; chapter.key_events.forEach(event => { text += `      - ${event}\n`; }); text += '\n'; }); else if (segment.key_events) { text += `  关键情节:\n`; segment.key_events.forEach(event => { text += `    - ${event}\n`; }); text += '\n'; } }); return text; };
  const markdownToDocx = async (markdown: string, title: string) => { const { Document, Packer, Paragraph, TextRun, HeadingLevel } = docx; const children = []; const lines = markdown.split('\n'); for (const line of lines) { if (line.trim() === '') { children.push(new Paragraph({ text: '' })); continue; } const headingMatch = line.match(/^(#{1,3})\s(.+)/); if (headingMatch) { const level = headingMatch[1].length; const text = headingMatch[2]; const headingLevel = level === 1 ? HeadingLevel.HEADING_1 : level === 2 ? HeadingLevel.HEADING_2 : level === 3 ? HeadingLevel.HEADING_3 : undefined; children.push(new Paragraph({ text, heading: headingLevel })); continue; } const textRuns = []; const parts = line.split(/(\*\*.*?\*\*|\*.*?\*)/g).filter(p => p); for (const part of parts) { if (part.startsWith('**') && part.endsWith('**')) textRuns.push(new TextRun({ text: part.slice(2, -2), bold: true })); else if (part.startsWith('*') && part.endsWith('*')) textRuns.push(new TextRun({ text: part.slice(1, -1), italics: true })); else textRuns.push(new TextRun({ text: part })); } children.push(new Paragraph({ children: textRuns })); } const doc = new Document({ sections: [{ children }] }); const blob = await Packer.toBlob(doc); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${sanitizeFilename(title)}.docx`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); };
  const handleDownloadAsset = async (asset: Asset, format: 'txt' | 'json' | 'md' | 'docx') => { const filename = sanitizeFilename(asset.title); let contentStr = ''; let blobType = 'text/plain;charset=utf-8'; let extension = format; if (asset.type === 'outline') { const outline = asset.content as StructuredOutline; if (format === 'json') { contentStr = JSON.stringify(outline, null, 2); blobType = 'application/json;charset=utf-8'; } else contentStr = outlineToPlainText(outline); } else { const story = asset.content as string; if (format === 'md') contentStr = story; else if (format === 'txt') contentStr = markdownToPlainText(story); else if (format === 'docx') { await markdownToDocx(story, filename); return; } } const blob = new Blob([contentStr], { type: blobType }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${filename}.${extension}`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); };
  const handleDownloadFromResultModal = (type: 'outline' | 'story', format: 'txt' | 'json' | 'md' | 'docx') => { const asset: Asset = type === 'outline' ? { type: 'outline', content: currentOutline!, title: currentOutline?.title || '大纲', timestamp: new Date() } : { type: 'story', content: currentStory, title: currentOutline?.title || '故事', timestamp: new Date() }; handleDownloadAsset(asset, format); };
  const handleExportAllAssets = async () => { if (assetLibrary.length === 0) { showAlert("导出失败", "资产库中没有内容可以导出。"); return; } const zip = new JSZip(); for (const asset of assetLibrary) { const filename = sanitizeFilename(asset.title); if (asset.type === 'outline') zip.file(`${filename}.txt`, outlineToPlainText(asset.content as StructuredOutline)); else zip.file(`${filename}.txt`, markdownToPlainText(asset.content as string)); } const zipBlob = await zip.generateAsync({ type: "blob" }); const url = URL.createObjectURL(zipBlob); const a = document.createElement('a'); a.href = url; a.download = 'Genodel_Assets_Export.zip'; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); };
  const bringNodeToFront = useCallback((nodeId: string) => setNodes(nds => { const nodeToMove = nds.find(n => n.id === nodeId); if (!nodeToMove) return nds; const otherNodes = nds.filter(n => n.id !== nodeId); return [...otherNodes, nodeToMove]; }), []);

  const handleOpenAssets = () => {
    if (isMobile) {
        setMobileView('assets');
    } else {
        setIsAssetLibraryOpen(true);
    }
  };

  const handleMinimapNodeClick = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    const editor = editorRef.current;
    if (!node || !editor) return;

    // Use a fixed approximation for node dimensions for simplicity
    const nodeWidthOnCanvas = 320 * transform.scale;
    const nodeHeightOnCanvas = 200 * transform.scale;

    const newX = -node.position.x * transform.scale + (editor.clientWidth / 2) - (nodeWidthOnCanvas / 2);
    const newY = -node.position.y * transform.scale + (editor.clientHeight / 2) - (nodeHeightOnCanvas / 2);

    setTransform(t => ({ ...t, x: newX, y: newY }));
  }, [nodes, transform.scale]);

  const handleMinimapPan = useCallback((newTransform: { x: number; y: number; scale: number }) => {
    setTransform(newTransform);
  }, []);

  const renderAssetLibraryPage = (isModal: boolean) => {
    return (
        <div className={`w-full h-full flex flex-col ${isModal ? 'max-h-[70vh]' : 'p-4 bg-slate-100 dark:bg-slate-950'}`}>
            {!isModal && (
                <div className="flex justify-between items-center mb-4 flex-shrink-0">
                    <h1 className="text-4xl font-bold text-monet-dark dark:text-blue-400">资产库</h1>
                    <button onClick={handleExportAllAssets} className="flex items-center space-x-2 px-4 h-10 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100 transition-colors btn-material" title="全部导出为ZIP">
                        <ArchiveIcon className="h-5 w-5"/>
                        <span className="text-sm font-medium">全部导出</span>
                    </button>
                </div>
            )}
            <div className="flex-grow min-h-0 overflow-y-auto">
                 {assetLibrary.length === 0 ? (
                    <p className="text-center text-slate-500 dark:text-slate-400 py-12 text-lg">资产库为空。请先生成大纲或故事。</p>
                ) : (
                    <ul className="space-y-3">
                        {assetLibrary.slice().reverse().map((asset) => {
                            const isRenamingThis = renamingState.id === asset.timestamp.toISOString();
                            const handlePreview = () => {
                                if (asset.type === 'outline') { setOutlineHistory([asset.content as StructuredOutline]); setCurrentOutlineIndex(0); setModalContent('outline'); } else { setStoryHistory([asset.content as string]); setCurrentStoryIndex(0); setModalContent('story'); }
                                setCameFromAssetLibrary(true);
                                if (isModal) setIsAssetLibraryOpen(false);
                            };
                            return (
                                <li key={asset.timestamp.toISOString()} 
                                    className="p-4 bg-monet-medium/40 dark:bg-slate-800/50 rounded-2xl hover:bg-monet-medium/80 dark:hover:bg-slate-700/50 transition-colors"
                                    onClick={(e) => {
                                        if (isMobile && !(e.target as HTMLElement).closest('button, [role="button"], a, input, textarea')) {
                                            handlePreview();
                                        }
                                    }}
                                >
                                    <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
                                        {isRenamingThis ? (
                                            <div className="flex items-center space-x-2 w-full">
                                                <input type="text" value={renamingState.name} onChange={(e) => setRenamingState(s => ({ ...s, name: e.target.value }))} onKeyDown={(e) => { if (e.key === 'Enter') handleConfirmRenameAsset(); if (e.key === 'Escape') handleCancelRenameAsset(); }} className="w-full bg-slate-300 dark:bg-slate-700 text-sm p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors" autoFocus />
                                                <button onClick={handleConfirmRenameAsset} className="p-2 text-green-500 hover:text-green-400 transition-transform btn-material rounded-full"><CheckIcon className="h-5 w-5"/></button>
                                                <button onClick={handleCancelRenameAsset} className="p-2 text-red-500 hover:text-red-400 transition-transform btn-material rounded-full"><XIcon className="h-5 w-5"/></button>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="flex-grow min-w-0 md:mr-4">
                                                    <div className="flex justify-between items-center">
                                                        <div className="min-w-0 mr-2" onClick={handlePreview}>
                                                            <p className="font-semibold text-lg truncate" title={asset.title}>{asset.title}</p>
                                                            <p className="text-sm text-slate-500 dark:text-slate-400">{asset.type === 'outline' ? '大纲' : '故事'}</p>
                                                        </div>
                                                        <button onClick={(e) => { e.stopPropagation(); handleStartRenameAsset(asset); }} className="h-11 w-11 flex md:hidden items-center justify-center bg-indigo-200 text-indigo-800 dark:bg-indigo-900/80 dark:text-indigo-200 rounded-full hover:bg-indigo-300 dark:hover:bg-indigo-800 transition-all flex-shrink-0 btn-material" title="重命名"><PencilIcon className="h-5 w-5"/></button>
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-start space-x-2 flex-shrink-0 w-full md:w-auto">
                                                    <button onClick={handlePreview} className="h-11 hidden md:flex items-center justify-center bg-blue-200 text-blue-800 dark:bg-blue-900/80 dark:text-blue-200 rounded-full hover:bg-blue-300 dark:hover:bg-blue-800 transition-all w-11 btn-material" title="预览"><EyeIcon className="h-6 w-6"/></button>
                                                    <button onClick={(e) => { e.stopPropagation(); handleImportAssetAsNode(asset); }} className="h-11 flex items-center justify-center bg-emerald-200 text-emerald-800 dark:bg-emerald-900/80 dark:text-emerald-200 rounded-full hover:bg-emerald-300 dark:hover:bg-emerald-800 transition-all px-4 md:w-11 md:px-0 btn-material" title="导入为作品节点"><DocumentAddIcon className="h-6 w-6"/><span className="md:hidden ml-2 font-medium text-sm">导入</span></button>
                                                    <DownloadDropdown asset={asset} onSelectFormat={handleDownloadAsset} isMobile={isMobile} />
                                                    <button onClick={(e) => { e.stopPropagation(); handleStartRenameAsset(asset); }} className="h-11 w-11 hidden md:flex items-center justify-center bg-indigo-200 text-indigo-800 dark:bg-indigo-900/80 dark:text-indigo-200 rounded-full hover:bg-indigo-300 dark:hover:bg-indigo-800 transition-all btn-material" title="重命名"><PencilIcon className="h-5 w-5"/></button>
                                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteAsset(asset.timestamp); }} className="h-11 flex items-center justify-center bg-red-500/10 text-red-700 dark:text-red-400 rounded-full hover:bg-red-500/20 transition-all px-4 md:w-11 md:px-0 btn-material" title="删除"><TrashIcon className="h-5 w-5"/><span className="md:hidden ml-2 font-medium text-sm">删除</span></button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </li>
                            )
                        })}
                    </ul>
                )}
            </div>
        </div>
    );
  };

  return (
    <ErrorBoundary>
        <div className="w-screen h-screen font-sans flex overflow-hidden" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
            {isMobile ? (
                 <div className="w-full h-full flex flex-col overflow-hidden">
                    <main className="relative flex-1 min-h-0">
                         {mobileView === 'workspace' && (
                             <Sidebar
                                 sidebarRef={sidebarRef} onAddNode={handleAddNodeFromWorkspaceSidebar} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} dragOffset={sidebarDragOffset} isMobile={true} isPageView={false}
                             />
                         )}
                         <div className={`w-full h-full ${mobileView === 'workspace' ? 'block' : 'hidden'}`}>
                            {!isSidebarOpen && (
                                <button onClick={() => setIsSidebarOpen(true)} className="fixed top-4 left-4 z-40 p-3 bg-slate-200/60 dark:bg-slate-900/60 backdrop-blur-md rounded-2xl text-slate-800 dark:text-white btn-material" aria-label="Open sidebar">
                                    <MenuIcon />
                                </button>
                            )}
                            <div onClick={() => setIsSidebarOpen(false)} className={`fixed inset-0 bg-black z-20 transition-opacity duration-300 ${isSidebarOpen ? 'opacity-40' : 'opacity-0 pointer-events-none'}`} />
                            <NodeEditor nodes={nodes} edges={edges} transform={transform} setTransform={setTransform} onNodesChange={setNodes} onEdgesChange={setEdges} onUpdateNodeData={updateNodeData} onDeleteNode={deleteNode} onToggleNodeCollapse={handleToggleNodeCollapse} onAnalyzeWork={handleAnalyzeWork} onExpandSetting={handleExpandSetting} onNodeSelect={bringNodeToFront} activeProgressTask={activeProgressTask} progress={progress} editorRef={editorRef} highlightedNodeId={highlightedNodeId} setHighlightedNodeId={setHighlightedNodeId} />
                            <Toolbar model={model} setModel={setModel} isGenerating={isAnyTaskRunning} onClearAllNodes={handleClearAllNodes} onImportNodes={triggerImport} onExportNodes={handleExportNodes} onLayoutNodes={handleLayoutNodes} layoutMode={layoutMode} theme={theme} setTheme={setTheme} isMinimapOpen={isMinimapOpen} onToggleMinimap={() => setIsMinimapOpen(p => !p)} />
                         </div>
                         {mobileView === 'library' && (
                             <div className="h-full flex flex-col">
                                <div className="flex-grow overflow-y-auto">
                                    <Sidebar sidebarRef={sidebarRef} onAddNode={addNodeToTray} isOpen={true} onClose={()=>{}} dragOffset={null} isMobile={true} isPageView={true} />
                                </div>
                                {trayNodes.length > 0 && <NodeTray nodes={trayNodes} onRemove={removeNodeFromTray} onInsert={insertNodesFromTray} />}
                             </div>
                         )}
                         {mobileView === 'assets' && renderAssetLibraryPage(false)}
                    </main>
                    {mobileView === 'workspace' && (
                        <>
                            {isAnyTaskRunning && (
                                <div className="absolute bottom-48 right-5 z-40 flex flex-col items-end gap-4 pointer-events-none">
                                    {(activeProgressTask === 'outline' || activeProgressTask === 'story' || activeProgressTask?.startsWith('revise')) && (
                                        <div className="bg-slate-200/60 dark:bg-slate-900/60 backdrop-blur-lg p-5 rounded-3xl shadow-lg w-64 border border-slate-300/50 dark:border-slate-800/50 animate-scale-in pointer-events-auto">
                                            <h4 className="font-bold text-lg text-slate-800 dark:text-slate-200 truncate">{progressMessage || '正在处理...'}</h4>
                                            <div className="w-full bg-slate-300/70 rounded-full h-2.5 dark:bg-slate-700/70 mt-3"><div className="bg-blue-500 h-2.5 rounded-full" style={{ width: `${progress}%`, transition: 'width 0.3s ease-in-out' }}></div></div>
                                            <p className="text-right text-sm font-semibold mt-1 text-slate-600 dark:text-slate-300">{progress}%</p>
                                        </div>
                                    )}
                                </div>
                            )}
                            <GenerationControls isAnyTaskRunning={isAnyTaskRunning} outline={currentOutline} targetWordCount={targetWordCount} onWordCountChange={handleWordCountChange} onAdjustWordCount={adjustWordCount} onGenerateOutline={handleGenerateOutline} onGenerateStory={handleGenerateStory} onOpenHelp={() => setIsHelpModalOpen(true)} onOpenAssets={handleOpenAssets} onCancel={handleCancel} onToggleAssistant={() => setIsAssistantPanelOpen(p => !p)} isAssistantOpen={isAssistantPanelOpen} isMobile={isMobile} />
                        </>
                    )}
                    <BottomNavBar activeView={mobileView} setActiveView={setMobileView} trayCount={trayNodes.length} />
                 </div>
            ) : (
                <>
                    <Sidebar sidebarRef={sidebarRef} onAddNode={addNode} isOpen={true} onClose={() => {}} dragOffset={null} />
                    <main className="relative flex-1 h-full">
                        <NodeEditor nodes={nodes} edges={edges} transform={transform} setTransform={setTransform} onNodesChange={setNodes} onEdgesChange={setEdges} onUpdateNodeData={updateNodeData} onDeleteNode={deleteNode} onToggleNodeCollapse={handleToggleNodeCollapse} onAnalyzeWork={handleAnalyzeWork} onExpandSetting={handleExpandSetting} onNodeSelect={bringNodeToFront} activeProgressTask={activeProgressTask} progress={progress} editorRef={editorRef} highlightedNodeId={highlightedNodeId} setHighlightedNodeId={setHighlightedNodeId} />
                        <Toolbar model={model} setModel={setModel} isGenerating={isAnyTaskRunning} onClearAllNodes={handleClearAllNodes} onImportNodes={triggerImport} onExportNodes={handleExportNodes} onLayoutNodes={handleLayoutNodes} layoutMode={layoutMode} theme={theme} setTheme={setTheme} isMinimapOpen={isMinimapOpen} onToggleMinimap={() => setIsMinimapOpen(p => !p)} />
                        {!isMobile && isMinimapOpen && (
                            <Minimap
                                nodes={nodes}
                                edges={edges}
                                transform={transform}
                                editorRef={editorRef}
                                onNodeClick={handleMinimapNodeClick}
                                onPan={handleMinimapPan}
                                onClose={() => setIsMinimapOpen(false)}
                                minimapState={minimapState}
                                setMinimapState={setMinimapState}
                            />
                        )}
                        {isAnyTaskRunning && (
                            <div className="absolute bottom-28 right-5 z-40 flex flex-col items-end gap-4 pointer-events-none">
                                {(activeProgressTask === 'outline' || activeProgressTask === 'story' || activeProgressTask?.startsWith('revise')) && (
                                    <div className="bg-slate-200/60 dark:bg-slate-900/60 backdrop-blur-lg p-5 rounded-3xl shadow-lg w-80 border border-slate-300/50 dark:border-slate-800/50 animate-scale-in pointer-events-auto">
                                        <h4 className="font-bold text-lg text-slate-800 dark:text-slate-200 truncate">{progressMessage || '正在处理...'}</h4>
                                        <div className="w-full bg-slate-300/70 rounded-full h-2.5 dark:bg-slate-700/70 mt-3"><div className="bg-blue-500 h-2.5 rounded-full" style={{ width: `${progress}%`, transition: 'width 0.3s ease-in-out' }}></div></div>
                                        <p className="text-right text-sm font-semibold mt-1 text-slate-600 dark:text-slate-300">{progress}%</p>
                                    </div>
                                )}
                            </div>
                        )}
                        <GenerationControls isAnyTaskRunning={isAnyTaskRunning} outline={currentOutline} targetWordCount={targetWordCount} onWordCountChange={handleWordCountChange} onAdjustWordCount={adjustWordCount} onGenerateOutline={handleGenerateOutline} onGenerateStory={handleGenerateStory} onOpenHelp={() => setIsHelpModalOpen(true)} onOpenAssets={handleOpenAssets} onCancel={handleCancel} onToggleAssistant={() => setIsAssistantPanelOpen(p => !p)} isAssistantOpen={isAssistantPanelOpen} isMobile={isMobile} />
                    </main>
                </>
            )}
        </div>
        
        <AIAssistant 
            isOpen={isAssistantPanelOpen} 
            onClose={() => setIsAssistantPanelOpen(false)} 
            onSubmit={handleAssistantSubmit} 
            isProcessing={activeProgressTask === 'assistant'} 
            progress={progress}
            message={assistantMessage} 
            isAwaitingConfirmation={isAwaitingAIAssistantConfirmation} 
            onAccept={handleAcceptChanges} 
            onRevert={handleRevertChanges} 
        />
        <HelpModal isOpen={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} onLoadExample={handleLoadExample} />
        <ResultModals 
            modalContent={modalContent} 
            outline={pendingRevision?.type === 'outline' ? pendingRevision.content : currentOutline}
            previousOutline={pendingRevision?.type === 'outline' ? currentOutline : previousOutline} 
            story={pendingRevision?.type === 'story' ? pendingRevision.content : currentStory} 
            previousStory={pendingRevision?.type === 'story' ? currentStory : previousStory} 
            storyHeadings={storyHeadings} 
            storyContentRef={storyContentRef} 
            isAnyTaskRunning={isAnyTaskRunning} 
            activeProgressTask={activeProgressTask} 
            progress={progress} 
            revisionPrompt={revisionPrompt} 
            onRevisionPromptChange={setRevisionPrompt} 
            onRevise={handleRevise} 
            isRevising={activeProgressTask === 'revise_outline' || activeProgressTask === 'revise_story'} 
            onClose={() => { setModalContent(null); setCameFromAssetLibrary(false); setPendingRevision(null); }} 
            onBack={cameFromAssetLibrary ? () => { setModalContent(null); if (isMobile) { setMobileView('assets'); } else { setIsAssetLibraryOpen(true); } setCameFromAssetLibrary(false); setPendingRevision(null); } : undefined} 
            onGenerateStory={handleGenerateStoryFromOutline} 
            onCopy={handleCopy} 
            onDownload={handleDownloadFromResultModal} 
            onTocClick={handleTocClick} 
            onHeadingsParse={setStoryHeadings} 
            canUndo={modalContent === 'outline' ? canUndoOutline : canUndoStory} 
            canRedo={modalContent === 'outline' ? canRedoOutline : canRedoStory} 
            onUndo={() => handleUndoRedo(modalContent!, 'undo')} 
            onRedo={() => handleUndoRedo(modalContent!, 'redo')}
            isAwaitingRevisionConfirmation={!!pendingRevision}
            onAcceptRevision={handleAcceptRevision}
            onRevertRevision={handleRevertRevision}
            isMobile={isMobile}
        />
        <AlertModal isOpen={alertModal.isOpen} onClose={closeAlert} title={alertModal.title}><p>{alertModal.message}</p></AlertModal>
        <ConfirmModal isOpen={confirmModal.isOpen} onCancel={closeConfirm} onConfirm={handleConfirm} title={confirmModal.title}><p>{confirmModal.message}</p></ConfirmModal>
        <input type="file" ref={fileInputRef} onChange={handleFileImport} style={{ display: 'none' }} accept=".json" />
        <Modal
            isOpen={!isMobile && isAssetLibraryOpen}
            onClose={() => setIsAssetLibraryOpen(false)}
            title="资产库"
            headerActions={
                 <button onClick={handleExportAllAssets} className="flex items-center space-x-2 px-4 h-10 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100 transition-colors btn-material" title="全部导出为ZIP">
                    <ArchiveIcon className="h-5 w-5"/>
                    <span className="text-sm font-medium hidden md:inline">全部导出</span>
                </button>
            }
        >
            {renderAssetLibraryPage(true)}
        </Modal>
    </ErrorBoundary>
  );
};

export default App;