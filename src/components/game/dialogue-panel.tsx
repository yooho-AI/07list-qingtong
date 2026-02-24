/**
 * [INPUT]: 依赖 @/lib/store, @/lib/parser, @/lib/data, framer-motion
 * [OUTPUT]: 对外提供 DialoguePanel 组件
 * [POS]: components/game 的中间对话面板，快捷操作 + 时间显示
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useState, useRef, useEffect, type FormEvent } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useGameStore } from '@/lib/store'
import { parseStoryParagraph } from '@/lib/parser'
import { CHARACTERS, SCENES, STORY_INFO, getTimeDisplay, TIME_SLOT_LABELS } from '@/lib/data'
import HighlightModal from './highlight-modal'

// ============================================================
// 信笺卡片
// ============================================================

function LetterCard() {
  return (
    <div className="qt-letter-card">
      <div className="qt-letter-seal">🏛️</div>
      <div className="qt-letter-genre">{STORY_INFO.genre}</div>
      <h2 className="qt-letter-title">{STORY_INFO.title}</h2>
      <p className="qt-letter-subtitle">{STORY_INFO.subtitle}</p>
      <p className="qt-letter-body">{STORY_INFO.description}</p>
      <div className="qt-letter-goals">
        <div className="qt-letter-goals-label">— 生存目标 —</div>
        {STORY_INFO.goals.map((goal, i) => (
          <div key={i} className="qt-letter-goal">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 12l2 2 4-4" /><circle cx="12" cy="12" r="10" /></svg>
            <span>{goal}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================
// 对话面板
// ============================================================

export default function DialoguePanel() {
  const [input, setInput] = useState('')
  const [showHighlight, setShowHighlight] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const isNearBottomRef = useRef(true)

  const messages = useGameStore((s) => s.messages)
  const isTyping = useGameStore((s) => s.isTyping)
  const streamingContent = useGameStore((s) => s.streamingContent)
  const currentScene = useGameStore((s) => s.currentScene)
  const currentCharacter = useGameStore((s) => s.currentCharacter)
  const currentMonth = useGameStore((s) => s.currentMonth)
  const currentTimeSlot = useGameStore((s) => s.currentTimeSlot)
  const sendMessage = useGameStore((s) => s.sendMessage)
  const addSystemMessage = useGameStore((s) => s.addSystemMessage)
  const advanceMonth = useGameStore((s) => s.advanceMonth)

  const scene = SCENES[currentScene]
  const char = currentCharacter ? CHARACTERS[currentCharacter] : null
  const time = getTimeDisplay(currentMonth)
  const canHighlight = messages.filter((m) => m.role !== 'system').length >= 5

  useEffect(() => {
    const c = scrollRef.current
    if (c && isNearBottomRef.current) c.scrollTop = c.scrollHeight
  }, [messages, isTyping, streamingContent])

  useEffect(() => {
    const c = scrollRef.current
    if (!c) return
    const onScroll = () => { isNearBottomRef.current = c.scrollHeight - c.scrollTop - c.clientHeight < 100 }
    c.addEventListener('scroll', onScroll)
    return () => c.removeEventListener('scroll', onScroll)
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isTyping) return
    const text = input.trim()
    setInput('')
    await sendMessage(text)
  }

  const handleQuickAction = async (action: string) => {
    if (isTyping) return
    if (action === 'talk') {
      if (!currentCharacter) { addSystemMessage('请先选择一个角色'); return }
      await sendMessage(`与${char?.name}交谈，了解对方的想法`)
    } else if (action === 'explore') {
      const areas = scene?.searchableAreas || []
      const area = areas[Math.floor(Math.random() * areas.length)]
      await sendMessage(area ? `探索${scene?.name}的${area}` : `仔细观察${scene?.name}的环境`)
    } else if (action === 'item') {
      addSystemMessage('📦 请在右侧面板查看道具列表')
    } else if (action === 'advance') {
      advanceMonth()
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      {/* 背景 */}
      {scene?.backgroundImage && (
        <div className="qt-dialogue-bg">
          <img src={scene.backgroundImage} alt={scene.name} />
          <div className="qt-dialogue-bg-overlay" />
        </div>
      )}

      {/* 消息区 */}
      <div ref={scrollRef} className="qt-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', position: 'relative', zIndex: 1 }}>
        {messages.length === 0 && <LetterCard />}

        {messages.map((msg) => {
          if (msg.role === 'user') {
            return (
              <div key={msg.id} style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                <div className="qt-player-bubble">{msg.content}</div>
              </div>
            )
          }
          if (msg.role === 'system') {
            return <div key={msg.id} className="qt-system-msg">{msg.content}</div>
          }
          const { narrative, statHtml } = parseStoryParagraph(msg.content)
          return (
            <div key={msg.id} style={{ marginBottom: 16 }}>
              <div className="qt-story-paragraph" dangerouslySetInnerHTML={{ __html: narrative }} />
              {statHtml && <div dangerouslySetInnerHTML={{ __html: statHtml }} />}
            </div>
          )
        })}

        {isTyping && streamingContent && (() => {
          const { narrative, statHtml } = parseStoryParagraph(streamingContent)
          return (
            <div style={{ marginBottom: 16 }}>
              <div className="qt-story-paragraph" dangerouslySetInnerHTML={{ __html: narrative }} />
              {statHtml && <div dangerouslySetInnerHTML={{ __html: statHtml }} />}
            </div>
          )
        })()}

        {isTyping && !streamingContent && (
          <div style={{ marginBottom: 16 }}>
            <div className="qt-story-paragraph" style={{ display: 'flex', gap: 4, padding: '16px 20px' }}>
              <span className="qt-typing-dot" /><span className="qt-typing-dot" /><span className="qt-typing-dot" />
            </div>
          </div>
        )}
      </div>

      {/* 输入区 */}
      <div style={{ padding: '12px 24px', borderTop: '1px solid var(--border)', position: 'relative', zIndex: 1, background: 'rgba(26, 22, 18, 0.9)' }}>
        {/* 时间 + 快捷操作 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            第{time.year}年 · 第{time.monthInYear}月 · {TIME_SLOT_LABELS[currentTimeSlot]} · {time.age}岁 · 距17岁还有{time.remaining}月
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
          <button className="qt-quick-btn" onClick={() => handleQuickAction('talk')} disabled={isTyping || !currentCharacter}>
            🏛️ 对话
          </button>
          <button className="qt-quick-btn" onClick={() => handleQuickAction('explore')} disabled={isTyping}>
            🔍 探索
          </button>
          <button className="qt-quick-btn" onClick={() => handleQuickAction('item')} disabled={isTyping}>
            📦 道具
          </button>
          <button className="qt-quick-btn" onClick={() => handleQuickAction('advance')} disabled={isTyping}>
            ⏭️ 推进时间
          </button>
          {canHighlight && (
            <button className="qt-quick-btn" onClick={() => setShowHighlight(true)}>
              ✨ 高光
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 10 }}>
          <input
            type="text" className="qt-input" value={input} onChange={(e) => setInput(e.target.value)}
            placeholder={char ? `对${char.name}说...` : '描述你的行动...'} disabled={isTyping}
          />
          <button type="submit" className="qt-send-btn" disabled={isTyping || !input.trim()}>发送</button>
        </form>
      </div>

      <AnimatePresence>{showHighlight && <HighlightModal onClose={() => setShowHighlight(false)} />}</AnimatePresence>
    </div>
  )
}
