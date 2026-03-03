/**
 * [INPUT]: charId + onClose, 读取 CHARACTERS from store, 调用 stream.ts
 * [OUTPUT]: 对外提供 CharacterChat 组件（全屏私聊面板）
 * [POS]: 独立角色私聊，不影响游戏主线数值/剧情
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { X } from '@phosphor-icons/react'
import { CHARACTERS } from '../../lib/store'
import { streamChat, type Message as StreamMessage } from '../../lib/stream'

const STORAGE_KEY = 'qingtong-chats'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

// ── localStorage 持久化 ──────────────────────────────

function loadChats(charId: string): ChatMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const all = JSON.parse(raw) as Record<string, ChatMessage[]>
    return all[charId] || []
  } catch {
    return []
  }
}

function saveChats(charId: string, messages: ChatMessage[]) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const all = raw ? (JSON.parse(raw) as Record<string, ChatMessage[]>) : {}
    all[charId] = messages
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  } catch {
    // ignore
  }
}

// ── 组件 ──────────────────────────────────────────────

export default function CharacterChat({
  charId,
  onClose,
}: {
  charId: string
  onClose: () => void
}) {
  const char = CHARACTERS[charId]
  const [messages, setMessages] = useState<ChatMessage[]>(() => loadChats(charId))
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // 自动滚动到底部
  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingContent, scrollToBottom])

  if (!char) return null

  // 构建 system prompt
  const buildSystemPrompt = (): string => {
    return `你是${char.name}（${char.nameEn}），${char.title}，${char.age}岁。
性格：${char.personality.core}
简介：${char.description}

你现在正在和一位少年闲聊。请完全以${char.name}的性格和说话方式回复。
规则：
- 用第一人称说话，不要用第三人称叙述
- 回复简短自然（50-150字），像真人微信聊天
- 不要输出数值变化、选项、状态面板等游戏机制内容
- 保持角色性格一致`
  }

  // 发送消息
  const handleSend = async () => {
    const text = input.trim()
    if (!text || streaming) return

    const userMsg: ChatMessage = { role: 'user', content: text, timestamp: Date.now() }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    saveChats(charId, newMessages)
    setInput('')
    setStreaming(true)
    setStreamingContent('')

    // 构建 API 消息列表
    const apiMessages: StreamMessage[] = [
      { role: 'system', content: buildSystemPrompt() },
      ...newMessages.slice(-20).map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ]

    let accumulated = ''

    try {
      await streamChat(
        apiMessages,
        (chunk) => {
          accumulated += chunk
          setStreamingContent(accumulated)
        },
        () => {
          const assistantMsg: ChatMessage = {
            role: 'assistant',
            content: accumulated,
            timestamp: Date.now(),
          }
          const final = [...newMessages, assistantMsg]
          setMessages(final)
          saveChats(charId, final)
          setStreamingContent('')
          setStreaming(false)
        },
      )
    } catch {
      if (accumulated) {
        const assistantMsg: ChatMessage = {
          role: 'assistant',
          content: accumulated,
          timestamp: Date.now(),
        }
        const final = [...newMessages, assistantMsg]
        setMessages(final)
        saveChats(charId, final)
      }
      setStreamingContent('')
      setStreaming(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <>
      {/* 背景遮罩 */}
      <motion.div
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          zIndex: 51,
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      {/* 聊天面板 */}
      <motion.div
        className="qt-dossier-overlay"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        style={{ display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div className="qt-chat-header">
          <img
            src={char.portrait}
            alt={char.name}
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              objectFit: 'cover',
              objectPosition: 'center top',
              border: `2px solid ${char.themeColor}44`,
            }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: char.themeColor }}>
              {char.name}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{char.title}</div>
          </div>
          <button
            onClick={onClose}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              borderRadius: 8,
              border: 'none',
              background: 'var(--bg-hover)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* 消息区域 */}
        <div className="qt-chat-area" style={{ flex: 1 }}>
          {messages.length === 0 && !streaming && (
            <div className="qt-placeholder">
              <img
                src={char.portrait}
                alt={char.name}
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  objectFit: 'cover',
                  objectPosition: 'center top',
                  border: `2px solid ${char.themeColor}22`,
                  marginBottom: 4,
                }}
              />
              <span>和{char.name}开始聊天吧</span>
            </div>
          )}

          {messages.map((msg, i) =>
            msg.role === 'user' ? (
              <div key={i} className="qt-bubble-player">
                {msg.content}
              </div>
            ) : (
              <div key={i} className="qt-npc-row">
                <img
                  src={char.portrait}
                  alt={char.name}
                  className="qt-npc-avatar"
                  style={{ borderColor: char.themeColor }}
                />
                <div className="qt-npc-bubble">{msg.content}</div>
              </div>
            ),
          )}

          {/* 流式回复中 */}
          {streaming && streamingContent && (
            <div className="qt-npc-row">
              <img
                src={char.portrait}
                alt={char.name}
                className="qt-npc-avatar"
                style={{ borderColor: char.themeColor }}
              />
              <div className="qt-npc-bubble">{streamingContent}</div>
            </div>
          )}

          {/* 打字指示器 */}
          {streaming && !streamingContent && (
            <div className="qt-typing">
              <span className="qt-typing-dot" />
              <span className="qt-typing-dot" />
              <span className="qt-typing-dot" />
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* 输入区域 */}
        <div className="qt-input-area">
          <input
            ref={inputRef}
            className="qt-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`对${char.name}说点什么...`}
            disabled={streaming}
          />
          <button
            className="qt-send-btn"
            onClick={handleSend}
            disabled={!input.trim() || streaming}
          >
            ➤
          </button>
        </div>
      </motion.div>
    </>
  )
}
