/**
 * [INPUT]: store (gameStarted, endingData, showEndingModal, initGame, resetGame, saveGame, loadGame, hasSave, clearSave), CHARACTERS, STORY_INFO, ENDING_TYPE_MAP
 * [OUTPUT]: 根组件: StartScreen + GameScreen(AppShell) + EndingModal + MenuOverlay
 * [POS]: 根组件，App.tsx → main.tsx 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Play, ArrowRight, FloppyDisk, FolderOpen, Trash, X, ArrowCounterClockwise,
} from '@phosphor-icons/react'
import {
  useGameStore, CHARACTERS, STORY_INFO, ENDING_TYPE_MAP,
} from './lib/store'
import { trackGameStart, trackGameContinue } from './lib/analytics'
import AppShell from './components/game/app-shell'
import './styles/globals.css'
import './styles/opening.css'
import './styles/rich-cards.css'

// ── StartScreen ──────────────────────────────────────

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
                <img
                  className="qt-preview-avatar"
                  src={char.portrait}
                  alt={char.name}
                  style={{ borderColor: char.themeColor }}
                />
                <div className="qt-preview-name">{char.name}</div>
                <div className="qt-preview-role">{char.title.split('/')[0].trim()}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="qt-start-actions">
          <button className="qt-start-btn" onClick={() => { initGame(); trackGameStart() }}>
            <Play size={18} weight="fill" /> 开始游戏
          </button>
          {hasSave() && (
            <button className="qt-continue-btn" onClick={() => { loadGame(); trackGameContinue() }}>
              <ArrowRight size={16} /> 继续游戏
            </button>
          )}
        </div>

        <p className="qt-tip">基于 AI 的历史生存模拟 · 每次游戏体验独一无二</p>
      </div>
    </div>
  )
}

// ── EndingModal ──────────────────────────────────────

function EndingModal() {
  const endingData = useGameStore((s) => s.endingData)
  const showEndingModal = useGameStore((s) => s.showEndingModal)
  const resetGame = useGameStore((s) => s.resetGame)

  if (!showEndingModal || !endingData) return null

  const typeInfo = ENDING_TYPE_MAP[endingData.type] || ENDING_TYPE_MAP.NE

  return (
    <div className="qt-overlay">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="qt-ending-modal"
        style={{ background: typeInfo.gradient }}
      >
        <div className="qt-ending-badge">{typeInfo.label}</div>
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
          <button
            className="qt-ending-btn"
            onClick={() => useGameStore.setState({ showEndingModal: false })}
          >
            继续探索
          </button>
          <button
            className="qt-ending-btn primary"
            onClick={() => resetGame()}
          >
            <ArrowCounterClockwise size={16} /> 返回标题
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ── MenuOverlay ──────────────────────────────────────

function MenuOverlay({ onClose }: { onClose: () => void }) {
  const saveGame = useGameStore((s) => s.saveGame)
  const loadGame = useGameStore((s) => s.loadGame)
  const resetGame = useGameStore((s) => s.resetGame)
  const hasSave = useGameStore((s) => s.hasSave)

  return (
    <motion.div
      className="qt-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="qt-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 340 }}
      >
        <h2 className="qt-modal-title">游戏菜单</h2>
        <div className="qt-modal-btns">
          <button className="qt-modal-btn" onClick={() => { saveGame(); onClose() }}>
            <FloppyDisk size={18} /> 保存游戏
          </button>
          {hasSave() && (
            <button className="qt-modal-btn" onClick={() => { loadGame(); onClose() }}>
              <FolderOpen size={18} /> 读取存档
            </button>
          )}
          <button className="qt-modal-btn" onClick={() => resetGame()}>
            <Trash size={18} /> 返回标题
          </button>
          <button className="qt-modal-btn" onClick={onClose}>
            <X size={18} /> 继续游戏
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Root App ─────────────────────────────────────────

export default function App() {
  const gameStarted = useGameStore((s) => s.gameStarted)
  const [showMenu, setShowMenu] = useState(false)

  return (
    <AnimatePresence mode="wait">
      {!gameStarted ? (
        <motion.div
          key="start"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <StartScreen />
        </motion.div>
      ) : (
        <motion.div
          key="game"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{ height: '100dvh' }}
        >
          <AppShell onMenuOpen={() => setShowMenu(true)} />
          <EndingModal />
          <AnimatePresence>
            {showMenu && <MenuOverlay onClose={() => setShowMenu(false)} />}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
