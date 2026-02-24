/**
 * [INPUT]: 依赖 @/lib/stream 的 chat，依赖 @/lib/data 的 CHARACTERS
 * [OUTPUT]: 对外提供分析/生成函数及风格常量
 * [POS]: lib 的高光时刻 API 封装，被 highlight-modal 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { CHARACTERS } from './data'
import { chat } from './stream'

// ============================================================
// 类型
// ============================================================

export type HighlightType = 'tension' | 'revelation' | 'emotional' | 'dramatic'
export type VideoStyle = 'anime' | 'chinese_ink' | 'cyberpunk' | 'cinematic' | 'pixel'
export type ComicStyle = 'shoujo' | 'shounen' | 'webtoon' | 'american' | 'doodle'

export interface Highlight {
  highlightId: string
  title: string
  summary: string
  type: HighlightType
  characters: { id: string; name: string }[]
  emotionalScore: number
}

// ============================================================
// 风格常量
// ============================================================

export const HIGHLIGHT_TYPES: Record<HighlightType, { icon: string; label: string; color: string }> = {
  tension: { icon: '😰', label: '紧张对峙', color: '#ef4444' },
  revelation: { icon: '💡', label: '真相揭露', color: '#3b82f6' },
  emotional: { icon: '😢', label: '悲情时刻', color: '#ec4899' },
  dramatic: { icon: '🎭', label: '戏剧转折', color: '#8b5cf6' },
}

export const VIDEO_STYLES: Record<VideoStyle, { label: string; desc: string; prompt: string }> = {
  anime: { label: '日系动漫', desc: '大眼睛、柔和光影', prompt: '日系动画风格，赛璐珞上色，柔和光影，角色大眼精致' },
  chinese_ink: { label: '国风水墨', desc: '水墨留白、古典配色', prompt: '中国水墨动画风格，墨色晕染，留白写意，古典配色' },
  cyberpunk: { label: '赛博朋克', desc: '霓虹灯、高饱和', prompt: '赛博朋克风格，霓虹灯光，高饱和色彩，暗色调' },
  cinematic: { label: '写实电影', desc: '自然光影、电影构图', prompt: '真人电影质感，自然光影，浅景深，电影级构图' },
  pixel: { label: '像素复古', desc: '像素颗粒、复古色调', prompt: '像素动画风格，16bit复古色调，像素颗粒感' },
}

export const COMIC_STYLES: Record<ComicStyle, { label: string; desc: string; prompt: string }> = {
  shoujo: { label: '少女漫画', desc: '花瓣特效、梦幻氛围', prompt: 'Q版少女漫画风格，大头小身2:1比例，圆润脸庞大眼睛，花瓣星星特效，柔美线条' },
  shounen: { label: '少年漫画', desc: '硬朗线条、张力构图', prompt: 'Q版少年漫画风格，大头小身2:1比例，硬朗线条，速度线，热血夸张表情' },
  webtoon: { label: '韩漫条漫', desc: '精致上色、网感强', prompt: 'Q版韩漫风格，大头小身2:1比例，精致数码上色，柔和渐变色彩，现代时尚' },
  american: { label: '美漫风格', desc: '粗线条、高对比', prompt: 'Q版美漫风格，大头小身2:1比例，粗黑描边，高对比色块，波普艺术感' },
  doodle: { label: '手绘涂鸦', desc: '随性笔触、轻松氛围', prompt: 'Q版手绘涂鸦风格，大头小身2:1比例，铅笔随性笔触，简笔画，轻松幽默' },
}

// ============================================================
// AI 分析
// ============================================================

export async function analyzeHighlights(
  dialogues: { role: string; content: string }[]
): Promise<Highlight[]> {
  const charNames = Object.values(CHARACTERS).map((c) => c.name).join('、')
  const dialogueText = dialogues
    .map((d, i) => `${i + 1}. [${d.role}]: ${d.content}`)
    .join('\n')

  const prompt = `你是一个专业的推理悬疑故事分析师。请分析以下民国推理游戏《旧宅遗恨》的对话，提取2-4个最精彩的高光片段。

## 对话历史
${dialogueText}

## 涉及角色
${charNames}

## 输出要求
请以 JSON 数组格式返回，每个片段包含：
- highlightId: 唯一ID (如 "hl_001")
- title: 片段标题 (6-10字)
- summary: 内容摘要 (20-40字)
- type: 片段类型 (tension/revelation/emotional/dramatic)
- characters: 涉及角色数组 [{id, name}]
- emotionalScore: 情感强度 (0-100)

只返回 JSON 数组，不要其他内容。`

  const content = await chat([{ role: 'user', content: prompt }])

  try {
    const jsonMatch = content.match(/\[[\s\S]*\]/)
    if (jsonMatch) return JSON.parse(jsonMatch[0]) as Highlight[]
  } catch {
    console.error('[Highlight] 解析失败:', content)
  }
  return []
}

// ============================================================
// 火山方舟 Ark API
// ============================================================

const ARK_BASE = 'https://ark.cn-beijing.volces.com/api/v3'
const ARK_API_KEY = '8821c4b7-6a64-44b9-a9d7-de1ffc36ff41'

const arkHeaders = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${ARK_API_KEY}`,
}

/** 文生图 — Seedream 4.5 */
export async function generateImage(prompt: string): Promise<string> {
  const res = await fetch(`${ARK_BASE}/images/generations`, {
    method: 'POST',
    headers: arkHeaders,
    body: JSON.stringify({
      model: 'doubao-seedream-4-5-251128',
      prompt,
      sequential_image_generation: 'disabled',
      response_format: 'url',
      size: '2K',
      stream: false,
      watermark: true,
    }),
  })

  if (!res.ok) {
    const err = await res.text().catch(() => '')
    throw new Error(`图片生成失败: ${res.status} ${err}`)
  }

  const data = await res.json()
  const url = data.data?.[0]?.url
  if (!url) throw new Error('未返回图片 URL')
  return url
}

