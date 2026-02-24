# lib/
> L2 | 父级: /CLAUDE.md

核心逻辑层 — 数据定义、状态管理、AI 通信、文本解析、高光时刻。

## 成员清单

```
data.ts       : 类型定义 + 4NPC/8场景/9道具/10事件/5章节/9结局/配置/工具函数，无外部依赖
store.ts      : Zustand+Immer 状态中枢，SSE 流式 sendMessage，时间/章节/事件/结局系统，存档
stream.ts     : SSE streamChat + chat，连接 api.yooho.ai
parser.ts     : AI 回复解析器，parseStoryParagraph 返回 {narrative, statHtml}
highlight.ts  : 高光时刻 API，分析+生图+生视频，火山方舟 Ark API
bgm.ts        : 全局音频单例 + useBgm hook
hooks.ts      : useMediaQuery + useIsMobile (768px)
analytics.ts  : Umami 埋点，qt_ 前缀事件
```

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
