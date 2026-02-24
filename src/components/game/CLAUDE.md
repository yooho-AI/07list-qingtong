# components/game/
> L2 | 父级: /CLAUDE.md

游戏 UI 组件层 — PC 三栏布局 + 移动端自适应 + 高光弹窗。

## 成员清单

```
dialogue-panel.tsx   : 中间面板，场景背景 + 遮罩 + LetterCard + Chat Fiction 段落 + 流式显示 + 快捷操作（对话/探索/道具/推进时间）
character-panel.tsx  : 左侧面板 280px，场景卡片 + 角色立绘 + 异构数值条 + NPC 锁定/解锁状态
side-panel.tsx       : 右侧面板，图标导航栏 52px + 三标签面板（道具/任务/事件）+ toggle 展开/收起
mobile-layout.tsx    : 移动端全屏布局，底部输入 + Sheet 抽屉（角色/道具/场景/菜单）+ 游戏弹窗
highlight-modal.tsx  : 高光时刻弹窗，AI 分析 + 生图 + 生视频（火山方舟 Ark API）
```

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
