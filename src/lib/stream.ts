/**
 * [INPUT]: 无外部依赖
 * [OUTPUT]: 对外提供 streamChat, chat 函数, Message 接口
 * [POS]: lib 的 API 通信层，SSE 流式 + 非流式，被 store.ts 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

export interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>
}

/* EC2 后端地址 */
const API_BASE = 'https://api.yooho.ai'

/**
 * 流式聊天请求
 * 使用 buffer 累积机制正确处理 SSE chunk 边界
 */
export async function streamChat(
  messages: Message[],
  onChunk: (text: string) => void,
  onDone: () => void
) {
  const API_URL = `${API_BASE}/api/v1/ai/game/chat/stream`

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, stream: true }),
  })

  if (!res.ok) {
    throw new Error(`API error: ${res.status}`)
  }

  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })

    /* 按完整行切割，保留未结束的行在 buffer 中 */
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || !trimmed.startsWith('data: ')) continue

      const data = trimmed.slice(6)
      if (data === '[DONE]') {
        onDone()
        return
      }

      try {
        const parsed = JSON.parse(data)
        const content = parsed.choices?.[0]?.delta?.content || ''
        if (content) onChunk(content)
      } catch {
        // 跳过非 JSON 行
      }
    }
  }

  /* 处理 buffer 中最后残留的数据 */
  if (buffer.trim().startsWith('data: ')) {
    const data = buffer.trim().slice(6)
    if (data !== '[DONE]') {
      try {
        const parsed = JSON.parse(data)
        const content = parsed.choices?.[0]?.delta?.content || ''
        if (content) onChunk(content)
      } catch {
        // 忽略
      }
    }
  }

  onDone()
}

/**
 * 非流式聊天请求（用于历史压缩等场景）
 * 使用流式端点，收集所有 chunks 后返回
 */
export async function chat(messages: Message[]): Promise<string> {
  const API_URL = `${API_BASE}/api/v1/ai/game/chat/stream`

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  })

  if (!res.ok) {
    throw new Error(`API error: ${res.status}`)
  }

  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let content = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || !trimmed.startsWith('data: ')) continue
      const data = trimmed.slice(6)
      if (data === '[DONE]') break
      try {
        const parsed = JSON.parse(data)
        content += parsed.choices?.[0]?.delta?.content || ''
      } catch {}
    }
  }

  return content
}
