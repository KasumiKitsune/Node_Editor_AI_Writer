import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Node, Edge, NodeType, CharacterNodeData, SettingNodeData, PlotNodeData, StyleNodeData, StructureNodeData, WorkNodeData, KeyValueField, StructureCategory, EnvironmentNodeData, StructuredOutline } from './types';
import { generateOutline, generateStoryChapter, generateShortStory, analyzeWork, expandSetting, reviseOutline, reviseStory } from './services/geminiService';
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
import { useProgress } from './hooks/useProgress';
// FIX: Added Modal and DownloadIcon to imports to resolve reference errors.
import Modal from './components/Modal';
import { MenuIcon, XIcon, DownloadIcon, PencilIcon, CheckIcon, DocumentAddIcon, TrashIcon } from './components/icons';

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
  // FIX: Updated the default model from 'gemini-flash-latest' to 'gemini-2.5-flash' to align with current API guidelines.
  const [model, setModel] = useState<string>('gemini-flash-latest');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('theme') as 'light' | 'dark') || 'light');
  const [targetWordCount, setTargetWordCount] = useState<string>('');

  const { progress, progressMessage, activeProgressTask, isAnyTaskRunning, setProgressMessage, startProgress, stopProgress } = useProgress();

  const [modalContent, setModalContent] = useState<'outline' | 'story' | null>(null);
  
  const [outlineHistory, setOutlineHistory] = useState<StructuredOutline[]>([]);
  const [currentOutlineIndex, setCurrentOutlineIndex] = useState(0);
  const [storyHistory, setStoryHistory] = useState<string[]>([]);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);

  const [storyHeadings, setStoryHeadings] = useState<Heading[]>([]);
  const [revisionPrompt, setRevisionPrompt] = useState('');

  const [assetLibrary, setAssetLibrary] = useState<Asset[]>([]);
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [renamingAssetId, setRenamingAssetId] = useState<string | null>(null);
  const [editingAssetName, setEditingAssetName] = useState('');

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '' });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const storyContentRef = useRef<HTMLDivElement>(null);

  const currentOutline = outlineHistory[currentOutlineIndex] || null;
  const previousOutline = outlineHistory[currentOutlineIndex - 1] || null;
  const canUndoOutline = currentOutlineIndex > 0;
  const canRedoOutline = currentOutlineIndex < outlineHistory.length - 1;

  const currentStory = storyHistory[currentStoryIndex] || '';
  const previousStory = storyHistory[currentStoryIndex - 1] || null;
  const canUndoStory = currentStoryIndex > 0;
  const canRedoStory = currentStoryIndex < storyHistory.length - 1;

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
        newNode.data = { title: data?.title || '导入作品', content: data?.content || '', mode: 'rewrite' } as WorkNodeData;
        break;
    }

    setNodes(nds => [...nds, newNode]);
  }, []);

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


  const processAiGeneratedGraph = (result: any, sourceNodePosition: { x: number; y: number }) => {
    const createdNodes: Node[] = [];
    const createdEdges: Edge[] = [];

    // Create Character Nodes
    (result.characters || []).forEach((char: any, index: number) => {
        const charFields: KeyValueField[] = (char.fields || []).map((f: any, i: number) => ({ id: `cf_${index}_${i}`, key: f.key, value: f.value }));
        createdNodes.push({
            id: `CHAR_ai_${Date.now()}_${index}`, type: NodeType.CHARACTER,
            position: { x: sourceNodePosition.x - 400, y: sourceNodePosition.y + index * 180 },
            data: { title: char.title, fields: charFields }, isCollapsed: false,
        });
    });

    // Create Setting Nodes
    (result.settings || []).forEach((setting: any, index: number) => {
        const settingFields: KeyValueField[] = (setting.fields || []).map((f: any, i: number) => ({ id: `sf_${index}_${i}`, key: f.key, value: f.value }));
        createdNodes.push({
            id: `SETTING_ai_${Date.now()}_${index}`, type: NodeType.SETTING,
            position: { x: sourceNodePosition.x, y: sourceNodePosition.y - 250 - (index * 200) },
            data: { title: setting.title, fields: settingFields, narrativeStructure: 'single' }, isCollapsed: false,
        });
    });

    // Create Environment Nodes
    (result.environments || []).forEach((env: any, index: number) => {
        const envFields: KeyValueField[] = (env.fields || []).map((f: any, i: number) => ({ id: `ef_${index}_${i}`, key: f.key, value: f.value }));
        createdNodes.push({
            id: `ENV_ai_${Date.now()}_${index}`, type: NodeType.ENVIRONMENT,
            position: { x: sourceNodePosition.x - 200, y: sourceNodePosition.y - 450 - (index * 200) },
            data: { title: env.title, fields: envFields }, isCollapsed: false,
        });
    });

    // Create Style Nodes
    (result.styles || []).forEach((style: any, index: number) => {
        const libraryStyle = style.id ? STORY_STYLES.find(s => s.id === style.id) : null;
        createdNodes.push({
            id: `STYLE_ai_${Date.now()}_${index}`, type: NodeType.STYLE,
            position: { x: sourceNodePosition.x - 400, y: sourceNodePosition.y - 250 - (index * 150) },
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
            position: {x: sourceNodePosition.x + 400, y: sourceNodePosition.y - 180 },
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
            position: {x: sourceNodePosition.x + 400, y: sourceNodePosition.y + 180 + (totalPlots * 180) },
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
                position: { x: sourceNodePosition.x + xOffset, y: yOffsetStart + index * 180 },
                data: {
                    plotId: plot.id ?? -1, title: libraryPlot?.name || plot.title,
                    description: libraryPlot?.description || plot.description || '自定义情节',
                    userInput: plot.userInput || ''
                }, isCollapsed: false,
            });
        });
    };
    processPlots(result.plots, 'single', sourceNodePosition.y, 400);
    processPlots(result.plots_a, 'a', sourceNodePosition.y, 400);
    processPlots(result.plots_b, 'b', sourceNodePosition.y + 350, 400);


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
        const result = await generateOutline(nodes, edges, language, model, wordCount);
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
                const finalStory = await generateShortStory(nodes, edges, currentOutline, language, model);
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
            startProgress('story', '正在准备创作...');
            let accumulatedStory = "";
            const storyParts: string[] = [];
            const totalChapters = currentOutline.segments.reduce((acc, s) => acc + (s.chapters?.length || 0), 0);
            let chaptersDone = 0;

            try {
                for (let i = 0; i < currentOutline.segments.length; i++) {
                    const segment = currentOutline.segments[i];
                    if (!segment.chapters) continue;

                    for (let j = 0; j < segment.chapters.length; j++) {
                        chaptersDone++;
                        setProgressMessage(`正在创作第 ${chaptersDone} / ${totalChapters} 章...`);
                        
                        const newChapterText = await generateStoryChapter(
                            nodes, edges, currentOutline, accumulatedStory, i, j, language, model
                        );
                        
                        storyParts.push(newChapterText);
                        accumulatedStory += (accumulatedStory ? "\n\n" : "") + newChapterText;
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
        // Step 1: Generate a temporary short-story outline
        const tempOutline = await generateOutline(nodes, edges, language, model, wordCount);
        
        // This won't be displayed, but stored for context and asset library
        setOutlineHistory([tempOutline]);
        setCurrentOutlineIndex(0);

        setProgressMessage('正在创作故事...');
        
        // Step 2: Generate the story from the temporary outline
        const finalStory = await generateShortStory(nodes, edges, tempOutline, language, model);

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
            const revisedOutline = await reviseOutline(currentOutline, revisionPrompt, language, model);
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
            const revisedStory = await reviseStory(currentStory, revisionPrompt, language, model);
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

  const handleWordCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      if (val === '' || (parseInt(val, 10) >= 0)) {
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
        setRenamingAssetId(asset.timestamp.toISOString());
        setEditingAssetName(asset.title);
    };

    const handleConfirmRenameAsset = () => {
        if (!renamingAssetId || !editingAssetName.trim()) return;
        setAssetLibrary(prev => prev.map(asset => 
            asset.timestamp.toISOString() === renamingAssetId 
            ? { ...asset, title: editingAssetName.trim() } 
            : asset
        ));
        setRenamingAssetId(null);
    };

    const handleCancelRenameAsset = () => {
        setRenamingAssetId(null);
    };
    
    const handleImportAssetAsNode = (asset: Asset) => {
        const content = typeof asset.content === 'string' ? asset.content : JSON.stringify(asset.content, null, 2);
        addNode(NodeType.WORK, { title: asset.title, content });
        setIsAssetModalOpen(false);
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
        />

        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileImport} 
          style={{ display: 'none' }} 
          accept=".json" 
        />
      </main>

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
        revisionPrompt={revisionPrompt}
        onRevisionPromptChange={setRevisionPrompt}
        onRevise={handleRevise}
        isRevising={activeProgressTask === 'revise_outline' || activeProgressTask === 'revise_story'}
        onClose={() => setModalContent(null)}
        onGenerateStory={handleGenerateStoryFromOutline}
        onCopy={handleCopy}
        onDownload={handleDownload}
        onTocClick={handleTocClick}
        onHeadingsParse={setStoryHeadings}
        canUndo={modalContent === 'outline' ? canUndoOutline : canUndoStory}
        canRedo={modalContent === 'outline' ? canRedoOutline : canRedoStory}
        onUndo={() => handleUndoRedo(modalContent!, 'undo')}
        onRedo={() => handleUndoRedo(modalContent!, 'redo')}
      />
      
      <Modal isOpen={isAssetModalOpen} onClose={() => setIsAssetModalOpen(false)} title="资产库">
        <div className="w-full max-h-[70vh] bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 rounded-md overflow-y-auto">
            {assetLibrary.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">资产库为空。请先生成大纲或故事。</p>
            ) : (
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                    {assetLibrary.slice().reverse().map((asset) => (
                        <li key={asset.timestamp.toISOString()} className="p-4 flex justify-between items-center hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
                            <div className="flex-grow">
                                {renamingAssetId === asset.timestamp.toISOString() ? (
                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="text"
                                            value={editingAssetName}
                                            onChange={(e) => setEditingAssetName(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleConfirmRenameAsset();
                                                if (e.key === 'Escape') handleCancelRenameAsset();
                                            }}
                                            className="w-full bg-gray-200 dark:bg-gray-700 text-sm p-1 rounded focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-colors"
                                            autoFocus
                                        />
                                        <button onClick={handleConfirmRenameAsset} className="p-1 text-green-500 hover:text-green-400"><CheckIcon className="h-5 w-5"/></button>
                                        <button onClick={handleCancelRenameAsset} className="p-1 text-red-500 hover:text-red-400"><XIcon className="h-5 w-5"/></button>
                                    </div>
                                ) : (
                                    <>
                                        <p className="font-semibold">{asset.title}</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{asset.type === 'outline' ? '大纲' : '故事'}</p>
                                    </>
                                )}
                            </div>
                            <div className="flex items-center space-x-2 flex-shrink-0 ml-4">
                                <button
                                    onClick={() => handleImportAssetAsNode(asset)}
                                    className="p-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-white rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
                                    title="导入为作品节点"
                                >
                                    <DocumentAddIcon className="h-5 w-5"/>
                                </button>
                                <button
                                    onClick={() => handleStartRenameAsset(asset)}
                                    className="p-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-white rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
                                    title="重命名"
                                >
                                    <PencilIcon className="h-5 w-5"/>
                                </button>
                                 <button
                                    onClick={() => handleDeleteAsset(asset.timestamp)}
                                    className="p-2 bg-gray-300 dark:bg-gray-600 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-colors"
                                    title="删除"
                                >
                                    <TrashIcon className="h-5 w-5"/>
                                </button>
                                <button
                                    onClick={() => {
                                        if (asset.type === 'outline') {
                                            setOutlineHistory([asset.content as StructuredOutline]);
                                            setCurrentOutlineIndex(0);
                                            setModalContent('outline');
                                        } else {
                                            setStoryHistory([asset.content as string]);
                                            setCurrentStoryIndex(0);
                                            setModalContent('story');
                                        }
                                        setIsAssetModalOpen(false);
                                    }}
                                    className="px-3 py-2 bg-cyan-600 text-white text-sm font-semibold rounded-lg hover:bg-cyan-500 transition-colors"
                                >
                                    预览
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