/**
 * [INPUT]: 无外部依赖
 * [OUTPUT]: 对外提供游戏类型定义 + 数据常量 + 工具函数
 * [POS]: lib 的游戏数据层，4NPC/8场景/9道具/10事件/5章节/9结局/配置/故事信息
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

// ============================================================
// 类型定义
// ============================================================

/* ------ NPC 异构数值 ------ */

export interface StatConfig {
  key: string
  label: string
  alias: string
  color: string
  initial: number
  hidden?: boolean
}

export interface Character {
  id: string
  name: string
  nameEn: string
  title: string
  age: number
  description: string
  themeColor: string
  avatar: string
  personality: { core: string; speakStyle: string; catchphrases: string[] }
  stats: StatConfig[]
  unlockCondition: {
    type: 'chapter' | 'stat' | 'event' | 'always'
    chapter?: number
    stat?: { npcId: string; key: string; min: number }
    eventId?: string
  }
  secret: { trueSelf: string; hiddenMotivation: string; pastTrauma: string }
  favorLevels: { range: [number, number]; label: string; behavior: string }[]
}

/* ------ 时间 ------ */

export type TimeSlot = 'dawn' | 'morning' | 'noon' | 'afternoon' | 'evening' | 'night'

export const TIME_SLOT_LABELS: Record<TimeSlot, string> = {
  dawn: '黎明', morning: '上午', noon: '正午',
  afternoon: '午后', evening: '傍晚', night: '深夜',
}

/* ------ 场景 ------ */

export interface Scene {
  id: string
  name: string
  icon: string
  description: string
  possibleCharacters: string[]
  searchableAreas: string[]
  backgroundImage: string
  accessCondition?: {
    timeSlots?: TimeSlot[]
    requiredItem?: string
    requiredStat?: { npcId: string; key: string; min: number }
    requiredEvent?: string
    requiredChapter?: number
  }
}

/* ------ 道具 ------ */

export interface GameItem {
  id: string
  name: string
  icon: string
  description: string
  type: 'permanent' | 'consumable' | 'key' | 'evidence'
}

/* ------ 事件 ------ */

export interface GameEvent {
  id: string
  name: string
  description: string
  type: 'forced' | 'conditional'
  trigger: {
    month?: number
    chapter?: number
    stat?: { npcId: string; key: string; min?: number; max?: number }
    item?: string
    event?: string
  }
  lockPlayer?: boolean
  chapter: number
}

/* ------ 章节 ------ */

export interface Chapter {
  id: number
  name: string
  subtitle: string
  monthRange: [number, number]
  theme: string
  enterText: string
  mainGoal: string
  sideGoal?: string
}

/* ------ 结局 ------ */

export interface Ending {
  id: string
  name: string
  type: 'TE' | 'HE' | 'BE' | 'NE'
  priority: number
  description: string
  evaluation: string
  epilogue: string
  conditions: {
    stats?: { target: string; key: string; min?: number; max?: number }[]
    items?: string[]
    events?: string[]
    eventsNot?: string[]
  }
}

/* ------ 消息 ------ */

export interface GameMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  characterId?: string
  characterName?: string
  characterColor?: string
  isPlayerAction?: boolean
  isNarrative?: boolean
  timestamp: number
}

// ============================================================
// 角色数据 — 4 位核心 NPC
// ============================================================

