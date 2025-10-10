import { Plot, PlotCategory, Style, StyleCategory, StructurePlot, StructureCategory } from './types';

export const STORY_PLOTS: Plot[] = [
  // 关系与情感 (Relationships & Love)
  { id: 12, name: '通奸', category: PlotCategory.RELATIONSHIPS, description: 'Adultery' },
  { id: 13, name: '爱情的罪行', category: PlotCategory.RELATIONSHIPS, description: 'Crimes of Love' },
  { id: 17, name: '无意的乱伦', category: PlotCategory.RELATIONSHIPS, description: 'Involuntary Crimes of Love' },
  { id: 25, name: '爱情的障碍', category: PlotCategory.RELATIONSHIPS, description: 'Obstacles to Love' },
  { id: 27, name: '爱上敌人', category: PlotCategory.RELATIONSHIPS, description: 'An Enemy Loved' },
  { id: 35, name: '嫉妒', category: PlotCategory.RELATIONSHIPS, description: 'Jealousy' },

  // 权力、野心与越轨 (Power, Ambition & Transgression)
  { id: 5, name: '复仇', category: PlotCategory.POWER, description: 'Vengeance' },
  { id: 8, name: '反抗', category: PlotCategory.POWER, description: 'Revolt' },
  { id: 9, name: '勇敢的尝试', category: PlotCategory.POWER, description: 'Daring Enterprise' },
  { id: 15, name: '阴谋', category: PlotCategory.POWER, description: 'Conspiracy' },
  { id: 21, name: '与神为敌', category: PlotCategory.POWER, description: 'Conflict with a God' },
  { id: 26, name: '野心', category: PlotCategory.POWER, description: 'Ambition' },

  // 生存、苦难与救赎 (Survival, Suffering & Redemption)
  { id: 1, name: '哀求', category: PlotCategory.SURVIVAL, description: 'Supplication' },
  { id: 2, name: '解救', category: PlotCategory.SURVIVAL, description: 'Deliverance' },
  { id: 4, name: '复仇的追捕', category: PlotCategory.SURVIVAL, description: 'Pursuit' },
  { id: 6, name: '灾祸', category: PlotCategory.SURVIVAL, description: 'Disaster' },
  { id: 7, name: '不幸的牺牲品', category: PlotCategory.SURVIVAL, description: 'Falling Prey to Cruelty or Misfortune' },
  { id: 30, name: '悔恨', category: PlotCategory.SURVIVAL, description: 'Remorse' },
  { id: 31, name: '审判', category: PlotCategory.SURVIVAL, description: 'Judgment' },

  // 发现与认知 (Discovery & Recognition)
  { id: 19, name: '获得', category: PlotCategory.DISCOVERY, description: 'Obtaining' },
  { id: 20, name: '谜', category: PlotCategory.DISCOVERY, description: 'An Enigma' },
  { id: 28, name: '亲族的对立', category: PlotCategory.DISCOVERY, description: 'Opposition of relatives' },
  { id: 32, name: '发现亲人有不名誉的事', category: PlotCategory.DISCOVERY, description: 'Discovery of the Dishonor of a Loved One' },
  { id: 33, name: '误杀骨肉', category: PlotCategory.DISCOVERY, description: 'Slaying of a Kinsman Unrecognized' },
];

export const PLOT_CATEGORIES = Object.values(PlotCategory);

export const STORY_STYLES: Style[] = [
  // 内容题材 (Genre)
  { id: 101, name: '悬疑', category: StyleCategory.GENRE, description: '核心在于制造谜团与紧张感，通过线索和误导，驱动读者与主角一同探寻真相。' },
  { id: 102, name: '浪漫', category: StyleCategory.GENRE, description: '围绕角色之间的爱情关系展开，重点描绘情感的萌发、发展、冲突与最终归属。' },
  { id: 103, name: '科幻', category: StyleCategory.GENRE, description: '基于科学构想，探索科技、未来社会或外星文明对人类的影响，特点是富有逻辑的奇特想象。' },
  { id: 104, name: '奇幻', category: StyleCategory.GENRE, description: '创造一个包含魔法、神话生物或超自然力量的架空世界，讲述通常围绕善恶斗争或史诗冒险展开。' },
  { id: 105, name: '惊悚/恐怖', category: StyleCategory.GENRE, description: '旨在引发读者强烈的恐惧、焦虑或生理不适。惊悚侧重心理压迫和情节的紧张感，恐怖则更偏向超自然或血腥元素。' },
  { id: 106, name: '历史', category: StyleCategory.GENRE, description: '将虚构的人物和故事放置在真实的历史背景中，追求时代氛围的真实感。' },
  // 叙事方式 (Narrative Method)
  { id: 201, name: '第一人称叙事', category: StyleCategory.NARRATIVE_METHOD, description: '由故事中的“我”来讲述，读者视野完全等同于该角色，代入感强但信息受限。' },
  { id: 202, name: '第三人称叙事', category: StyleCategory.NARRATIVE_METHOD, description: '由故事外的叙述者以“他/她”来讲述。可分为洞悉一切的全知视角，和仅跟随特定角色感知的限制性视角。' },
  { id: 203, name: '非线性叙事', category: StyleCategory.NARRATIVE_METHOD, description: '打破时间顺序，通过倒叙、插叙、多线索并行等方式组织情节，制造悬念或呈现更复杂的主题。' },
  { id: 204, name: '意识流', category: StyleCategory.NARRATIVE_METHOD, description: '直接呈现角色脑海中连贯或混乱的思绪、记忆和感官印象，模仿人类思维的真实流动状态。' },
  { id: 205, name: '不可靠叙事', category: StyleCategory.NARRATIVE_METHOD, description: '叙述者因自身偏见、精神状态或刻意欺骗，导致其讲述与事实不符，读者需要自行辨别真相。' },
  // 语言文风 (Prose Style)
  { id: 301, name: '极简主义', category: StyleCategory.PROSE_STYLE, description: '语言高度简练、克制，省略大量描写和心理活动，用最少的文字传达丰富的信息，留下大量“留白”供读者想象。' },
  { id: 302, name: '诗意/华丽', category: StyleCategory.PROSE_STYLE, description: '语言富有韵律和美感，大量运用比喻、象征等修辞，文笔精致，注重营造氛围和意境。' },
  { id: 303, name: '幽默诙谐', category: StyleCategory.PROSE_STYLE, description: '运用讽刺、夸张、双关等手法，语言风趣机智，旨在引人发笑或进行温和的批判。' },
  { id: 304, name: '平实质朴', category: StyleCategory.PROSE_STYLE, description: '语言直白、清晰，不追求华丽的修饰，力求准确、流畅地传达故事内容。' },
  // 叙事态度 (Narrative Stance)
  { id: 401, name: '现实主义', category: StyleCategory.NARRATIVE_STANCE, description: '致力于客观、细致地描绘日常生活和社会现实，追求细节的真实性和典型性，仿佛生活本身。' },
  { id: 402, name: '魔幻现实主义', category: StyleCategory.NARRATIVE_STANCE, description: '在极为写实的背景中，自然地融入奇幻或超现实的元素，并将它们当作平常事物来处理，以此探讨更深层的现实。' },
  { id: 403, name: '后现代主义', category: StyleCategory.NARRATIVE_STANCE, description: '对传统叙事权威的解构和反思。常常运用戏仿、拼贴、元小说（小说意识到自身是小说）等手法，质疑和游戏于“真实”与“虚构”的边界。' },
  { id: 404, name: '零度叙事', category: StyleCategory.NARRATIVE_STANCE, description: '一种极端客观、冷静的叙事态度。作者力图消除一切主观情感和价值判断，像镜头一样毫无感情地记录事件，语言平淡、中性，达到一种“无风格”的风格。' },
];

