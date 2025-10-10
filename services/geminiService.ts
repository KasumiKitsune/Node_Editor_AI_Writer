import { GoogleGenAI, Type } from "@google/genai";
import { Node, Edge, NodeType, CharacterNodeData, SettingNodeData, PlotNodeData, StyleNodeData, StructureNodeData, StructureCategory, WorkNodeData, KeyValueField, EnvironmentNodeData, StructuredOutline, Chapter } from '../types';
import { PLOT_DESCRIPTIONS } from '../plotDescriptions';
import { STORY_PLOTS, STORY_STYLES, STORY_STRUCTURES } from '../constants';

// FIX: The API key is now sourced directly from `process.env.API_KEY` during initialization, and the prior manual check has been removed, aligning with the project's setup assumptions.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

function serializeGraph(nodes: Node[], edges: Edge[]): string {
  let serialized = "";

  const workNode = nodes.find(n => n.type === NodeType.WORK) as Node<WorkNodeData> | undefined;
  const characters = nodes.filter(n => n.type === NodeType.CHARACTER) as Node<CharacterNodeData>[];
  const settings = nodes.filter(n => n.type === NodeType.SETTING) as Node<SettingNodeData>[];
  const environments = nodes.filter(n => n.type === NodeType.ENVIRONMENT) as Node<EnvironmentNodeData>[];
  const plots = nodes.filter(n => n.type === NodeType.PLOT) as Node<PlotNodeData>[];
  const structures = nodes.filter(n => n.type === NodeType.STRUCTURE) as Node<StructureNodeData>[];
  const startNode = structures.find(s => s.data.category === StructureCategory.STARTING);
  const endNode = structures.find(s => s.data.category === StructureCategory.ENDING);
  
  if (workNode) {
      const modeText = workNode.data.mode === 'rewrite' ? '改写模式' : '续写模式';
      serialized += `**原始作品 (${modeText}):**\n`;
      serialized += "```\n";
      serialized += `${workNode.data.content}\n`;
      serialized += "```\n\n";
  }

  const globalStyleEdges = edges.filter(e => {
    const sourceNode = nodes.find(n => n.id === e.source);
    const targetNode = nodes.find(n => n.id === e.target);
    return sourceNode?.type === NodeType.STYLE && targetNode?.type === NodeType.SETTING;
  });

  if (globalStyleEdges.length > 0) {
    serialized += "**全局写作风格:** (应用于整个故事)\n";
    globalStyleEdges.forEach(edge => {
        const styleNode = nodes.find(n => n.id === edge.source) as Node<StyleNodeData>;
        if (styleNode) {
             serialized += `*   **${styleNode.data.title}**: *释义: ${styleNode.data.description}*\n`;
        }
    });
    serialized += "\n";
  }

  if (characters.length > 0) {
    serialized += "**人物设定:**\n";
    characters.forEach((char, index) => {
      serialized += `*   **${char.data.title || `人物 ${index + 1}`}:**\n`;
      char.data.fields.forEach(field => {
        if(field.key && field.value) serialized += `    *   ${field.key}: ${field.value}\n`;
      });
    });
    serialized += "\n";
  }

  if (settings.length > 0) {
    serialized += "**作品设定 (世界观、核心概念):**\n";
    settings.forEach((setting, index) => {
      serialized += `*   **${setting.data.title || `设定 ${index + 1}`}:**\n`;
      if (setting.data.narrativeStructure && setting.data.narrativeStructure !== 'single') {
        const structureText = setting.data.narrativeStructure === 'dual' ? '双线叙事' : '明暗双线叙事';
        serialized += `    *   叙事脉络: ${structureText}\n`;
      }
      setting.data.fields.forEach(field => {
        if(field.key && field.value) serialized += `    *   ${field.key}: ${field.value}\n`;
      });
    });
    serialized += "\n";
  }
  
  if (environments.length > 0) {
    serialized += "**环境/地点设定:**\n";
    environments.forEach((env, index) => {
      serialized += `*   **${env.data.title || `地点 ${index + 1}`}:**\n`;
      env.data.fields.forEach(field => {
        if(field.key && field.value) serialized += `    *   ${field.key}: ${field.value}\n`;
      });
    });
    serialized += "\n";
  }


  const allPlotNodes = [
      ...(startNode ? [startNode] : []),
      ...plots,
      ...(endNode ? [endNode] : [])
  ];

  if (allPlotNodes.length > 0) {
    serialized += "**情节节点:**\n";
    allPlotNodes.forEach(node => {
      if (node.type === NodeType.PLOT) {
        const plot = node as Node<PlotNodeData>;
        const plotDescription = PLOT_DESCRIPTIONS[plot.data.plotId as keyof typeof PLOT_DESCRIPTIONS] || plot.data.description;
        serialized += `*   **${plot.data.title}**: ${plotDescription}\n`;
        if (plot.data.userInput && plot.data.userInput.trim() !== '') {
          serialized += `    *   **用户额外需求**: ${plot.data.userInput}\n`;
        }
      } else if (node.type === NodeType.STRUCTURE) {
        const structure = node as Node<StructureNodeData>;
        const prefix = structure.data.category === StructureCategory.STARTING ? '开头' : '结尾';
        serialized += `*   **${prefix}: ${structure.data.title}**: ${structure.data.description}\n`;
        if (structure.data.userInput && structure.data.userInput.trim() !== '') {
          serialized += `    *   **用户额外需求**: ${structure.data.userInput}\n`;
        }
      }

      const connectedStyleEdge = edges.find(e => {
          const sourceNode = nodes.find(n => n.id === e.source);
          return sourceNode?.type === NodeType.STYLE && e.target === node.id;
      });
      
      if(connectedStyleEdge) {
          const styleNode = nodes.find(n => n.id === connectedStyleEdge.source) as Node<StyleNodeData>;
          if (styleNode) {
              const method = styleNode.data.applicationMethod === 'appropriate' ? '适当应用' : '作为该部分核心风格';
              serialized += `    *   **局部写作风格**: ${styleNode.data.title} - *释义: ${styleNode.data.description}* (${method})\n`
          }
      }
    });
    serialized += "\n";
  }

  if (edges.length > 0) {
    serialized += "**情节关联:**\n";
    edges.forEach(edge => {
      const sourceNode = nodes.find(n => n.id === edge.source);
      const targetNode = nodes.find(n => n.id === edge.target);
      if (sourceNode && targetNode && sourceNode.type !== NodeType.STYLE && targetNode.type !== NodeType.CHARACTER) { // Exclude style & character connections from flow
        let sourceTitle = (sourceNode.data as any).title || (sourceNode.data as any).name;
        if (sourceNode.type === NodeType.SETTING && edge.sourceHandle) {
             const settingData = sourceNode.data as SettingNodeData;
            if (settingData.narrativeStructure === 'dual') {
                sourceTitle += ` (${edge.sourceHandle === 'source_a' ? '故事线A' : '故事线B'})`;
            } else if (settingData.narrativeStructure === 'light_dark') {
                sourceTitle += ` (${edge.sourceHandle === 'source_a' ? '明线' : '暗线'})`;
            }
        }

        const targetTitle = (targetNode.data as any).title || (targetNode.data as any).name;
        serialized += `*   '${sourceTitle}' 连接到 '${targetTitle}'\n`;
      }
    });
  }

  return serialized;
}

