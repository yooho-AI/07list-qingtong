/**
 * [INPUT]: 无外部依赖
 * [OUTPUT]: 对外提供 track* 系列埋点函数
 * [POS]: lib 的分析模块，被 store.ts 和组件消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

const PREFIX = 'qt_'

function trackEvent(name: string, data?: Record<string, string | number>) {
  try {
    ;(window as unknown as Record<string, unknown>).umami &&
      (window as unknown as { umami: { track: (n: string, d?: Record<string, string | number>) => void } })
        .umami.track(PREFIX + name, data)
  } catch { /* 静默 */ }
}

// ── 通用事件 ─────────────────────────────────────────
export const trackGameStart = () => trackEvent('game_start')
export const trackGameContinue = () => trackEvent('game_continue')
export const trackTimeAdvance = (month: number, timeSlot: string) =>
  trackEvent('time_advance', { month, timeSlot })
export const trackChapterEnter = (chapter: number) =>
  trackEvent('chapter_enter', { chapter })
export const trackEndingReached = (ending: string) =>
  trackEvent('ending_reached', { ending })

// ── 项目特有事件 ─────────────────────────────────────
export const trackPlayerCreate = (name: string) =>
  trackEvent('player_create', { name })
export const trackSceneUnlock = (scene: string) =>
  trackEvent('scene_unlock', { scene })
export const trackMentalCrisis = (value: number) =>
  trackEvent('mental_crisis', { value })
