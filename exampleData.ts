import { Node, Edge, NodeType, StructureCategory } from './types';

export const generalExample: { nodes: Node[], edges: Edge[] } = {
  nodes: [
    {
      id: "SETTING_general_1",
      type: NodeType.SETTING,
      position: { x: 50, y: 50 },
      data: {
        title: "宇宙背景",
        fields: [
          { id: 'f1', key: '背景', value: '人类已经进入深空探索时代' },
          { id: 'f2', key: '核心概念', value: '超空间航行技术' }
        ],
        narrativeStructure: 'single'
      },
      isCollapsed: false,
    },
    {
      id: "CHAR_general_1",
      type: NodeType.CHARACTER,
      position: { x: 50, y: 250 },
      data: {
        title: "卡珊德拉船长",
        fields: [
          { id: 'f1', key: '姓名', value: '卡珊德ら' },
          { id: 'f2', key: '职业', value: '星际探险家' },
          { id: 'f3', key: '性格', value: '好奇、坚韧' }
        ]
      },
      isCollapsed: false,
    },
    {
      id: "ENV_general_1",
      type: NodeType.ENVIRONMENT,
      position: { x: 50, y: 450 },
      data: {
        title: "遗忘星球X-7",
        fields: [
          { id: 'f1', key: '特点', value: '双星系统，紫色植被，大气稀薄' }
        ]
      },
      isCollapsed: false,
    },
    {
      id: "STRUC_start_general_1",
      type: NodeType.STRUCTURE,
      position: { x: 400, y: 50 },
      data: {
        structureId: 501,
        title: "开门见山式",
        description: "故事从情节发展的关键或紧张时刻切入，迅速将读者带入冲突之中。这种开头节奏快，能立刻激发读者的好奇心。",
        category: StructureCategory.STARTING,
        userInput: ""
      },
      isCollapsed: false,
    },
    {
      id: "PLOT_general_1",
      type: NodeType.PLOT,
      position: { x: 400, y: 250 },
      data: {
        plotId: 36,
        title: "发现外星遗迹",
        description: "故事始于一个重要的联结（人或物）处于“丢失”或“分离”的状态。整个叙事过程就是寻找、辨认并最终重新建立这一联结的旅程。",
        userInput: "遗迹是一个巨大的金属立方体，表面刻有未知符号"
      },
      isCollapsed: false,
    },
    {
      id: "STRUC_end_general_1",
      type: NodeType.STRUCTURE,
      position: { x: 400, y: 450 },
      data: {
        structureId: 608,
        title: "解谜式结局",
        description: "主要用于推理小说，结尾揭开所有谜团的真相，让读者恍然大悟。",
        category: StructureCategory.ENDING,
        userInput: ""
      },
      isCollapsed: false,
    },
  ],
  edges: [
    { id: "e_gen_1", source: "SETTING_general_1", target: "CHAR_general_1", sourceHandle: undefined, targetHandle: "flow" },
    { id: "e_gen_2", source: "CHAR_general_1", target: "ENV_general_1", sourceHandle: undefined, targetHandle: "flow" },
    { id: "e_gen_3", source: "ENV_general_1", target: "STRUC_start_general_1", sourceHandle: undefined, targetHandle: "flow" },
    { id: "e_gen_4", source: "STRUC_start_general_1", target: "PLOT_general_1", sourceHandle: undefined, targetHandle: "flow" },
    { id: "e_gen_5", source: "PLOT_general_1", target: "STRUC_end_general_1", sourceHandle: undefined, targetHandle: "flow" },
  ]
};

export const expansionExample: { nodes: Node[], edges: Edge[] } = {
  nodes: [
    {
      id: "SETTING_expansion_1",
      type: NodeType.SETTING,
      position: { x: 150, y: 150 },
      data: {
        title: "龟背之城 - 阿图因",
        fields: [
          { id: 'f1', key: '核心概念', value: '一座城市建立在一只穿越云海的远古巨龟的背上' },
          { id: 'f2', key: '社会规则', value: '城市的居民与巨龟共生，他们的文化与龟的习性息息相关' }
        ],
        narrativeStructure: 'single'
      },
      isCollapsed: false,
    }
  ],
  edges: []
};

export const rewriteExample: { nodes: Node[], edges: Edge[] } = {
  nodes: [
    {
      id: "WORK_rewrite_1",
      type: NodeType.WORK,
      position: { x: 50, y: 200 },
      data: {
        title: "哈里森的案件",
        content: "侦探哈里森站在码头上，雨水浸湿了他的风衣。他凝视着黑色的海水，思考着失踪的珠宝商——马洛先生。线索指向了城里最臭名昭著的夜总会“蓝鹦鹉”。他叹了口气，知道今晚又将是一个不眠之夜。",
        mode: 'rewrite'
      },
      isCollapsed: false,
    },
    {
      id: "CHAR_rewrite_1",
      type: NodeType.CHARACTER,
      position: { x: 400, y: 50 },
      data: { title: "侦探哈里森", fields: [{id:'f1', key: '职业', value: '私家侦探'}, {id:'f2', key:'特征', value:'风衣，疲惫'}] },
      isCollapsed: false,
    },
    {
      id: "ENV_rewrite_1",
      type: NodeType.ENVIRONMENT,
      position: { x: 400, y: 200 },
      data: { title: "码头", fields: [{id:'f1', key:'氛围', value: '下雨，夜晚'}] },
      isCollapsed: false,
    },
    {
      id: "PLOT_rewrite_1",
      type: NodeType.PLOT,
      position: { x: 400, y: 350 },
      data: {
        plotId: 5,
        title: "既有承诺的背叛",
        description: "在一个既定的承诺关系（如婚姻、盟约）中，一方或多方秘密地违背了其核心的忠诚义务，故事围绕着这种背叛的产生、维系与最终的暴露展开。",
        userInput: "哈里森发现，他最信任的线人，其实是马洛失踪的幕后黑手之一。"
      },
      isCollapsed: false,
    }
  ],
  edges: [
    { id: "e_rew_1", source: "WORK_rewrite_1", target: "CHAR_rewrite_1", targetHandle: "flow" },
    { id: "e_rew_2", source: "CHAR_rewrite_1", target: "ENV_rewrite_1", targetHandle: "flow" },
    { id: "e_rew_3", source: "ENV_rewrite_1", target: "PLOT_rewrite_1", targetHandle: "flow" },
  ]
};
