/**
 * [INPUT]: store (npcStats, unlockedCharacters, selectCharacter), CHARACTERS
 * [OUTPUT]: 人物Tab：2x2角色网格(聊天按钮+mini数值条) + SVG关系图 + CharacterDossier(overlay+sheet) + CharacterChat
 * [POS]: components/game Tab组件，app-shell.tsx TabContent 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, ChatCircleDots } from '@phosphor-icons/react'
import {
  useGameStore, CHARACTERS, getStatLevel,
} from '../../lib/store'
import CharacterChat from './character-chat'

const P = 'qt'

// ── SVG Relation Graph ──────────────────────────────

function RelationGraph({ onSelect }: { onSelect: (id: string) => void }) {
  const { unlockedCharacters, npcStats } = useGameStore()
  const chars = unlockedCharacters.map((id) => CHARACTERS[id]).filter(Boolean)

  const cx = 190, cy = 150, r = 100
  const angleStep = chars.length > 0 ? (2 * Math.PI) / chars.length : 0

  return (
    <div className={`${P}-relation-wrap`}>
      <div className={`${P}-relation-svg`}>
        <svg viewBox="0 0 380 300">
          {/* Center: "我" */}
          <circle cx={cx} cy={cy} r={24} fill="var(--bg-card)" stroke="var(--primary)" strokeWidth={2} />
          <text x={cx} y={cy + 5} className={`${P}-relation-center`} textAnchor="middle">我</text>

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
                <line x1={cx} y1={cy} x2={nx} y2={ny} className={`${P}-relation-line`} />
                {level && (
                  <text x={midX} y={midY - 6} className={`${P}-relation-label`}>{level.label}</text>
                )}
                <circle cx={nx} cy={ny} r={20} fill="var(--bg-card)" stroke={c.themeColor} strokeWidth={1.5} />
                <clipPath id={`clip-rel-${c.id}`}><circle cx={nx} cy={ny} r={18} /></clipPath>
                <image
                  href={c.portrait} x={nx - 18} y={ny - 18} width={36} height={36}
                  clipPath={`url(#clip-rel-${c.id})`} preserveAspectRatio="xMidYMin slice"
                />
                <text x={nx} y={ny + 32} className={`${P}-relation-node-name`}>{c.name}</text>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}

// ── Character Dossier (overlay + sheet) ───────────────────────────

