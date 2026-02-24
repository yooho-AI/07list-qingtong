/**
 * [INPUT]: 依赖 @/lib/store, @/lib/data
 * [OUTPUT]: 对外提供 RightPanel 组件（导航栏 + 道具/任务/事件三面板）
 * [POS]: components/game 的右侧面板
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useState } from 'react'
import { useGameStore } from '@/lib/store'
import { ITEMS, EVENTS, getChapterByMonth } from '@/lib/data'

type PanelTab = 'items' | 'quests' | 'events'

// ============================================================
// 道具面板
// ============================================================

function ItemsPanel() {
  const inventory = useGameStore((s) => s.inventory)
  const items = inventory.map((id) => ITEMS[id]).filter(Boolean)

  return (
    <div className="qt-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
      {items.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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
        <div className="qt-placeholder" style={{ height: 150 }}>
          <span style={{ fontSize: 32, opacity: 0.5 }}>📦</span>
          <span className="qt-placeholder-text">背包为空</span>
        </div>
      )}
    </div>
  )
}

// ============================================================
// 任务面板
// ============================================================

function QuestsPanel() {
  const currentMonth = useGameStore((s) => s.currentMonth)
  const chapter = getChapterByMonth(currentMonth)

  return (
    <div className="qt-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="qt-quest-entry">
          <div className="qt-quest-name">🎯 主线：{chapter.mainGoal}</div>
          <div className="qt-quest-desc">{chapter.name}「{chapter.subtitle}」— {chapter.theme}</div>
        </div>
        {chapter.sideGoal && (
          <div className="qt-quest-entry" style={{ borderLeftColor: 'var(--accent)' }}>
            <div className="qt-quest-name">📌 支线：{chapter.sideGoal}</div>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================
// 事件面板
// ============================================================

function EventsPanel() {
  const triggeredEvents = useGameStore((s) => s.triggeredEvents)
  const events = triggeredEvents.map((id) => EVENTS[id]).filter(Boolean)

  return (
    <div className="qt-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
      {events.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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
        <div className="qt-placeholder" style={{ height: 150 }}>
          <span style={{ fontSize: 32, opacity: 0.5 }}>📜</span>
          <span className="qt-placeholder-text">尚无事件记录</span>
        </div>
      )}
    </div>
  )
}

// ============================================================
// 详情面板
// ============================================================

function DetailPanel({ tab, onClose }: { tab: PanelTab; onClose: () => void }) {
  const tabLabels: Record<PanelTab, string> = { items: '📦 道具', quests: '📋 任务', events: '📜 事件' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{tabLabels[tab]}</span>
        <button
          onClick={onClose}
          style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: 18, cursor: 'pointer', borderRadius: 4 }}
        >
          ×
        </button>
      </div>
      {tab === 'items' && <ItemsPanel />}
      {tab === 'quests' && <QuestsPanel />}
      {tab === 'events' && <EventsPanel />}
    </div>
  )
}

// ============================================================
// 右侧面板主组件
// ============================================================

export default function RightPanel() {
  const [activePanel, setActivePanel] = useState<PanelTab | null>(null)
  const inventory = useGameStore((s) => s.inventory)
  const triggeredEvents = useGameStore((s) => s.triggeredEvents)

  const toggle = (tab: PanelTab) => setActivePanel(activePanel === tab ? null : tab)

  return (
    <div style={{ display: 'flex', flexDirection: 'row', height: '100%', padding: '12px 0 12px 12px', background: 'var(--bg-secondary)' }}>
      {activePanel && (
        <div className="qt-detail-panel">
          <div className="qt-card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <DetailPanel tab={activePanel} onClose={() => setActivePanel(null)} />
          </div>
        </div>
      )}

      <div className="qt-nav-bar" style={{ marginLeft: activePanel ? 8 : 0 }}>
        <button className={`qt-nav-btn ${activePanel === 'items' ? 'active' : ''}`} onClick={() => toggle('items')} style={{ position: 'relative' }}>
          <span className="qt-nav-icon">📦</span>
          <span className="qt-nav-label">道具</span>
          {inventory.length > 0 && <span className="qt-nav-badge">{inventory.length}</span>}
        </button>
        <button className={`qt-nav-btn ${activePanel === 'quests' ? 'active' : ''}`} onClick={() => toggle('quests')}>
          <span className="qt-nav-icon">📋</span>
          <span className="qt-nav-label">任务</span>
        </button>
        <button className={`qt-nav-btn ${activePanel === 'events' ? 'active' : ''}`} onClick={() => toggle('events')} style={{ position: 'relative' }}>
          <span className="qt-nav-icon">📜</span>
          <span className="qt-nav-label">事件</span>
          {triggeredEvents.length > 0 && <span className="qt-nav-badge">{triggeredEvents.length}</span>}
        </button>
      </div>
    </div>
  )
}
