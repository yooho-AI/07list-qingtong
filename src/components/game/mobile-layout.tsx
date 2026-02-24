/**
 * [INPUT]: 依赖 @/lib/store, @/lib/parser, @/lib/data, @/lib/bgm, framer-motion
 * [OUTPUT]: 对外提供 MobileGameLayout 组件
 * [POS]: components/game 的移动端完整布局，被 App.tsx 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useState, useRef, useEffect, useCallback, type FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '@/lib/store'
import { parseStoryParagraph } from '@/lib/parser'
import { CHARACTERS, SCENES, ITEMS, EVENTS, STORY_INFO, getTimeDisplay } from '@/lib/data'
import { useBgm } from '@/lib/bgm'
import HighlightModal from './highlight-modal'

// ============================================================
// 移动端顶栏
// ============================================================

function MobileHeader({ onCharClick, onMenuClick }: { onCharClick: () => void; onMenuClick: () => void }) {
  const currentScene = useGameStore((s) => s.currentScene)
  const currentCharacter = useGameStore((s) => s.currentCharacter)
  const currentMonth = useGameStore((s) => s.currentMonth)
  const { isPlaying, toggle } = useBgm()

  const scene = SCENES[currentScene]
  const char = currentCharacter ? CHARACTERS[currentCharacter] : null
  const time = getTimeDisplay(currentMonth)

  return (
    <header className="mobile-header">
      <div className="mobile-header-left">
        <span className="mobile-header-stage">🏛️</span>
        <span className="mobile-header-scene">{scene?.icon} {scene?.name}</span>
        <span className="mobile-header-scene" style={{ color: '#CD7F32' }}>{time.age}岁</span>
        <span className="mobile-header-scene" style={{ color: time.remaining <= 12 ? '#ef4444' : '#a09078' }}>余{time.remaining}月</span>
        <button
          onClick={(e) => toggle(e)}
          style={{ background: 'rgba(205,127,50,0.1)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 14, cursor: 'pointer', padding: '4px 10px' }}
        >
          {isPlaying ? '🔊' : '🔇'}
        </button>
      </div>
      <div className="mobile-header-right">
        <button className="mobile-header-npc" onClick={onCharClick}>
          {char ? (
            <span style={{ color: char.themeColor, display: 'flex', alignItems: 'center', gap: 4 }}>
              <img src={char.portraitImage} alt={char.name} style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover' }} />
              {char.name}
            </span>
          ) : <span style={{ color: 'var(--text-muted)' }}>选择角色</span>}
          <span className="mobile-header-arrow">▼</span>
        </button>
        <button className="mobile-header-menu" onClick={onMenuClick}>☰</button>
      </div>
    </header>
  )
}

// ============================================================
// 移动端信笺
// ============================================================

function MobileLetterCard() {
  return (
    <div className="mobile-letter-card">
      <div className="mobile-letter-icon">🏛️</div>
      <div className="mobile-letter-genre">{STORY_INFO.genre}</div>
      <h2 className="mobile-letter-title">{STORY_INFO.title}</h2>
      <p className="mobile-letter-body">{STORY_INFO.description}</p>
    </div>
  )
}

// ============================================================
// 移动端对话区
// ============================================================

function MobileDialogue() {
  const messages = useGameStore((s) => s.messages)
  const isTyping = useGameStore((s) => s.isTyping)
  const streamingContent = useGameStore((s) => s.streamingContent)
  const scrollRef = useRef<HTMLDivElement>(null)
  const isNearBottomRef = useRef(true)

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

  return (
    <div ref={scrollRef} className="mobile-dialogue qt-scrollbar">
      {messages.length === 0 && <MobileLetterCard />}

      {messages.map((msg) => {
        if (msg.role === 'user') return <div key={msg.id} className="mobile-msg-user"><div className="mobile-bubble-user">{msg.content}</div></div>
        if (msg.role === 'system') return <div key={msg.id} className="mobile-msg-system">{msg.content}</div>
        const { narrative, statHtml } = parseStoryParagraph(msg.content)
        return (
          <div key={msg.id}>
            <div className="mobile-msg-ai"><div className="mobile-bubble-ai" dangerouslySetInnerHTML={{ __html: narrative }} /></div>
            {statHtml && <div dangerouslySetInnerHTML={{ __html: statHtml }} />}
          </div>
        )
      })}

      {isTyping && streamingContent && (() => {
        const { narrative, statHtml } = parseStoryParagraph(streamingContent)
        return (
          <div>
            <div className="mobile-msg-ai"><div className="mobile-bubble-ai" dangerouslySetInnerHTML={{ __html: narrative }} /></div>
            {statHtml && <div dangerouslySetInnerHTML={{ __html: statHtml }} />}
          </div>
        )
      })()}

      {isTyping && !streamingContent && (
        <div className="mobile-msg-ai">
          <div className="mobile-bubble-ai mobile-typing">
            <span className="mobile-typing-dot" /><span className="mobile-typing-dot" /><span className="mobile-typing-dot" />
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// 移动端输入栏
// ============================================================

function MobileInputBar({ onInventoryClick, onQuickAction }: { onInventoryClick: () => void; onQuickAction: (a: string) => void }) {
  const [input, setInput] = useState('')
  const [showHighlight, setShowHighlight] = useState(false)
  const messages = useGameStore((s) => s.messages)
  const isTyping = useGameStore((s) => s.isTyping)
  const sendMessage = useGameStore((s) => s.sendMessage)
  const currentCharacter = useGameStore((s) => s.currentCharacter)
  const inventory = useGameStore((s) => s.inventory)

  const char = currentCharacter ? CHARACTERS[currentCharacter] : null
  const canHighlight = messages.filter((m) => m.role !== 'system').length >= 5

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isTyping) return
    const text = input.trim()
    setInput('')
    await sendMessage(text)
  }

  return (
    <div className="mobile-input-bar" style={{ flexDirection: 'column', gap: 0 }}>
      {/* 快捷操作 */}
      <div className="flex gap-2 overflow-x-auto px-3 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
        <button className="shrink-0 rounded-full border px-3 py-1 text-xs" style={{ borderColor: '#CD7F32', color: '#CD7F32', background: 'var(--bg-primary)' }} onClick={() => onQuickAction('talk')} disabled={isTyping || !currentCharacter}>
          🏛️ 对话
        </button>
        <button className="shrink-0 rounded-full border px-3 py-1 text-xs" style={{ borderColor: '#059669', color: '#059669', background: 'var(--bg-primary)' }} onClick={() => onQuickAction('explore')} disabled={isTyping}>
          🔍 探索
        </button>
        <button className="shrink-0 rounded-full border px-3 py-1 text-xs" style={{ borderColor: '#f59e0b', color: '#f59e0b', background: 'var(--bg-primary)' }} onClick={() => onQuickAction('advance')} disabled={isTyping}>
          ⏭️ 推进
        </button>
        {canHighlight && (
          <button className="shrink-0 rounded-full border px-3 py-1 text-xs" style={{ borderColor: '#a855f7', color: '#a855f7', background: 'var(--bg-primary)' }} onClick={() => setShowHighlight(true)}>
            ✨ 高光
          </button>
        )}
      </div>

      <AnimatePresence>{showHighlight && <HighlightModal onClose={() => setShowHighlight(false)} />}</AnimatePresence>

      <div className="flex items-center gap-2 px-3 py-2">
        <button className="mobile-inventory-btn" onClick={onInventoryClick}>
          📦{inventory.length > 0 && <span className="mobile-inventory-badge">{inventory.length}</span>}
        </button>
        <form onSubmit={handleSubmit} className="mobile-input-form">
          <input
            type="text" className="mobile-input" value={input} onChange={(e) => setInput(e.target.value)}
            placeholder={char ? `对${char.name}说...` : '描述你的行动...'} disabled={isTyping}
          />
          <button type="submit" className="mobile-send-btn" disabled={isTyping || !input.trim()}>发送</button>
        </form>
      </div>
    </div>
  )
}

