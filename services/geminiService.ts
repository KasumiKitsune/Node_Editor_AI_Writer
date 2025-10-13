import { GoogleGenAI, Type } from "@google/genai";
import { Node, Edge, NodeType, CharacterNodeData, SettingNodeData, PlotNodeData, StyleNodeData, StructureNodeData, StructureCategory, WorkNodeData, KeyValueField, EnvironmentNodeData, StructuredOutline, Chapter } from '../types';
import { serializeGraph, getBasePrompt, serializeLibraryForPrompt, serializeExistingNodesForContext } from './gemini.helpers';
import { STORY_PLOTS, STORY_STYLES, STORY_STRUCTURES } from '../constants';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const getModelConfig = (model: string, baseConfig: any = {}) => {
    let effectiveModel = model;
    const config = { ...baseConfig };
    if (model === 'gemini-2.5-flash-no-thinking') {
        effectiveModel = 'gemini-2.5-flash';
        config.thinkingConfig = { thinkingBudget: 0 };
    } else if (model === 'gemini-2.5-flash' || model === 'gemini-flash-latest') {
        effectiveModel = 'gemini-2.5-flash';
    } else if (model === 'gemini-2.5-pro') {
        effectiveModel = 'gemini-2.5-pro';
    }
    // Removed gemini-2.5-flash-lite as it's no longer used for the analysis step.
    return { effectiveModel, config };
};

// --- Start of New Helper Functions for Two-Step Generation ---

const convertJsonToTempNodes = (jsonResult: any, basePosition: {x: number, y: number}): Node[] => {
    const tempNodes: Node[] = [];
    const now = Date.now();

    const addNode = (type: NodeType, data: any) => {
        tempNodes.push({ id: `temp_${type}_${now}_${tempNodes.length}`, type, data, position: basePosition, isCollapsed: false });
    };

    (jsonResult.characters || []).forEach((c: any) => addNode(NodeType.CHARACTER, { title: c.title }));
    (jsonResult.settings || []).forEach((s: any) => addNode(NodeType.SETTING, { title: s.title, narrativeStructure: 'single' }));
    (jsonResult.environments || []).forEach((e: any) => addNode(NodeType.ENVIRONMENT, { title: e.title }));
    (jsonResult.styles || []).forEach((s: any) => addNode(NodeType.STYLE, { title: s.title || STORY_STYLES.find(ls => ls.id === s.id)?.name }));
    
    if (jsonResult.structures?.start) {
        addNode(NodeType.STRUCTURE, { title: jsonResult.structures.start.title || STORY_STRUCTURES.find(ls => ls.id === jsonResult.structures.start.id)?.name, category: StructureCategory.STARTING });
    }
    if (jsonResult.structures?.end) {
        addNode(NodeType.STRUCTURE, { title: jsonResult.structures.end.title || STORY_STRUCTURES.find(ls => ls.id === jsonResult.structures.end.id)?.name, category: StructureCategory.ENDING });
    }

    const processPlots = (plotList: any[]) => {
        (plotList || []).forEach((p: any) => addNode(NodeType.PLOT, { title: p.title || STORY_PLOTS.find(lp => lp.id === p.id)?.name }));
    };

    processPlots(jsonResult.plots);
    processPlots(jsonResult.plots_a);
    processPlots(jsonResult.plots_b);

    return tempNodes;
};

const serializeNodesForConnectionPrompt = (nodes: Node[]): string => {
    return nodes.map(node => {
        const data = node.data as any;
        const type = node.type;
        const title = data.title;
        let details = `Type: ${type}, Title: "${title}"`;
        if (type === NodeType.SETTING) {
            const settingData = data as SettingNodeData;
            if (settingData.narrativeStructure !== 'single') {
                details += `, Narrative Structure: ${settingData.narrativeStructure}`;
            }
        }
        if (type === NodeType.STRUCTURE) {
            const structureData = data as StructureNodeData;
            details += `, Category: ${structureData.category}`;
        }
        return `- { ${details} }`;
    }).join('\n');
};

