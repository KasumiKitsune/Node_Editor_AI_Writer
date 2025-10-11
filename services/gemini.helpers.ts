import { Node, Edge, NodeType, CharacterNodeData, SettingNodeData, PlotNodeData, StyleNodeData, StructureNodeData, StructureCategory, WorkNodeData, EnvironmentNodeData } from '../types';
import { PLOT_DESCRIPTIONS } from '../plotDescriptions';
import { STORY_PLOTS, STORY_STYLES, STORY_STRUCTURES } from '../constants';

export function serializeGraph(nodes: Node[], edges: Edge[]): string {
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
      if (workNode.data.mode === 'parody') {
        const levelMap = {
            'reference': '参考 (仅参考文风，内容需完全不同)',
            'imitation': '模仿 (模仿原文风格和结构，创作新内容)',
            '套作': '套作 (严格模仿原文结构和句式，替换核心元素)',
        };
        const levelText = levelMap[workNode.data.parodyLevel || 'reference'];
        serialized += `**写作风格仿写目标 (程度: ${levelText}):**\n`;
        serialized += "```\n";
        serialized += `${workNode.data.content}\n`;
        serialized += "```\n\n";
    } else {
        const modeText = workNode.data.mode === 'rewrite' ? '改写模式' : '续写模式';
        serialized += `**原始作品 (${modeText}):**\n`;
        serialized += "```\n";
        serialized += `${workNode.data.content}\n`;
        serialized += "```\n\n";
    }
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

export const getBasePrompt = (nodes: Node[]): { systemInstruction: string, taskInstruction: string } => {
    const workNode = nodes.find(n => n.type === NodeType.WORK) as Node<WorkNodeData> | undefined;
    if (workNode) {
        if (workNode.data.mode === 'rewrite') {
            return {
                systemInstruction: "You are a story rewriting tool. Your task is to process user-provided text and structural nodes to create a new story outline. Follow the user's structural plan precisely.",
                taskInstruction: "Based on the provided 【Original Work】 and the new structural components, create a new, logically sound story outline in JSON format."
            };
        }
        if (workNode.data.mode === 'continue') {
            return {
                systemInstruction: "You are a story continuation tool. Your task is to extend an existing story based on a set of new plot nodes.",
                taskInstruction: "Based on the provided 【Original Work】, continue the story strictly following the order and content of the 【Plot Nodes】. Generate a structured outline for the new sections only. **CRITICAL: Your output must not include any content from the 【Original Work】; only output the new continuation part.**"
            };
        }
        if (workNode.data.mode === 'parody') {
            const level = workNode.data.parodyLevel;
            let levelInstruction = '';
            switch(level) {
                case 'reference':
                    levelInstruction = "Your primary goal is to capture the *essence* of the example's style—its tone, rhythm, and vocabulary—but apply it to a completely original story based on the other nodes. The final reader should NOT be able to tell what specific work you are referencing. Avoid using any character names, specific plot points, or unique settings from the example text.";
                    break;
                case 'imitation':
                    levelInstruction = "Your task is to closely imitate the example's style, structure, and narrative voice. You should create a new story based on the other nodes, but it should feel like it was written by the same author as the example. You can echo the structure (e.g., how paragraphs are built, how dialogue is presented) but the core content must be original.";
                    break;
                case '套作':
                    levelInstruction = "This is a formal imitation exercise ('套作'). You must strictly replicate the sentence structures, paragraphing, and narrative flow of the example text. Replace the key nouns, verbs, and concepts from the example with elements from the other provided story nodes, but keep the grammatical 'skeleton' as close to the original as possible.";
                    break;
            }
            return {
                systemInstruction: "You are a master of literary styles. Your task is to write a story that imitates the style of a provided text, based on specific instructions for the level of imitation.",
                taskInstruction: `Based on the plot nodes and character settings, write a new story outline. **CRITICAL: You must create an outline for a story that will be written in the style of the【写作风格仿写目标】text provided below. Follow the specified imitation level meticulously when designing the key events. ${levelInstruction}`
            };
        }
    }
    // Default mode: create from scratch
    return {
        systemInstruction: "You are a story outlining tool. Your task is to convert a set of structured nodes into a logical, JSON-formatted story outline. Adhere strictly to the user's provided components.",
        taskInstruction: "Based on all the information below, generate a logically sound, structured story outline in JSON format."
    };
};

export const serializeLibraryForPrompt = () => {
    let text = "可用情节库:\n";
    STORY_PLOTS.forEach(p => text += `- id: ${p.id}, name: ${p.name}\n`);
    text += "\n可用风格库:\n";
    STORY_STYLES.forEach(s => text += `- id: ${s.id}, name: ${s.name}, category: ${s.category}\n`);
    text += "\n可用结构库:\n";
    STORY_STRUCTURES.forEach(s => text += `- id: ${s.id}, name: ${s.name}, category: ${s.category}\n`);
    return text;
};

export const serializeExistingNodesForContext = (nodes: Node[]): string => {
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
