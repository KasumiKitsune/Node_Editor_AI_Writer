import { Plot, PlotCategory, Style, StyleCategory, StructurePlot, StructureCategory } from './types';

export const STORY_PLOTS: Plot[] = [
  // 关系与情感 (Relationships & Love)
  { id: 1, name: '内部成员的憎恨', category: PlotCategory.RELATIONSHIPS, description: '在家庭、团队等本应紧密联结的团体内部，成员之间产生了不可调和的仇恨，这种内在的憎恨最终将驱动团体走向分裂或毁灭。' },
  { id: 2, name: '内部成员的竞争', category: PlotCategory.RELATIONSHIPS, description: '团体内的成员为了争夺一个有限的、不可分割的目标（如爱情、地位、继承权）而展开较量，这种竞争考验并重塑了他们之间的关系。' },
  { id: 3, name: '禁忌联盟的罪行', category: PlotCategory.RELATIONSHIPS, description: '两个处于禁忌关系中的个体为了巩固或保护他们的联盟，合谋移除了一个代表着旧有秩序或承诺的障碍，从而犯下了严重的道德或社会罪行。' },
  { id: 4, name: '无知的禁忌之恋', category: PlotCategory.RELATIONSHIPS, description: '两个个体在不知晓彼此间存在着某种社会伦理障碍（如血缘）的情况下，产生了深厚的情感联结。真相的揭示将对这段关系以及他们的自我认知造成毁灭性打击。' },
  { id: 5, name: '既有承诺的背叛', category: PlotCategory.RELATIONSHIPS, description: '在一个既定的承诺关系（如婚姻、盟约）中，一方或多方秘密地违背了其核心的忠诚义务，故事围绕着这种背叛的产生、维系与最终的暴露展开。' },
  { id: 6, name: '逾越边界的爱恋', category: PlotCategory.RELATIONSHIPS, description: '两个个体之间的情感联结，因其本身触犯了群体、社会或文化的根本性禁忌而受到压制，他们的核心抗争是捍卫这段关系本身的存在合理性。' },
  { id: 7, name: '结合的阻碍', category: PlotCategory.RELATIONSHIPS, description: '两个期望结合的个体或实体，其结合之路受到了强大的外部力量的阻挠。故事的动力来自于他们不断克服这些障碍的努力。' },
  { id: 8, name: '与对立者的情感联结', category: PlotCategory.RELATIONSHIPS, description: '一个角色对自己所属阵营的敌人产生了深厚的情感联结，这使其陷入了忠诚与情感、责任与欲望的尖锐内心冲突之中。' },
  { id: 9, name: '基于误解的猜疑', category: PlotCategory.RELATIONSHIPS, description: '一个角色因错误的信息或主观臆断，而对自己的情感关系对象产生了破坏性的猜疑，并基于这种猜疑采取了导致悲剧性后果的行动。' },
  { id: 10, name: '重要联结的丧失', category: PlotCategory.RELATIONSHIPS, description: '故事的核心事件是一个角色失去了对其身份和存在至关重要的另一个人或事物，情节围绕着这一“丧失”所带来的情感冲击和后续行为展开。' },

  // 权力、野心与越轨 (Power, Ambition & Transgression)
  { id: 11, name: '非对称的复仇', category: PlotCategory.POWER, description: '当一个不公行为未能被现有体系制裁时，受害者或其代理人选择脱离常规秩序，以个人的方式对施害者进行追溯和惩罚。' },
  { id: 12, name: '颠覆性的复仇', category: PlotCategory.POWER, description: '复仇行为发生在紧密团体内部，复仇者必须在维护团体存续和伸张个人正义之间做出选择，其行为本身将颠覆团体原有的权力结构和伦理关系。' },
  { id: 13, name: '反抗压迫性权威', category: PlotCategory.POWER, description: '一个居于从属地位的个体或群体，对一个压迫性的上层权力结构发起了有组织的挑战，意图将其推翻并建立新的秩序。' },
  { id: 14, name: '宏大目标的追求', category: PlotCategory.POWER, description: '一位领导者为了达成一个极具挑战性的宏伟目标，必须动员资源、凝聚力量，并战胜一个同样强大的竞争对手或客观障碍。' },
  { id: 15, name: '强制性的掠夺', category: PlotCategory.POWER, description: '一方为了达成自身目的，通过计谋或暴力手段，强行剥夺另一方的人身自由或关键资源。' },
  { id: 16, name: '不平等的竞争', category: PlotCategory.POWER, description: '在力量、资源或地位上处于明显劣势的一方，与一个占据绝对优势的对手展开竞争。冲突的看点在于弱者如何运用智慧或特殊策略来弥补力量的差距。' },
  { id: 17, name: '欲望驱动的越轨', category: PlotCategory.POWER, description: '一个角色被强烈的个人野心所驱使，为了获得某个渴望的目标，不惜打破道德或社会规范，从而与现有秩序的维护者产生激烈冲突。' },
  { id: 18, name: '与不可抗力抗衡', category: PlotCategory.POWER, description: '一个角色（通常是人类）向一个远超自身、看似绝对而无情的巨大力量（如命运、社会体制、自然法则或某种象征性的“神”）发起挑战。' },

  // 生存、苦难与救赎 (Survival, Suffering & Redemption)
  { id: 19, name: '向权力者求助', category: PlotCategory.SURVIVAL, description: '一个处于弱势且面临威胁的角色，其唯一的希望在于说服一个拥有更高裁决权和干预能力的第三方，以获得庇护或帮助。' },
  { id: 20, name: '危机中的解救', category: PlotCategory.SURVIVAL, description: '一个角色陷入了迫在眉睫的、无法自救的危难之中，在毁灭的最后一刻，一个外部的拯救力量出现，改变了其命运。' },
  { id: 21, name: '为洗脱罪名而逃亡', category: PlotCategory.SURVIVAL, description: '一个角色被错误地指控犯有重罪，为了逃避不公的惩罚，他必须在躲避追捕的同时，寻找揭示真相、证明自身清白的方法。' },
  { id: 22, name: '秩序的崩塌', category: PlotCategory.SURVIVAL, description: '一个曾经稳定而强大的实体（如一个帝国、家族或个人的内心世界），遭遇了突发性的、不可逆转的灾难性事件，导致其彻底瓦解。' },
  { id: 23, name: '无辜者承受苦难', category: PlotCategory.SURVIVAL, description: '一个角色并非因为自身的过错，而是因为外部的恶意或纯粹的偶然，而被迫承受巨大的、不公平的痛苦和折磨。' },
  { id: 24, name: '失控状态下的过失', category: PlotCategory.SURVIVAL, description: '一个角色因心智或情感的失控，无意识地犯下了无可挽回的错误，对其珍视的人或物造成了伤害。冲突的核心在于清醒后如何面对这一后果。' },
  { id: 25, name: '轻率行为的灾难性后果', category: PlotCategory.SURVIVAL, description: '一个看似微不足道的疏忽、好奇或鲁莽的决定，像多米诺骨牌一样引发了一连串的负面反应，最终导致了灾难性的结局。' },
  { id: 26, name: '为抽象价值牺牲', category: PlotCategory.SURVIVAL, description: '一个角色为了捍卫并实现一个超越个人利益的宏大理念（如自由、正义、信仰），而自愿放弃个人的幸福、安全乃至生命。' },
  { id: 27, name: '为守护亲密关系牺牲', category: PlotCategory.SURVIVAL, description: '一个角色为了保护或成全另一个与其有紧密情感联结的个体，而选择牺牲自身的利益或生命。' },
  { id: 28, name: '为毁灭性激情牺牲', category: PlotCategory.SURVIVAL, description: '一个角色被一种强烈的、非理性的情感（如爱情、瘾好）所支配，为了满足这种激情，他最终放弃了所有其他有价值的东西，走向自我毁灭。' },
  { id: 29, name: '牺牲珍爱之物的必要性', category: PlotCategory.SURVIVAL, description: '一个角色为了履行一个更高层次的责任或实现一个更宏大的目标，被迫面临一个痛苦的抉择：必须亲手牺牲掉自己所珍爱的人或物。' },
  { id: 30, name: '对过往的赎罪', category: PlotCategory.SURVIVAL, description: '情节的核心冲突发生在角色内心。角色因过去犯下的某个错误而深陷负罪感，其后续的所有行为都是为了寻求忏悔、弥补和精神上的救赎。' },

  // 发现与认知 (Discovery & Recognition)
  { id: 31, name: '智识的考验', category: PlotCategory.DISCOVERY, description: '角色面临一个复杂的谜题或智力挑战，其命运或目标的实现，完全取决于他能否成功地解读信息、进行推理并找到正确的答案。' },
  { id: 32, name: '关键目标的获取', category: PlotCategory.DISCOVERY, description: '冲突的核心在于“获取”这一行为本身。一个角色必须通过智力、辩论或策略，从一个持有并抗拒交出的一方手中，获得某件关键物品或信息。' },
  { id: 33, name: '无知的毁灭性行为', category: PlotCategory.DISCOVERY, description: '一个角色在对关键信息毫不知情的情况下，采取了某个行动，而这个行动恰好对一个与他有隐藏的、重要联系的对象造成了毁灭性伤害。戏剧性来自于真相揭晓的瞬间。' },
  { id: 34, name: '信念的崩塌', category: PlotCategory.DISCOVERY, description: '一个角色发现，他所深信不疑并赖以建立自己世界观的某个人、某个团体或某种理念，其背后隐藏着不光彩的、与之信念相悖的真相。' },
  { id: 35, name: '基于错误信息的审判', category: PlotCategory.DISCOVERY, description: '一个掌握审判权的角色，因为被误导或信息不全，做出了错误的判断，导致无辜者受罚而有罪者逍遥法外。故事的张力在于真相的调查与最终的纠正过程。' },
  { id: 36, name: '失落联结的重建', category: PlotCategory.DISCOVERY, description: '故事始于一个重要的联结（人或物）处于“丢失”或“分离”的状态。整个叙事过程就是寻找、辨认并最终重新建立这一联结的旅程。' },

  // 其他 (Other)
  { id: 37, name: '内在成长与觉醒', category: PlotCategory.OTHER, description: '叙事的驱动力源自角色的内心世界。其核心轨迹并非征服外部敌人或获取某个目标，而是主角从迷茫、不成熟或固有的认知状态，向自我觉醒、精神成熟或世界观重塑的转变过程。故事的高潮是一个顿悟的瞬间，而非一次决胜的行动。' },
  { id: 38, name: '个体与抽象系统的对抗', category: PlotCategory.OTHER, description: '核心的对立面并非一个具体的人格化反派，而是一个庞大、无形、非人格化的系统——例如官僚体制、社会规范、意识形态或某种无法抗拒的社会潮流。角色的挣扎在于试图在这个系统中保持人性、揭露其荒谬性或进行象征性的反抗，其胜利往往是精神层面的，而非物理上的颠覆。' },
  { id: 39, name: '并置与融合', category: PlotCategory.OTHER, description: '故事的推进不依赖于持续升级的矛盾冲突，而是通过引入一个或多个看似无关的新元素，与现有情境形成并置。叙事的张力与美感来自于这些不同元素之间的对照，以及最终它们如何被巧妙地融合，从而产生一个全新的、富有深意的整体认知。其终点是和谐的领悟，而非矛盾的解决。' },
  { id: 40, name: '过程导向的探索', category: PlotCategory.OTHER, description: '叙事的根本目的在于“过程”本身——即探索一个未知的物理空间、一个复杂的哲学概念或一种全新的生存体验。虽然旅途中会遇到障碍，但这些障碍是探索过程的有机组成部分，而非为了某个终极奖赏必须被击败的敌人。故事的价值在于体验的积累与视野的拓宽。' },
  { id: 41, name: '叙事本身的解构', category: PlotCategory.OTHER, description: '这类情节的核心是打破故事与现实的边界，有意识地暴露、反思或颠覆叙事自身的规则与惯例。故事的“冲突”是与媒介形式、观众预期和“真实”的定义进行的游戏。它探讨的是“如何讲述”以及“讲述意味着什么”，而非仅仅是“讲述了什么”。' },
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
  { id: 107, name: '冒险', category: StyleCategory.GENRE, description: '主角前往未知或危险的境地，经历一系列挑战、发现和成长，强调动作、探索和克服困难的过程。' },
  { id: 108, name: '喜剧', category: StyleCategory.GENRE, description: '旨在通过情节、对话或人物的滑稽行为引人发笑，通常有一个轻松、愉快的结局。' },
  { id: 109, name: '武侠', category: StyleCategory.GENRE, description: '植根于中国文化的独特类型，以侠客、江湖、武功和道义为核心，讲述快意恩仇与个人成长。' },
  { id: 110, name: '反乌托邦', category: StyleCategory.GENRE, description: '描绘一个表面看似有序，实则充满压迫、监控和思想控制的未来社会，探讨自由、人性和权力的主题。' },
  { id: 111, name: '犯罪/黑色', category: StyleCategory.GENRE, description: '聚焦于犯罪行为、侦破过程和犯罪心理。黑色风格（Noir）则更进一步，通常带有悲观主义、道德模糊和宿命论的色彩。' },
  { id: 112, name: '成长故事', category: StyleCategory.GENRE, description: '又称“启蒙小说”，追踪主角从青春期到成年的心路历程，重点描绘其身份认同、价值观形成和对世界的认知变化。' },
  { id: 113, name: '寓言/神话', category: StyleCategory.GENRE, description: '通过象征性的角色和情节来传达深刻的道德、哲学或宗教教训。神话则常涉及神祇、英雄与创世传说。' },
  { id: 114, name: '生活流', category: StyleCategory.GENRE, description: '弱化戏剧性冲突和强情节，专注于描绘日常生活的琐碎细节、人物的内心感受和缓慢流逝的时间。' },

  // 叙事方式 (Narrative Method)
  { id: 201, name: '第一人称叙事', category: StyleCategory.NARRATIVE_METHOD, description: '由故事中的“我”来讲述，读者视野完全等同于该角色，代入感强但信息受限。' },
  { id: 202, name: '第三人称叙事', category: StyleCategory.NARRATIVE_METHOD, description: '由故事外的叙述者以“他/她”来讲述。可分为洞悉一切的全知视角，和仅跟随特定角色感知的限制性视角。' },
  { id: 203, name: '非线性叙事', category: StyleCategory.NARRATIVE_METHOD, description: '打破时间顺序，通过倒叙、插叙、多线索并行等方式组织情节，制造悬念或呈现更复杂的主题。' },
  { id: 204, name: '意识流', category: StyleCategory.NARRATIVE_METHOD, description: '直接呈现角色脑海中连贯或混乱的思绪、记忆和感官印象，模仿人类思维的真实流动状态。' },
  { id: 205, name: '不可靠叙事', category: StyleCategory.NARRATIVE_METHOD, description: '叙述者因自身偏见、精神状态或刻意欺骗，导致其讲述与事实不符，读者需要自行辨别真相。' },
  { id: 206, name: '第二人称叙事', category: StyleCategory.NARRATIVE_METHOD, description: '以“你”作为主角进行讲述，将读者直接置于故事角色的位置，创造出独特的参与感和沉浸感。' },
  { id: 207, name: '书信体叙事', category: StyleCategory.NARRATIVE_METHOD, description: '故事通过信件、日记、邮件、新闻报道等文件形式呈现，读者通过拼凑这些碎片化的信息来了解全局。' },
  { id: 208, name: '多视角叙事', category: StyleCategory.NARRATIVE_METHOD, description: '故事在不同章节或部分切换叙事视角，由多个不同角色轮流讲述，提供更全面、立体的事件图景。' },
  { id: 209, name: '框架故事', category: StyleCategory.NARRATIVE_METHOD, description: '在一个主故事的框架内，讲述一个或多个嵌入的子故事，形成“故事中的故事”结构。' },

  // 语言文风 (Prose Style)
  { id: 301, name: '极简主义', category: StyleCategory.PROSE_STYLE, description: '语言高度简练、克制，省略大量描写和心理活动，用最少的文字传达丰富的信息，留下大量“留白”供读者想象。' },
  { id: 302, name: '诗意/华丽', category: StyleCategory.PROSE_STYLE, description: '语言富有韵律和美感，大量运用比喻、象征等修辞，文笔精致，注重营造氛围和意境。' },
  { id: 303, name: '幽默诙谐', category: StyleCategory.PROSE_STYLE, description: '运用讽刺、夸张、双关等手法，语言风趣机智，旨在引人发笑或进行温和的批判。' },
  { id: 304, name: '平实质朴', category: StyleCategory.PROSE_STYLE, description: '语言直白、清晰，不追求华丽的修饰，力求准确、流畅地传达故事内容。' },
  { id: 305, name: '口语/通俗', category: StyleCategory.PROSE_STYLE, description: '模仿日常对话，使用大量俚语、俗语和非正式表达，语言生动活泼，贴近生活。' },
  { id: 306, name: '新闻体', category: StyleCategory.PROSE_STYLE, description: '模仿新闻报道的风格，语言客观、精确、信息密度高，注重事实陈述而非情感渲染。' },
  { id: 307, name: '哥特式', category: StyleCategory.PROSE_STYLE, description: '营造阴森、神秘、恐怖的氛围，常使用古堡、废墟、超自然等元素，语言上倾向于渲染黑暗、死亡和强烈的情感。' },
  { id: 308, name: '反讽/讽刺', category: StyleCategory.PROSE_STYLE, description: '语言的字面意思与其真实意图相反或不符，通过这种反差达到嘲讽、批判或引人深思的效果。' },
  
  // 叙事态度 (Narrative Stance)
  { id: 401, name: '现实主义', category: StyleCategory.NARRATIVE_STANCE, description: '致力于客观、细致地描绘日常生活和社会现实，追求细节的真实性和典型性，仿佛生活本身。' },
  { id: 402, name: '魔幻现实主义', category: StyleCategory.NARRATIVE_STANCE, description: '在极为写实的背景中，自然地融入奇幻或超现实的元素，并将它们当作平常事物来处理，以此探讨更深层的现实。' },
  { id: 403, name: '后现代主义', category: StyleCategory.NARRATIVE_STANCE, description: '对传统叙事权威的解构和反思。常常运用戏仿、拼贴、元小说（小说意识到自身是小说）等手法，质疑和游戏于“真实”与“虚构”的边界。' },
  { id: 404, name: '零度叙事', category: StyleCategory.NARRATIVE_STANCE, description: '一种极端客观、冷静的叙事态度。作者力图消除一切主观情感和价值判断，像镜头一样毫无感情地记录事件，语言平淡、中性，达到一种“无风格”的风格。' },
  { id: 405, name: '自然主义', category: StyleCategory.NARRATIVE_STANCE, description: '现实主义的延伸，强调环境、遗传和社会条件对人物命运的决定性作用，常带有宿命论和悲观色彩。' },
  { id: 406, name: '浪漫主义', category: StyleCategory.NARRATIVE_STANCE, description: '强调个人情感、想象力、主观体验和自然的壮丽。人物常常是理想化或英雄式的，反抗社会束缚。' },
  { id: 407, name: '荒诞主义', category: StyleCategory.NARRATIVE_STANCE, description: '通过展现人物在无意义、不合逻辑的世界中的徒劳挣扎，来揭示人类存在的荒谬和沟通的无效性。' },
  { id: 408, name: '说教式', category: StyleCategory.NARRATIVE_STANCE, description: '叙事的主要目的在于传达明确的道德、伦理或社会教诲，作者的意图清晰可见。' },

  // 基调/氛围 (Tone & Mood)
  { id: 501, name: '忧郁/致郁', category: StyleCategory.TONE_MOOD, description: '故事弥漫着悲伤、失落和无力感，情节可能走向悲剧，旨在引发读者深刻的同情和沉思。' },
  { id: 502, name: '励志/治愈', category: StyleCategory.TONE_MOOD, description: '传递积极、向上的能量，讲述角色克服困难、实现成长的故事，给予读者温暖、希望和慰藉。' },
  { id: 503, name: '怀旧/感伤', category: StyleCategory.TONE_MOOD, description: '以一种温柔而略带伤感的情绪回望过去，注重对逝去时光、记忆和情感的描绘。' },
  { id: 504, name: '黑暗/冷硬', category: StyleCategory.TONE_MOOD, description: '风格残酷、现实，道德界限模糊，暴力和绝望是常态。冷硬（Hardboiled）是其在侦探小说中的一种体现。' },
  { id: 505, name: '轻松/明快', category: StyleCategory.TONE_MOOD, description: '氛围轻松愉快，节奏明快，不追求深刻的冲突或主题，以娱乐和放松读者为主要目的。' },
  { id: 506, name: '史诗/宏大', category: StyleCategory.TONE_MOOD, description: '格局庞大，时间跨度长，涉及众多角色和重大历史事件，语言庄重，气氛严肃而壮丽。' },
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