/** 图生视频 — Seedance 1.5 Pro */
export async function generateVideo(
  prompt: string,
  imageUrl?: string
): Promise<{ taskId?: string; videoUrl?: string; error?: string }> {
  const content: { type: string; text?: string; image_url?: { url: string } }[] = [
    { type: 'text', text: `${prompt}  --duration 5 --camerafixed false --watermark true` },
  ]

  if (imageUrl) {
    content.push({ type: 'image_url', image_url: { url: imageUrl } })
  }

  try {
    const res = await fetch(`${ARK_BASE}/contents/generations/tasks`, {
      method: 'POST',
      headers: arkHeaders,
      body: JSON.stringify({ model: 'doubao-seedance-1-5-pro-251215', content }),
    })

    const data = await res.json()
    if (!res.ok || data.error) {
      return { error: data.error?.message || `视频生成失败: ${res.status}` }
    }
    return { taskId: data.id || data.task_id, videoUrl: data.output?.video_url }
  } catch (e) {
    return { error: e instanceof Error ? e.message : '视频生成请求失败' }
  }
}

/** 查询视频任务状态 */
export async function queryVideoTask(taskId: string): Promise<{
  status: 'pending' | 'running' | 'succeeded' | 'failed'
  videoUrl?: string
  error?: string
}> {
  const res = await fetch(`${ARK_BASE}/contents/generations/tasks/${taskId}`, {
    method: 'GET',
    headers: arkHeaders,
  })

  const data = await res.json()
  if (!res.ok) return { status: 'failed', error: data.error?.message || '查询失败' }

  return {
    status: data.status || 'pending',
    videoUrl: data.output?.video_url || data.content?.[0]?.url,
  }
}

// ============================================================
// Prompt 构建
// ============================================================

const EMOTION_MAP: Record<HighlightType, { image: string; video: string }> = {
  tension: { image: '紧张对峙、冷汗、手部特写、光影对比', video: '紧迫感镜头，角色对峙，冷色调' },
  revelation: { image: '顿悟表情、瞳孔放大、光芒乍现', video: '慢镜头揭露，光线变化，戏剧性推拉' },
  emotional: { image: '眼含泪光、哀伤氛围、暗色光晕', video: '慢镜头，暖黄色调与冷色交织，悲凉氛围' },
  dramatic: { image: '震惊表情、速度线背景、戏剧光影', video: '戏剧性推拉镜头，明暗对比强烈' },
}

export function buildImagePrompt(highlight: Highlight, style: ComicStyle): string {
  const styleInfo = COMIC_STYLES[style]
  const emotion = EMOTION_MAP[highlight.type].image

  return `${styleInfo.prompt}。民国深色调古宅室内场景，烛光摇曳，檀香缭绕，推理悬疑氛围。
角色：${highlight.characters.map((c) => c.name).join('、')}，表情极度夸张。
剧情：${highlight.summary}
情绪：${emotion}
排版：4-6格漫画分镜，黑色分格边框，对话气泡框，漫画音效文字，高清精致`
}

export function buildVideoPrompt(highlight: Highlight, style: VideoStyle): string {
  const styleInfo = VIDEO_STYLES[style]
  const emotion = EMOTION_MAP[highlight.type].video

  return `${styleInfo.prompt}。民国古宅深色调，烛光明灭，推理悬疑氛围。
剧情：${highlight.summary}
角色：${highlight.characters.map((c) => c.name).join('、')}
情绪：${emotion}
镜头：5秒短片，角色表情生动，氛围紧张`
}