async function generateConnectionsForGraph(allNodes: Node[], model: string, context: { type: 'analyzeWork' } | { type: 'expandSetting', sourceNode: Node<SettingNodeData> }): Promise<{ connections: any[] }> {
    const serializedNodes = serializeNodesForConnectionPrompt(allNodes);

    let contextInstruction = '';
    if (context.type === 'expandSetting') {
        const sourceNodeData = context.sourceNode.data;
        const lineAName = sourceNodeData.narrativeStructure === 'light_dark' ? '明线' : '故事线A';
        const lineBName = sourceNodeData.narrativeStructure === 'light_dark' ? '暗线' : '故事线B';
        contextInstruction = `这是一个“扩展设定”操作。所有新的故事流程都应源自于“${sourceNodeData.title}”节点。`;
        if (sourceNodeData.narrativeStructure !== 'single') {
            contextInstruction += ` 此节点具有双线结构。你必须创建两条独立的故事线，分别从它的 'source_a' (${lineAName}) 和 'source_b' (${lineBName}) 手柄引出。`;
        }
    } else {
        contextInstruction = `这是一个“分析作品”操作。目标是重建原始故事的流程。`;
    }

    const prompt = `
你是一位逻辑严谨的故事结构建筑师。你的任务是分析一系列故事组件，并决定它们之间应该如何连接。

**可用的故事节点列表:**
---
${serializedNodes}
---

**核心指令:**
1.  **目标**: ${contextInstruction}
2.  **情节流**: 将所有的 PLOT (情节) 和 STRUCTURE (结构) 节点按照逻辑和时间顺序连接起来，形成一个连贯的故事。对于双线叙事，请创建两条独立、平行的情节流。
3.  **元素放置**: 将每个 CHARACTER (人物) 和 ENVIRONMENT (环境) 节点连接到它最相关或首次出现的那个 PLOT (情节) 节点上。
4.  **风格应用**: 将每个 STYLE (风格) 节点连接到它应该应用的 PLOT (情节) 或 SETTING (设定) 节点上。连接到 SETTING 节点的 STYLE 被视为全局风格。
5.  **Handle 规则**:
    *   PLOT, STRUCTURE, CHARACTER, ENVIRONMENT, SETTING, 和非仿写模式的 WORK 之间的连接是“流程”连接 (圆形手柄)。
    *   双线叙事的 SETTING 节点的源 handle 是 'source_a' 和 'source_b'。
    *   从 STYLE 节点或仿写模式的 WORK 节点发出的连接是“风格”连接 (方形手柄)。
    *   PLOT 节点的目标 handle 可以是 'flow' 或 'style'。SETTING 节点的目标 handle 是 'style'。其他所有节点的目标 handle 都是 'flow'。
6.  **JSON 输出**: 你必须返回一个只包含 \`connections\` 数组的有效JSON对象。不要包含任何其他文本或markdown。

现在，请生成连接。
`;
    const { effectiveModel, config } = getModelConfig(model, {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                connections: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            sourceTitle: { type: Type.STRING },
                            targetTitle: { type: Type.STRING },
                            sourceHandle: { type: Type.STRING },
                            targetHandle: { type: Type.STRING }
                        }
                    }
                }
            }
        }
    });

    try {
        const response = await ai.models.generateContent({ model: effectiveModel, contents: prompt, config: config });
        const jsonText = response.text.trim();
        return JSON.parse(jsonText);
    } catch (error) {
        console.error("Error generating connections:", error);
        throw new Error(`生成节点连接时出错: ${error instanceof Error ? error.message : '未知错误'}`);
    }
}