export const CHARACTERS: Record<string, Character> = {
  kallias: {
    id: 'kallias', name: '卡利阿斯', nameEn: 'Kallias',
    title: '贵族 / 你的 erastês', age: 35,
    description: '雅典城邦的显赫贵族，你的庇护者。穿着紫色希马提翁长袍，手戴金环，棕色锐利眼瞳。在城邦政治中颇有手腕，对你既有庇护也有掌控。',
    themeColor: '#8B6914', avatar: '⚜',
    personality: {
      core: '威严、多疑、占有、表面儒雅',
      speakStyle: '措辞优雅但暗含控制。引经据典，常用苏格拉底式反问。',
      catchphrases: ['你是我最珍贵的收藏', '美德需要引导', '自由？你还不懂自由的分量'],
    },
    stats: [
      { key: 'favor', label: '好感度', alias: '好感度', color: '#f59e0b', initial: 50 },
      { key: 'trust', label: '信任度', alias: '信任度', color: '#3b82f6', initial: 30 },
      { key: 'possessiveness', label: '占有欲', alias: '占有欲', color: '#ef4444', initial: 60 },
    ],
    unlockCondition: { type: 'always' },
    secret: {
      trueSelf: '他真正害怕的是失去控制。年轻时被自己的 erastês 背叛，从此对亲密关系带有强烈的占有欲。他的"爱"是一座精致的牢笼。',
      hiddenMotivation: '在城邦中维持体面的 erastês 形象，将阿莱克西斯塑造为自己的"完美作品"',
      pastTrauma: '18岁时被导师当众羞辱和抛弃，从此将控制等同于保护',
    },
    favorLevels: [
      { range: [0, 25], label: '冷漠', behavior: '语气冰冷，威胁暗示，强调你的"债务"' },
      { range: [26, 50], label: '关注', behavior: '表面关怀但附加条件，赐予小恩小惠' },
      { range: [51, 75], label: '宠爱', behavior: '提供资源和保护，但要求绝对服从' },
      { range: [76, 100], label: '执迷', behavior: '视为私有财产，任何远离的迹象都引发狂怒' },
    ],
  },
  philokles: {
    id: 'philokles', name: '菲洛克勒斯', nameEn: 'Philokles',
    title: '外邦商人 / 威胁者', age: 40,
    description: '从科林斯来的富商，在雅典有广泛的地下势力。身材壮硕，灰蓝色冷眼，全身金饰。以"收藏"少年闻名，臭名昭著却因财力免于追究。',
    themeColor: '#4a0e0e', avatar: '🐍',
    personality: {
      core: '残忍、精于算计、以施虐为乐、蔑视弱者',
      speakStyle: '低沉柔和，字字如蛇。用商业术语谈论人，仿佛一切皆可标价。',
      catchphrases: ['每个人都有价格', '痛苦是最好的教育', '你还能忍受更多'],
    },
    stats: [
      { key: 'threat', label: '威胁度', alias: '威胁度', color: '#dc2626', initial: 0 },
    ],
    unlockCondition: { type: 'chapter', chapter: 3 },
    secret: {
      trueSelf: '一个彻底的掠食者。他的"收藏"行为背后是对权力的病态渴求——他需要看到他人痛苦才能确认自己的存在价值。',
      hiddenMotivation: '想从卡利阿斯手中得到阿莱克西斯，以此羞辱卡利阿斯并扩大自己在雅典的影响力',
      pastTrauma: '童年在科林斯港口被奴贩虐待，扭曲为施虐者认同',
    },
    favorLevels: [
      { range: [0, 30], label: '窥伺', behavior: '远处观察，偶尔出现在你经过的场景' },
      { range: [31, 60], label: '逼近', behavior: '主动接触，用威胁和利诱交替施压' },
      { range: [61, 100], label: '猎杀', behavior: '公开宣称所有权，对你和周围人构成直接危险' },
    ],
  },
  dionysios: {
    id: 'dionysios', name: '狄奥尼修斯', nameEn: 'Dionysios',
    title: '获释自由人 / 盟友', age: 28,
    description: '曾经的奴隶，通过学习陶艺获得自由。瘦削身材，温暖棕色眼瞳，穿简朴褐色束腰衣。在月光废墟中经营秘密的识字班。',
    themeColor: '#059669', avatar: '🕊',
    personality: {
      core: '温和、坚韧、有理想、谨慎',
      speakStyle: '语速偏慢，用词朴实但偶尔冒出深刻见解。常用陶艺做比喻。',
      catchphrases: ['陶土在窑中才知道自己的形状', '自由不是被给予的，是被塑造的', '慢慢来，黏土不会催你'],
    },
    stats: [
      { key: 'trust', label: '信任度', alias: '信任度', color: '#10b981', initial: 0 },
    ],
    unlockCondition: { type: 'chapter', chapter: 2 },
    secret: {
      trueSelf: '他是少数真正关心阿莱克西斯的人。但他自己也活在恐惧中——作为获释自由人，他的身份随时可能被撤销。帮助阿莱克西斯意味着冒自由的风险。',
      hiddenMotivation: '建立一个地下教育网络，帮助被奴役的少年获得谋生技能',
      pastTrauma: '曾亲眼看到同伴被主人打死，从此发誓用知识而非暴力改变命运',
    },
    favorLevels: [
      { range: [0, 20], label: '戒备', behavior: '谨慎观望，不轻易透露真实身份' },
      { range: [21, 50], label: '接纳', behavior: '愿意传授技艺和知识，分享自己的经历' },
      { range: [51, 80], label: '信赖', behavior: '主动提供逃跑计划和关键资源' },
      { range: [81, 100], label: '生死之交', behavior: '愿意冒自由甚至生命的危险帮助你' },
    ],
  },
  eurydamos: {
    id: 'eurydamos', name: '欧律达摩斯', nameEn: 'Eurydamos',
    title: '获释自由人 / 证人', age: 32,
    description: '满面伤疤、佝偻着身体的前奴隶。曾是菲洛克勒斯的"收藏品"之一，奇迹般存活。在集市角落卖廉价陶器为生。',
    themeColor: '#6b7280', avatar: '💔',
    personality: {
      core: '恐惧、沉默、偶尔爆发的愤怒与正义感',
      speakStyle: '断断续续，经常中途停顿。一旦被触发创伤会陷入恍惚。但提到帮助别人时眼中会有光。',
      catchphrases: ['别……别碰我', '他还在找我', '如果我的伤能换来一个人的自由……'],
    },
    stats: [
      { key: 'sympathy', label: '同情度', alias: '同情度', color: '#8b5cf6', initial: 0 },
    ],
    unlockCondition: { type: 'chapter', chapter: 3 },
    secret: {
      trueSelf: '他是菲洛克勒斯罪行最直接的证据。他身上的每一道伤疤都是一份控诉。但创伤后应激让他无法在公开场合作证——除非有人真正赢得他的信任。',
      hiddenMotivation: '内心深处渴望让菲洛克勒斯受到惩罚，但恐惧几乎完全淹没了他的勇气',
      pastTrauma: '在菲洛克勒斯手下遭受三年系统性虐待，身心俱毁',
    },
    favorLevels: [
      { range: [0, 25], label: '恐惧', behavior: '几乎无法交流，任何突然的动作都让他退缩' },
      { range: [26, 50], label: '松动', behavior: '开始愿意在安全环境中说几句话' },
      { range: [51, 75], label: '信任', behavior: '断断续续讲述过去，提供关键证词片段' },
      { range: [76, 100], label: '觉醒', behavior: '鼓起勇气愿意出面作证，尽管全身发抖' },
    ],
  },
}