// ============================================================
// 角色选择面板
// ============================================================

function CharacterSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const currentCharacter = useGameStore((s) => s.currentCharacter)
  const npcStats = useGameStore((s) => s.npcStats)
  const selectCharacter = useGameStore((s) => s.selectCharacter)
  const unlockedCharacters = useGameStore((s) => s.unlockedCharacters)

  const handleSelect = (id: string) => {
    if (!unlockedCharacters.includes(id)) return
    selectCharacter(currentCharacter === id ? null : id)
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="mobile-sheet-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div className="mobile-sheet" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 300 }}>
            <div className="mobile-sheet-handle" />
            <div className="mobile-sheet-title">选择角色</div>
            <div className="mobile-char-grid">
              {Object.values(CHARACTERS).map((char) => {
                const isSelected = currentCharacter === char.id
                const isLocked = !unlockedCharacters.includes(char.id)
                const stats = npcStats[char.id]
                return (
                  <button key={char.id} className={`mobile-char-card ${isSelected ? 'selected' : ''} ${isLocked ? 'locked' : ''}`} style={{ borderColor: isSelected ? char.themeColor : 'transparent' }} onClick={() => handleSelect(char.id)} disabled={isLocked}>
                    {isLocked ? (
                      <span style={{ fontSize: 28 }}>🔒</span>
                    ) : (
                      <img src={char.portraitImage} alt={char.name} style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }} />
                    )}
                    <span className="mobile-char-name" style={{ color: isLocked ? 'var(--text-muted)' : char.themeColor }}>{isLocked ? '???' : char.name}</span>
                    {!isLocked && stats && (
                      <div className="mobile-char-stats">
                        {char.stats.slice(0, 2).map((s) => (
                          <span key={s.key}>{s.label.slice(0, 2)}{stats[s.key] ?? 0}</span>
                        ))}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ============================================================
// 道具/事件面板
// ============================================================

function InventorySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<'items' | 'events'>('items')
  const inventory = useGameStore((s) => s.inventory)
  const triggeredEvents = useGameStore((s) => s.triggeredEvents)

  const items = inventory.map((id) => ITEMS[id]).filter(Boolean)
  const events = triggeredEvents.map((id) => EVENTS[id]).filter(Boolean)

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="mobile-sheet-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div className="mobile-sheet" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 300 }}>
            <div className="mobile-sheet-handle" />
            <div className="mobile-sheet-title">背包</div>
            <div style={{ display: 'flex', gap: 8, padding: '0 16px 8px' }}>
              <button className={`qt-tab-btn ${tab === 'items' ? 'active' : ''}`} onClick={() => setTab('items')}>📦 道具 ({items.length})</button>
              <button className={`qt-tab-btn ${tab === 'events' ? 'active' : ''}`} onClick={() => setTab('events')}>📜 事件 ({events.length})</button>
            </div>
            <div className="qt-scrollbar" style={{ maxHeight: '50vh', overflowY: 'auto', padding: '0 16px 16px' }}>
              {tab === 'items' ? (
                items.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {items.map((item) => (
                      <div key={item.id} className="qt-item-entry">
                        <span className="qt-item-icon">{item.icon}</span>
                        <div className="qt-item-info">
                          <span className="qt-item-name">{item.name}</span>
                          <span className="qt-item-desc">{item.description}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="qt-placeholder" style={{ height: 120 }}>
                    <span style={{ fontSize: 32, opacity: 0.5 }}>📦</span>
                    <span className="qt-placeholder-text">背包为空</span>
                  </div>
                )
              ) : events.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {events.map((evt) => (
                    <div key={evt.id} className="qt-event-entry">
                      <span className="qt-item-icon">📜</span>
                      <div className="qt-item-info">
                        <span className="qt-item-name">{evt.name}</span>
                        <span className="qt-item-desc">{evt.description}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="qt-placeholder" style={{ height: 120 }}>
                  <span style={{ fontSize: 32, opacity: 0.5 }}>📜</span>
                  <span className="qt-placeholder-text">尚无事件记录</span>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ============================================================
// 场景选择面板
// ============================================================

function SceneSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const currentScene = useGameStore((s) => s.currentScene)
  const selectScene = useGameStore((s) => s.selectScene)
  const unlockedScenes = useGameStore((s) => s.unlockedScenes)

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="mobile-sheet-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div className="mobile-sheet" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 300 }}>
            <div className="mobile-sheet-handle" />
            <div className="mobile-sheet-title">选择场景</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '0 16px 16px' }}>
              {Object.values(SCENES).map((s) => {
                const isLocked = !unlockedScenes.includes(s.id)
                return (
                  <button
                    key={s.id}
                    className={`mobile-char-card ${currentScene === s.id ? 'selected' : ''} ${isLocked ? 'locked' : ''}`}
                    style={{ borderColor: currentScene === s.id ? '#CD7F32' : 'transparent' }}
                    onClick={() => { if (!isLocked) { selectScene(s.id); onClose() } }}
                    disabled={isLocked}
                  >
                    <span style={{ fontSize: 24 }}>{s.icon}</span>
                    <span className="mobile-char-name">{isLocked ? '🔒' : s.name}</span>
                  </button>
                )
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ============================================================
// 移动端菜单
// ============================================================

function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const resetGame = useGameStore((s) => s.resetGame)
  const saveGame = useGameStore((s) => s.saveGame)

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="mobile-sheet-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div className="mobile-menu" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
            <div className="mobile-menu-title">游戏菜单</div>
            <button className="mobile-menu-btn" onClick={() => { saveGame(); onClose() }}>💾 保存游戏</button>
            <button className="mobile-menu-btn" onClick={() => resetGame()}>🏠 返回标题</button>
            <button className="mobile-menu-btn" onClick={onClose}>▶️ 继续游戏</button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ============================================================
// 移动端游戏主布局
// ============================================================

export default function MobileGameLayout() {
  const [showChar, setShowChar] = useState(false)
  const [showInventory, setShowInventory] = useState(false)
  const [showScene, setShowScene] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  const currentScene = useGameStore((s) => s.currentScene)
  const currentCharacter = useGameStore((s) => s.currentCharacter)
  const sendMessage = useGameStore((s) => s.sendMessage)
  const advanceMonth = useGameStore((s) => s.advanceMonth)
  const showEndingModal = useGameStore((s) => s.showEndingModal)
  const endingData = useGameStore((s) => s.endingData)
  const initGame = useGameStore((s) => s.initGame)

  const scene = SCENES[currentScene]

  const handleQuickAction = useCallback(async (action: string) => {
    if (action === 'talk' && currentCharacter) {
      const charName = CHARACTERS[currentCharacter]?.name
      await sendMessage(`与${charName}交谈，了解对方的想法`)
    } else if (action === 'explore') {
      const areas = scene?.searchableAreas || []
      const area = areas[Math.floor(Math.random() * areas.length)]
      await sendMessage(area ? `探索${scene?.name}的${area}` : `仔细观察周围的环境`)
    } else if (action === 'advance') {
      advanceMonth()
    }
  }, [currentCharacter, sendMessage, scene, advanceMonth])

  return (
    <div className="mobile-game" style={{ position: 'relative' }}>
      {/* 场景背景 */}
      {scene?.backgroundImage && (
        <img src={scene.backgroundImage} alt={scene.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0, pointerEvents: 'none' }} />
      )}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(15, 13, 10, 0.65)', zIndex: 0, pointerEvents: 'none' }} />

      <MobileHeader onCharClick={() => setShowChar(true)} onMenuClick={() => setShowMenu(true)} />
      <MobileDialogue />
      <MobileInputBar onInventoryClick={() => setShowInventory(true)} onQuickAction={handleQuickAction} />

      <CharacterSheet open={showChar} onClose={() => setShowChar(false)} />
      <InventorySheet open={showInventory} onClose={() => setShowInventory(false)} />
      <SceneSheet open={showScene} onClose={() => setShowScene(false)} />
      <MobileMenu open={showMenu} onClose={() => setShowMenu(false)} />

      {/* 结局弹窗 */}
      <AnimatePresence>
        {showEndingModal && endingData && (
          <div className="qt-overlay">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className={`qt-modal qt-ending-modal ${endingData.type}`}>
              <div className="qt-ending-badge">
                {endingData.type === 'TE' ? '🌟 真结局' : endingData.type === 'HE' ? '🕊️ 好结局' : endingData.type === 'BE' ? '🔥 坏结局' : '⚖️ 中性结局'}
              </div>
              <h2 className="qt-ending-title">{endingData.name}</h2>
              <p className="qt-ending-desc">{endingData.description}</p>
              {endingData.epilogue && endingData.epilogue !== '……' && (
                <div className="qt-ending-epilogue">
                  <div style={{ fontSize: 11, color: 'var(--primary)', marginBottom: 8 }}>后日谈</div>
                  {endingData.epilogue}
                </div>
              )}
              <p className="qt-ending-evaluation">{endingData.evaluation}</p>
              <div className="qt-ending-actions">
                <button className="qt-ending-btn primary" onClick={() => initGame()}>🔄 重新开始</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