async function generateNodesFromWork(content: string, existingNodes: Node[], model: string): Promise<any> {
    const libraryText = serializeLibraryForPrompt();
    const existingNodesContext = serializeExistingNodesForContext(existingNodes);

    const prompt = `
你是一位专业的文学分析师。请仔细阅读【待分析的作品】，并将其分解为结构化的JSON对象。

**重要指令:**
1.  **只生成节点**: 你的任务是从作品中提取新的、尚未存在的 \`characters\`, \`settings\`, \`environments\`, \`plots\`, \`styles\` 和 \`structures\`。**不要生成 connections 数组**。
2.  **避免重复**: **绝对不要**为【画布上已存在的元素】中列出的项目创建重复的节点。
3.  **区分设定与环境**: 必须区分宏观的“作品设定” (settings) 和具体的“环境/地点” (environments)。
4.  **匹配优先**: 对于 \`plots\`, \`styles\` 和 \`structures\`，必须优先从【可用库】中寻找最匹配的选项并返回其 \`id\`。找不到则将 \`id\` 设为 \`null\` 并自行提供 \`title\` 和 \`description\`。
5.  **填写userInput**: 将作品中与库匹配项相关的具体细节，填写到 \`userInput\` 字段中。
6.  **识别叙事结构**: 判断作品是单线还是多线叙事。如果有多条明显的故事线，请将情节分别归入 \`plots_a\` 和 \`plots_b\`。否则，全部放入 \`plots\`。

**画布上已存在的元素:**
---
${existingNodesContext}
---
**可用库:**
---
${libraryText}
---
**待分析的作品:**
---
${content}
---

请严格按照指定的JSON格式返回，不要添加任何额外的解释或文本。
`;

    const basePlotSchema = { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.NUMBER, description: "匹配的库ID，或null" }, title: { type: Type.STRING }, description: { type: Type.STRING }, userInput: { type: Type.STRING } } } };
    const { effectiveModel, config } = getModelConfig(model, {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                characters: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, fields: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { key: { type: Type.STRING }, value: { type: Type.STRING } } } } } } },
                settings: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, fields: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { key: { type: Type.STRING }, value: { type: Type.STRING } } } } } } },
                environments: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, fields: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { key: { type: Type.STRING }, value: { type: Type.STRING } } } } } } },
                plots: { ...basePlotSchema },
                plots_a: { ...basePlotSchema },
                plots_b: { ...basePlotSchema },
                styles: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.NUMBER }, title: { type: Type.STRING }, description: { type: Type.STRING } } } },
                structures: { type: Type.OBJECT, properties: { start: { type: Type.OBJECT, properties: { id: { type: Type.NUMBER }, title: { type: Type.STRING }, description: { type: Type.STRING } } }, end: { type: Type.OBJECT, properties: { id: { type: Type.NUMBER }, title: { type: Type.STRING }, description: { type: Type.STRING } } } } },
            }
        }
    });

    try {
        const response = await ai.models.generateContent({ model: effectiveModel, contents: prompt, config: config });
        const jsonText = response.text.trim();
        return JSON.parse(jsonText);
    } catch (error) {
        console.error("Error generating nodes from work:", error);
        throw new Error(`从作品生成节点时出错: ${error instanceof Error ? error.message : '未知错误'}`);
    }
}

