import { GoogleGenAI, Type } from "@google/genai";
import { Node, Edge, NodeType, CharacterNodeData, SettingNodeData, PlotNodeData, StyleNodeData, StructureNodeData, StructureCategory, WorkNodeData, KeyValueField, EnvironmentNodeData } from '../types';
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
                systemInstruction: "你是一位才华横溢的编辑和作家。你的任务是根据用户提供的原始文本和一组新的结构化节点，对故事进行彻底的重写。",
                taskInstruction: "请根据下方提供的【原始作品】和新的【情节节点】、【人物设定】等组件，创作一个全新的、完整的故事大纲。你的任务是重写，而不是续写。"
            };
        } else { // continue mode
            return {
                systemInstruction: "你是一位能够无缝衔接他人风格的续写专家。你的任务是基于一个已有的故事开头，继续创作后续的情节。",
                taskInstruction: "请根据下方提供的【原始作品】，严格按照【情节节点】的顺序和内容，续写故事。**非常重要：你的输出绝对不能包含【原始作品】的任何内容，只输出新创作的续写部分。**"
            };
        }
    }
    // Default mode: create from scratch
    return {
        systemInstruction: "你是一位经验丰富的作家兼故事结构分析师。你的任务是根据用户提供的组件，创作一份详细、连贯且引人入胜的故事大纲。",
        taskInstruction: "请基于以下所有信息，生成一份逻辑清晰的故事大纲。大纲应包含主要情节转折、角色动机和场景描述。"
    };
};