function CharacterDossier({ charId, onClose }: { charId: string; onClose: () => void }) {
  const { npcStats } = useGameStore()
  const char = CHARACTERS[charId]
  if (!char) return null

  const stats = npcStats[charId] || {}
  const mainStat = char.stats[0]
  const mainVal = mainStat ? (stats[mainStat.key] ?? 0) : 0
  const level = mainStat ? getStatLevel(char, mainStat.key, mainVal) : null

  return (
    <>
      <motion.div
        className={`${P}-dossier-overlay`}
        style={{ background: 'rgba(0,0,0,0.5)', overflow: 'visible' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        className={`${P}-records-sheet`}
        style={{ zIndex: 52, overflowY: 'auto' }}
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      >
        <div className={`${P}-dossier-portrait`}>
          <img src={char.portrait} alt={char.name} />
          <div className={`${P}-dossier-gradient`} />
          <button className={`${P}-dossier-close`} onClick={onClose}><X size={18} /></button>
        </div>

        <div className={`${P}-dossier-content`}>
          <h2 className={`${P}-dossier-name`}>{char.name}</h2>
          <div className={`${P}-dossier-subtitle`}>{char.nameEn} · {char.title}</div>
          <p className={`${P}-dossier-desc`}>{char.description}</p>

          <div className={`${P}-dossier-tags`}>
            <span className={`${P}-dossier-tag`}>{char.age}岁</span>
            <span className={`${P}-dossier-tag`}>{char.title}</span>
            {level && <span className={`${P}-dossier-tag`}>{level.label}</span>}
          </div>

          {/* NPC Stats */}
          <div className={`${P}-dossier-stats`}>
            {char.stats.map((s) => {
              const val = stats[s.key] ?? 0
              return (
                <div key={s.key} className={`${P}-dossier-stat-row`}>
                  <span className={`${P}-dossier-stat-label`}>{s.label}</span>
                  <div className={`${P}-dossier-stat-track`}>
                    <div
                      className={`${P}-dossier-stat-fill`}
                      style={{ width: `${val}%`, background: `linear-gradient(90deg, ${s.color}, ${s.color}88)` }}
                    />
                  </div>
                  <span className={`${P}-dossier-stat-val`}>{val}</span>
                </div>
              )
            })}
          </div>

          {/* Favor level */}
          {level && (
            <div className={`${P}-dossier-section`}>
              <div className={`${P}-dossier-section-title`}>关系阶段：{level.label}</div>
              <div className={`${P}-dossier-section-body`}>{level.behavior}</div>
            </div>
          )}

          {/* Personality */}
          <div className={`${P}-dossier-section`}>
            <div className={`${P}-dossier-section-title`}>性格</div>
            <div className={`${P}-dossier-section-body`}>{char.personality.core}</div>
          </div>

          {/* Secret hint */}
          <div className={`${P}-dossier-section`}>
            <div className={`${P}-dossier-section-title`}>印象</div>
            <div className={`${P}-dossier-section-body`}>
              {mainVal >= 50 ? char.secret.hiddenMotivation : '你还不够了解这个人……'}
            </div>
          </div>
        </div>
      </motion.div>
    </>
  )
}

// ── Main component ──────────────────────────────────

export default function TabCharacter() {
  const { unlockedCharacters, npcStats } = useGameStore()
  const [dossierChar, setDossierChar] = useState<string | null>(null)
  const [chatChar, setChatChar] = useState<string | null>(null)

  const chars = unlockedCharacters.map((id) => CHARACTERS[id]).filter(Boolean)

  return (
    <div style={{ height: '100%', overflow: 'auto', padding: 12 }}>
      {/* ── 角色网格 (2x2) ── */}
      <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, paddingLeft: 4 }}>
        🏛️ 关键人物
      </h4>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
        {chars.map((c) => {
          const stats = npcStats[c.id] || {}
          const mainStat = c.stats[0]
          const mainVal = mainStat ? (stats[mainStat.key] ?? 0) : 0
          const level = mainStat ? getStatLevel(c, mainStat.key, mainVal) : null
          return (
            <button
              key={c.id}
              onClick={() => setDossierChar(c.id)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: 10, borderRadius: 12,
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                cursor: 'pointer', transition: 'all 0.2s',
                position: 'relative',
              }}
            >
              {/* 聊天按钮 */}
              <div
                onClick={(e) => { e.stopPropagation(); setChatChar(c.id) }}
                style={{
                  position: 'absolute', top: 6, left: 6,
                  width: 28, height: 28, borderRadius: '50%',
                  background: `${c.themeColor}18`,
                  border: `1px solid ${c.themeColor}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', zIndex: 1,
                }}
              >
                <ChatCircleDots size={16} weight="fill" color={c.themeColor} />
              </div>
              <img
                src={c.portrait}
                alt={c.name}
                style={{
                  width: 56, height: 56, borderRadius: '50%',
                  objectFit: 'cover', objectPosition: 'center top',
                  border: `2px solid ${c.themeColor}44`,
                  marginBottom: 6,
                }}
              />
              <span style={{ fontSize: 12, fontWeight: 500, color: c.themeColor }}>
                {c.name}
              </span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>
                {c.title}
              </span>
              {/* Mini stat bar */}
              <div style={{ width: '80%', height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.06)' }}>
                <div style={{
                  height: '100%', borderRadius: 2,
                  background: mainStat?.color || c.themeColor,
                  width: `${mainVal}%`, transition: 'width 0.5s ease',
                }} />
              </div>
              <span style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>
                {level ? level.label : ''} {mainVal}
              </span>
            </button>
          )
        })}
      </div>

      {/* ── 关系图 ── */}
      <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, paddingLeft: 4 }}>
        🕸️ 关系网络
      </h4>
      <RelationGraph onSelect={setDossierChar} />

      <div style={{ height: 16 }} />

      {/* Dossier overlay */}
      <AnimatePresence>
        {dossierChar && (
          <CharacterDossier charId={dossierChar} onClose={() => setDossierChar(null)} />
        )}
      </AnimatePresence>

      {/* Character Chat */}
      <AnimatePresence>
        {chatChar && (
          <CharacterChat charId={chatChar} onClose={() => setChatChar(null)} />
        )}
      </AnimatePresence>
    </div>
  )
}