async function generateNodesFromSetting(settingData: SettingNodeData, existingNodes: Node[], model: string): Promise<any> {
    const settingText = `标题: ${settingData.title}\n` + (settingData.fields || []).map(f => `${f.key}: ${f.value}`).join('\n');
    const libraryText = serializeLibraryForPrompt();
    const existingNodesContext = serializeExistingNodesForContext(existingNodes);
    const isMultiLine = settingData.narrativeStructure === 'dual' || settingData.narrativeStructure === 'light_dark';
    
    let plotInstructions: string;
    if (isMultiLine) {
        const lineAName = settingData.narrativeStructure === 'light_dark' ? '明线' : '故事线A';
        const lineBName = settingData.narrativeStructure === 'light_dark' ? '暗线' : '故事线B';
        plotInstructions = `- **生成双线情节**: 此设定为 **${lineAName}/${lineBName}** 结构。你必须生成 **两组独立的情节**：\`plots_a\` (用于 ${lineAName}) 和 \`plots_b\` (用于 ${lineBName})。`;
    } else {
        plotInstructions = `- **生成情节**: 基于设定，生成一系列连贯的 \`plots\` (情节)。`;
    }

    const prompt = `
你是一位富有想象力的世界构建大师。根据【原始作品设定】，并参考【画布上已存在的元素】，进行创意扩展。

**可用库:**
---
${libraryText}
---
**原始作品设定 (本次扩展的核心):**
---
${settingText}
---
**画布上已存在的元素 (供你参考，避免重复):**
---
${existingNodesContext}
---

**指令:**
1.  **只生成节点**: 你的任务是创造与【原始作品设定】相关，且与【画布上已存在的元素】**不重复**的新元素。你需要生成 \`characters\`, \`environments\`, \`styles\`, \`structures\` 和情节。**不要生成 connections 数组**。
2.  ${plotInstructions}
3.  **匹配库**: 对于 \`plots\`, \`styles\` 和 \`structures\`，你**必须**从上方的【可用库】中选择最匹配的选项，并返回其 \`id\`。
4.  **返回JSON**: 必须严格按照指定的JSON格式返回结果。
`;

    const basePlotSchema = { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.NUMBER, description: "匹配的库ID" } } } };
    const { effectiveModel, config } = getModelConfig(model, {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                characters: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, fields: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { key: { type: Type.STRING }, value: { type: Type.STRING } } } } } } },
                environments: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, fields: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { key: { type: Type.STRING }, value: { type: Type.STRING } } } } } } },
                plots: { ...basePlotSchema },
                plots_a: { ...basePlotSchema },
                plots_b: { ...basePlotSchema },
                styles: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.NUMBER } } } },
                structures: { type: Type.OBJECT, properties: { start: { type: Type.OBJECT, properties: { id: { type: Type.NUMBER } } }, end: { type: Type.OBJECT, properties: { id: { type: Type.NUMBER } } } } },
            }
        }
    });

    try {
        const response = await ai.models.generateContent({ model: effectiveModel, contents: prompt, config: config });
        const jsonText = response.text.trim();
        return JSON.parse(jsonText);
    } catch (error) {
        console.error("Error generating nodes from setting:", error);
        throw new Error(`从设定生成节点时出错: ${error instanceof Error ? error.message : '未知错误'}`);
    }
}

// --- End of New Helper Functions ---