export const generateOutline = async (nodes: Node[], edges: Edge[], language: string, model: string): Promise<string> => {
  const serializedData = serializeGraph(nodes, edges);
  if (!serializedData.trim()) {
    return "错误：没有足够的信息来生成大纲。请添加一些节点和连接。";
  }
  
  const { systemInstruction, taskInstruction } = getBasePrompt(nodes);

  const prompt = `
${taskInstruction}

重要指令：
- **全局风格**: 如果提供了【全局写作风格】，它将作为整个故事的基调。你必须在整个大纲的构思中始终贯穿这些风格。
- **局部风格**: 对于指定了【局部写作风格】的情节节点，你必须严格遵守该指令。它会覆盖全局风格，用于在故事的特定部分创造独特的氛围或叙事效果。
- **指令的严肃性**: 所有的风格指令都是必须遵守的硬性要求，不是建议。例如，如果指定了“第一人称叙事”，大纲中对应的部分必须以第一人称的口吻来构思和描述。这是绝对的命令。
- **融合**: 大纲需要将所有情节节点和设定有机地融合起来，形成一个完整的故事框架。

以下是用户提供的故事组件：
---
${serializedData}
---

最终大纲请使用 **${language}** 写作。
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
    console.error("Error generating outline:", error);
    return `生成大纲时出错: ${error instanceof Error ? error.message : '未知错误'}`;
  }
};

const getStoryBasePrompt = (nodes: Node[]): { systemInstruction: string, taskInstruction: string } => {
    const workNode = nodes.find(n => n.type === NodeType.WORK) as Node<WorkNodeData> | undefined;
    if (workNode) {
        if (workNode.data.mode === 'rewrite') {
            return {
                systemInstruction: "你是一位技艺精湛的文学编辑。你的任务不是从头重写，而是对现有文本进行精准的修订，使其符合新的结构要求。",
                taskInstruction: "你的任务是**编辑和修改**下方的【原始作品】，使其完全符合【故事大纲】中的新情节和结构。**核心要求**：尽可能多地保留【原始作品】的原文、风格和对话。只在为了融入新大纲内容而**绝对必要**时才进行修改或重写。你的目标是一次“微创手术式”的修订，而不是一次彻底的重写。未受大纲变化影响的部分应与原文保持一致。"
            };
        } else { // continue mode
            return {
                systemInstruction: "你是一位能够模仿任何写作风格并无缝续写故事的文学大师。",
                taskInstruction: "请根据【原始作品】的上下文和风格，严格按照下面的【故事大纲】续写故事。**极端重要：你的回答必须只包含新写的部分，绝对不要重复任何【原始作品】的内容。** 这是一个硬性要求。"
            };
        }
    }
    // Default mode
    return {
        systemInstruction: "你是一位世界级的作家。请根据以下详细的故事大纲，创作一篇完整的作品。",
        taskInstruction: "你必须严格遵循大纲中的角色设定、故事背景和情节发展。"
    };
};

export const generateStory = async (nodes: Node[], edges: Edge[], outline: string, language: string, model: string): Promise<string> => {
  const workNode = nodes.find(n => n.type === NodeType.WORK) as Node<WorkNodeData> | undefined;
  const { systemInstruction, taskInstruction } = getStoryBasePrompt(nodes);
  
  let originalWorkSection = "";
  if (workNode) {
    originalWorkSection = `
**原始作品 (仅供参考):**
---
${workNode.data.content}
---
`;
  }
  
  const serializedData = serializeGraph(nodes, edges);

  const prompt = `
重要要求：
- **任务**: ${taskInstruction}
- **核心原则**: 你必须将【故事大纲】中的要点自然地融入叙事，**避免生硬地直接使用情节节点的标题词语（例如，不要在文中直接写出“解救”、“获得”这样的词）**。你的任务是讲述一个体现了节点内涵的故事，而不是对大纲进行简单的填充。
- **文风要求**: 故事的叙述应成熟、含蓄，避免说教或过于幼稚的口吻。通过角色的行为和对话来展现主题，而不是直接陈述道理。
- **遵守风格指令**: 【故事组件】中可能包含【全局写作风格】和【局部写作风格】。你必须绝对遵守这些指令。全局风格是整篇作品的基调，而局部风格则应用于特定部分。这是一个绝对指令，不是建议。例如，如果全局风格要求“第一人称叙事”，整篇文章都必须使用“我”来叙述，除非某个局部风格另有指定。不遵守此项指令是不可接受的。
- **章节**: 如果故事篇幅较长，可以酌情分为多个章节。如果内容紧凑，则无需分章。如果分章，请使用“# 第一章”、“## 场景一”等Markdown格式作为章节标题。
- **语言**: 整篇作品必须使用 **${language}** 写作。

${originalWorkSection}

**故事组件 (包含详细释义，供你理解深层内涵):**
---
${serializedData}
---

**故事大纲 (这是你创作的直接依据):**
---
${outline}
---
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
    console.error("Error generating story:", error);
    return `生成作品时出错: ${error instanceof Error ? error.message : '未知错误'}`;
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

export const analyzeWork = async (content: string, model: string): Promise<any> => {
    const libraryText = serializeLibraryForPrompt();
    const prompt = `
你是一个专业的文学分析师。请仔细阅读以下文学作品，并将其分解为结构化的JSON对象。

**重要指令:**
1.  **区分设定与环境**: 你必须区分宏观的“作品设定” (settings) 和具体的“环境/地点” (environments)。
    *   **作品设定 (settings)**: 这是指世界观、核心规则、魔法体系等抽象概念。**目标是只生成一个核心的作品设定对象**，除非原文明确存在多个完全不同的世界观。
    *   **环境/地点 (environments)**: 这是指故事中出现的具体地点，如城市、建筑、森林等。请提取所有提到的具体地点。对于每个地点，**提取其关键特征或描述**，并将其放入 \`fields\` 数组中（例如：\`{ key: "氛围", value: "阴森恐怖" }\`）。
2.  **匹配优先**: 对于\`plots\`、\`styles\`和\`structures\`，你必须优先从下方提供的【可用库】中寻找最匹配的选项。
3.  **返回ID**: 如果找到匹配项，请在JSON对象中返回该项的\`id\`。
4.  **填写userInput**: 将作品中与该匹配项相关的具体、独特的细节，填写到\`userInput\`字段中。这非常重要，它可以保留原文的精髓。
5.  **自定义**: 如果在库中找不到任何合适的匹配项，请将\`id\`设为\`null\`，并自行提供\`title\`和\`description\`。

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

export const expandSetting = async (settingData: SettingNodeData, model: string): Promise<any> => {
    const settingText = `标题: ${settingData.title}\n` + settingData.fields.map(f => `${f.key}: ${f.value}`).join('\n');
    const plotLibraryText = "可用情节库:\n" + STORY_PLOTS.map(p => `- id: ${p.id}, name: ${p.name}`).join('\n');
    const styleLibraryText = "可用风格库:\n" + STORY_STYLES.map(s => `- id: ${s.id}, name: ${s.name}, category: ${s.category}`).join('\n');
    const structureLibraryText = "可用结构库:\n" + STORY_STRUCTURES.map(s => `- id: ${s.id}, name: ${s.name}, category: ${s.category}`).join('\n');

    const prompt = `
你是一位富有想象力的世界构建大师和故事创意总监。
根据以下提供的【原始作品设定】，请进行创意扩展，生成一些可能存在于这个世界中的新元素，并建立它们之间的联系。

**可用库:**
---
${plotLibraryText}
---
${styleLibraryText}
---
${structureLibraryText}
---

**原始作品设定:**
---
${settingText}
---

**指令:**
1.  **生成多样化节点**: 创造一些相关的 \`characters\` (人物), \`plots\` (情节线索), \`environments\` (更具体的地点), \`styles\` (风格), 以及一对 \`structures\` (一个开头和一个结尾)。
2.  **匹配库**: 对于 \`plots\`, \`styles\` 和 \`structures\`，你**必须**从上方的【可用库】中选择最匹配的选项，并返回其 \`id\`。不要创建库中不存在的项目。
3.  **保持一致性**: 所有新生成的元素都必须与原始设定的风格和内容保持高度一致。
4.  **生成连接**: 同时，生成一个 \`connections\` 数组，描述你创建的节点之间，以及它们与原始设定节点之间的关系。在 \`connections\` 中，使用节点的标题(\`title\`)来指代节点。例如：\`{ "sourceTitle": "${settingData.title}", "targetTitle": "新角色标题" }\` 或 \`{ "sourceTitle": "新地点标题", "targetTitle": "新情节标题" }\`。
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