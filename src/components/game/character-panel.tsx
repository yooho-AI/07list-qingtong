/**
 * [INPUT]: 依赖 @/lib/store, @/lib/data
 * [OUTPUT]: 对外提供 LeftPanel 组件（场景卡片 + 角色头像 + 异构数值 + 角色列表）
 * [POS]: components/game 的左侧面板，古希腊青铜主题
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useState } from 'react'
import { useGameStore } from '@/lib/store'
import { CHARACTERS, SCENES } from '@/lib/data'

// ============================================================
// 场景卡片 — 16:9 横版背景图 + 场景选择器
// ============================================================

function SceneCard() {
  const [showSelector, setShowSelector] = useState(false)
  const currentScene = useGameStore((s) => s.currentScene)
  const selectScene = useGameStore((s) => s.selectScene)
  const unlockedScenes = useGameStore((s) => s.unlockedScenes)
  const scene = SCENES[currentScene]

  return (
    <div className="qt-card qt-scene-card">
      {scene?.backgroundImage ? (
        <img src={scene.backgroundImage} alt={scene?.name} />
      ) : (
        <div className="qt-placeholder"><span className="qt-placeholder-icon">📍</span></div>
      )}
      <div className="qt-scene-selector" onClick={() => setShowSelector(!showSelector)}>
        <span className="qt-scene-icon">{scene?.icon || '📍'}</span>
        <span className="qt-scene-name">{scene?.name || '选择场景'}</span>
        <span className="qt-scene-arrow">{showSelector ? '▲' : '▼'}</span>
      </div>
      {showSelector && (
        <div className="qt-scene-dropdown">
          {Object.values(SCENES).map((s) => {
            const isLocked = !unlockedScenes.includes(s.id)
            return (
              <button
                key={s.id}
                className={`qt-scene-option ${currentScene === s.id ? 'active' : ''} ${isLocked ? 'locked' : ''}`}
                onClick={(e) => {
                  e.stopPropagation()
                  if (isLocked) return
                  selectScene(s.id)
                  setShowSelector(false)
                }}
                disabled={isLocked}
              >
                <span className="qt-option-icon">{s.icon}</span>
                <span className="qt-option-name">{isLocked ? '🔒 ' + s.name : s.name}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ============================================================
// NPC 头像卡片 — 3:4 纵版
// ============================================================

function PortraitCard() {
  const currentCharacter = useGameStore((s) => s.currentCharacter)
  const char = currentCharacter ? CHARACTERS[currentCharacter] : null

  return (
    <div className="qt-card qt-portrait-card">
      {char ? (
        <img src={char.portraitImage} alt={char.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} />
      ) : (
        <div className="qt-placeholder" style={{ paddingBottom: 40 }}>
          <span className="qt-placeholder-icon">🏛️</span>
          <span className="qt-placeholder-text">选择角色</span>
        </div>
      )}
    </div>
  )
}

// ============================================================
// NPC 简介 + 异构数值条
// ============================================================

function InfoCard() {
  const currentCharacter = useGameStore((s) => s.currentCharacter)
  const npcStats = useGameStore((s) => s.npcStats)
  const playerStats = useGameStore((s) => s.playerStats)
  const char = currentCharacter ? CHARACTERS[currentCharacter] : null
  const stats = currentCharacter ? npcStats[currentCharacter] : null

  return (
    <div className="qt-card qt-info-card">
      {/* 玩家健康值 */}
      <div className="qt-health-bar">
        <span>❤️ 健康</span>
        <div className="qt-stat-track" style={{ flex: 1 }}>
          <div
            className="qt-stat-fill"
            style={{
              width: `${playerStats.health}%`,
              background: playerStats.health > 50 ? '#22c55e' : playerStats.health > 25 ? '#f59e0b' : '#ef4444',
            }}
          />
        </div>
        <span className="qt-stat-value">{playerStats.health}</span>
      </div>

      {char && stats && (
        <>
          <div className="qt-info-title" style={{ color: char.themeColor }}>{char.name}</div>
          <div className="qt-info-meta">
            <span>{char.age}岁</span>
            <span style={{ color: 'var(--text-muted)' }}>·</span>
            <span>{char.title}</span>
          </div>
          <div className="qt-info-desc">{char.personality.core}</div>
          <div className="qt-info-stats">
            {char.stats.filter((s) => !s.hidden).map((statCfg) => (
              <div key={statCfg.key} className="qt-stat-bar">
                <span className="qt-stat-label">{statCfg.label}</span>
                <div className="qt-stat-track">
                  <div
                    className="qt-stat-fill"
                    style={{ width: `${stats[statCfg.key] ?? 0}%`, background: statCfg.color }}
                  />
                </div>
                <span className="qt-stat-value">{stats[statCfg.key] ?? 0}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ============================================================
// 角色选择列表 — 2 列网格（含锁定状态）
// ============================================================

function CharacterList() {
  const currentCharacter = useGameStore((s) => s.currentCharacter)
  const selectCharacter = useGameStore((s) => s.selectCharacter)
  const unlockedCharacters = useGameStore((s) => s.unlockedCharacters)

  return (
    <div className="qt-card" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '10px 14px' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>角色</span>
      </div>
      <div className="qt-char-list" style={{ flex: 1, alignContent: 'center' }}>
        {Object.entries(CHARACTERS).map(([charId, char]) => {
          const isLocked = !unlockedCharacters.includes(charId)
          return (
            <button
              key={charId}
              className={`qt-char-item ${currentCharacter === charId ? 'active' : ''} ${isLocked ? 'locked' : ''}`}
              style={{ '--char-color': char.themeColor } as React.CSSProperties}
              onClick={() => !isLocked && selectCharacter(currentCharacter === charId ? null : charId)}
              disabled={isLocked}
            >
              {isLocked ? (
                <span style={{ fontSize: 20 }}>🔒</span>
              ) : (
                <img src={char.portraitImage} alt={char.name} style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
              )}
              <span>{isLocked ? '???' : char.name}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================
// 左侧面板主组件
// ============================================================

export default function LeftPanel() {
  return (
    <div
      className="qt-scrollbar"
      style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '12px 0 12px 12px', height: '100%', background: 'var(--bg-secondary)', overflowY: 'auto' }}
    >
      <SceneCard />
      <PortraitCard />
      <InfoCard />
      <CharacterList />
    </div>
  )
}
