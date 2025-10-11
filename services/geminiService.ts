import { GoogleGenAI, Type } from "@google/genai";
import { Node, Edge, NodeType, CharacterNodeData, SettingNodeData, PlotNodeData, StyleNodeData, StructureNodeData, StructureCategory, WorkNodeData, KeyValueField, EnvironmentNodeData, StructuredOutline, Chapter } from '../types';
import { serializeGraph, getBasePrompt, serializeLibraryForPrompt, serializeExistingNodesForContext } from './gemini.helpers';
// FIX: Added import for STORY_PLOTS, STORY_STYLES, and STORY_STRUCTURES to resolve reference errors in the expandSetting function.
import { STORY_PLOTS, STORY_STYLES, STORY_STRUCTURES } from '../constants';

// FIX: The API key is now sourced directly from `process.env.API_KEY` during initialization, and the prior manual check has been removed, aligning with the project's setup assumptions.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const getModelConfig = (model: string, baseConfig: any = {}) => {
    let effectiveModel = model;
    const config = { ...baseConfig };
    if (model === 'gemini-2.5-flash-no-thinking') {
        effectiveModel = 'gemini-2.5-flash';
        config.thinkingConfig = { thinkingBudget: 0 };
    }
    return { effectiveModel, config };
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
    const libraryText = serializeLibraryForPrompt();
    const existingNodesContext = serializeExistingNodesForContext(existingNodes);

    const prompt = `
你是一个专业的文学分析师。请仔细阅读【待分析的作品】，并将其分解为结构化的JSON对象。

**重要指令:**
1.  **识别节点**: 从作品中提取新的、尚未存在的\`characters\`, \`settings\`, \`environments\`, \`plots\`, \`styles\` 和 \`structures\`。
2.  **避免重复**: **绝对不要**为【画布上已存在的元素】中列出的项目创建重复的节点。
3.  **区分设定与环境**: 必须区分宏观的“作品设定” (settings) 和具体的“环境/地点” (environments)。设定是世界观，环境是具体地点。
4.  **匹配优先**: 对于\`plots\`、\`styles\`和\`structures\`，必须优先从【可用库】中寻找最匹配的选项并返回其\`id\`。找不到则将\`id\`设为\`null\`并自行提供\`title\`和\`description\`。
5.  **填写userInput**: 将作品中与库匹配项相关的具体细节，填写到\`userInput\`字段中。
6.  **识别叙事结构**: 判断作品是单线还是多线叙事。如果有多条明显的故事线，请将情节分别归入 \`plots_a\` 和 \`plots_b\`。否则，全部放入 \`plots\`。
7.  **创建连接**: 生成一个 \`connections\` 数组来表示节点间的关系。
    *   **情节流**: **必须**将所有情节节点（在各自的故事线内）按时间顺序首尾相连，形成连贯的故事线。
    *   **元素归属**: 将每个识别出的 \`characters\` 和 \`environments\` 节点，连接到它们在故事中首次出现或最关键的那个情节节点上。
    *   **风格应用**: 将识别出的 \`styles\` 节点，连接到应用了该风格的情节或设定节点上。

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
        const basePlotSchema = {
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
        };

        // FIX: Defined schema components as constants to resolve "Cannot find name" reference errors.
        const charactersSchema = { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, fields: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { key: { type: Type.STRING }, value: { type: Type.STRING } } } } } } };
        const settingsSchema = { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, fields: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { key: { type: Type.STRING }, value: { type: Type.STRING } } } } } } };
        const environmentsSchema = { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, fields: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { key: { type: Type.STRING }, value: { type: Type.STRING } } } } } } };
        const plotsSchema = { ...basePlotSchema, description: "单线叙事时的情节" };
        const plotsASchema = { ...basePlotSchema, description: "多线叙事时的A线情节" };
        const plotsBSchema = { ...basePlotSchema, description: "多线叙事时的B线情节" };
        const stylesSchema = { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.NUMBER }, title: { type: Type.STRING }, description: { type: Type.STRING }, userInput: { type: Type.STRING } } } };
        const structurePartSchema = { type: Type.OBJECT, properties: { id: { type: Type.NUMBER }, title: { type: Type.STRING }, description: { type: Type.STRING }, userInput: { type: Type.STRING } } };
        const structuresSchema = { type: Type.OBJECT, properties: { start: structurePartSchema, end: structurePartSchema } };
        const connectionsSchema = { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { sourceTitle: { type: Type.STRING }, targetTitle: { type: Type.STRING }, sourceHandle: { type: Type.STRING }, targetHandle: { type: Type.STRING } } } };
        
        const { effectiveModel, config } = getModelConfig(model, {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    characters: charactersSchema,
                    settings: settingsSchema,
                    environments: environmentsSchema,
                    plots: plotsSchema,
                    plots_a: plotsASchema,
                    plots_b: plotsBSchema,
                    styles: stylesSchema,
                    structures: structuresSchema,
                    connections: connectionsSchema
                }
            }
        });
        
        const response = await ai.models.generateContent({
            model: effectiveModel,
            contents: prompt,
            config: config
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

    const isMultiLine = settingData.narrativeStructure === 'dual' || settingData.narrativeStructure === 'light_dark';
    const lineAName = settingData.narrativeStructure === 'light_dark' ? '明线' : '故事线A';
    const lineBName = settingData.narrativeStructure === 'light_dark' ? '暗线' : '故事线B';

    let plotInstructions: string;
    let plotProperties: any;
    const plotLineSchema = {
        type: Type.ARRAY,
        items: { type: Type.OBJECT, properties: { id: { type: Type.NUMBER, description: "匹配的库ID" } } }
    };

    if (isMultiLine) {
        plotProperties = {
            plots_a: { ...plotLineSchema, description: `与 ${lineAName} 相关的情节线索` },
            plots_b: { ...plotLineSchema, description: `与 ${lineBName} 相关的情节线索` }
        };
        plotInstructions = `
