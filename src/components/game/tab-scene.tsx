/**
 * [INPUT]: store (currentScene, unlockedScenes, unlockedCharacters, selectScene, selectCharacter), SCENES, CHARACTERS
 * [OUTPUT]: 场景Tab：9:16 Hero大图 + 角色标签行 + 地点列表
 * [POS]: components/game Tab组件，app-shell.tsx TabContent 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { Lock } from '@phosphor-icons/react'
import { useGameStore, CHARACTERS, SCENES } from '../../lib/store'

export default function TabScene() {
  const { currentScene, unlockedScenes, unlockedCharacters, selectScene, selectCharacter } = useGameStore()
  const scene = SCENES[currentScene]
  if (!scene) return null

  const relatedChars = scene.possibleCharacters
    .filter((id) => unlockedCharacters.includes(id))
    .map((id) => CHARACTERS[id])
    .filter(Boolean)

  const allScenes = Object.values(SCENES)

  return (
    <div style={{ padding: 12 }}>
      {/* Scene hero */}
      <div className="qt-scene-hero">
        <img src={scene.background} alt={scene.name} />
        <div className="scene-overlay">
          <div className="scene-name">{scene.icon} {scene.name}</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
            {scene.description}
          </div>
        </div>
      </div>

      {/* Related characters */}
      {relatedChars.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {relatedChars.map((c) => (
            <button key={c.id} className="qt-char-tag" onClick={() => selectCharacter(c.id)}>
              <img src={c.portrait} alt={c.name} />
              <span className="tag-name">{c.name}</span>
              <span className="tag-role">{c.title}</span>
            </button>
          ))}
        </div>
      )}

      {/* Location list */}
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600, letterSpacing: 1 }}>
        所有地点
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {allScenes.map((s) => {
          const unlocked = unlockedScenes.includes(s.id)
          const isCurrent = s.id === currentScene
          return (
            <button
              key={s.id}
              className={`qt-location-tag ${isCurrent ? 'qt-location-active' : ''}`}
              style={{ opacity: unlocked ? 1 : 0.45 }}
              onClick={() => unlocked && selectScene(s.id)}
              disabled={!unlocked}
            >
              <span className="loc-icon">{unlocked ? s.icon : <Lock size={16} />}</span>
              <div>
                <div className="loc-name">{s.name}</div>
                <div className="loc-desc">{unlocked ? s.description : '未解锁'}</div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
