/**
 * [INPUT]: 依赖 zustand, immer, @/lib/stream, @/lib/data, @/lib/analytics
 * [OUTPUT]: 对外提供 useGameStore（Zustand 状态中枢）
 * [POS]: lib 的状态管理层，时间系统 + 章节推进 + 事件 + 道具 + 结局判定 + SSE + 存档
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { streamChat, chat } from '@/lib/stream'
import { trackGameStart, trackGameContinue } from '@/lib/analytics'
import {
  type GameMessage, type TimeSlot, type Ending,
  CHARACTERS, SCENES, ITEMS, EVENTS, CHAPTERS, ENDINGS,
  GAME_CONFIG, TIME_SLOT_LABELS,
  getChapterByMonth, getTimeDisplay, getStatLevel,
} from '@/lib/data'

// ============================================================
// Store 类型
// ============================================================

interface GameState {
  gameStarted: boolean

  /* 时间系统 */
  currentMonth: number
  currentTimeSlot: TimeSlot
  currentChapter: number

  /* 场景 & NPC */
  currentScene: string
  currentCharacter: string | null
  unlockedCharacters: string[]
  unlockedScenes: string[]

  /* NPC 异构数值 */
  npcStats: Record<string, Record<string, number>>

  /* 玩家隐藏数值 */
  playerStats: {
    health: number
    insight: number
    autonomy: number
    hope: number
    artSkill: number
  }

  /* 道具 */
  inventory: string[]

  /* 事件 */
  triggeredEvents: string[]
  activeForceEvent: string | null

  /* 对话 */
  messages: GameMessage[]
  streamingContent: string
  isTyping: boolean
  historySummary: string | null

  /* 结局 */
  endingId: string | null
  endingData: Ending | null
  showEndingModal: boolean

  /* 选择记录 */
  choices: Record<string, string>
}

interface GameActions {
  initGame: () => void
  resetGame: () => void

  advanceMonth: () => void
  setTimeSlot: (slot: TimeSlot) => void

  selectCharacter: (id: string | null) => void
  selectScene: (id: string) => void
  checkUnlocks: () => void

  updateNpcStat: (npcId: string, key: string, delta: number) => void
  updatePlayerStat: (key: string, delta: number) => void

  addItem: (itemId: string) => void
  hasItem: (itemId: string) => boolean

  triggerEvent: (eventId: string) => void
  isEventTriggered: (eventId: string) => boolean
  checkConditionalEvents: () => void

  recordChoice: (key: string, value: string) => void

  sendMessage: (text: string) => Promise<void>
  addSystemMessage: (content: string) => void

  checkEnding: () => void

  saveGame: () => void
  loadGame: () => void
  hasSave: () => boolean
}

// ============================================================
// 辅助
// ============================================================

let counter = 0
const makeId = () => `msg-${Date.now()}-${++counter}`
const SAVE_KEY = 'qingtong-save-v1'

function buildInitialNpcStats(): Record<string, Record<string, number>> {
  const result: Record<string, Record<string, number>> = {}
  for (const [id, char] of Object.entries(CHARACTERS)) {
    result[id] = {}
    for (const stat of char.stats) {
      result[id][stat.key] = stat.initial
    }
  }
  return result
}

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val))
}

// ============================================================
// Store
// ============================================================