export const generateOutline = async (nodes: Node[], edges: Edge[], language: string, model: string, targetWordCount?: number): Promise<StructuredOutline> => {
  const serializedData = serializeGraph(nodes, edges);
  if (!serializedData.trim()) {
    throw new Error("没有足够的信息来生成大纲。请添加一些节点和连接。");
  }
  
  const { systemInstruction, taskInstruction } = getBasePrompt(nodes);
  const isShortStory = targetWordCount !== undefined && targetWordCount <= 3000;

  const wordCountInstruction = targetWordCount 
    ? `The user's target for the entire story is approximately ${targetWordCount} words. Distribute this word count realistically.`
    : `The user has not specified a word count. Aim for a concise story structure suitable for a short story (around 2000-4000 words total) unless the number of plot nodes suggests a longer form.`;

  let storyStructureInstruction: string;
  let responseSchema: any;

  if (isShortStory) {
    storyStructureInstruction = `2.  **No Chapters**: This is a short story, so you MUST NOT create chapters. Create a single segment and provide a concise, bullet-point list of \`key_events\` for the entire story directly within that segment.`;
    responseSchema = {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING, description: "The overall title of the story." },
            segments: {
                type: Type.ARRAY,
                description: "An array containing a single story segment.",
                items: {
                    type: Type.OBJECT,
                    properties: {
                        segment_title: { type: Type.STRING, description: "The title for the story's single part." },
                        estimated_word_count: { type: Type.NUMBER, description: "The estimated word count for the story." },
                        key_events: {
                            type: Type.ARRAY,
                            description: "A concise, bullet-point list of key events for the story.",
                            items: { type: Type.STRING }
                        },
                    },
                    required: ["segment_title", "estimated_word_count", "key_events"]
                }
            }
        },
        required: ["title", "segments"]
    };
  } else {
    storyStructureInstruction = `2.  **Segments and Chapters**: Divide the story into logical Segments, and then subdivide each Segment into multiple Chapters.
3.  **Key Events**: For each chapter, you must provide a concise, bullet-point list of \`key_events\`. These should be actions, decisions, or revelations, not descriptive paragraphs.`;
    responseSchema = {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING, description: "The overall title of the story." },
            segments: {
                type: Type.ARRAY,
                description: "An array of story segments. A segment is a major part of the story and can contain multiple chapters.",
                items: {
                    type: Type.OBJECT,
                    properties: {
                        segment_title: { type: Type.STRING, description: "The title of this specific segment." },
                        estimated_word_count: { type: Type.NUMBER, description: "The estimated word count for this segment (e.g., 2000)." },
                        chapters: {
                            type: Type.ARRAY,
                            description: "An array of chapters within this segment.",
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    chapter_number: { type: Type.NUMBER, description: "The sequential number of the chapter in the whole story." },
                                    chapter_title: { type: Type.STRING, description: "The title of this chapter." },
                                    key_events: {
                                        type: Type.ARRAY,
                                        description: "A concise, bullet-point list of key events that must happen in this chapter.",
                                        items: { type: Type.STRING }
                                    },
                                    point_of_view: { type: Type.STRING, description: "Optional. The character's perspective from which this chapter is told." },
                                    setting: { type: Type.STRING, description: "Optional. The primary location or setting for this chapter." }
                                },
                                required: ["chapter_number", "chapter_title", "key_events"]
                            }
                        }
                    },
                    required: ["segment_title", "estimated_word_count", "chapters"]
                }
            }
        },
        required: ["title", "segments"]
    };
  }

  const prompt = `
${taskInstruction}

**CRITICAL INSTRUCTIONS:**
1.  **Structural Outline**: Your primary task is to create a well-formatted, structural outline, not a prose summary.
${storyStructureInstruction}
4.  **JSON Output**: You MUST return your response as a valid JSON object. Do not include any text, notes, or markdown formatting outside of the JSON structure.
5.  **JSON Structure**: The JSON must match the specified schema precisely.
6.  **Word Count**: ${wordCountInstruction}
7.  **Fusion**: The outline must organically integrate all plot nodes and settings into a complete story framework.
8.  **Style Integration**: Consider all provided style instructions when formulating the key events.

Below are the story components provided by the user:
---
${serializedData}
---

Please generate the structured story outline in **${language}**.
`;

  try {
    const { effectiveModel, config } = getModelConfig(model, {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: responseSchema
    });

    const response = await ai.models.generateContent({
        model: effectiveModel,
        contents: prompt,
        config: config
    });
    const jsonText = response.text.trim();
    return JSON.parse(jsonText) as StructuredOutline;
  } catch (error) {
    console.error("Error generating outline:", error);
    let errorMessage = `生成大纲时出错: ${error instanceof Error ? error.message : '未知错误'}`;
    if (error instanceof SyntaxError) {
        errorMessage += "\nAI返回的格式可能不正确，无法解析。";
    }
    throw new Error(errorMessage);
  }
};

const getStoryBasePrompt = (): { systemInstruction: string } => {
    return {
        systemInstruction: "You are a writing generation tool. Your task is to write a chapter of a story based *strictly* on the provided components, outline, and context. Do not deviate from the plan. Adhere only to the instructions given."
    };
};

export const generateShortStory = async (nodes: Node[], edges: Edge[], outline: StructuredOutline, language: string, model: string): Promise<string> => {
    const { systemInstruction } = getStoryBasePrompt();
    const segment = outline.segments[0];
    const serializedData = serializeGraph(nodes, edges);

    const prompt = `
**CRITICAL INSTRUCTIONS:**
1.  **WRITE THE COMPLETE STORY**: Your task is to write a complete short story in one go.
2.  **NO CHAPTERS**: Do not add any chapter headings or numbers. The output should be a single, continuous piece of prose.
3.  **FOLLOW THE PLAN**: You must strictly adhere to the plot points listed in the "STORY PLAN".
4.  **STYLE**: You must absolutely adhere to any global or local style instructions provided in the "FULL STORY COMPONENTS".
5.  **WORD COUNT**: The target word count is approximately **${segment.estimated_word_count} words**.
6.  **LANGUAGE**: Write in **${language}**.

---
**FULL STORY COMPONENTS (For Reference):**
${serializedData}
---
**STORY PLAN (Your Task):**
-   **Story Title**: ${outline.title}
-   **Key Events to Cover**: 
    - ${(segment.key_events || []).join('\n    - ')}
---

Now, begin writing the complete short story.
`;
    try {
        const { effectiveModel, config } = getModelConfig(model, { systemInstruction });
        const response = await ai.models.generateContent({
            model: effectiveModel,
            contents: prompt,
            config: config
        });
        return response.text;
    } catch (error) {
        console.error("Error generating short story:", error);
        throw new Error(`生成短篇故事时出错: ${error instanceof Error ? error.message : '未知错误'}`);
    }
};