export const STYLE_CATEGORIES = Object.values(StyleCategory);

export const STORY_STRUCTURES: StructurePlot[] = [
  // 小说的开头类型 (Novel Startings)
  { id: 501, name: '开门见山式', category: StructureCategory.STARTING, description: '故事从情节发展的关键或紧张时刻切入，迅速将读者带入冲突之中。这种开头节奏快，能立刻激发读者的好奇心。' },
  { id: 502, name: '悬念引导式', category: StructureCategory.STARTING, description: '开头便抛出一个谜题或一个不寻常的事件，让读者带着疑问去探寻究竟。这在悬疑和惊悚类小说中尤为常见。' },
  { id: 503, name: '背景描绘式', category: StructureCategory.STARTING, description: '通过对环境、时代背景或人物生活状态的细致描写，为故事铺陈一个坚实的舞台，营造出特定的氛围。' },
  { id: 504, name: '对话切入式', category: StructureCategory.STARTING, description: '故事由一段或几段对话展开，通过人物的语言来揭示他们的性格、关系以及所处的困境。' },
  { id: 505, name: '哲理思辨式', category: StructureCategory.STARTING, description: '以一段富有哲理或深刻内涵的独白或叙述开启故事，奠定作品的思辨基调。' },
  { id: 506, name: '人物介绍式', category: StructureCategory.STARTING, description: '直接向读者介绍主角的身份、性格特点或独特处境，让读者迅速与人物建立联系。' },
  { id: 507, name: '引用典故式', category: StructureCategory.STARTING, description: '引用诗歌、名言或其他文本作为开头，借此暗示故事的主题或基调。' },
  // 小说的结尾类型 (Novel Endings)
  { id: 601, name: '圆满式结局', category: StructureCategory.ENDING, description: '主人公克服重重困难，最终达成了目标，获得了幸福美满的结果，满足了读者的期待。这在许多主流和商业小说中十分常见。' },
  { id: 602, name: '悲剧式结局', category: StructureCategory.ENDING, description: '主人公在与命运的抗争中最终失败，甚至付出生命的代价，给读者带来强烈的震撼和惋惜之情。' },
  { id: 603, name: '开放式结局', category: StructureCategory.ENDING, description: '故事在某个关键点戛然而止，作者没有明确交代人物的最终命运，留给读者广阔的想象空间。' },
  { id: 604, name: '悲喜剧式结局', category: StructureCategory.ENDING, description: '主人公在达成一部分目标的同时也失去了一些重要的东西，结局喜忧参半，更贴近现实生活的复杂性。' },
  { id: 605, name: '讽刺式结局', category: StructureCategory.ENDING, description: '主人公历经艰辛达成了追求的目标，却发现这个目标毫无意义甚至带来了负面效果，具有强烈的讽刺意味。' },
  { id: 606, name: '出人意料式结局', category: StructureCategory.ENDING, description: '结尾出现颠覆读者此前认知的惊人反转，带来强烈的戏剧冲击力。' },
  { id: 607, name: '循环式结局', category: StructureCategory.ENDING, description: '故事的结尾又回到了开头的某个场景或状态，形成一个闭环，常用来表达宿命论或周而复始的主题。' },
  { id: 608, name: '解谜式结局', category: StructureCategory.ENDING, description: '主要用于推理小说，结尾揭开所有谜团的真相，让读者恍然大悟。' },
];

export const STRUCTURE_CATEGORIES = Object.values(StructureCategory);