// ============================================================
// 场景数据 — 8 个场景
// ============================================================

export const SCENES: Record<string, Scene> = {
  bedroom: {
    id: 'bedroom', name: '主宅卧室', icon: '🛏️',
    description: '卡利阿斯宅邸中你的居室。克利奈床榻、青铜镜、蓝色帷幕，爱奥尼柱映着晨光。',
    possibleCharacters: ['kallias'],
    searchableAreas: ['床榻', '青铜镜', '木箱', '窗台'],
    backgroundImage: '/scenes/bedroom.png',
  },
  symposium: {
    id: 'symposium', name: '酒宴厅', icon: '🍷',
    description: '半环形卧榻排列的宴饮大厅。油灯摇曳，红墙绘满神话故事，酒杯碰撞声不绝。',
    possibleCharacters: ['kallias', 'philokles'],
    searchableAreas: ['卧榻', '酒案', '壁画', '侧门'],
    backgroundImage: '/scenes/symposium.png',
    accessCondition: { timeSlots: ['evening'] },
  },
  gymnasium: {
    id: 'gymnasium', name: '体育场', icon: '🏛️',
    description: '沙地训练场，橄榄油瓶排列整齐。天窗洒入黎明的光。雅典自由少年和贵族在此锻炼。',
    possibleCharacters: ['kallias'],
    searchableAreas: ['沙地', '柱廊', '更衣室', '水池'],
    backgroundImage: '/scenes/gymnasium.png',
    accessCondition: { timeSlots: ['dawn', 'morning'] },
  },
  study: {
    id: 'study', name: '书房', icon: '📜',
    description: '堆满莎草纸卷轴的密室。油灯微弱，黑檀木书桌上散落着蜡版和铜笔。藏有卡利阿斯的私人日记。',
    possibleCharacters: ['kallias'],
    searchableAreas: ['卷轴架', '书桌', '暗格', '蜡版'],
    backgroundImage: '/scenes/study.png',
    accessCondition: { timeSlots: ['night'], requiredItem: 'study_key' },
  },
  secret: {
    id: 'secret', name: '月光废墟', icon: '🌙',
    description: '城外一处残破的赫尔墨斯神庙。杂草丛生，月光从塌陷的屋顶洒入。狄奥尼修斯的秘密据点。',
    possibleCharacters: ['dionysios', 'eurydamos'],
    searchableAreas: ['神像', '地下通道', '草丛', '祭坛'],
    backgroundImage: '/scenes/secret.png',
    accessCondition: { timeSlots: ['night'], requiredStat: { npcId: 'dionysios', key: 'trust', min: 30 } },
  },
  courtyard: {
    id: 'courtyard', name: '柱廊庭院', icon: '🏛️',
    description: '白色大理石柱环绕的中庭。橄榄树投下斑驳阴影，阿波罗雕像立于中央喷泉旁。',
    possibleCharacters: ['kallias', 'dionysios'],
    searchableAreas: ['橄榄树', '雕像', '喷泉', '柱廊'],
    backgroundImage: '/scenes/courtyard.png',
  },
  servants: {
    id: 'servants', name: '仆人区', icon: '🏠',
    description: '宅邸后方的仆人居所。简陋的房间，陶罐和粗布，昏暗的灯光。此处能听到最真实的低语。',
    possibleCharacters: ['dionysios'],
    searchableAreas: ['陶罐', '角落', '后门', '储物间'],
    backgroundImage: '/scenes/servants.png',
    accessCondition: { requiredChapter: 2 },
  },
  market: {
    id: 'market', name: '雅典集市', icon: '🏺',
    description: '阿哥拉广场。陶器摊、鱼贩、哲学家的争辩声混杂。地中海蓝天下人头攒动。',
    possibleCharacters: ['eurydamos', 'philokles'],
    searchableAreas: ['陶器摊', '鱼贩', '柱廊', '角落'],
    backgroundImage: '/scenes/market.png',
    accessCondition: { timeSlots: ['morning', 'noon', 'afternoon'] },
  },
}