export const useGameStore = create<GameState & GameActions>()(
  immer((set, get) => ({
    /* --- 初始状态 --- */
    gameStarted: false,
    currentMonth: 1,
    currentTimeSlot: 'morning' as TimeSlot,
    currentChapter: 1,
    currentScene: 'bedroom',
    currentCharacter: null,
    unlockedCharacters: ['kallias'],
    unlockedScenes: ['bedroom', 'courtyard'],
    npcStats: buildInitialNpcStats(),
    playerStats: { health: 100, insight: 0, autonomy: 50, hope: 50, artSkill: 0 },
    inventory: ['white_robe', 'gold_armband'],
    triggeredEvents: [],
    activeForceEvent: null,
    messages: [],
    streamingContent: '',
    isTyping: false,
    historySummary: null,
    endingId: null,
    endingData: null,
    showEndingModal: false,
    choices: {},

    /* --- 游戏控制 --- */

    initGame: () => {
      set((s) => {
        s.gameStarted = true
        s.currentMonth = 1
        s.currentTimeSlot = 'morning'
        s.currentChapter = 1
        s.currentScene = 'bedroom'
        s.currentCharacter = null
        s.unlockedCharacters = ['kallias']
        s.unlockedScenes = ['bedroom', 'courtyard']
        s.npcStats = buildInitialNpcStats()
        s.playerStats = { health: 100, insight: 0, autonomy: 50, hope: 50, artSkill: 0 }
        s.inventory = ['white_robe', 'gold_armband']
        s.triggeredEvents = []
        s.activeForceEvent = null
        s.messages = []
        s.streamingContent = ''
        s.isTyping = false
        s.historySummary = null
        s.endingId = null
        s.endingData = null
        s.showEndingModal = false
        s.choices = {}
      })
      trackGameStart()
      const chapter = CHAPTERS[0]
      get().addSystemMessage(chapter.enterText)
    },

    resetGame: () => {
      set((s) => {
        s.gameStarted = false
        s.messages = []
        s.streamingContent = ''
        s.endingId = null
        s.endingData = null
        s.showEndingModal = false
      })
    },

    /* --- 时间推进 --- */

    advanceMonth: () => {
      const state = get()
      if (state.currentMonth >= GAME_CONFIG.MAX_MONTHS) {
        get().checkEnding()
        return
      }

      set((s) => { s.currentMonth++ })
      const newMonth = get().currentMonth

      /* 章节边界检查 */
      const newChapter = getChapterByMonth(newMonth)
      if (newChapter.id !== get().currentChapter) {
        set((s) => { s.currentChapter = newChapter.id })
        get().addSystemMessage(`\n—— ${newChapter.name}：${newChapter.subtitle} ——\n\n${newChapter.enterText}`)
      }

      /* 强制事件检查 */
      for (const evt of Object.values(EVENTS)) {
        if (evt.type !== 'forced') continue
        if (get().triggeredEvents.includes(evt.id)) continue
        if (evt.trigger.month && evt.trigger.month === newMonth) {
          get().triggerEvent(evt.id)
          if (evt.lockPlayer) {
            set((s) => { s.activeForceEvent = evt.id })
          }
        }
      }

      get().checkConditionalEvents()
      get().checkUnlocks()

      if (newMonth >= GAME_CONFIG.MAX_MONTHS) {
        get().checkEnding()
      }
    },

    setTimeSlot: (slot) => {
      set((s) => { s.currentTimeSlot = slot })
    },

    /* --- NPC & 场景 --- */

    selectCharacter: (id) => {
      set((s) => { s.currentCharacter = id })
    },

    selectScene: (id) => {
      set((s) => { s.currentScene = id; s.currentCharacter = null })
      const scene = SCENES[id]
      if (scene) get().addSystemMessage(`你来到了${scene.icon} ${scene.name}。\n\n${scene.description}`)
    },

    checkUnlocks: () => {
      const state = get()
      set((s) => {
        /* NPC 解锁 */
        for (const [id, char] of Object.entries(CHARACTERS)) {
          if (s.unlockedCharacters.includes(id)) continue
          const cond = char.unlockCondition
          if (cond.type === 'always') {
            s.unlockedCharacters.push(id)
          } else if (cond.type === 'chapter' && cond.chapter && state.currentChapter >= cond.chapter) {
            s.unlockedCharacters.push(id)
          } else if (cond.type === 'stat' && cond.stat) {
            const val = state.npcStats[cond.stat.npcId]?.[cond.stat.key] ?? 0
            if (val >= cond.stat.min) s.unlockedCharacters.push(id)
          } else if (cond.type === 'event' && cond.eventId) {
            if (state.triggeredEvents.includes(cond.eventId)) s.unlockedCharacters.push(id)
          }
        }

        /* 场景解锁 */
        for (const [id, scene] of Object.entries(SCENES)) {
          if (s.unlockedScenes.includes(id)) continue
          const ac = scene.accessCondition
          if (!ac) { s.unlockedScenes.push(id); continue }
          let canUnlock = true
          if (ac.requiredChapter && state.currentChapter < ac.requiredChapter) canUnlock = false
          if (ac.requiredItem && !state.inventory.includes(ac.requiredItem)) canUnlock = false
          if (ac.requiredEvent && !state.triggeredEvents.includes(ac.requiredEvent)) canUnlock = false
          if (ac.requiredStat) {
            const val = state.npcStats[ac.requiredStat.npcId]?.[ac.requiredStat.key] ?? 0
            if (val < ac.requiredStat.min) canUnlock = false
          }
          if (canUnlock) s.unlockedScenes.push(id)
        }
      })
    },

    /* --- 数值 --- */

    updateNpcStat: (npcId, key, delta) => {
      set((s) => {
        if (!s.npcStats[npcId]) return
        const current = s.npcStats[npcId][key] ?? 0
        s.npcStats[npcId][key] = clamp(current + delta, 0, 100)
      })
    },

    updatePlayerStat: (key, delta) => {
      set((s) => {
        const k = key as keyof typeof s.playerStats
        if (s.playerStats[k] === undefined) return
        s.playerStats[k] = clamp(s.playerStats[k] + delta, 0, 100)
      })
    },

    /* --- 道具 --- */

    addItem: (itemId) => {
      set((s) => {
        if (!s.inventory.includes(itemId)) {
          s.inventory.push(itemId)
        }
      })
      const item = ITEMS[itemId]
      if (item) get().addSystemMessage(`📦 获得道具：**${item.icon} ${item.name}**\n\n${item.description}`)
    },

    hasItem: (itemId) => get().inventory.includes(itemId),

    /* --- 事件 --- */

    triggerEvent: (eventId) => {
      const evt = EVENTS[eventId]
      if (!evt || get().triggeredEvents.includes(eventId)) return
      set((s) => { s.triggeredEvents.push(eventId) })
      get().addSystemMessage(`📜 事件触发：**${evt.name}**\n\n${evt.description}`)
    },

    isEventTriggered: (eventId) => get().triggeredEvents.includes(eventId),

    checkConditionalEvents: () => {
      const state = get()
      for (const evt of Object.values(EVENTS)) {
        if (evt.type !== 'conditional') continue
        if (state.triggeredEvents.includes(evt.id)) continue

        const t = evt.trigger
        let match = true

        if (t.chapter && state.currentChapter < t.chapter) match = false
        if (t.month && state.currentMonth < t.month) match = false
        if (t.stat) {
          const val = state.npcStats[t.stat.npcId]?.[t.stat.key] ?? 0
          if (t.stat.min !== undefined && val < t.stat.min) match = false
          if (t.stat.max !== undefined && val > t.stat.max) match = false
        }
        if (t.item && !state.inventory.includes(t.item)) match = false
        if (t.event && !state.triggeredEvents.includes(t.event)) match = false

        if (match) get().triggerEvent(evt.id)
      }
    },

    /* --- 选择记录 --- */

    recordChoice: (key, value) => {
      set((s) => { s.choices[key] = value })
    },

    /* --- SSE 流式消息 --- */

    sendMessage: async (text: string) => {
      const state = get()
      const char = state.currentCharacter ? CHARACTERS[state.currentCharacter] : null

      set((s) => {
        s.messages.push({ id: makeId(), role: 'user', content: text, isPlayerAction: true, timestamp: Date.now() })
        s.isTyping = true
        s.streamingContent = ''
        s.activeForceEvent = null
      })

      /* 超过 15 条自动压缩 */
      if (state.messages.length > 15) {
        await compressHistory(get, set)
      }

      try {
        const systemPrompt = buildSystemPrompt(get())
        const recentMessages = get().messages.slice(-20).map((m) => ({
          role: m.role as 'user' | 'assistant' | 'system',
          content: m.content,
        }))

        const apiMessages = [
          { role: 'system' as const, content: systemPrompt },
          ...recentMessages,
        ]

        let accumulated = ''

        await streamChat(
          apiMessages,
          (chunk) => {
            accumulated += chunk
            set((s) => { s.streamingContent = accumulated })
          },
          () => { /* done */ }
        )

        if (!accumulated) {
          const fallbacks = char
            ? [`【${char.name}】（看了你一眼）\u201c有什么事吗？\u201d`, `【${char.name}】（沉默片刻）\u201c……\u201d`]
            : ['大理石柱廊间传来悠远的笛声。', '橄榄叶在风中沙沙作响。']
          accumulated = fallbacks[Math.floor(Math.random() * fallbacks.length)]
        }

        /* 解析 NPC 数值变化: 【角色名 属性名±N】 */
        const statMatches = accumulated.match(/【([^】]+)\s+([^±+\-】]+)([+-]\d+)】/g)
        if (statMatches) {
          for (const match of statMatches) {
            const parts = match.match(/【([^】]+)\s+([^±+\-】]+)([+-]\d+)】/)
            if (parts) {
              const npcName = parts[1]
              const statAlias = parts[2]
              const delta = parseInt(parts[3])
              /* 查找 NPC */
              for (const [npcId, npc] of Object.entries(CHARACTERS)) {
                if (npc.name !== npcName) continue
                const statCfg = npc.stats.find((s) => s.alias === statAlias || s.label === statAlias)
                if (statCfg) get().updateNpcStat(npcId, statCfg.key, delta)
              }
            }
          }
        }

        /* 解析玩家数值变化: 【玩家 属性名±N】 */
        const playerStatMatches = accumulated.match(/【玩家\s+([^±+\-】]+)([+-]\d+)】/g)
        if (playerStatMatches) {
          for (const match of playerStatMatches) {
            const parts = match.match(/【玩家\s+([^±+\-】]+)([+-]\d+)】/)
            if (parts) {
              const keyMap: Record<string, string> = {
                '健康值': 'health', '洞察力': 'insight', '自主性': 'autonomy',
                '希望值': 'hope', '技艺': 'artSkill',
              }
              const key = keyMap[parts[1]]
              if (key) get().updatePlayerStat(key, parseInt(parts[2]))
            }
          }
        }

        /* 解析道具获得: 【获得道具：道具名】 */
        const itemMatches = accumulated.match(/【获得道具[：:]([^】]+)】/g)
        if (itemMatches) {
          for (const match of itemMatches) {
            const name = match.match(/【获得道具[：:]([^】]+)】/)?.[1]
            if (name) {
              const item = Object.values(ITEMS).find((i) => i.name === name)
              if (item) get().addItem(item.id)
            }
          }
        }

        /* 解析事件触发: 【事件：事件名】 */
        const eventMatches = accumulated.match(/【事件[：:]([^】]+)】/g)
        if (eventMatches) {
          for (const match of eventMatches) {
            const name = match.match(/【事件[：:]([^】]+)】/)?.[1]
            if (name) {
              const evt = Object.values(EVENTS).find((e) => e.name === name)
              if (evt) get().triggerEvent(evt.id)
            }
          }
        }

        set((s) => {
          s.messages.push({
            id: makeId(), role: 'assistant', content: accumulated,
            characterId: state.currentCharacter ?? undefined,
            characterName: char?.name ?? '叙事',
            characterColor: char?.themeColor ?? '#CD7F32',
            isNarrative: true, timestamp: Date.now(),
          })
          s.isTyping = false
          s.streamingContent = ''
        })

        /* 每次对话后推进时间 */
        get().advanceMonth()

      } catch {
        set((s) => {
          s.messages.push({
            id: makeId(), role: 'assistant',
            content: char
              ? `【${char.name}】（似乎在想什么）\u201c……\u201d`
              : '远处传来海潮般的声响。大理石柱在月光下泛着冷光。',
            characterId: state.currentCharacter ?? undefined,
            isNarrative: true, timestamp: Date.now(),
          })
          s.isTyping = false
          s.streamingContent = ''
        })
      }
    },

    addSystemMessage: (content) => {
      set((s) => {
        s.messages.push({ id: makeId(), role: 'system', content, characterName: '旁白', characterColor: '#CD7F32', timestamp: Date.now() })
      })
    },

    /* --- 结局判定 --- */

    checkEnding: () => {
      const state = get()
      /* 按 priority 排序（低优先级数字 = 高优先） */
      const sorted = [...ENDINGS].sort((a, b) => a.priority - b.priority)

      for (const ending of sorted) {
        const c = ending.conditions
        let match = true

        /* stats 条件 */
        if (c.stats) {
          for (const sc of c.stats) {
            const val = state.npcStats[sc.target]?.[sc.key] ?? 0
            if (sc.min !== undefined && val < sc.min) match = false
            if (sc.max !== undefined && val > sc.max) match = false
          }
        }

        /* items 条件 */
        if (c.items) {
          for (const itemId of c.items) {
            if (!state.inventory.includes(itemId)) match = false
          }
        }

        /* events 条件 */
        if (c.events) {
          for (const evtId of c.events) {
            if (!state.triggeredEvents.includes(evtId)) match = false
          }
        }

        /* eventsNot 条件 */
        if (c.eventsNot) {
          for (const evtId of c.eventsNot) {
            if (state.triggeredEvents.includes(evtId)) match = false
          }
        }

        if (match) {
          set((s) => {
            s.endingId = ending.id
            s.endingData = ending
            s.showEndingModal = true
          })
          return
        }
      }

      /* 无匹配 → 默认结局 (NE-2) */
      const fallback = ENDINGS.find((e) => e.id === 'NE-2')!
      set((s) => {
        s.endingId = fallback.id
        s.endingData = fallback
        s.showEndingModal = true
      })
    },

    /* --- 存档 --- */

    saveGame: () => {
      const s = get()
      const save = {
        currentMonth: s.currentMonth,
        currentTimeSlot: s.currentTimeSlot,
        currentChapter: s.currentChapter,
        currentScene: s.currentScene,
        currentCharacter: s.currentCharacter,
        unlockedCharacters: s.unlockedCharacters,
        unlockedScenes: s.unlockedScenes,
        npcStats: s.npcStats,
        playerStats: s.playerStats,
        inventory: s.inventory,
        triggeredEvents: s.triggeredEvents,
        choices: s.choices,
        messages: s.messages.slice(-30),
      }
      localStorage.setItem(SAVE_KEY, JSON.stringify(save))
    },

    loadGame: () => {
      const raw = localStorage.getItem(SAVE_KEY)
      if (!raw) return
      try {
        const save = JSON.parse(raw)
        set((s) => {
          s.gameStarted = true
          s.currentMonth = save.currentMonth
          s.currentTimeSlot = save.currentTimeSlot
          s.currentChapter = save.currentChapter
          s.currentScene = save.currentScene
          s.currentCharacter = save.currentCharacter
          s.unlockedCharacters = save.unlockedCharacters
          s.unlockedScenes = save.unlockedScenes
          s.npcStats = save.npcStats
          s.playerStats = save.playerStats
          s.inventory = save.inventory
          s.triggeredEvents = save.triggeredEvents
          s.choices = save.choices || {}
          s.messages = save.messages
        })
        trackGameContinue()
      } catch { /* 损坏的存档 */ }
    },

    hasSave: () => !!localStorage.getItem(SAVE_KEY),
  }))
)

