# 青铜之笼 (qingtong)

> L1 | 独立 SPA 古希腊历史生存模拟游戏
> React 19 + Zustand + Immer + Framer Motion + Tailwind CSS v4 + Vite 7

公元前432年雅典，12岁少年阿莱克西斯被出售为贵族男宠 — 四位关键人物，双层时间系统，九种结局。

## 目录结构

```
07list-qingtong/
├── index.html           - SPA 入口 HTML（Umami 统计 + 🏛️ favicon）
├── package.json         - 依赖声明（纯独立 SPA）
├── vite.config.ts       - Vite 配置（react + tailwindcss + @ 别名）
├── wrangler.toml        - Cloudflare Worker 配置（qingtong-api）
├── worker/              - API 代理 (1 文件)
│   └── index.js         - Cloudflare Worker，转发到 shubiaobiao API
├── public/              - 静态资源
│   ├── audio/           - BGM 音频
│   ├── characters/      - 角色立绘 PNG
│   └── scenes/          - 场景背景 PNG
└── src/                 - 源码 (3 子目录)
    ├── main.tsx         - React 挂载入口
    ├── App.tsx          - 根组件：StartScreen ↔ GameScreen + 结局系统
    ├── styles/          - 样式 (1 文件: globals.css)
    ├── lib/             - 核心逻辑 (8 文件: data/store/stream/parser/bgm/hooks/highlight/analytics)
    └── components/game/ - 游戏 UI (6 文件: dialogue/character/side/mobile/highlight)
```

## 数据流

```
用户输入 → store.sendMessage()
  → stream.ts SSE 流式请求 → api.yooho.ai
  → onChunk 实时更新 streamingContent
  → 完成后 parseStoryParagraph() 解析故事段落
  → 解析数值变化（【角色名 属性名±N】）→ updateNpcStat
  → 解析道具获得（【获得道具：道具名】）→ addItem
  → 解析事件触发（【事件：事件名】）→ triggerEvent
  → advanceMonth() → 检查章节/事件/解锁/结局
  → 消息 > 15 条时自动压缩历史上下文
```

## 视觉系统

```
风格:       Notion 卡片布局 + 古希腊青铜暗色主题
外壳背景:   #0f0d0a / 卡片: #241e18
文字:       主 #e8dcc8 / 次 #a09078 / 淡 #6b5d4f
主色:       #CD7F32 (青铜色)
次色:       #8B6914 (暗橄榄金) / 强调色: #2F4F4F (暗石板)
渐变按钮:   #CD7F32 → #8B6914
CSS 前缀:   qt-
角色色:     卡利阿斯 #8B6914, 菲洛克勒斯 #4a0e0e, 狄奥尼修斯 #059669, 欧律马科斯 #6b7280
```

## 核心系统

### 双层时间系统
- **月份** (1-60)：5年，每次对话推进1月
- **时段** (6种)：黎明/清晨/正午/午后/傍晚/深夜，影响场景开放

### NPC 异构数值系统
| NPC | 属性 | 初始值 |
|-----|------|--------|
| 卡利阿斯 | 好感度/信任度/占有欲 | 50/30/60 |
| 菲洛克勒斯 | 威胁度 | 0 |
| 狄奥尼修斯 | 信任度 | 0 |
| 欧律马科斯 | 同情度 | 0 |

### 玩家隐藏数值
| 数值 | 初始 | 可见 |
|------|------|------|
| 健康值 | 100 | ✓ |
| 洞察力 | 0 | ✗ |
| 自主性 | 50 | ✗ |
| 希望值 | 50 | ✗ |
| 技艺 | 0 | ✗ |

### 五章结构
| 章 | 名称 | 月份 | 年龄 |
|----|------|------|------|
| 1 | 初入宅邸 | 1-6 | 12岁 |
| 2 | 酒会考验 | 7-18 | 13岁 |
| 3 | 预警危机 | 19-36 | 14-15岁 |
| 4 | 申诉之路 | 37-54 | 16岁 |
| 5 | 终点站 | 55-60 | 17岁 |

### 九种结局
| ID | 名称 | 类型 | 优先级 |
|----|------|------|--------|
| TE-1 | 真相揭露者 | 真结局 | 1 |
| TE-2 | 永恒的循环 | 真结局 | 2 |
| HE-1 | 自由公民 | 好结局 | 3 |
| HE-2 | 破茧之蝶 | 好结局 | 4 |
| BE-1 | 深渊 | 坏结局 | 5 |
| BE-2 | 沉溺者 | 坏结局 | 6 |
| BE-3 | 遗忘 | 坏结局 | 7 |
| NE-1 | 陶工学徒 | 中立 | 8 |
| NE-2 | 制度性喘息 | 中立 | 9 |

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