// ============================================================
// 道具数据 — 9 个道具
// ============================================================

export const ITEMS: Record<string, GameItem> = {
  white_robe: {
    id: 'white_robe', name: '白色长袍', icon: '👘',
    description: '卡利阿斯赐予你的精致亚麻希顿。穿戴它是身份的象征，也是束缚的标记。',
    type: 'permanent',
  },
  gold_armband: {
    id: 'gold_armband', name: '金环臂饰', icon: '💎',
    description: '刻有卡利阿斯家族纹章的金质臂环。佩戴它意味着你"属于"他。',
    type: 'permanent',
  },
  homer_scroll: {
    id: 'homer_scroll', name: '荷马诗卷', icon: '📜',
    description: '《奥德赛》的手抄莎草纸卷轴。狄奥尼修斯偷偷交给你的识字教材。',
    type: 'permanent',
  },
  scar_salve: {
    id: 'scar_salve', name: '旧伤疤药膏', icon: '🧴',
    description: '用橄榄油和草药调制的药膏。可以帮助欧律达摩斯缓解旧伤的疼痛。',
    type: 'consumable',
  },
  study_key: {
    id: 'study_key', name: '书房钥匙', icon: '🔑',
    description: '通往卡利阿斯私人书房的青铜钥匙。从仆人区偷偷获取。',
    type: 'key',
  },
  recommendation: {
    id: 'recommendation', name: '推荐信草稿', icon: '✉️',
    description: '卡利阿斯为你撰写的自由公民推荐信草稿。还需要他的印章才能生效。',
    type: 'key',
  },
  private_diary: {
    id: 'private_diary', name: '私人日记', icon: '📕',
    description: '卡利阿斯的私人蜡版日记。记录了他与菲洛克勒斯之间不可告人的交易。',
    type: 'evidence',
  },
  legal_document: {
    id: 'legal_document', name: '法律文献', icon: '⚖️',
    description: '关于解放 erômenos 的雅典法律条文。狄奥尼修斯帮你搜集的。',
    type: 'evidence',
  },
  scar_evidence: {
    id: 'scar_evidence', name: '伤疤证据', icon: '🩹',
    description: '记录欧律达摩斯伤疤位置和形状的蜡版拓片。指控菲洛克勒斯的铁证。',
    type: 'evidence',
  },
}