const getBasePrompt = (nodes: Node[]): { systemInstruction: string, taskInstruction: string } => {
    const workNode = nodes.find(n => n.type === NodeType.WORK) as Node<WorkNodeData> | undefined;
    if (workNode) {
        if (workNode.data.mode === 'rewrite') {
            return {
                systemInstruction: "You are a story rewriting tool. Your task is to process user-provided text and structural nodes to create a new story outline. Follow the user's structural plan precisely.",
                taskInstruction: "Based on the provided 【Original Work】 and the new structural components, create a new, logically sound story outline in JSON format."
            };
        } else { // continue mode
            return {
                systemInstruction: "You are a story continuation tool. Your task is to extend an existing story based on a set of new plot nodes.",
                taskInstruction: "Based on the provided 【Original Work】, continue the story strictly following the order and content of the 【Plot Nodes】. Generate a structured outline for the new sections only. **CRITICAL: Your output must not include any content from the 【Original Work】; only output the new continuation part.**"
            };
        }
    }
    // Default mode: create from scratch
    return {
        systemInstruction: "You are a story outlining tool. Your task is to convert a set of structured nodes into a logical, JSON-formatted story outline. Adhere strictly to the user's provided components.",
        taskInstruction: "Based on all the information below, generate a logically sound, structured story outline in JSON format."
    };
};


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
    const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: responseSchema
        }
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
        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                systemInstruction
            }
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
    const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
            systemInstruction
        }
    });
    return response.text;
  } catch (error) {
    console.error("Error generating story chapter:", error);
    throw new Error(`生成故事章节时出错: ${error instanceof Error ? error.message : '未知错误'}`);
  }
};

