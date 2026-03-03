/**
 * [INPUT]: 依赖 script.md(?raw), stream.ts, data.ts, parser.ts, analytics.ts
 * [OUTPUT]: 对外提供 useGameStore + re-export data.ts + parser.ts
 * [POS]: 状态中枢：Zustand+Immer，剧本直通+富消息+双轨解析+链式反应+存档
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import GAME_SCRIPT from './script.md?raw'
import { streamChat } from './stream'
import {
  type Message,
  type StoryRecord,
  type TimeSlot,
  type Ending,
  CHARACTERS,
  SCENES,
  ITEMS,
  EVENTS,
  CHAPTERS,
  ENDINGS,
  MAX_MONTHS,
  TIME_SLOT_LABELS,
  TIME_SLOTS,
  STORY_INFO,
  getChapterByMonth,
  getTimeDisplay,
  getStatLevel,
} from './data'
import { parseStoryParagraph, extractChoices } from './parser'
import {
  trackGameStart,
  trackGameContinue,
  trackTimeAdvance,
  trackChapterEnter,
  trackEndingReached,
  trackSceneUnlock,
  trackMentalCrisis,
} from './analytics'

// ── Re-export ────────────────────────────────────────
export {
  type Character,
  type Message,
  type StoryRecord,
  type TimeSlot,
  type Ending,
  CHARACTERS,
  SCENES,
  ITEMS,
  EVENTS,
  CHAPTERS,
  ENDINGS,
  PLAYER_STATS,
  MAX_MONTHS,
  TIME_SLOT_LABELS,
  TIME_SLOTS,
  STORY_INFO,
  ENDING_TYPE_MAP,
  getChapterByMonth,
  getTimeDisplay,
  getStatLevel,
} from './data'
export { parseStoryParagraph, extractChoices } from './parser'

// ── Helpers ──────────────────────────────────────────

let messageCounter = 0
const makeId = () => `msg-${Date.now()}-${++messageCounter}`
const SAVE_KEY = 'qingtong-save-v1'
const HISTORY_COMPRESS_THRESHOLD = 15

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val))
}

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

// ── State / Actions ──────────────────────────────────

interface PlayerStats {
  health: number
  insight: number
  autonomy: number
  hope: number
  artSkill: number
}

interface GameState {
  gameStarted: boolean

  currentMonth: number
  currentTimeSlot: TimeSlot
  currentChapter: number

  currentScene: string
  currentCharacter: string | null
  unlockedCharacters: string[]
  unlockedScenes: string[]

  npcStats: Record<string, Record<string, number>>
  playerStats: PlayerStats

  inventory: string[]
  triggeredEvents: string[]
  activeForceEvent: string | null

  messages: Message[]
  streamingContent: string
  isTyping: boolean
  historySummary: string

  endingId: string | null
  endingData: Ending | null
  showEndingModal: boolean

  choices: string[]

  activeTab: 'dialogue' | 'scene' | 'character' | 'dashboard' | 'records'
  showDashboard: boolean
  showRecords: boolean
  storyRecords: StoryRecord[]
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

  sendMessage: (text: string) => Promise<void>
  addSystemMessage: (content: string) => void

  checkEnding: () => void

  setActiveTab: (tab: 'dialogue' | 'scene' | 'character' | 'dashboard' | 'records') => void
  toggleDashboard: () => void
  toggleRecords: () => void

  saveGame: () => void
  loadGame: () => boolean
  hasSave: () => boolean
  clearSave: () => void
}

type GameStore = GameState & GameActions

// ── Dual-track parseStatChanges ──────────────────────

interface StatChangeResult {
  npcChanges: Array<{ npcId: string; key: string; delta: number }>
  playerChanges: Array<{ key: string; delta: number }>
}

function parseStatChanges(content: string): StatChangeResult {
  const npcChanges: StatChangeResult['npcChanges'] = []
  const playerChanges: StatChangeResult['playerChanges'] = []

  const nameToId: Record<string, string> = {}
  for (const [id, char] of Object.entries(CHARACTERS)) {
    nameToId[char.name] = id
  }

  // Track 1: NPC stat changes — 【角色名 属性名±N】
  const npcRegex = /[【\[]([^】\]]+?)\s+([^±+\-】\]]+?)([+-])(\d+)[】\]]/g
  let match
  while ((match = npcRegex.exec(content))) {
    const [, charName, statAlias, sign, numStr] = match
    if (charName === '玩家') continue
    const delta = parseInt(numStr) * (sign === '+' ? 1 : -1)
    const npcId = nameToId[charName]
    if (npcId) {
      const char = CHARACTERS[npcId]
      const statCfg = char.stats.find((s) => s.alias === statAlias || s.label === statAlias)
      if (statCfg) {
        npcChanges.push({ npcId, key: statCfg.key, delta })
      }
    }
  }

  // Track 2: Player stat changes — 【玩家 属性名±N】
  const playerRegex = /[【\[]玩家\s+([^±+\-】\]]+?)([+-])(\d+)[】\]]/g
  let pMatch
  while ((pMatch = playerRegex.exec(content))) {
    const [, statName, sign, numStr] = pMatch
    const delta = parseInt(numStr) * (sign === '+' ? 1 : -1)
    const keyMap: Record<string, string> = {
      '健康值': 'health', '洞察力': 'insight', '自主性': 'autonomy',
      '希望值': 'hope', '技艺': 'artSkill',
    }
    const key = keyMap[statName]
    if (key) playerChanges.push({ key, delta })
  }

  // Items — 【获得道具：道具名】
  // (handled separately in sendMessage)

  return { npcChanges, playerChanges }
}

// ── buildSystemPrompt — Script-through ───────────────

function buildSystemPrompt(state: GameState): string {
  const char = state.currentCharacter ? CHARACTERS[state.currentCharacter] : null
  const chapter = getChapterByMonth(state.currentMonth)
  const scene = SCENES[state.currentScene]
  const time = getTimeDisplay(state.currentMonth)

  const npcStatus = state.unlockedCharacters
    .map((id) => {
      const c = CHARACTERS[id]
      if (!c) return ''
      const stats = c.stats.map((s) => `${s.label}:${state.npcStats[id]?.[s.key] ?? 0}`).join(' ')
      return `${c.name}(${c.title}): ${stats}`
    })
    .filter(Boolean).join('\n')

  const evtNames = state.triggeredEvents
    .map((id) => EVENTS[id]?.name)
    .filter(Boolean).join('、')

  const itemNames = state.inventory
    .map((id) => ITEMS[id])
    .filter(Boolean)
    .map((i) => `${i.icon}${i.name}`)
    .join('、')

  let prompt = `你是《${STORY_INFO.title}》的AI叙述者。

## 游戏剧本
${GAME_SCRIPT}

## 当前状态
玩家「阿莱克西斯」
第${time.year}年 第${time.monthInYear}月（${time.age}岁，距17岁还有${time.remaining}月）
时段：${TIME_SLOT_LABELS[state.currentTimeSlot]}
章节：${chapter.name}「${chapter.subtitle}」— ${chapter.theme}
场景：${scene?.name} — ${scene?.description}
健康值：${state.playerStats.health}/100

## NPC 状态
${npcStatus}

## 已触发事件
${evtNames || '无'}

## 持有道具
${itemNames || '无'}

## 历史摘要
${state.historySummary || '旅程刚刚开始'}`

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
${currentLevel ? `\n根据当前关系等级「${currentLevel.label}」调整行为：${currentLevel.behavior}` : ''}

## 数值变化标注（必须严格遵守！）
每次回复末尾（选项之前）必须标注本次互动产生的所有数值变化，缺一不可：
- NPC数值变化：【角色名 好感度+N】或【角色名 信任度+N】或【角色名 占有欲+N】等（N通常为3-10）
- 玩家属性变化：【玩家 健康值+N】【玩家 洞察力+N】【玩家 自主性+N】【玩家 希望值+N】【玩家 技艺+N】
示例：
（叙述内容）
【卡利阿斯 好感度+5】【菲洛克勒斯 信任度+3】【玩家 洞察力+5】【玩家 希望值-2】
1. 选项一
2. 选项二
规则：
- 每次回复至少产生1个数值变化
- NPC数值变化必须与当前互动的角色相关
- 玩家属性至少标注1个变化`
  }

  return prompt
}

// ── Chain Reactions ──────────────────────────────────

function applyChainReactions(s: GameState): void {
  // 占有欲≥80 → 信任-5
  const possessiveness = s.npcStats['kallias']?.['possessiveness'] ?? 0
  if (possessiveness >= 80) {
    s.npcStats['kallias']['trust'] = clamp((s.npcStats['kallias']['trust'] ?? 0) - 5, 0, 100)
  }

  // 威胁≥70 + 信任≤20 → 危机
  const threat = s.npcStats['philokles']?.['threat'] ?? 0
  const trust = s.npcStats['kallias']?.['trust'] ?? 0
  if (threat >= 70 && trust <= 20) {
    // Crisis state — handled by ending check
  }

  // 希望≤20 → 心理危机
  if (s.playerStats.hope <= 20) {
    trackMentalCrisis(s.playerStats.hope)
  }
}

// ── Store ────────────────────────────────────────────

export const useGameStore = create<GameStore>()(
  immer((set, get) => ({
    // ── Initial state ──
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
    historySummary: '',
    endingId: null,
    endingData: null,
    showEndingModal: false,
    choices: [],
    activeTab: 'dialogue',
    showDashboard: false,
    showRecords: false,
    storyRecords: [],

    // ── Actions ──

    initGame: () => {
      trackGameStart()
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
        s.historySummary = ''
        s.endingId = null
        s.endingData = null
        s.showEndingModal = false
        s.choices = []
        s.activeTab = 'dialogue'
        s.showDashboard = false
        s.showRecords = false
        s.storyRecords = []

        const chapter = CHAPTERS[0]
        s.messages.push({
          id: makeId(),
          role: 'system',
          content: chapter.enterText,
          timestamp: Date.now(),
        })

        s.storyRecords.push({
          id: `sr-${Date.now()}`,
          month: 1,
          timeSlot: '上午',
          title: '初入宅邸',
          content: '阿莱克西斯被带入卡利阿斯的宅邸，旅程从此刻开始。',
        })

        s.choices = ['观察卧室环境', '走出卧室探索', '等待卡利阿斯出现', '检查自己的物品']
      })
    },

    resetGame: () => {
      set((s) => {
        s.gameStarted = false
        s.messages = []
        s.streamingContent = ''
        s.endingId = null
        s.endingData = null
        s.showEndingModal = false
        s.choices = []
        s.activeTab = 'dialogue'
        s.showDashboard = false
        s.showRecords = false
        s.storyRecords = []
      })
    },

    // ── 时间推进 ──

    advanceMonth: () => {
      const state = get()
      if (state.currentMonth >= MAX_MONTHS) {
        get().checkEnding()
        return
      }

      set((s) => {
        s.currentMonth++

        // Rotate time slot
        const currentIdx = TIME_SLOTS.indexOf(s.currentTimeSlot)
        s.currentTimeSlot = TIME_SLOTS[(currentIdx + 1) % TIME_SLOTS.length]

        trackTimeAdvance(s.currentMonth, TIME_SLOT_LABELS[s.currentTimeSlot])

        // Chapter boundary check
        const newChapter = getChapterByMonth(s.currentMonth)
        if (newChapter.id !== s.currentChapter) {
          s.currentChapter = newChapter.id
          trackChapterEnter(newChapter.id)

          s.messages.push({
            id: makeId(),
            role: 'system',
            content: `— ${newChapter.name}「${newChapter.subtitle}」—\n\n${newChapter.enterText}`,
            timestamp: Date.now(),
            type: 'chapter-change',
            monthInfo: {
              month: s.currentMonth,
              timeSlot: TIME_SLOT_LABELS[s.currentTimeSlot],
              chapter: `${newChapter.name}·${newChapter.subtitle}`,
            },
          })

          s.storyRecords.push({
            id: `sr-${Date.now()}-ch`,
            month: s.currentMonth,
            timeSlot: TIME_SLOT_LABELS[s.currentTimeSlot],
            title: `进入${newChapter.name}`,
            content: newChapter.subtitle,
          })
        }

        // Forced events
        for (const evt of Object.values(EVENTS)) {
          if (evt.type !== 'forced') continue
          if (s.triggeredEvents.includes(evt.id)) continue
          if (evt.trigger.month && evt.trigger.month === s.currentMonth) {
            s.triggeredEvents.push(evt.id)
            s.messages.push({
              id: makeId(),
              role: 'system',
              content: `📜 事件触发：**${evt.name}**\n\n${evt.description}`,
              timestamp: Date.now(),
            })
            if (evt.lockPlayer) s.activeForceEvent = evt.id

            s.storyRecords.push({
              id: `sr-${Date.now()}-evt`,
              month: s.currentMonth,
              timeSlot: TIME_SLOT_LABELS[s.currentTimeSlot],
              title: evt.name,
              content: evt.description,
            })
          }
        }
      })

      get().checkConditionalEvents()
      get().checkUnlocks()

      if (get().currentMonth >= MAX_MONTHS) {
        get().checkEnding()
      }
    },

    setTimeSlot: (slot) => {
      set((s) => { s.currentTimeSlot = slot })
    },

    // ── NPC & 场景 ──

    selectCharacter: (id) => {
      set((s) => {
        s.currentCharacter = id
        s.activeTab = 'dialogue'
      })
    },

    selectScene: (id) => {
      const state = get()
      if (!state.unlockedScenes.includes(id)) return
      if (state.currentScene === id) return

      trackSceneUnlock(id)

      set((s) => {
        s.currentScene = id
        s.currentCharacter = null
        s.activeTab = 'dialogue'

        const scene = SCENES[id]
        if (scene) {
          s.messages.push({
            id: makeId(),
            role: 'system',
            content: `你来到了${scene.name}。\n\n${scene.description}`,
            timestamp: Date.now(),
            type: 'scene-transition',
            sceneId: id,
          })
        }
      })
    },

    checkUnlocks: () => {
      const state = get()
      set((s) => {
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

    // ── 数值 ──

    updateNpcStat: (npcId, key, delta) => {
      set((s) => {
        if (!s.npcStats[npcId]) return
        const current = s.npcStats[npcId][key] ?? 0
        s.npcStats[npcId][key] = clamp(current + delta, 0, 100)
      })
    },

    updatePlayerStat: (key, delta) => {
      set((s) => {
        const k = key as keyof PlayerStats
        if (s.playerStats[k] === undefined) return
        s.playerStats[k] = clamp(s.playerStats[k] + delta, 0, 100)
      })
    },

    // ── 道具 ──

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

    // ── 事件 ──

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

        if (match) {
          get().triggerEvent(evt.id)

          set((s) => {
            s.storyRecords.push({
              id: `sr-${Date.now()}-ce`,
              month: s.currentMonth,
              timeSlot: TIME_SLOT_LABELS[s.currentTimeSlot],
              title: evt.name,
              content: evt.description,
            })
          })
        }
      }
    },

    // ── SSE 流式消息 ──

    sendMessage: async (text: string) => {
      const state = get()
      if (state.isTyping || state.endingId) return

      const char = state.currentCharacter ? CHARACTERS[state.currentCharacter] : null

      set((s) => {
        s.messages.push({
          id: makeId(),
          role: 'user',
          content: text,
          timestamp: Date.now(),
        })
        s.isTyping = true
        s.streamingContent = ''
        s.activeForceEvent = null
      })

      // Compress history if needed
      const currentState = get()
      if (currentState.messages.length > HISTORY_COMPRESS_THRESHOLD) {
        const oldMessages = currentState.messages.slice(0, -10)
        const summary = oldMessages
          .filter((m) => m.role !== 'system' || m.type)
          .map((m) => `[${m.role}] ${m.content.slice(0, 80)}`)
          .join('\n')

        set((s) => {
          s.historySummary = (s.historySummary + '\n' + summary).slice(-2000)
          s.messages = s.messages.slice(-10)
        })
      }

      try {
        const promptState = get()
        const systemPrompt = buildSystemPrompt(promptState)
        const recentMessages = promptState.messages
          .filter((m) => !m.type)
          .slice(-10)
          .map((m) => ({ role: m.role as 'user' | 'assistant' | 'system', content: m.content }))

        const apiMessages = [
          { role: 'system' as const, content: systemPrompt },
          ...recentMessages,
        ]

        let fullContent = ''

        await streamChat(
          apiMessages,
          (chunk: string) => {
            fullContent += chunk
            set((s) => { s.streamingContent = fullContent })
          },
          () => {},
        )

        if (!fullContent) {
          const fallbacks = char
            ? [`【${char.name}】（看了你一眼）\u201c有什么事吗？\u201d`, `【${char.name}】（沉默片刻）\u201c……\u201d`]
            : ['大理石柱廊间传来悠远的笛声。', '橄榄叶在风中沙沙作响。']
          fullContent = fallbacks[Math.floor(Math.random() * fallbacks.length)]
        }

        // Parse stat changes
        const { npcChanges, playerChanges } = parseStatChanges(fullContent)

        // Detect character for NPC bubble
        const { charColor } = parseStoryParagraph(fullContent)
        let detectedChar: string | null = null
        if (charColor) {
          for (const [id, c] of Object.entries(CHARACTERS)) {
            if (c.themeColor === charColor) {
              detectedChar = id
              break
            }
          }
        }

        // Extract choices from AI response
        const { cleanContent, choices: parsedChoices } = extractChoices(fullContent)

        // Parse items
        const itemMatches = fullContent.match(/【获得道具[：:]([^】]+)】/g)

        // Parse events
        const eventMatches = fullContent.match(/【事件[：:]([^】]+)】/g)

        // Fallback choices
        const finalChoices = parsedChoices.length >= 2 ? parsedChoices : (() => {
          const cs = get()
          const c2 = cs.currentCharacter ? CHARACTERS[cs.currentCharacter] : null
          if (c2) {
            return [
              `继续和${c2.name}交谈`,
              `向${c2.name}询问信息`,
              `观察${c2.name}的反应`,
              '环顾四周',
            ]
          }
          const sc = SCENES[cs.currentScene]
          return [
            `探索${sc?.name || '周围'}`,
            '与人交谈',
            '查看物品',
            '休息片刻',
          ]
        })()

        set((s) => {
          // Apply NPC stat changes
          for (const change of npcChanges) {
            if (s.npcStats[change.npcId]) {
              const current = s.npcStats[change.npcId][change.key] ?? 0
              s.npcStats[change.npcId][change.key] = clamp(current + change.delta, 0, 100)
            }
          }

          // Apply player stat changes
          for (const change of playerChanges) {
            const k = change.key as keyof PlayerStats
            if (s.playerStats[k] !== undefined) {
              s.playerStats[k] = clamp(s.playerStats[k] + change.delta, 0, 100)
            }
          }

          // Chain reactions
          applyChainReactions(s)

          // Push assistant message
          s.messages.push({
            id: makeId(),
            role: 'assistant',
            content: cleanContent,
            timestamp: Date.now(),
            character: detectedChar || state.currentCharacter || undefined,
          })

          s.choices = finalChoices.slice(0, 4)

          // Record
          s.storyRecords.push({
            id: `sr-${Date.now()}`,
            month: s.currentMonth,
            timeSlot: TIME_SLOT_LABELS[s.currentTimeSlot],
            title: text.slice(0, 20) + (text.length > 20 ? '...' : ''),
            content: cleanContent.slice(0, 100) + '...',
          })

          s.isTyping = false
          s.streamingContent = ''
        })

        // Handle items
        if (itemMatches) {
          for (const match of itemMatches) {
            const name = match.match(/【获得道具[：:]([^】]+)】/)?.[1]
            if (name) {
              const item = Object.values(ITEMS).find((i) => i.name === name)
              if (item) get().addItem(item.id)
            }
          }
        }

        // Handle events
        if (eventMatches) {
          for (const match of eventMatches) {
            const name = match.match(/【事件[：:]([^】]+)】/)?.[1]
            if (name) {
              const evt = Object.values(EVENTS).find((e) => e.name === name)
              if (evt) get().triggerEvent(evt.id)
            }
          }
        }

        // Advance time
        get().advanceMonth()

        // Auto-save
        get().saveGame()

      } catch {
        set((s) => {
          s.isTyping = false
          s.streamingContent = ''
          s.messages.push({
            id: makeId(),
            role: 'assistant',
            content: char
              ? `【${char.name}】（似乎在想什么）\u201c……\u201d`
              : '远处传来海潮般的声响。大理石柱在月光下泛着冷光。',
            timestamp: Date.now(),
            character: state.currentCharacter || undefined,
          })
        })
      }
    },

    addSystemMessage: (content) => {
      set((s) => {
        s.messages.push({
          id: makeId(),
          role: 'system',
          content,
          timestamp: Date.now(),
        })
      })
    },

    // ── 结局判定 ──

    checkEnding: () => {
      const state = get()
      if (state.endingId) return

      const sorted = [...ENDINGS].sort((a, b) => a.priority - b.priority)

      for (const ending of sorted) {
        const c = ending.conditions
        let match = true

        if (c.stats) {
          for (const sc of c.stats) {
            const val = state.npcStats[sc.target]?.[sc.key] ?? 0
            if (sc.min !== undefined && val < sc.min) match = false
            if (sc.max !== undefined && val > sc.max) match = false
          }
        }

        if (c.items) {
          for (const itemId of c.items) {
            if (!state.inventory.includes(itemId)) match = false
          }
        }

        if (c.events) {
          for (const evtId of c.events) {
            if (!state.triggeredEvents.includes(evtId)) match = false
          }
        }

        if (c.eventsNot) {
          for (const evtId of c.eventsNot) {
            if (state.triggeredEvents.includes(evtId)) match = false
          }
        }

        if (match) {
          trackEndingReached(ending.id)
          set((s) => {
            s.endingId = ending.id
            s.endingData = ending
            s.showEndingModal = true
          })
          return
        }
      }

      // Fallback
      const fallback = ENDINGS.find((e) => e.id === 'NE-2')!
      trackEndingReached(fallback.id)
      set((s) => {
        s.endingId = fallback.id
        s.endingData = fallback
        s.showEndingModal = true
      })
    },

    // ── Tab / Drawer ──

    setActiveTab: (tab) => {
      set((s) => {
        s.activeTab = tab
        s.showDashboard = false
        s.showRecords = false
      })
    },

    toggleDashboard: () => {
      set((s) => {
        s.showDashboard = !s.showDashboard
        if (s.showDashboard) s.showRecords = false
      })
    },

    toggleRecords: () => {
      set((s) => {
        s.showRecords = !s.showRecords
        if (s.showRecords) s.showDashboard = false
      })
    },

    // ── 存档 ──

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
        messages: s.messages.slice(-30),
        historySummary: s.historySummary,
        storyRecords: s.storyRecords.slice(-50),
        endingId: s.endingId,
      }
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(save))
      } catch { /* 静默 */ }
    },

    loadGame: () => {
      try {
        const raw = localStorage.getItem(SAVE_KEY)
        if (!raw) return false
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
          s.messages = save.messages || []
          s.historySummary = save.historySummary || ''
          s.storyRecords = save.storyRecords || []
          s.endingId = save.endingId || null
        })
        trackGameContinue()
        return true
      } catch {
        return false
      }
    },

    hasSave: () => {
      try {
        return !!localStorage.getItem(SAVE_KEY)
      } catch {
        return false
      }
    },

    clearSave: () => {
      try {
        localStorage.removeItem(SAVE_KEY)
      } catch { /* 静默 */ }
    },
  })),
)
