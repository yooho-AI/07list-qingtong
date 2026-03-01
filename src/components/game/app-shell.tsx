/**
 * [INPUT]: store (activeTab, choices, messages, showDashboard, showRecords, storyRecords), bgm
 * [OUTPUT]: 桌面居中壳 + Header + Tab路由 + 5键TabBar + 三向手势 + 抽屉 + Toast
 * [POS]: components/game 的唯一布局入口，App.tsx GameScreen 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useRef, useState, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Notebook, ChatCircleDots, MapTrifold, Users, Scroll,
  MusicNotes, SpeakerSimpleSlash, List, X,
} from '@phosphor-icons/react'
import {
  useGameStore, getTimeDisplay, getChapterByMonth,
  TIME_SLOT_LABELS, MAX_MONTHS,
} from '../../lib/store'
import { useBgm } from '../../lib/bgm'
import TabDialogue from './tab-dialogue'
import TabScene from './tab-scene'
import TabCharacter from './tab-character'
import DashboardDrawer from './dashboard-drawer'

interface Props {
  onMenuOpen: () => void
}

export default function AppShell({ onMenuOpen }: Props) {
  const {
    activeTab, setActiveTab, showDashboard, toggleDashboard,
    showRecords, toggleRecords, currentMonth, currentTimeSlot,
    storyRecords,
  } = useGameStore()
  const { isPlaying: playing, toggle: toggleBGM } = useBgm()
  const [toast, setToast] = useState('')
  const touchRef = useRef<{ x: number; y: number } | null>(null)

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }, [])

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchRef.current) return
    const dx = e.changedTouches[0].clientX - touchRef.current.x
    const dy = e.changedTouches[0].clientY - touchRef.current.y
    touchRef.current = null
    if (Math.abs(dx) < 60 || Math.abs(dy) > Math.abs(dx) * 1.5) return
    if (dx > 0) toggleDashboard()
    else toggleRecords()
  }, [toggleDashboard, toggleRecords])

  const time = getTimeDisplay(currentMonth)
  const chapter = getChapterByMonth(currentMonth)
  const progress = Math.round((currentMonth / MAX_MONTHS) * 100)

  void setToast // save functionality is in MenuOverlay

  const tabs = [
    { key: 'dashboard' as const, Icon: Notebook, label: '手册' },
    { key: 'dialogue' as const, Icon: ChatCircleDots, label: '对话' },
    { key: 'scene' as const, Icon: MapTrifold, label: '场景' },
    { key: 'character' as const, Icon: Users, label: '人物' },
    { key: 'records' as const, Icon: Scroll, label: '事件' },
  ]

  return (
    <div className="qt-shell">
      {/* Header */}
      <header className="qt-header">
        <div className="qt-header-left">
          <span className="qt-header-badge">
            第{time.year}年{time.monthInYear}月
          </span>
          <span>{TIME_SLOT_LABELS[currentTimeSlot]}</span>
        </div>
        <div className="qt-header-center">
          <span>{chapter.name}·{chapter.subtitle}</span>
        </div>
        <div className="qt-header-right">
          <button
            className={`qt-music-btn ${playing ? 'playing' : ''}`}
            onClick={toggleBGM}
            title="音乐"
          >
            {playing ? <MusicNotes size={18} /> : <SpeakerSimpleSlash size={18} />}
          </button>
          <button className="qt-icon-btn" onClick={onMenuOpen} title="菜单">
            <List size={18} />
          </button>
        </div>
      </header>

      {/* Progress bar */}
      <div className="qt-progress">
        <div className="qt-progress-fill" style={{ width: `${progress}%` }} />
      </div>

      {/* Tab Content */}
      <div
        className="qt-tab-content"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <AnimatePresence mode="wait">
          {activeTab === 'dialogue' && (
            <motion.div key="dialogue" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} style={{ height: '100%' }}>
              <TabDialogue />
            </motion.div>
          )}
          {activeTab === 'scene' && (
            <motion.div key="scene" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} style={{ height: '100%', overflowY: 'auto' }}>
              <TabScene />
            </motion.div>
          )}
          {activeTab === 'character' && (
            <motion.div key="character" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} style={{ height: '100%', overflowY: 'auto' }}>
              <TabCharacter />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* TabBar */}
      <nav className="qt-tab-bar">
        {tabs.map((t) => {
          const isDrawer = t.key === 'dashboard' || t.key === 'records'
          const isActive = isDrawer
            ? (t.key === 'dashboard' ? showDashboard : showRecords)
            : activeTab === t.key
          return (
            <button
              key={t.key}
              className={`qt-tab-item ${isActive ? 'qt-tab-active' : ''}`}
              onClick={() => {
                if (t.key === 'dashboard') toggleDashboard()
                else if (t.key === 'records') toggleRecords()
                else setActiveTab(t.key)
              }}
            >
              <t.Icon size={22} weight={isActive ? 'fill' : 'regular'} />
              <span>{t.label}</span>
            </button>
          )
        })}
      </nav>

      {/* Dashboard Drawer (left) */}
      <AnimatePresence>
        {showDashboard && (
          <>
            <motion.div
              className="qt-dash-overlay"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={toggleDashboard}
            />
            <motion.div
              className="qt-dash-drawer"
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              <DashboardDrawer />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Record Sheet (right) */}
      <AnimatePresence>
        {showRecords && (
          <>
            <motion.div
              className="qt-records-overlay"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={toggleRecords}
            />
            <motion.aside
              className="qt-records-sheet"
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              <div className="qt-records-header">
                <h3 className="qt-records-title">事件记录</h3>
                <button className="qt-records-close" onClick={toggleRecords}><X size={14} /></button>
              </div>
              <div className="qt-records-timeline">
                {[...storyRecords].reverse().map((r) => (
                  <div key={r.id} className="qt-records-item">
                    <div className="qt-records-dot" />
                    <div className="qt-records-body">
                      <div className="qt-records-meta">第{r.month}月 · {r.timeSlot}</div>
                      <div className="qt-records-event-title">{r.title}</div>
                      <div className="qt-records-content">{r.content}</div>
                    </div>
                  </div>
                ))}
                {storyRecords.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                    暂无事件记录
                  </div>
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Toast */}
      {toast && <div className="qt-toast">{toast}</div>}
    </div>
  )
}
