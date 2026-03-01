# lib/
> L2 | 父级: /CLAUDE.md

核心逻辑层 — 数据定义、状态管理、AI 通信、文本解析、剧本直通。

## 成员清单

```
script.md     : 剧本直通：五模块原文（零转换注入 prompt）
data.ts       : UI 薄层：类型定义(含富消息扩展) + 4NPC/8场景/9道具/10事件/5章节/9结局/工具函数
store.ts      : Zustand+Immer 状态中枢，剧本直通 + 富消息 + 抽屉 + 双轨解析 + 链式反应 + 存档
parser.ts     : AI 回复解析（角色名着色 + 数值着色 + charColor + extractChoices）
analytics.ts  : Umami 埋点，qt_ 前缀事件
stream.ts     : SSE streamChat + chat，连接 api.yooho.ai
bgm.ts        : 全局音频单例 + useBgm hook
hooks.ts      : useMediaQuery + useIsMobile (768px)
```

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
