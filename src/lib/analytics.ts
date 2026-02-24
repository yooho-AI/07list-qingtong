/**
 * [INPUT]: 无外部依赖
 * [OUTPUT]: 对外提供 trackEvent 及预定义事件追踪函数
 * [POS]: lib 的数据统计模块，被 store.ts 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

declare global {
  interface Window {
    umami?: {
      track: (name: string, data?: Record<string, string | number>) => void
    }
  }
}

export function trackEvent(name: string, data?: Record<string, string | number>) {
  if (typeof window !== 'undefined' && window.umami) {
    window.umami.track(name, data)
  }
}

// ============================================================
// 预定义事件
// ============================================================

/** 开始新游戏 */
export function trackGameStart() {
  trackEvent('qt_game_start')
}

/** 继续游戏 */
export function trackGameContinue() {
  trackEvent('qt_game_continue')
}

/** 触发事件 */
export function trackEventTriggered(eventId: string) {
  trackEvent('qt_event_triggered', { eventId })
}

/** 获得道具 */
export function trackItemObtained(itemId: string) {
  trackEvent('qt_item_obtained', { itemId })
}

/** 达成结局 */
export function trackEnding(endingId: string) {
  trackEvent('qt_ending', { endingId })
}
