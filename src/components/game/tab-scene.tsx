/**
 * [INPUT]: store (currentScene, unlockedScenes, unlockedCharacters, selectScene), SCENES, CHARACTERS
 * [OUTPUT]: 场景Tab：当前场景横幅 + 2列场景网格(thumbnail+锁定/当前) + SceneDetail全屏覆盖(overlay+sheet)
 * [POS]: components/game Tab组件，app-shell.tsx TabContent 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore, CHARACTERS, SCENES } from '../../lib/store'

const P = 'qt'

// ── Scene Detail (Full-screen overlay) ──────────────
function SceneDetail({
  sceneId,
  onClose,
}: {
  sceneId: string
  onClose: () => void
}) {
  const scene = SCENES[sceneId]
  const currentScene = useGameStore((s) => s.currentScene)
  const selectScene = useGameStore((s) => s.selectScene)
  const unlockedCharacters = useGameStore((s) => s.unlockedCharacters)
  const isCurrent = sceneId === currentScene

  if (!scene) return null

  const relatedChars = scene.possibleCharacters
    .filter((id) => unlockedCharacters.includes(id))
    .map((id) => CHARACTERS[id])
    .filter(Boolean)

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
          <img src={scene.background} alt={scene.name} />
          <div className={`${P}-dossier-gradient`} />
          <button className={`${P}-dossier-close`} onClick={onClose}>✕</button>
        </div>

        <div className={`${P}-dossier-content`}>
          <div className={`${P}-dossier-name`}>
            {scene.icon} {scene.name}
            {isCurrent && (
              <span style={{
                fontSize: 11, padding: '2px 8px', borderRadius: 10, marginLeft: 8,
                background: 'var(--primary)', color: '#fff', fontWeight: 600,
                verticalAlign: 'middle',
              }}>
                当前
              </span>
            )}
          </div>

          {/* Description */}
          <div className={`${P}-dossier-section`}>
            <p className={`${P}-dossier-desc`}>{scene.description}</p>
          </div>

          {/* Searchable Areas */}
          {scene.searchableAreas.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
              {scene.searchableAreas.map((area) => (
                <span key={area} style={{
                  padding: '3px 10px', borderRadius: 12,
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                  fontSize: 11, color: 'var(--text-muted)',
                }}>
                  {area}
                </span>
              ))}
            </div>
          )}

          {/* Possible Characters */}
          {relatedChars.length > 0 && (
            <div style={{
              padding: 12, borderRadius: 12, background: 'var(--bg-card)',
              border: '1px solid var(--border)', marginBottom: 16,
            }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
                可能遇见的人
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                {relatedChars.map((char) => (
                  <div key={char.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <img
                      src={char.portrait}
                      alt={char.name}
                      style={{
                        width: 36, height: 36, borderRadius: '50%',
                        objectFit: 'cover', objectPosition: 'center top',
                        border: `2px solid ${char.themeColor}44`,
                      }}
                    />
                    <span style={{ fontSize: 10, color: char.themeColor, fontWeight: 500 }}>
                      {char.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Move button */}
          {!isCurrent && (
            <button
              onClick={() => {
                selectScene(sceneId)
                onClose()
              }}
              style={{
                width: '100%', padding: '12px 0', borderRadius: 12,
                background: 'var(--primary)', color: '#fff',
                border: 'none', fontSize: 14, fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              移动到此场景
            </button>
          )}
        </div>
      </motion.div>
    </>
  )
}

// ── Main Component ──────────────────────────────────

export default function TabScene() {
  const currentScene = useGameStore((s) => s.currentScene)
  const unlockedScenes = useGameStore((s) => s.unlockedScenes)

  const [detailScene, setDetailScene] = useState<string | null>(null)

  return (
    <div style={{ height: '100%', overflow: 'auto', padding: 12 }}>
      {/* ── 当前场景 ── */}
      {SCENES[currentScene] && (
        <>
          <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, paddingLeft: 4 }}>
            📍 当前位置
          </h4>
          <button
            onClick={() => setDetailScene(currentScene)}
            style={{
              width: '100%', borderRadius: 16, overflow: 'hidden',
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              cursor: 'pointer', marginBottom: 20, padding: 0,
            }}
          >
            <div style={{ position: 'relative', height: 120, overflow: 'hidden' }}>
              <img
                src={SCENES[currentScene].background}
                alt={SCENES[currentScene].name}
                loading="lazy"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                padding: '20px 12px 8px',
                background: 'linear-gradient(transparent, rgba(0,0,0,0.6))',
              }}>
                <span style={{ color: '#fff', fontSize: 15, fontWeight: 600 }}>
                  {SCENES[currentScene].icon} {SCENES[currentScene].name}
                </span>
              </div>
            </div>
          </button>
        </>
      )}

      {/* ── 场景网格 (2列) ── */}
      <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, paddingLeft: 4 }}>
        🗺️ 所有地点
      </h4>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
        {Object.values(SCENES).map((s) => {
          const locked = !unlockedScenes.includes(s.id)
          const active = s.id === currentScene

          return (
            <button
              key={s.id}
              onClick={() => !locked && setDetailScene(s.id)}
              disabled={locked}
              style={{
                display: 'flex', flexDirection: 'column',
                borderRadius: 12, overflow: 'hidden',
                background: 'var(--bg-card)',
                border: active ? '2px solid var(--primary)' : '1px solid var(--border)',
                cursor: locked ? 'not-allowed' : 'pointer',
                opacity: locked ? 0.4 : 1,
                padding: 0,
                transition: 'all 0.2s',
              }}
            >
              {/* Scene thumbnail */}
              <div style={{ height: 80, overflow: 'hidden', position: 'relative' }}>
                <img
                  src={s.background}
                  alt={s.name}
                  loading="lazy"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                {locked && (
                  <div style={{
                    position: 'absolute', inset: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(0,0,0,0.4)',
                    fontSize: 20,
                  }}>
                    🔒
                  </div>
                )}
                {active && (
                  <span style={{
                    position: 'absolute', top: 4, right: 4,
                    fontSize: 9, padding: '1px 6px', borderRadius: 8,
                    background: 'var(--primary)', color: '#fff', fontWeight: 600,
                  }}>
                    当前
                  </span>
                )}
              </div>
              {/* Scene info */}
              <div style={{ padding: '6px 8px', textAlign: 'left' }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>
                  {s.icon} {s.name}
                </div>
                <div style={{
                  fontSize: 10, color: 'var(--text-muted)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {s.searchableAreas.join(' · ')}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      <div style={{ height: 16 }} />

      {/* ── Scene Detail Overlay ── */}
      <AnimatePresence>
        {detailScene && SCENES[detailScene] && (
          <SceneDetail
            sceneId={detailScene}
            onClose={() => setDetailScene(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