export const generateStoryChapter = async (nodes: Node[], edges: Edge[], outline: StructuredOutline, previousText: string, segmentIndex: number, chapterIndex: number, language: string, model: string): Promise<string> => {
  const { systemInstruction } = getStoryBasePrompt();
  const currentSegment = outline.segments[segmentIndex];
  const currentChapter = currentSegment.chapters![chapterIndex];
  const serializedData = serializeGraph(nodes, edges);

  const prompt = `
**CRITICAL INSTRUCTIONS:**
1.  **WRITE ONE CHAPTER**: Your task is to write the *next chapter* of an ongoing story. You must seamlessly connect your writing to the end of the "STORY SO FAR".
2.  **MARKDOWN HEADING**: Your output for this chapter **MUST** start with a Markdown H2 heading containing the chapter number and title. For example: \`## 第 ${currentChapter.chapter_number} 章：${currentChapter.chapter_title}\`. There should be a newline after the heading.
3.  **DO NOT REPEAT**: Your output must **ONLY** contain the new heading and text for the *current chapter*. **ABSOLUTELY DO NOT** repeat any part of the "STORY SO FAR" section.
4.  **FOLLOW THE PLAN**: You must strictly adhere to the plot points listed in the "CURRENT CHAPTER PLAN". This is your primary guide.
5.  **STYLE**: You must absolutely adhere to any global or local style instructions provided in the "FULL STORY COMPONENTS".
6.  **WORD COUNT**: The estimated word count for this chapter's parent segment is **${currentSegment.estimated_word_count} words**. Write this chapter concisely to contribute to that total without exceeding it.
7.  **LANGUAGE**: Write in **${language}**.

---
**FULL STORY COMPONENTS (For Reference):**
${serializedData}
---
**FULL STORY OUTLINE (For Reference):**
${JSON.stringify(outline, null, 2)}
---
**STORY SO FAR (Context - DO NOT REPEAT IN YOUR OUTPUT):**
\`\`\`
${previousText || "This is the very first chapter. Start the story."}
\`\`\`
---
**CURRENT CHAPTER PLAN (Your Immediate Task):**
-   **Chapter Number**: ${currentChapter.chapter_number}
-   **Chapter Title**: ${currentChapter.chapter_title}
-   **Key Events to Cover**: 
    - ${currentChapter.key_events.join('\n    - ')}
-   **Point of View**: ${currentChapter.point_of_view || 'Default'}
-   **Setting**: ${currentChapter.setting || 'Default'}
---

Now, begin writing the text for the current chapter, starting with the H2 markdown heading.
`;

  try {
    const { effectiveModel, config } = getModelConfig(model, { systemInstruction });
    const response = await ai.models.generateContent({
        model: effectiveModel,
        contents: prompt,
        config: config
    });
    return response.text;
  } catch (error) {
    console.error("Error generating story chapter:", error);
    throw new Error(`生成故事章节时出错: ${error instanceof Error ? error.message : '未知错误'}`);
  }
};

