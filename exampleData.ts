import { Node, Edge, NodeType, StructureCategory } from './types';

export const generalExample: { nodes: Node[], edges: Edge[] } = {
  nodes: [
    {
      id: "CHAR_general_1",
      type: NodeType.CHARACTER,
      position: { x: 50, y: 50 },
      data: {
        title: "伊莱娜",
        fields: [
          { id: 'f1', key: '职业', value: '旧书店管理员' },
          { id: 'f2', key: '性格', value: '安静，善于观察，内心有淡淡的忧郁' },
          { id: 'f3', key: '习惯', value: '喜欢在泛黄的书页中寻找被遗忘的笔记' }
        ]
      },
      isCollapsed: false,
    },
    {
      id: "ENV_general_1",
      type: NodeType.ENVIRONMENT,
      position: { x: 50, y: 280 },
      data: {
        title: "旧书店'墨痕'",
        fields: [
          { id: 'f1', key: '氛围', value: '充满了旧纸张、尘埃和咖啡混合的气味' },
          { id: 'f2', key: '特点', value: '光线昏暗，书架直抵天花板，时间在这里仿佛变慢了' }
        ]
      },
      isCollapsed: false,
    },
    {
      id: "STRUC_start_general_1",
      type: NodeType.STRUCTURE,
      position: { x: 400, y: 50 },
      data: {
        structureId: 503,
        title: "背景描绘式",
        description: "通过对环境、时代背景或人物生活状态的细致描写，为故事铺陈一个坚实的舞台，营造出特定的氛围。",
        category: StructureCategory.STARTING,
        userInput: ""
      },
      isCollapsed: true,
    },
    {
      id: "PLOT_general_1",
      type: NodeType.PLOT,
      position: { x: 400, y: 220 },
      data: {
        plotId: 36,
        title: "失落联结的重建",
        description: "故事始于一个重要的联结（人或物）处于“丢失”或“分离”的状态。整个叙事过程就是寻找、辨认并最终重新建立这一联结的旅程。",
        userInput: "伊莱娜在一本捐赠的旧诗集里，发现了一系列夹在书页中的、从未寄出的信件。信件揭示了一段发生在几十年前的、无疾而终的爱情故事。"
      },
      isCollapsed: false,
    },
    {
      id: "STRUC_end_general_1",
      type: NodeType.STRUCTURE,
      position: { x: 400, y: 450 },
      data: {
        structureId: 603,
        title: "开放式结局",
        description: "故事在某个关键点戛然而止，作者没有明确交代人物的最终命运，留给读者广阔的想象空间。",
        category: StructureCategory.ENDING,
        userInput: "伊莱娜读完了所有信，她站在书店窗前，看着窗外的街道，思考着是否应该去寻找信件的收件人，或者让这个故事永远地保存在这家书店里。"
      },
      isCollapsed: false,
    },
     {
      id: "STYLE_general_1",
      type: NodeType.STYLE,
      position: { x: 50, y: 500 },
      data: {
        styleId: 401,
        title: "现实主义",
        description: "致力于客观、细致地描绘日常生活和社会现实，追求细节的真实性和典型性，仿佛生活本身。",
        applicationMethod: 'appropriate'
      },
      isCollapsed: true,
    }
  ],
  edges: [
    { id: "e_gen_1", source: "STRUC_start_general_1", target: "PLOT_general_1", sourceHandle: undefined, targetHandle: "flow" },
    { id: "e_gen_2", source: "PLOT_general_1", target: "STRUC_end_general_1", sourceHandle: undefined, targetHandle: "flow" },
    { id: "e_gen_3", source: "CHAR_general_1", target: "PLOT_general_1", sourceHandle: undefined, targetHandle: "flow" },
    { id: "e_gen_4", source: "ENV_general_1", target: "PLOT_general_1", sourceHandle: undefined, targetHandle: "flow" },
    { id: "e_gen_5", source: "STYLE_general_1", target: "PLOT_general_1", sourceHandle: undefined, targetHandle: "style" }
  ]
};