- **生成双线情节**: 此设定为 **${lineAName}/${lineBName}** 结构。你必须生成 **两组独立的情节**：\`plots_a\` (用于 ${lineAName}) 和 \`plots_b\` (用于 ${lineBName})。
- **连接情节**: 在 \`connections\` 数组中，你必须:
    1.  将 \`plots_a\` 中的所有情节首尾相连，形成 **${lineAName}** 的故事流。
    2.  将 \`plots_b\` 中的所有情节首尾相连，形成 **${lineBName}** 的故事流。
    3.  这两条故事线应从设定节点的 '${settingData.title}' 分别通过 \`source_a\` 和 \`source_b\` 手柄引出。`;
    } else {
        plotProperties = {
            plots: { ...plotLineSchema, description: "与设定相关的情节线索" }
        };
        plotInstructions = `
- **生成情节**: 基于设定，生成一系列连贯的 \`plots\` (情节)。
- **连接情节**: 在 \`connections\` 数组中，将所有情节节点首尾相连，形成一个单一的故事流。`;
    }


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
1.  **生成补充性节点**: 你的任务是创造与【原始作品设定】相关，且与【画布上已存在的元素】**不重复**的新元素。你需要生成一些新的 \`characters\` (人物), \`environments\` (更具体的地点), \`styles\` (风格), 以及一对 \`structures\` (一个开头和一个结尾)。
2.  ${plotInstructions}
3.  **匹配库**: 对于 \`plots\`, \`styles\` 和 \`structures\`，你**必须**从上方的【可用库】中选择最匹配的选项，并返回其 \`id\`。
4.  **精准连接**: 对于每一个新生成的 \`characters\` 和 \`environments\` 节点，请在 \`connections\` 数组中将其连接到 **最相关的一个情节节点** 上。不要将所有节点都连接到第一个情节上。
5.  **返回JSON**: 必须严格按照指定的JSON格式返回结果。
`;

    try {
        // FIX: Defined schema components as constants to resolve "Cannot find name" reference errors.
        const charactersSchema = { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, fields: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { key: { type: Type.STRING }, value: { type: Type.STRING } } } } } } };
        const environmentsSchema = { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, fields: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { key: { type: Type.STRING }, value: { type: Type.STRING } } } } } } };
        const stylesSchema = { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.NUMBER, description: "匹配的库ID" } } } };
        const structuresSchema = { type: Type.OBJECT, properties: { start: { type: Type.OBJECT, properties: { id: { type: Type.NUMBER } } }, end: { type: Type.OBJECT, properties: { id: { type: Type.NUMBER } } } } };
        const connectionsSchema = { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { sourceTitle: { type: Type.STRING }, targetTitle: { type: Type.STRING }, sourceHandle: { type: Type.STRING }, targetHandle: { type: Type.STRING } } } };
        
        const { effectiveModel, config } = getModelConfig(model, {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    characters: charactersSchema,
                    environments: environmentsSchema,
                    ...plotProperties,
                    styles: stylesSchema,
                    structures: structuresSchema,
                    connections: connectionsSchema
                }
            }
        });

        const response = await ai.models.generateContent({
            model: effectiveModel,
            contents: prompt,
            config: config
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