export const analyzeWork = async (content: string, existingNodes: Node[], model: string): Promise<any> => {
    // Step 1: Generate nodes
    const nodesResult = await generateNodesFromWork(content, existingNodes, model);

    // Step 2: Generate connections
    const tempNewNodes = convertJsonToTempNodes(nodesResult, existingNodes[0]?.position || { x: 400, y: 100 });
    const allNodesForConnection = [...existingNodes, ...tempNewNodes];
    const connectionsResult = await generateConnectionsForGraph(allNodesForConnection, model, { type: 'analyzeWork' });

    // Step 3: Combine and return
    return { ...nodesResult, connections: connectionsResult.connections };
};

export const expandSetting = async (settingData: SettingNodeData, existingNodes: Node[], model: string): Promise<any> => {
    // Find the original full node from the existing nodes list to get its context (like position)
    const settingNode = existingNodes.find(n => n.type === NodeType.SETTING && (n.data as SettingNodeData).title === settingData.title) as Node<SettingNodeData>;
    if (!settingNode) {
        throw new Error("Could not find the source setting node on the canvas.");
    }

    // Step 1: Generate nodes based on the setting
    const nodesResult = await generateNodesFromSetting(settingData, existingNodes, model);

    // Step 2: Generate connections for all nodes
    const tempNewNodes = convertJsonToTempNodes(nodesResult, settingNode.position);
    const allNodesForConnection = [...existingNodes, ...tempNewNodes];
    const connectionsResult = await generateConnectionsForGraph(allNodesForConnection, model, { type: 'expandSetting', sourceNode: settingNode });

    // Step 3: Combine and return
    return { ...nodesResult, connections: connectionsResult.connections };
};


export const reviseOutline = async (outline: StructuredOutline, revisionRequest: string, language: string, model: string): Promise<StructuredOutline> => {
  const systemInstruction = `You are a story editor. Your task is to revise a story outline provided in JSON format based on the user's request. You must return the complete, full, modified JSON object. Adhere strictly to the original JSON schema. Make minimal changes necessary to fulfill the request. The response language must be ${language}.`;

  const prompt = `
**USER'S REVISION REQUEST:**
${revisionRequest}

**ORIGINAL OUTLINE (JSON):**
\`\`\`json
${JSON.stringify(outline, null, 2)}
\`\`\`

**CRITICAL INSTRUCTIONS:**
1.  Read the user's request carefully.
2.  Modify the original JSON outline to incorporate the requested changes.
3.  Ensure the final output is a single, valid JSON object that conforms to the original schema.
4.  Do not add any text, notes, or markdown formatting outside of the JSON structure.
`;
  try {
    const { effectiveModel, config } = getModelConfig(model, { systemInstruction, responseMimeType: "application/json" });
    
    const response = await ai.models.generateContent({
      model: effectiveModel,
      contents: prompt,
      config: config
    });

    const jsonText = response.text.trim().replace(/^```json\s*|```\s*$/g, '');
    return JSON.parse(jsonText) as StructuredOutline;
  } catch (error) {
    console.error("Error revising outline:", error);
    throw new Error(`修改大纲时出错: ${error instanceof Error ? error.message : '未知错误'}`);
  }
};


export const reviseStory = async (story: string, revisionRequest: string, language: string, model: string): Promise<string> => {
    const systemInstruction = `You are a writing editor. Your task is to revise a story based on the user's request. Make only the necessary changes to fulfill the request while preserving the original style and tone as much as possible. You must return the complete, full, revised story text. The response language must be ${language}.`;

    const prompt = `
**USER'S REVISION REQUEST:**
${revisionRequest}

**ORIGINAL STORY:**
---
${story}
---

**CRITICAL INSTRUCTIONS:**
1.  Read the user's request carefully.
2.  Revise the original story to incorporate the requested changes.
3.  Your output must be the complete, full, revised story text.
4.  Do not add any meta-commentary, notes, or introductions like "Here is the revised story:". Just return the text.
`;

    try {
        const { effectiveModel, config } = getModelConfig(model, { systemInstruction });
        const response = await ai.models.generateContent({
            model: effectiveModel,
            contents: prompt,
            config: config
        });
        return response.text;
    } catch (error) {
        console.error("Error revising story:", error);
        throw new Error(`修改故事时出错: ${error instanceof Error ? error.message : '未知错误'}`);
    }
};