// ============================================================
// 事件数据 — 10 个关键事件
// ============================================================

export const EVENTS: Record<string, GameEvent> = {
  first_symposium: {
    id: 'first_symposium', name: '首次酒会', type: 'forced',
    description: '卡利阿斯带你参加你人生中第一场 symposium。你必须学会在狼群中隐藏锋芒。',
    trigger: { month: 6 }, lockPlayer: true, chapter: 1,
  },
  birthday_15: {
    id: 'birthday_15', name: '十五岁生日', type: 'forced',
    description: '你满15岁了。在雅典，这意味着你作为 erômenos 的"价值"正在巅峰。更多目光开始注意到你。',
    trigger: { month: 30 }, lockPlayer: true, chapter: 3,
  },
  dislocation: {
    id: 'dislocation', name: '脱臼事件', type: 'conditional',
    description: '在体育场训练中肩关节脱臼。卡利阿斯的反应揭示他对你身体的态度。',
    trigger: { chapter: 2, month: 12 }, chapter: 2,
  },
  philokles_appears: {
    id: 'philokles_appears', name: '菲洛克勒斯出现', type: 'forced',
    description: '那个外邦商人第一次出现在酒会上，灰蓝色的眼睛像蛇一样盯着你。',
    trigger: { month: 30 }, lockPlayer: true, chapter: 3,
  },
  night_invitation: {
    id: 'night_invitation', name: '深夜邀约', type: 'conditional',
    description: '卡利阿斯深夜召你到书房。他的态度取决于你们之间的关系。',
    trigger: { stat: { npcId: 'kallias', key: 'favor', min: 60 }, chapter: 2 }, chapter: 2,
  },
  dionysios_trust: {
    id: 'dionysios_trust', name: '狄奥尼修斯的秘密', type: 'conditional',
    description: '狄奥尼修斯向你展示了他的秘密识字班，并提议教你读写。',
    trigger: { stat: { npcId: 'dionysios', key: 'trust', min: 40 } }, chapter: 2,
  },
  eurydamos_testimony: {
    id: 'eurydamos_testimony', name: '欧律达摩斯的证词', type: 'conditional',
    description: '欧律达摩斯终于鼓起勇气，断断续续地说出菲洛克勒斯对他做过的事。',
    trigger: { stat: { npcId: 'eurydamos', key: 'sympathy', min: 60 } }, chapter: 4,
  },
  kallias_dark: {
    id: 'kallias_dark', name: '卡利阿斯的黑暗面', type: 'conditional',
    description: '你发现卡利阿斯曾经与菲洛克勒斯有过一笔交易——他差点把你"转让"出去。',
    trigger: { item: 'private_diary', chapter: 4 }, chapter: 4,
  },
  birthday_17: {
    id: 'birthday_17', name: '十七岁生日', type: 'forced',
    description: '你满17岁了。按雅典惯例，erastês-erômenos 关系即将终结。你的命运走向终局。',
    trigger: { month: 60 }, lockPlayer: true, chapter: 5,
  },
  appeal_hearing: {
    id: 'appeal_hearing', name: '申诉听证', type: 'conditional',
    description: '你能否在雅典公民大会上为自己争取自由？这取决于你收集的证据和盟友。',
    trigger: { event: 'eurydamos_testimony', item: 'legal_document', chapter: 5 }, chapter: 5,
  },
}

