/**
 * [INPUT]: store (messages, isTyping, streamingContent, choices, inventory, currentScene, currentCharacter)
 * [OUTPUT]: 对话Tab：富消息路由 + 可折叠选项面板 + 快捷操作 + 背包 + 输入区
 * [POS]: components/game Tab组件，app-shell.tsx TabContent 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useRef, useEffect, useState, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { PaperPlaneRight, Backpack, GameController, CaretUp, CaretDown, X, Target } from '@phosphor-icons/react'
import {
  useGameStore, CHARACTERS, SCENES, ITEMS, STORY_INFO,
  type Message, parseStoryParagraph,
} from '../../lib/store'

const QUICK_ACTIONS = [
  { emoji: '🔍', label: '探索周围' },
  { emoji: '💬', label: '与人交谈' },
  { emoji: '👁', label: '仔细观察' },
  { emoji: '🛏', label: '休息片刻' },
]

// ── Rich message sub-components ──────────────────────

function LetterCard() {
  return (
    <div className="qt-letter">
      <div className="qt-letter-watermark">🏛️</div>
      <div className="qt-letter-seal">🏺</div>
      <div className="qt-letter-genre">{STORY_INFO.genre}</div>
      <div className="qt-letter-title">{STORY_INFO.title}</div>
      <div className="qt-letter-body">{STORY_INFO.description}</div>
      <div className="qt-letter-goals">
        <div className="qt-letter-goals-label">目标</div>
        {STORY_INFO.goals.map((g, i) => (
          <div key={i} className="qt-letter-goal">
            <Target size={14} /> {g}
          </div>
        ))}
      </div>
    </div>
  )
}

function SceneTransitionCard({ msg }: { msg: Message }) {
  const scene = msg.sceneId ? SCENES[msg.sceneId] : null
  if (!scene) return null
  return (
    <div className="qt-scene-card">
      <img src={scene.background} alt={scene.name} />
      <div className="qt-scene-card-overlay">
        <div className="qt-scene-card-name">{scene.name}</div>
        <div className="qt-scene-card-atmo">{scene.description}</div>
      </div>
      <div className="qt-scene-card-badge">场景切换</div>
    </div>
  )
}

function ChapterCard({ msg }: { msg: Message }) {
  const info = msg.monthInfo
  if (!info) return null
  return (
    <div className="qt-chapter-card">
      <div className="qt-chapter-number">第{info.month}月</div>
      <div className="qt-chapter-name">{info.chapter}</div>
      <div className="qt-chapter-period">{info.timeSlot}</div>
      <div className="qt-chapter-desc">{msg.content.split('\n\n')[1] || ''}</div>
    </div>
  )
}

function NpcBubble({ msg }: { msg: Message }) {
  const char = msg.character ? CHARACTERS[msg.character] : null
  const { narrative, statHtml, charColor } = parseStoryParagraph(msg.content)
  const borderColor = charColor || char?.themeColor || 'var(--primary)'

  return (
    <div className="qt-npc-row">
      {char && (
        <img
          className="qt-npc-avatar"
          src={char.portrait}
          alt={char.name}
          style={{ borderColor }}
        />
      )}
      <div className="qt-npc-bubble" style={{ borderLeft: `3px solid ${borderColor}` }}>
        {char && (
          <div style={{ fontSize: 12, fontWeight: 600, color: borderColor, marginBottom: 4 }}>
            {char.name}
          </div>
        )}
        <div dangerouslySetInnerHTML={{ __html: narrative }} />
        {statHtml && <div dangerouslySetInnerHTML={{ __html: statHtml }} />}
      </div>
    </div>
  )
}

function PlayerBubble({ msg }: { msg: Message }) {
  return <div className="qt-bubble-player">{msg.content}</div>
}

function SystemMessage({ msg }: { msg: Message }) {
  return <div className="qt-bubble-system">{msg.content}</div>
}

function StreamingBubble({ content }: { content: string }) {
  const { narrative, charColor } = parseStoryParagraph(content)
  const borderColor = charColor || 'var(--primary)'
  return (
    <div className="qt-npc-row">
      <div className="qt-npc-bubble" style={{ borderLeft: `3px solid ${borderColor}` }}>
        <div dangerouslySetInnerHTML={{ __html: narrative }} />
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="qt-typing">
      <div className="qt-typing-dot" />
      <div className="qt-typing-dot" />
      <div className="qt-typing-dot" />
    </div>
  )
}

// ── Main component ──────────────────────────────────

export default function TabDialogue() {
  const {
    messages, isTyping, streamingContent, choices, inventory,
    sendMessage,
  } = useGameStore()
  const chatRef = useRef<HTMLDivElement>(null)
  const [input, setInput] = useState('')
  const [choicesExpanded, setChoicesExpanded] = useState(false)
  const [showInventory, setShowInventory] = useState(false)
  const isNearBottom = useRef(true)

  useEffect(() => {
    if (!chatRef.current || !isNearBottom.current) return
    chatRef.current.scrollTop = chatRef.current.scrollHeight
  }, [messages, streamingContent, isTyping])

  const handleScroll = useCallback(() => {
    if (!chatRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = chatRef.current
    isNearBottom.current = scrollHeight - scrollTop - clientHeight < 80
  }, [])

  const handleSend = useCallback((text: string) => {
    const t = text.trim()
    if (!t || isTyping) return
    setInput('')
    setChoicesExpanded(false)
    sendMessage(t)
  }, [isTyping, sendMessage])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend(input)
    }
  }, [input, handleSend])

  const renderMessage = (msg: Message, idx: number) => {
    if (idx === 0 && msg.role === 'system' && !msg.type) return <LetterCard key={msg.id} />
    if (msg.type === 'scene-transition') return <SceneTransitionCard key={msg.id} msg={msg} />
    if (msg.type === 'chapter-change') return <ChapterCard key={msg.id} msg={msg} />
    if (msg.role === 'assistant') return <NpcBubble key={msg.id} msg={msg} />
    if (msg.role === 'user') return <PlayerBubble key={msg.id} msg={msg} />
    if (msg.role === 'system') return <SystemMessage key={msg.id} msg={msg} />
    return null
  }

  const inventoryItems = inventory.map((id) => ITEMS[id]).filter(Boolean)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Chat area */}
      <div className="qt-chat-area" ref={chatRef} onScroll={handleScroll}>
        {messages.map(renderMessage)}
        {isTyping && (
          streamingContent
            ? <StreamingBubble content={streamingContent} />
            : <TypingIndicator />
        )}
      </div>

      {/* Choices panel */}
      {choices.length > 0 && !isTyping && (
        choicesExpanded ? (
          <div className="qt-choices-panel">
            <div className="qt-choices-panel-header" onClick={() => setChoicesExpanded(false)}>
              <div className="qt-choices-panel-title">
                <GameController size={16} /> 行动选项
              </div>
              <CaretDown size={16} />
            </div>
            <div className="qt-choices-grid">
              {choices.map((c, i) => (
                <motion.button
                  key={i}
                  className="qt-choices-card"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => handleSend(c)}
                  disabled={isTyping}
                >
                  <span className="qt-choices-letter">{String.fromCharCode(65 + i)}</span>
                  {c}
                </motion.button>
              ))}
            </div>
          </div>
        ) : (
          <button
            className="qt-choices-bar"
            onClick={() => setChoicesExpanded(true)}
            disabled={isTyping}
          >
            <GameController size={16} />
            展开行动选项
            <span className="qt-choices-count">{choices.length}</span>
            <CaretUp size={14} />
          </button>
        )
      )}

      {/* Quick actions (fallback when no AI choices) */}
      {!isTyping && choices.length === 0 && messages.length > 0 && (
        <div className="qt-quick-grid" style={{ padding: '4px 12px' }}>
          {QUICK_ACTIONS.map((a) => (
            <button
              key={a.label}
              className="qt-quick-btn"
              onClick={() => handleSend(a.label)}
              disabled={isTyping}
            >
              <span className="qt-quick-emoji">{a.emoji}</span>
              <span className="qt-quick-label">{a.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="qt-input-area">
        <button
          className="qt-icon-btn"
          onClick={() => setShowInventory(true)}
          title="背包"
        >
          <Backpack size={20} />
        </button>
        <textarea
          className="qt-input"
          rows={1}
          placeholder="输入你的行动..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isTyping}
        />
        <button
          className="qt-send-btn"
          onClick={() => handleSend(input)}
          disabled={isTyping || !input.trim()}
        >
          <PaperPlaneRight size={18} weight="fill" />
        </button>
      </div>

      {/* Inventory Sheet */}
      <AnimatePresence>
        {showInventory && (
          <motion.div
            className="qt-inventory-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowInventory(false)}
          >
            <motion.div
              className="qt-inventory-sheet"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="qt-inventory-handle" />
              <div className="qt-inventory-header">
                <h3 className="qt-inventory-title">背包</h3>
                <button className="qt-inventory-close" onClick={() => setShowInventory(false)}>
                  <X size={12} />
                </button>
              </div>
              <div className="qt-inventory-grid">
                {inventoryItems.length > 0 ? inventoryItems.map((item) => (
                  <button
                    key={item.id}
                    className="qt-inventory-item"
                    onClick={() => {
                      handleSend(`使用道具：${item.name}`)
                      setShowInventory(false)
                    }}
                  >
                    <span className="qt-inventory-icon">{item.icon}</span>
                    <span className="qt-inventory-name">{item.name}</span>
                  </button>
                )) : (
                  <div className="qt-inventory-empty">背包空空如也</div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