export const modifyGraphWithAssistant = async (userPrompt: string, nodes: Node[], edges: Edge[], model: string): Promise<{nodes: Node[], edges: Edge[]}> => {
    const systemInstruction = "You are an AI assistant for a node-based story editor. Your task is to modify a graph data structure based on a user's request. Your response MUST be the complete, final graph state as a single, valid JSON object.";
    const validNodeTypes = Object.values(NodeType).join(', ');

    const prompt = `
You are an AI model that expertly modifies a graph data structure based on a user's request.
Your response MUST be the complete, final graph state as a single, valid JSON object.

**User's Request:**
---
${userPrompt}
---

**Your Task:**
Carefully analyze the user's request and the current graph state. Modify the graph to fulfill the request. If the request is vague (e.g., "add more plot", "enrich the setting"), you must take creative initiative. Invent new, relevant nodes and connect them logically to the existing graph. Your goal is to be a helpful, proactive creative partner.

**Initial Graph State (JSON):**
---
${JSON.stringify({ nodes, edges }, null, 2)}
---

**Node Library (for creating new standard nodes):**
---
${serializeLibraryForPrompt()}
---

**Connection Rules:**
- **Flow Connections** (circle handles): Represent the story's sequence.
    - Source Nodes: PLOT, CHARACTER, STRUCTURE, SETTING, ENVIRONMENT, WORK (rewrite/continue modes).
    - Target Nodes: PLOT, CHARACTER, STRUCTURE, ENVIRONMENT.
    - A PLOT node's target handle for flow is \`flow\`.
- **Style Connections** (square handles): Apply a writing style.
    - Source Nodes: STYLE, WORK (parody mode).
    - Target Nodes: PLOT, SETTING.
    - A PLOT or SETTING node's target handle for style is \`style\`.
- **Multi-line SETTING nodes**: These have two source handles, \`source_a\` and \`source_b\`, for creating parallel storylines.

**CRITICAL INSTRUCTIONS:**
1.  **Fulfill the Request**: Apply the user's request to the initial graph state.
2.  **Use User's Language**: When creating new nodes (titles, descriptions, fields), you MUST use the same language as the "User's Request".
3.  **Use Node Library**: When creating a new node based on an item from the "Node Library", you MUST:
    a. Use the library item's \`id\` for the node's \`plotId\`, \`styleId\`, or \`structureId\`.
    b. Use the library item's \`name\` as the node's \`title\`.
    c. Use the library item's \`description\` as the node's \`description\`.
    For custom nodes not in the library, set the relevant id to \`-1\` and create a descriptive title and description.
4.  **Valid Node Types**: You must only use one of the following for the \`type\` property of any new node: ${validNodeTypes}.
5.  **Return Full State**: Your response must be a single, valid JSON object containing the *entire modified graph*, including all original nodes and edges that were not changed. The format must be: \`{ "nodes": [...], "edges": [...] }\`.
6.  **Preserve IDs & Positions**: Retain existing \`id\` and \`position\` for all unmodified nodes.
7.  **New Node Positioning**: For any **new nodes** you create, you can OMIT the \`position\` property. The system will auto-layout them.
8.  **Data Completeness**: Ensure every node in the final state has a complete \`data\` object appropriate for its type (e.g., character nodes must have a \`fields\` array).
9.  **Do Not Explain**: Do not add any text, notes, or markdown formatting outside of the final JSON object.
`;

    const { effectiveModel, config } = getModelConfig(model, {
        systemInstruction,
        responseMimeType: "application/json",
    });

    try {
        const response = await ai.models.generateContent({
            model: effectiveModel,
            contents: prompt,
            config: config
        });
        const jsonText = response.text.trim();
        const result = JSON.parse(jsonText);

        if (!result || !Array.isArray(result.nodes) || !Array.isArray(result.edges)) {
            throw new Error("AI response did not conform to the expected {nodes: [], edges: []} structure.");
        }

        return result;
    } catch (error) {
        console.error("Error executing graph modification:", error);
        throw new Error(`执行图表修改时出错: ${error instanceof Error ? error.message : '未知错误'}`);
    }
};