const serializeLibraryForPrompt = () => {
    let text = "可用情节库:\n";
    STORY_PLOTS.forEach(p => text += `- id: ${p.id}, name: ${p.name}\n`);
    text += "\n可用风格库:\n";
    STORY_STYLES.forEach(s => text += `- id: ${s.id}, name: ${s.name}, category: ${s.category}\n`);
    text += "\n可用结构库:\n";
    STORY_STRUCTURES.forEach(s => text += `- id: ${s.id}, name: ${s.name}, category: ${s.category}\n`);
    return text;
};

const serializeExistingNodesForContext = (nodes: Node[]): string => {
    if (nodes.length === 0) {
        return "画布当前为空。";
    }

    let context = "画布上已存在以下元素，请勿重复创建：\n";
    const characters = nodes.filter(n => n.type === NodeType.CHARACTER).map(n => `"${(n.data as CharacterNodeData).title}"`);
    const settings = nodes.filter(n => n.type === NodeType.SETTING).map(n => `"${(n.data as SettingNodeData).title}"`);
    const plots = nodes.filter(n => n.type === NodeType.PLOT).map(n => `"${(n.data as PlotNodeData).title}"`);
    const environments = nodes.filter(n => n.type === NodeType.ENVIRONMENT).map(n => `"${(n.data as EnvironmentNodeData).title}"`);
    const works = nodes.filter(n => n.type === NodeType.WORK).map(n => `"${(n.data as WorkNodeData).title}"`);

    if (characters.length > 0) context += `- 人物: ${characters.join(', ')}\n`;
    if (settings.length > 0) context += `- 设定: ${settings.join(', ')}\n`;
    if (environments.length > 0) context += `- 环境/地点: ${environments.join(', ')}\n`;
    if (plots.length > 0) context += `- 情节: ${plots.join(', ')}\n`;
    if (works.length > 0) context += `- 作品: ${works.join(', ')}\n`;

    return context;
}

