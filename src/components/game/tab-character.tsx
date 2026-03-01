/**
 * [INPUT]: store (npcStats, playerStats, unlockedCharacters, selectCharacter), CHARACTERS, PLAYER_STATS
 * [OUTPUT]: 人物Tab：SVG关系图 + 玩家属性 + 角色列表 + 全屏档案
 * [POS]: components/game Tab组件，app-shell.tsx TabContent 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from '@phosphor-icons/react'
import {
  useGameStore, CHARACTERS, PLAYER_STATS, getStatLevel,
} from '../../lib/store'

// ── SVG Relation Graph ──────────────────────────────

function RelationGraph({ onSelect }: { onSelect: (id: string) => void }) {
  const { unlockedCharacters, npcStats } = useGameStore()
  const chars = unlockedCharacters.map((id) => CHARACTERS[id]).filter(Boolean)

  const cx = 190, cy = 150, r = 100
  const angleStep = chars.length > 0 ? (2 * Math.PI) / chars.length : 0

  return (
    <div className="qt-relation-wrap">
      <div className="qt-relation-svg">
        <svg viewBox="0 0 380 300">
          {/* Center: "我" */}
          <circle cx={cx} cy={cy} r={24} fill="var(--bg-card)" stroke="var(--primary)" strokeWidth={2} />
          <text x={cx} y={cy + 5} className="qt-relation-center" textAnchor="middle">我</text>

          {/* NPC nodes */}
          {chars.map((c, i) => {
            const angle = -Math.PI / 2 + i * angleStep
            const nx = cx + r * Math.cos(angle)
            const ny = cy + r * Math.sin(angle)
            const stats = npcStats[c.id] || {}
            const mainStat = c.stats[0]
            const mainVal = mainStat ? (stats[mainStat.key] ?? 0) : 0
            const level = mainStat ? getStatLevel(c, mainStat.key, mainVal) : null
            const midX = (cx + nx) / 2
            const midY = (cy + ny) / 2

            return (
              <g key={c.id} onClick={() => onSelect(c.id)} style={{ cursor: 'pointer' }}>
                <line x1={cx} y1={cy} x2={nx} y2={ny} className="qt-relation-line" />
                {level && (
                  <text x={midX} y={midY - 6} className="qt-relation-label">{level.label}</text>
                )}
                <circle cx={nx} cy={ny} r={20} fill="var(--bg-card)" stroke={c.themeColor} strokeWidth={1.5} />
                <clipPath id={`clip-rel-${c.id}`}><circle cx={nx} cy={ny} r={18} /></clipPath>
                <image
                  href={c.portrait} x={nx - 18} y={ny - 18} width={36} height={36}
                  clipPath={`url(#clip-rel-${c.id})`} preserveAspectRatio="xMidYMin slice"
                />
                <text x={nx} y={ny + 32} className="qt-relation-node-name">{c.name}</text>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}

// ── Character Dossier ───────────────────────────────

function CharacterDossier({ charId, onClose }: { charId: string; onClose: () => void }) {
  const { npcStats } = useGameStore()
  const char = CHARACTERS[charId]
  if (!char) return null

  const stats = npcStats[charId] || {}
  const mainStat = char.stats[0]
  const mainVal = mainStat ? (stats[mainStat.key] ?? 0) : 0
  const level = mainStat ? getStatLevel(char, mainStat.key, mainVal) : null

  return (
    <motion.div
      className="qt-dossier-overlay"
      initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
    >
      <div className="qt-dossier-portrait">
        <img src={char.portrait} alt={char.name} />
        <div className="qt-dossier-gradient" />
        <button className="qt-dossier-close" onClick={onClose}><X size={18} /></button>
      </div>

      <div className="qt-dossier-content">
        <h2 className="qt-dossier-name">{char.name}</h2>
        <div className="qt-dossier-subtitle">{char.nameEn} · {char.title}</div>
        <p className="qt-dossier-desc">{char.description}</p>

        <div className="qt-dossier-tags">
          <span className="qt-dossier-tag">{char.age}岁</span>
          <span className="qt-dossier-tag">{char.title}</span>
          {level && <span className="qt-dossier-tag">{level.label}</span>}
        </div>

        {/* NPC Stats */}
        <div className="qt-dossier-stats">
          {char.stats.map((s) => {
            const val = stats[s.key] ?? 0
            return (
              <div key={s.key} className="qt-dossier-stat-row">
                <span className="qt-dossier-stat-label">{s.label}</span>
                <div className="qt-dossier-stat-track">
                  <div
                    className="qt-dossier-stat-fill"
                    style={{ width: `${val}%`, background: `linear-gradient(90deg, ${s.color}, ${s.color}88)` }}
                  />
                </div>
                <span className="qt-dossier-stat-val">{val}</span>
              </div>
            )
          })}
        </div>

        {/* Favor level */}
        {level && (
          <div className="qt-dossier-section">
            <div className="qt-dossier-section-title">关系阶段：{level.label}</div>
            <div className="qt-dossier-section-body">{level.behavior}</div>
          </div>
        )}

        {/* Personality */}
        <div className="qt-dossier-section">
          <div className="qt-dossier-section-title">性格</div>
          <div className="qt-dossier-section-body">{char.personality.core}</div>
        </div>

        {/* Secret hint — revealed progressively */}
        <div className="qt-dossier-section">
          <div className="qt-dossier-section-title">印象</div>
          <div className="qt-dossier-section-body">
            {mainVal >= 50 ? char.secret.hiddenMotivation : '你还不够了解这个人……'}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ── Main component ──────────────────────────────────

export default function TabCharacter() {
  const { unlockedCharacters, npcStats, playerStats } = useGameStore()
  const [dossierChar, setDossierChar] = useState<string | null>(null)

  const chars = unlockedCharacters.map((id) => CHARACTERS[id]).filter(Boolean)

  return (
    <div style={{ padding: 12 }}>
      {/* SVG Relation Graph */}
      <RelationGraph onSelect={setDossierChar} />

      {/* Player stats */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600, letterSpacing: 1 }}>
          玩家属性
        </div>
        {PLAYER_STATS.map((s) => {
          const val = playerStats[s.key as keyof typeof playerStats] ?? 0
          return (
            <div key={s.key} className="qt-dossier-stat-row">
              <span className="qt-dossier-stat-label">{s.icon} {s.label}</span>
              <div className="qt-dossier-stat-track">
                <div className="qt-dossier-stat-fill" style={{ width: `${val}%`, background: s.color }} />
              </div>
              <span className="qt-dossier-stat-val">{val}</span>
            </div>
          )
        })}
      </div>

      {/* Character list */}
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600, letterSpacing: 1 }}>
        角色列表
      </div>
      <div className="qt-char-list">
        {chars.map((c) => {
          const stats = npcStats[c.id] || {}
          const mainStat = c.stats[0]
          const mainVal = mainStat ? (stats[mainStat.key] ?? 0) : 0
          return (
            <div
              key={c.id}
              className="qt-char-item"
              onClick={() => setDossierChar(c.id)}
            >
              <img src={c.portrait} alt={c.name} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{c.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.title}</div>
              </div>
              {mainStat && (
                <div style={{ fontSize: 12, color: mainStat.color, fontWeight: 600 }}>
                  {mainStat.label} {mainVal}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Dossier overlay */}
      <AnimatePresence>
        {dossierChar && (
          <CharacterDossier charId={dossierChar} onClose={() => setDossierChar(null)} />
        )}
      </AnimatePresence>
    </div>
  )
}
