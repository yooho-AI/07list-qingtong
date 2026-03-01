/**
 * [INPUT]: store (currentMonth, currentTimeSlot, currentChapter, playerStats, npcStats, unlockedCharacters, unlockedScenes, inventory, currentScene, currentCharacter)
 * [OUTPUT]: 信息手册（左抽屉）：扉页 + 角色轮播 + 场景缩略图 + 目标 + 道具格 + 属性 + 音乐
 * [POS]: components/game 左抽屉组件，app-shell.tsx 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useState, useEffect } from 'react'
import { Reorder, useDragControls } from 'framer-motion'
import { DotsSixVertical, Play, Pause } from '@phosphor-icons/react'
import {
  useGameStore, CHARACTERS, SCENES, ITEMS, PLAYER_STATS,
  getTimeDisplay, getChapterByMonth, TIME_SLOT_LABELS,
} from '../../lib/store'
import { useBgm } from '../../lib/bgm'

const STORAGE_KEY = 'qt-dash-order'
const DEFAULT_ORDER = ['characters', 'scenes', 'objectives', 'items', 'stats', 'music']

function loadOrder(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* fallback */ }
  return DEFAULT_ORDER
}

// ── Draggable section wrapper ───────────────────────

function DragSection({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  const controls = useDragControls()
  return (
    <Reorder.Item value={id} dragListener={false} dragControls={controls}>
      <div className="qt-dash-section">
        <div className="qt-dash-section-header">
          <div className="qt-dash-section-title">{title}</div>
          <div className="qt-dash-grip" onPointerDown={(e) => controls.start(e)}>
            <DotsSixVertical size={14} />
          </div>
        </div>
        {children}
      </div>
    </Reorder.Item>
  )
}

// ── Main component ──────────────────────────────────

export default function DashboardDrawer() {
  const {
    currentMonth, currentTimeSlot, playerStats, npcStats,
    unlockedCharacters, unlockedScenes, inventory, currentScene,
    currentCharacter, selectCharacter, selectScene, setActiveTab,
  } = useGameStore()
  const { isPlaying: playing, toggle: toggleBGM } = useBgm()
  const [order, setOrder] = useState(loadOrder)

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(order)) } catch { /* skip */ }
  }, [order])

  const time = getTimeDisplay(currentMonth)
  const chapter = getChapterByMonth(currentMonth)
  const chars = unlockedCharacters.map((id) => CHARACTERS[id]).filter(Boolean)

  const renderSection = (id: string) => {
    switch (id) {
      case 'characters':
        return (
          <DragSection key={id} id={id} title="人物">
            <div className="qt-dash-char-scroll">
              {chars.map((c) => {
                const stats = npcStats[c.id] || {}
                const mainStat = c.stats[0]
                const mainVal = mainStat ? (stats[mainStat.key] ?? 0) : 0
                return (
                  <button
                    key={c.id}
                    className={`qt-dash-char-card ${c.id === currentCharacter ? 'active' : ''}`}
                    onClick={() => { selectCharacter(c.id); setActiveTab('dialogue') }}
                  >
                    <img className="qt-dash-char-portrait" src={c.portrait} alt={c.name} />
                    <div className="qt-dash-char-name">{c.name}</div>
                    {mainStat && <div className="qt-dash-char-stat">{mainStat.label} {mainVal}</div>}
                  </button>
                )
              })}
            </div>
          </DragSection>
        )

      case 'scenes':
        return (
          <DragSection key={id} id={id} title="场景">
            <div className="qt-dash-scene-scroll">
              {Object.values(SCENES).map((s) => {
                const unlocked = unlockedScenes.includes(s.id)
                const isCurrent = s.id === currentScene
                return (
                  <button
                    key={s.id}
                    className={`qt-dash-scene-thumb ${isCurrent ? 'qt-dash-scene-active' : ''} ${!unlocked ? 'qt-dash-scene-locked' : ''}`}
                    onClick={() => { if (unlocked) { selectScene(s.id); setActiveTab('dialogue') } }}
                    disabled={!unlocked}
                  >
                    <img src={s.background} alt={s.name} />
                    <div className="qt-dash-scene-label">{s.name}</div>
                  </button>
                )
              })}
            </div>
          </DragSection>
        )

      case 'objectives':
        return (
          <DragSection key={id} id={id} title="目标">
            <div className="qt-dash-objectives">
              <div className="qt-dash-objective">
                <span className="qt-dash-objective-icon">◆</span>
                <span>{chapter.mainGoal}</span>
              </div>
              {chapter.sideGoal && (
                <div className="qt-dash-objective">
                  <span className="qt-dash-objective-icon">◇</span>
                  <span>{chapter.sideGoal}</span>
                </div>
              )}
            </div>
          </DragSection>
        )

      case 'items':
        return (
          <DragSection key={id} id={id} title="道具">
            {inventory.length > 0 ? (
              <div className="qt-dash-item-grid">
                {inventory.map((itemId) => {
                  const item = ITEMS[itemId]
                  if (!item) return null
                  return (
                    <div key={itemId} className="qt-dash-item-cell">
                      <span style={{ fontSize: 24 }}>{item.icon}</span>
                      <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{item.name}</span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="qt-dash-empty">暂无道具</div>
            )}
          </DragSection>
        )

      case 'stats':
        return (
          <DragSection key={id} id={id} title="属性">
            <div className="qt-dash-stat-pills">
              {PLAYER_STATS.map((s) => {
                const val = playerStats[s.key as keyof typeof playerStats] ?? 0
                return (
                  <span
                    key={s.key}
                    className="qt-dash-stat-pill"
                    style={{ color: s.color, borderColor: `${s.color}40`, background: `${s.color}10` }}
                  >
                    {s.icon} {s.label} {val}
                  </span>
                )
              })}
            </div>
          </DragSection>
        )

      case 'music':
        return (
          <DragSection key={id} id={id} title="音乐">
            <div className="qt-dash-mini-player">
              <span className="qt-dash-mini-note">🏛️</span>
              <span className="qt-dash-mini-title">青铜之笼 BGM</span>
              <button className="qt-dash-mini-btn" onClick={toggleBGM}>
                {playing ? <Pause size={12} weight="fill" /> : <Play size={12} weight="fill" />}
              </button>
            </div>
          </DragSection>
        )

      default:
        return null
    }
  }

  return (
    <div className="qt-dash-scroll" style={{ padding: 12 }}>
        {/* Front page (non-draggable) */}
        <div className="qt-dash-front">
          <div className="qt-dash-front-left">
            <div className="qt-dash-front-badge">{time.age}</div>
            <div className="qt-dash-front-meta">
              <div className="qt-dash-front-period">第{time.year}年{time.monthInYear}月 · {TIME_SLOT_LABELS[currentTimeSlot]}</div>
              <div className="qt-dash-front-chapter">{chapter.name}·{chapter.subtitle}</div>
            </div>
          </div>
          <div className="qt-dash-front-right">
            <div className="qt-dash-front-health">{playerStats.health}/100</div>
            <div className="qt-dash-front-health-label">健康值</div>
          </div>
        </div>

        {/* Reorderable sections */}
        <Reorder.Group
          axis="y"
          values={order}
          onReorder={setOrder}
          style={{ listStyle: 'none', padding: 0, margin: 0 }}
        >
          {order.map(renderSection)}
        </Reorder.Group>
    </div>
  )
}