export const expansionExample: { nodes: Node[], edges: Edge[] } = {
  nodes: [
    {
      id: "SETTING_expansion_1",
      type: NodeType.SETTING,
      position: { x: 150, y: 150 },
      data: {
        title: "记忆市场",
        fields: [
          { id: 'f1', key: '核心概念', value: '在一个海边小镇，人们可以将自己的记忆提取出来，储存在特制的玻璃瓶中进行交易。' },
          { id: 'f2', key: '社会规则', value: '交易记忆是合法的，但窃取或强行篡改他人的核心记忆被视为最严重的罪行。' }
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
        title: "灰色的海",
        content: "画家安雅又一次站在了画布前。外面是她画了无数次的海，一片单调的灰色，和她此刻的心情别无二致。她举起画笔，却又无力地垂下。颜料在调色盘上干涸，如同她枯竭的灵感。",
        mode: 'rewrite'
      },
      isCollapsed: false,
    },
    {
      id: "CHAR_rewrite_1",
      type: NodeType.CHARACTER,
      position: { x: 450, y: 50 },
      data: { title: "安雅", fields: [{id:'f1', key: '职业', value: '画家'}, {id:'f2', key:'困境', value:'遭遇创作瓶颈'}] },
      isCollapsed: false,
    },
    {
      id: "ENV_rewrite_1",
      type: NodeType.ENVIRONMENT,
      position: { x: 450, y: 230 },
      data: { title: "海边画室", fields: [{id:'f1', key:'特点', value: '能直接看到大海，但光线总是很阴沉'}] },
      isCollapsed: false,
    },
    {
      id: "PLOT_rewrite_1",
      type: NodeType.PLOT,
      position: { x: 450, y: 410 },
      data: {
        plotId: 25,
        title: "轻率行为的灾难性后果",
        description: "一个看似微不足道的疏忽、好奇或鲁莽的决定，像多米诺骨牌一样引发了一连串的负面反应，最终导致了灾难性的结局。",
        userInput: "安雅在清理画室时，无意间发现地板下一本隐藏的日记。日记属于画室的前主人，记录了一段与这片灰色大海有关的、悲伤的爱情故事。这个发现彻底改变了她对这片海的看法，也击碎了她的创作瓶颈。"
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

export const assistantExample: { nodes: Node[], edges: Edge[] } = {
  nodes: [
    {
      id: "CHAR_assistant_1",
      type: NodeType.CHARACTER,
      position: { x: 100, y: 150 },
      data: {
        title: "陈伯",
        fields: [
          { id: 'f1', key: '外貌', value: '满脸皱纹，眼神浑浊但时而锐利' },
          { id: 'f2', key: '习惯', value: '每天下午都会坐在同一张长椅上' }
        ]
      },
      isCollapsed: false,
    },
    {
      id: "ENV_assistant_1",
      type: NodeType.ENVIRONMENT,
      position: { x: 450, y: 150 },
      data: {
        title: "黄昏的公园",
        fields: [
          { id: 'f1', key: '氛围', value: '宁静，有孩子们的嬉笑声和归鸟的鸣叫' },
          { id: 'f2', key: '特点', value: '有一排老旧的木制长椅' }
        ]
      },
      isCollapsed: false,
    }
  ],
  edges: []
};

export const continuationExample: { nodes: Node[], edges: Edge[] } = {
  nodes: [
    {
      id: "WORK_continuation_1",
      type: NodeType.WORK,
      position: { x: 50, y: 150 },
      data: {
        title: "钟表匠的秘密",
        content: "老钟表匠西拉斯最后一次锁上了他的店铺。他手中握着一只雕刻精巧的木鸟，它的翅膀摆出飞翔的姿态，却永远无法挣脱木头的束缚。今晚，他必须将它归还给真正的主人。",
        mode: 'continue'
      },
      isCollapsed: false,
    },
    {
      id: "PLOT_continuation_1",
      type: NodeType.PLOT,
      position: { x: 450, y: 150 },
      data: {
        plotId: 30,
        title: "对过往的赎罪",
        description: "情节的核心冲突发生在角色内心。角色因过去犯下的某个错误而深陷负罪感，其后续的所有行为都是为了寻求忏悔、弥补和精神上的救赎。",
        userInput: "他必须前往山顶废弃已久的天文台，去见那个几十年前被他深深伤害过的人。"
      },
      isCollapsed: false,
    }
  ],
  edges: [
    { id: "e_cont_1", source: "WORK_continuation_1", target: "PLOT_continuation_1", targetHandle: "flow" }
  ]
};

export const parodyExample: { nodes: Node[], edges: Edge[] } = {
  nodes: [
    {
      id: "WORK_parody_1",
      type: NodeType.WORK,
      position: { x: 50, y: 150 },
      data: {
        title: "仿写风格源",
        content: "午后的阳光懒洋洋地洒在地板上，像融化的蜂蜜。空气中浮动着尘埃，每一粒都像一个沉睡的星球。莉莉安用指尖轻轻划过一本旧书的封面，那触感，粗糙而温暖，仿佛能感受到上一个读者留下的余温与叹息。",
        mode: 'parody',
        parodyLevel: 'imitation'
      },
      isCollapsed: false,
    },
    {
      id: "PLOT_parody_1",
      type: NodeType.PLOT,
      position: { x: 450, y: 150 },
      data: {
        plotId: 14,
        title: "宏大目标的追求",
        description: "一位领导者为了达成一个极具挑战性的宏伟目标，必须动员资源、凝聚力量，并战胜一个同样强大的竞争对手或客观障碍。",
        userInput: "舰长必须驾驶她的星舰穿越危机四伏的“低语星云”，去为一个濒临灭绝的文明送去唯一的解药。"
      },
      isCollapsed: false,
    },
    {
      id: "STYLE_parody_1",
      type: NodeType.STYLE,
      position: { x: 450, y: 380 },
      data: {
        styleId: 103,
        title: "科幻",
        description: "基于科学构想，探索科技、未来社会或外星文明对人类的影响，特点是富有逻辑的奇特想象。",
        applicationMethod: 'appropriate'
      },
      isCollapsed: true,
    }
  ],
  edges: [
    { id: "e_parody_1", source: "WORK_parody_1", target: "PLOT_parody_1", targetHandle: "style" },
    { id: "e_parody_2", source: "STYLE_parody_1", target: "PLOT_parody_1", targetHandle: "style" }
  ]
};