// ============================================================
// 章节数据 — 5 章
// ============================================================

export const CHAPTERS: Chapter[] = [
  {
    id: 1, name: '第一章', subtitle: '初入宅邸',
    monthRange: [1, 6], theme: '认识环境，了解规则',
    enterText: '公元前432年，雅典。你，阿莱克西斯，12岁的色雷斯少年，被父亲卖给了雅典贵族卡利阿斯。从今天起，这座大理石宅邸就是你的世界。',
    mainGoal: '了解宅邸环境，建立与卡利阿斯的初步关系',
    sideGoal: '探索柱廊庭院和卧室',
  },
  {
    id: 2, name: '第二章', subtitle: '酒会考验',
    monthRange: [7, 18], theme: '社交周旋，发现盟友',
    enterText: '你已在宅邸中度过了半年。第一场酒会即将来临，你必须学会在贵族的觥筹交错中生存。',
    mainGoal: '应对酒会挑战，寻找潜在盟友',
    sideGoal: '与狄奥尼修斯建立信任',
  },
  {
    id: 3, name: '第三章', subtitle: '预警危机',
    monthRange: [19, 36], theme: '危险逼近，抉择加重',
    enterText: '你满15岁了。你的容貌和气质引来了更多注意——包括那个来自科林斯的商人菲洛克勒斯。危险的阴影正在笼罩。',
    mainGoal: '应对菲洛克勒斯的威胁',
    sideGoal: '获取书房钥匙，收集证据',
  },
  {
    id: 4, name: '第四章', subtitle: '申诉之路',
    monthRange: [37, 54], theme: '收集证据，准备抗争',
    enterText: '你开始理解这个制度的真相。如果想要自由，你需要证据、盟友、和勇气。时间在流逝。',
    mainGoal: '收集足够的证据和证人支持',
    sideGoal: '揭露卡利阿斯和菲洛克勒斯的秘密',
  },
  {
    id: 5, name: '第五章', subtitle: '终点站',
    monthRange: [55, 60], theme: '终局抉择',
    enterText: '你即将满17岁。按照惯例，一切都将改变。但改变的方向，取决于你过去五年的每一个选择。',
    mainGoal: '迎接终局判定',
  },
]

// ============================================================
// 结局数据 — 9 个结局
// ============================================================