// ============================================================
// 上下文压缩
// ============================================================

async function compressHistory(
  get: () => GameState & GameActions,
  set: (fn: (s: GameState) => void) => void
) {
  const msgs = get().messages
  if (msgs.length <= 15) return

  const toCompress = msgs.slice(0, -10)
  const text = toCompress.map((m) => `[${m.role}]: ${m.content}`).join('\n')

  try {
    const summary = await chat([
      { role: 'system', content: '你是一个历史生存模拟游戏的叙事压缩器。请将以下对话历史压缩为简洁的叙事摘要（200字以内），保留关键事件、NPC关系变化和道具获取。' },
      { role: 'user', content: text },
    ])

    if (summary) {
      set((s) => {
        const kept = s.messages.slice(-10)
        s.messages = [
          { id: makeId(), role: 'system', content: `[剧情回顾] ${summary}`, timestamp: Date.now() },
          ...kept,
        ]
        s.historySummary = summary
      })
    }
  } catch { /* 压缩失败不影响主流程 */ }
}

// ============================================================
// System Prompt
// ============================================================

function buildSystemPrompt(state: GameState): string {
  const scene = SCENES[state.currentScene]
  const char = state.currentCharacter ? CHARACTERS[state.currentCharacter] : null
  const time = getTimeDisplay(state.currentMonth)
  const chapter = getChapterByMonth(state.currentMonth)

  /* 所有已解锁 NPC 状态 */
  const npcStatus = state.unlockedCharacters
    .map((id) => {
      const c = CHARACTERS[id]
      if (!c) return ''
      const stats = c.stats.map((s) => `${s.label}:${state.npcStats[id]?.[s.key] ?? 0}`).join(' ')
      return `${c.name}(${c.title}): ${stats}`
    })
    .filter(Boolean).join('\n')

  /* 已触发事件 */
  const evtNames = state.triggeredEvents
    .map((id) => EVENTS[id]?.name)
    .filter(Boolean).join('、')

  /* 持有道具 */
  const itemNames = state.inventory
    .map((id) => ITEMS[id])
    .filter(Boolean)
    .map((i) => `${i.icon}${i.name}`)
    .join('、')

  let prompt = `你是古希腊历史生存模拟游戏《青铜之笼》的 AI 叙述者。

## 游戏背景
公元前432年，雅典。玩家扮演12岁色雷斯少年阿莱克西斯（Alexis），被父亲出售给雅典贵族卡利阿斯作为 erômenos。游戏跨越5年（60个月），玩家需要在庇护与掌控之间寻找生存之道。

## 当前状态
- 时间：第${time.year}年 第${time.monthInYear}个月（阿莱克西斯${time.age}岁，距17岁还有${time.remaining}个月）
- 时段：${TIME_SLOT_LABELS[state.currentTimeSlot]}
- 章节：${chapter.name}「${chapter.subtitle}」— ${chapter.theme}
- 场景：${scene?.name} — ${scene?.description}
- 健康值：${state.playerStats.health}/100

## NPC 状态
${npcStatus}

## 已触发事件
${evtNames || '无'}

## 持有道具
${itemNames || '无'}

## 叙述规则
- 用古典希腊风格叙事，融合诗意与克制
- 角色对话用【角色名】标记，动作用（）包裹
- 数值变化用【角色名 属性名±N】标注（如【卡利阿斯 好感度+5】）
- 玩家数值变化用【玩家 属性名±N】标注（如【玩家 健康值-10】）
- 获得道具用【获得道具：道具名】标注
- 触发事件用【事件：事件名】标注
- 每段回复 200-400 字
- 结尾提供 2-3 个行动建议`

  if (char) {
    const charStats = char.stats.map((s) => {
      const val = state.npcStats[char.id]?.[s.key] ?? 0
      const level = getStatLevel(char, s.key, val)
      return `${s.label}: ${val}${level ? ` (${level.label})` : ''}`
    }).join('、')

    const currentLevel = char.favorLevels.find((l) => {
      const val = state.npcStats[char.id]?.[char.stats[0]?.key] ?? 0
      return val >= l.range[0] && val <= l.range[1]
    })

    prompt += `

## 当前互动角色
- 姓名：${char.name}（${char.nameEn}，${char.title}，${char.age}岁）
- 性格：${char.personality.core}
- 说话风格：${char.personality.speakStyle}
- 口头禅：${char.personality.catchphrases.join('、')}
- 当前数值：${charStats}
- 秘密动机：${char.secret.hiddenMotivation}
- 内心真相：${char.secret.trueSelf}
- 创伤背景：${char.secret.pastTrauma}
${currentLevel ? `\n根据当前关系等级「${currentLevel.label}」调整行为：${currentLevel.behavior}` : ''}`
  }

  if (state.historySummary) {
    prompt += `\n\n## 历史剧情摘要\n${state.historySummary}`
  }

  return prompt
}
