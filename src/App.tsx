/**
 * [INPUT]: 依赖 @/lib/store, @/lib/data, @/lib/bgm, @/lib/hooks, framer-motion
 * [OUTPUT]: 对外提供 App 根组件（StartScreen ↔ GameScreen 状态机）
 * [POS]: 根组件，启动画面 + PC游戏画面 + 结局弹窗
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '@/lib/store'
import { CHARACTERS, STORY_INFO, getTimeDisplay, TIME_SLOT_LABELS } from '@/lib/data'
import { useIsMobile } from '@/lib/hooks'
import { useBgm } from '@/lib/bgm'
import LeftPanel from '@/components/game/character-panel'
import DialoguePanel from '@/components/game/dialogue-panel'
import RightPanel from '@/components/game/side-panel'
import MobileGameLayout from '@/components/game/mobile-layout'
import { useState } from 'react'

// ============================================================
// 开始画面
// ============================================================

function StartScreen() {
  const initGame = useGameStore((s) => s.initGame)
  const loadGame = useGameStore((s) => s.loadGame)
  const hasSave = useGameStore((s) => s.hasSave)

  return (
    <div className="qt-start">
      <div className="qt-start-bg">
        <div className="qt-columns" />
        <div className="qt-fog" />
      </div>

      <div className="qt-start-content">
        <div className="qt-title-section">
          <div className="qt-era-badge">{STORY_INFO.era}</div>
          <h1 className="qt-game-title">{STORY_INFO.title}</h1>
          <p className="qt-game-subtitle">{STORY_INFO.subtitle}</p>
          <p className="qt-game-desc">{STORY_INFO.description}</p>
        </div>

        <div className="qt-char-preview">
          <div className="qt-preview-grid">
            {Object.values(CHARACTERS).map((char) => (
              <div key={char.id} className="qt-preview-card">
                <div className="qt-preview-avatar" style={{ borderColor: char.themeColor }}>
                  {char.avatar}
                </div>
                <div className="qt-preview-name">{char.name}</div>
                <div className="qt-preview-role">{char.title.split('/')[0].trim()}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="qt-start-actions">
          <button className="qt-start-btn" onClick={() => initGame()}>
            🏛️ 开始游戏
          </button>
          {hasSave() && (
            <button className="qt-continue-btn" onClick={() => loadGame()}>
              继续游戏
            </button>
          )}
        </div>

        <p className="qt-tip">基于 AI 的历史生存模拟 · 每次游戏体验独一无二</p>
      </div>
    </div>
  )
}

// ============================================================
// 顶部栏
// ============================================================

function HeaderBar({ onMenuClick }: { onMenuClick: () => void }) {
  const currentMonth = useGameStore((s) => s.currentMonth)
  const currentTimeSlot = useGameStore((s) => s.currentTimeSlot)
  const { isPlaying, toggle } = useBgm()

  const time = getTimeDisplay(currentMonth)

  return (
    <header className="qt-header">
      <div className="qt-logo">🏛️ 青铜之笼</div>
      <div className="qt-time-bar">
        <span>第{time.year}年</span>
        <span>·</span>
        <span>第{time.monthInYear}月</span>
        <span>·</span>
        <span>{TIME_SLOT_LABELS[currentTimeSlot]}</span>
        <span>·</span>
        <span>{time.age}岁</span>
        <span>·</span>
        <span style={{ color: time.remaining <= 12 ? '#ef4444' : 'inherit' }}>
          距17岁还有{time.remaining}月
        </span>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={(e) => toggle(e)}
          className="qt-menu-btn"
        >
          {isPlaying ? '🔊' : '🔇'}
        </button>
        <button className="qt-menu-btn" onClick={onMenuClick}>☰</button>
      </div>
    </header>
  )
}

// ============================================================
// 游戏主画面（PC）
// ============================================================

function GameScreen() {
  const [showMenu, setShowMenu] = useState(false)
  const resetGame = useGameStore((s) => s.resetGame)
  const saveGame = useGameStore((s) => s.saveGame)
  const showEndingModal = useGameStore((s) => s.showEndingModal)
  const endingData = useGameStore((s) => s.endingData)
  const initGame = useGameStore((s) => s.initGame)

  return (
    <div className="qt-game">
      <HeaderBar onMenuClick={() => setShowMenu(true)} />
      <main className="qt-main">
        <div className="qt-left"><LeftPanel /></div>
        <div className="qt-center"><DialoguePanel /></div>
        <div className="qt-right"><RightPanel /></div>
      </main>

      {/* 菜单弹窗 */}
      <AnimatePresence>
        {showMenu && (
          <div className="qt-overlay" onClick={() => setShowMenu(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="qt-modal" onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: 340 }}
            >
              <h2 className="qt-modal-title">🏛️ 游戏菜单</h2>
              <div className="qt-modal-btns">
                <button className="qt-modal-btn" onClick={() => { saveGame(); setShowMenu(false) }}>💾 保存游戏</button>
                <button className="qt-modal-btn" onClick={() => resetGame()}>🏠 返回标题</button>
                <button className="qt-modal-btn" onClick={() => window.open('https://yooho.ai/', '_blank')}>🌐 返回主页</button>
                <button className="qt-modal-btn" onClick={() => setShowMenu(false)}>▶️ 继续游戏</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 结局弹窗 */}
      <AnimatePresence>
        {showEndingModal && endingData && (
          <div className="qt-overlay">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className={`qt-modal qt-ending-modal ${endingData.type}`}
            >
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

// ============================================================
// 根组件
// ============================================================

export default function App() {
  const gameStarted = useGameStore((s) => s.gameStarted)
  const isMobile = useIsMobile()

  return (
    <AnimatePresence mode="wait">
      {!gameStarted ? (
        <motion.div key="start" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <StartScreen />
        </motion.div>
      ) : isMobile ? (
        <motion.div key="mobile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ height: '100vh' }}>
          <MobileGameLayout />
        </motion.div>
      ) : (
        <motion.div key="game" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ height: '100vh' }}>
          <GameScreen />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