export const ENDINGS: Ending[] = [
  /* --- TE: 真结局 --- */
  {
    id: 'TE-1', name: '真相揭露者', type: 'TE', priority: 1,
    description: '你在公民大会上公开指控菲洛克勒斯的罪行，欧律达摩斯颤抖着站上证人席。你揭露了卡利阿斯的交易记录，引发城邦震动。',
    evaluation: '你不仅获得了自由，还推动了雅典对该制度的反思。这是历史上罕见的胜利。',
    epilogue: '多年后，你成为一名陶艺教师，与狄奥尼修斯一起经营识字班。在阿哥拉广场的角落，人们偶尔会看到一个伤疤累累的男人安静地坐在你的店铺外，脸上带着平静的微笑。',
    conditions: {
      events: ['eurydamos_testimony', 'appeal_hearing', 'kallias_dark'],
      items: ['scar_evidence', 'legal_document', 'private_diary'],
    },
  },
  {
    id: 'TE-2', name: '永恒的循环', type: 'TE', priority: 2,
    description: '你揭露了真相，却发现制度本身无法被一个人撼动。菲洛克勒斯受到惩罚，但很快就有新的掠食者填补他的位置。',
    evaluation: '你获得了自由，也获得了最痛苦的认知——个体的胜利无法改变系统的惯性。',
    epilogue: '你离开雅典，沿着爱琴海岸一路向东。在某个无名小岛上，你用余生写下了你的故事。几百年后，这些文字成为后人理解那个时代的窗口。',
    conditions: {
      events: ['eurydamos_testimony', 'kallias_dark'],
      items: ['private_diary'],
      eventsNot: ['appeal_hearing'],
    },
  },

  /* --- HE: 好结局 --- */
  {
    id: 'HE-1', name: '自由公民', type: 'HE', priority: 3,
    description: '凭借法律文献和狄奥尼修斯的帮助，你通过正式途径获得了自由公民身份。卡利阿斯最终在推荐信上盖了印章。',
    evaluation: '你用智慧和耐心赢得了自由。虽然没有改变世界，但你改变了自己的命运。',
    epilogue: '你在雅典开了一间小陶器作坊。每到傍晚，你会站在门口看爱琴海的落日，想起那个12岁被卖掉的少年，感叹他终于走完了这段路。',
    conditions: {
      stats: [{ target: 'kallias', key: 'trust', min: 60 }],
      items: ['recommendation', 'legal_document'],
      events: ['dionysios_trust'],
    },
  },
  {
    id: 'HE-2', name: '破茧之蝶', type: 'HE', priority: 4,
    description: '在狄奥尼修斯的帮助下，你趁一个月黑风高的夜晚逃离了雅典。自由的代价是永远不能回来。',
    evaluation: '你选择了最直接的自由——逃跑。失去了一切，但获得了自己。',
    epilogue: '你在意大利南部的希腊殖民地定居，改了名字，成为一名渔夫。每当有人问起你的过去，你只是微笑着摇头。海风带走了一切旧日的伤痛。',
    conditions: {
      stats: [{ target: 'dionysios', key: 'trust', min: 70 }],
      events: ['dionysios_trust'],
      eventsNot: ['kallias_dark'],
    },
  },

  /* --- BE: 坏结局 --- */
  {
    id: 'BE-1', name: '深渊', type: 'BE', priority: 5,
    description: '菲洛克勒斯最终得逞了。卡利阿斯在一次赌博中将你作为"赌注"输给了他。你被带往科林斯。',
    evaluation: '你没有找到足够的盟友和证据来保护自己。在这个世界，无力者的命运由他人书写。',
    epilogue: '……',
    conditions: {
      stats: [
        { target: 'philokles', key: 'threat', min: 70 },
        { target: 'kallias', key: 'trust', max: 20 },
      ],
    },
  },
  {
    id: 'BE-2', name: '沉溺者', type: 'BE', priority: 6,
    description: '你在卡利阿斯的宠爱中迷失了自己。金环臂饰成为你唯一的身份认同。17岁到来时，你甚至害怕离开。',
    evaluation: '最精致的笼子也是笼子。你在"爱"的名义下失去了自我。',
    epilogue: '卡利阿斯最终娶了一个公民女子。你被安排到宅邸的偏院，和其他过气的宠物一起，等待被遗忘。',
    conditions: {
      stats: [
        { target: 'kallias', key: 'favor', min: 80 },
        { target: 'kallias', key: 'possessiveness', min: 80 },
      ],
      eventsNot: ['dionysios_trust'],
    },
  },
  {
    id: 'BE-3', name: '遗忘', type: 'BE', priority: 7,
    description: '你试图反抗但没有足够的准备。卡利阿斯发现了你的计划，将你贬为普通家奴。你的名字从宾客名单上消失。',
    evaluation: '鲁莽的反抗比不反抗更危险。勇气需要智慧的支撑。',
    epilogue: '你在仆人区度过余生，做着最低等的劳动。但在深夜，你仍然会默默背诵狄奥尼修斯教你的那几行荷马诗句。',
    conditions: {
      stats: [{ target: 'kallias', key: 'trust', max: 30 }],
      events: ['dionysios_trust'],
      eventsNot: ['eurydamos_testimony'],
    },
  },

  /* --- NE: 中性结局 --- */
  {
    id: 'NE-1', name: '陶工学徒', type: 'NE', priority: 8,
    description: '17岁时，卡利阿斯按惯例结束了你们的关系。他给了你一小笔钱和一身衣服。你在集市上找到了一份陶工学徒的工作。',
    evaluation: '不好不坏的结局。你获得了最低限度的自由，但伤痕永远不会消失。',
    epilogue: '你活了下来。在雅典的底层社会中，这已经是一种胜利。',
    conditions: {
      stats: [
        { target: 'kallias', key: 'favor', min: 30 },
        { target: 'dionysios', key: 'trust', min: 20 },
      ],
    },
  },
  {
    id: 'NE-2', name: '原地踏步', type: 'NE', priority: 10,
    description: '五年过去了，什么都没有真正改变。你既没有获得自由，也没有沉沦。你只是……活着。',
    evaluation: '这是默认的结局。在古代雅典，大多数 erômenos 的故事都是这样无声无息地结束的。',
    epilogue: '历史不会记住你的名字。但这不是你的错。',
    conditions: {},
  },
]