export const analyzeWork = async (content: string, existingNodes: Node[], model: string): Promise<any> => {
    const libraryText = serializeLibraryForPrompt();
    const existingNodesContext = serializeExistingNodesForContext(existingNodes);

    const prompt = `
你是一个专业的文学分析师。请仔细阅读【待分析的作品】，并将其分解为结构化的JSON对象。

**重要指令:**
1.  **参考现有元素**: 首先，请参考【画布上已存在的元素】。你的核心任务是从作品中提取**新的、尚未存在**的信息。
2.  **避免重复**: **绝对不要**为【画布上已存在的元素】中列出的项目创建重复的节点。例如，如果人物“张三”已经存在，即使作品中提到了他，你也不应在JSON中再次生成他。
3.  **区分设定与环境**: 你必须区分宏观的“作品设定” (settings) 和具体的“环境/地点” (environments)。
    *   **作品设定 (settings)**: 这是指世界观、核心规则、魔法体系等抽象概念。**目标是只生成一个核心的作品设定对象**，除非原文明确存在多个完全不同的世界观。
    *   **环境/地点 (environments)**: 这是指故事中出现的具体地点，如城市、建筑、森林等。请提取所有提到的具体地点。对于每个地点，**提取其关键特征或描述**，并将其放入 \`fields\` 数组中（例如：\`{ key: "氛围", value: "阴森恐怖" }\`）。
4.  **匹配优先**: 对于\`plots\`、\`styles\`和\`structures\`，你必须优先从下方提供的【可用库】中寻找最匹配的选项。
5.  **返回ID**: 如果找到匹配项，请在JSON对象中返回该项的\`id\`。
6.  **填写userInput**: 将作品中与该匹配项相关的具体、独特的细节，填写到\`userInput\`字段中。这非常重要，它可以保留原文的精髓。
7.  **自定义**: 如果在库中找不到任何合适的匹配项，请将\`id\`设为\`null\`，并自行提供\`title\`和\`description\`。

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

    try {
        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        characters: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    title: { type: Type.STRING, description: "人物的姓名或称谓" },
                                    fields: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { key: { type: Type.STRING }, value: { type: Type.STRING } } } }
                                }
                            }
                        },
                        settings: {
                             type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    title: { type: Type.STRING, description: "作品设定的名称 (世界观, 核心概念)" },
                                    fields: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { key: { type: Type.STRING }, value: { type: Type.STRING } } } }
                                }
                            }
                        },
                        environments: {
                             type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    title: { type: Type.STRING, description: "环境/地点的具体名称" },
                                    fields: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { key: { type: Type.STRING }, value: { type: Type.STRING } } } }
                                }
                            }
                        },
                        plots: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    id: { type: Type.NUMBER, description: "匹配的库ID，或null" },
                                    title: { type: Type.STRING, description: "情节节点的简洁标题" },
                                    description: { type: Type.STRING, description: "仅当id为null时提供" },
                                    userInput: { type: Type.STRING, description: "作品中的具体细节" }
                                }
                            }
                        },
                        styles: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    id: { type: Type.NUMBER },
                                    title: { type: Type.STRING },
                                    description: { type: Type.STRING },
                                    userInput: { type: Type.STRING }
                                }
                            }
                        },
                        structures: {
                            type: Type.OBJECT,
                            properties: {
                                start: {
                                    type: Type.OBJECT,
                                    properties: { id: { type: Type.NUMBER }, title: { type: Type.STRING }, description: { type: Type.STRING }, userInput: { type: Type.STRING } }
                                },
                                end: {
                                    type: Type.OBJECT,
                                    properties: { id: { type: Type.NUMBER }, title: { type: Type.STRING }, description: { type: Type.STRING }, userInput: { type: Type.STRING } }
                                }
                            }
                        }
                    }
                }
            }
        });
        
        const jsonText = response.text.trim();
        return JSON.parse(jsonText);
    } catch (error) {
        console.error("Error analyzing work:", error);
        let errorMessage = `解析作品时出错: ${error instanceof Error ? error.message : '未知错误'}`;
        if (error instanceof SyntaxError) {
            errorMessage += "\nAI返回的格式可能不正确。";
        }
        throw new Error(errorMessage);
    }
};

export const expandSetting = async (settingData: SettingNodeData, existingNodes: Node[], model: string): Promise<any> => {
    const settingText = `标题: ${settingData.title}\n` + settingData.fields.map(f => `${f.key}: ${f.value}`).join('\n');
    const plotLibraryText = "可用情节库:\n" + STORY_PLOTS.map(p => `- id: ${p.id}, name: ${p.name}`).join('\n');
    const styleLibraryText = "可用风格库:\n" + STORY_STYLES.map(s => `- id: ${s.id}, name: ${s.name}, category: ${s.category}`).join('\n');
    const structureLibraryText = "可用结构库:\n" + STORY_STRUCTURES.map(s => `- id: ${s.id}, name: ${s.name}, category: ${s.category}`).join('\n');
    const existingNodesContext = serializeExistingNodesForContext(existingNodes);

    const prompt = `
你是一位富有想象力的世界构建大师和故事创意总监。
根据以下提供的【原始作品设定】，并参考【画布上已存在的元素】，进行创意扩展。

**可用库:**
---
${plotLibraryText}
---
${styleLibraryText}
---
${structureLibraryText}
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
1.  **生成补充性节点**: 你的任务是创造与【原始作品设定】相关，且与【画布上已存在的元素】**不重复**的新元素。你需要生成一些新的 \`characters\` (人物), \`plots\` (情节线索), \`environments\` (更具体的地点), \`styles\` (风格), 以及一对 \`structures\` (一个开头和一个结尾)。
2.  **匹配库**: 对于 \`plots\`, \`styles\` 和 \`structures\`，你**必须**从上方的【可用库】中选择最匹配的选项，并返回其 \`id\`。不要创建库中不存在的项目。
3.  **保持一致性**: 所有新生成的元素都必须与【原始作品设定】的风格和内容保持高度一致。
4.  **生成连接**: 同时，生成一个 \`connections\` 数组，描述你创建的节点之间，以及它们与**画布上任何已有节点**（包括原始设定节点）的合理关系。在 \`connections\` 中，使用节点的标题(\`title\`)来指代节点。例如：\`{ "sourceTitle": "${settingData.title}", "targetTitle": "新角色标题" }\` 或 \`{ "sourceTitle": "已存在的环境节点标题", "targetTitle": "新情节标题" }\`。
5.  **返回JSON**: 必须严格按照指定的JSON格式返回结果。
`;

    try {
        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        characters: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    title: { type: Type.STRING, description: "人物的姓名或称谓" },
                                    fields: {
                                        type: Type.ARRAY,
                                        items: { type: Type.OBJECT, properties: { key: { type: Type.STRING }, value: { type: Type.STRING } } }
                                    }
                                }
                            }
                        },
                        environments: {
                             type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    title: { type: Type.STRING, description: "具体环境/地点的名称" },
                                    fields: {
                                        type: Type.ARRAY,
                                        items: { type: Type.OBJECT, properties: { key: { type: Type.STRING }, value: { type: Type.STRING } } }
                                    }
                                }
                            }
                        },
                        plots: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    id: { type: Type.NUMBER, description: "匹配的库ID" },
                                }
                            }
                        },
                        styles: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    id: { type: Type.NUMBER, description: "匹配的库ID" },
                                }
                            }
                        },
                        structures: {
                            type: Type.OBJECT,
                            properties: {
                                start: {
                                    type: Type.OBJECT,
                                    properties: { id: { type: Type.NUMBER } }
                                },
                                end: {
                                    type: Type.OBJECT,
                                    properties: { id: { type: Type.NUMBER } }
                                }
                            }
                        },
                        connections: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    sourceTitle: { type: Type.STRING, description: "源节点的标题" },
                                    targetTitle: { type: Type.STRING, description: "目标节点的标题" }
                                }
                            }
                        }
                    }
                }
            }
        });
        
        const jsonText = response.text.trim();
        return JSON.parse(jsonText);

    } catch (error) {
        console.error("Error expanding setting:", error);
        let errorMessage = `扩展设定时出错: ${error instanceof Error ? error.message : '未知错误'}`;
        if (error instanceof SyntaxError) {
            errorMessage += "\nAI返回的格式可能不正确。";
        }
        throw new Error(errorMessage);
    }
};