// ============================================================
// 游戏配置
// ============================================================

export const GAME_CONFIG = {
  MAX_MONTHS: 60,
  TIME_SLOTS: ['dawn', 'morning', 'noon', 'afternoon', 'evening', 'night'] as TimeSlot[],
  PLAYER_NAME: '阿莱克西斯',
  PLAYER_NAME_EN: 'Alexis',
}

// ============================================================
// 故事简介
// ============================================================

export const STORY_INFO = {
  genre: '历史生存模拟',
  title: '青铜之笼',
  subtitle: '雅典男宠生存录',
  era: '公元前432年 · 雅典',
  description: '你是阿莱克西斯，一个12岁的色雷斯少年，被父亲卖给雅典贵族卡利阿斯作为 erômenos。在接下来的五年里，你必须在庇护与掌控、顺从与反抗之间寻找生存之道。你的每一个选择，都将塑造你的命运。',
  duration: '60-90分钟',
  difficulty: 4,
  goals: [
    '在卡利阿斯的宅邸中生存',
    '寻找盟友和逃脱之路',
    '应对来自外邦商人的威胁',
    '在17岁到来之前决定你的命运',
  ],
}

// ============================================================
// 工具函数
// ============================================================

/* 获取 NPC 某个属性的等级描述 */
export function getStatLevel(char: Character, key: string, value: number): { label: string; behavior: string } | null {
  if (key === char.stats[0]?.key && char.favorLevels.length > 0) {
    const level = char.favorLevels.find((l) => value >= l.range[0] && value <= l.range[1])
    return level || null
  }
  return null
}

/* 获取当前章节 */
export function getChapterByMonth(month: number): Chapter {
  return CHAPTERS.find((c) => month >= c.monthRange[0] && month <= c.monthRange[1]) || CHAPTERS[CHAPTERS.length - 1]
}

/* 计算游戏时间显示 */
export function getTimeDisplay(month: number): { year: number; monthInYear: number; age: number; remaining: number } {
  const year = Math.ceil(month / 12)
  const monthInYear = ((month - 1) % 12) + 1
  const age = 12 + Math.floor((month - 1) / 12)
  const remaining = GAME_CONFIG.MAX_MONTHS - month
  return { year, monthInYear, age, remaining }
}
