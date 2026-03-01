# components/game/
> L2 | 父级: /CLAUDE.md

游戏 UI 组件层 — 移动优先单一布局 + Tab导航 + 三向手势 + 抽屉。

## 成员清单

```
app-shell.tsx        : 桌面居中壳 + Header + Tab路由 + 5键TabBar + 三向手势 + DashboardDrawer + RecordSheet + Toast
dashboard-drawer.tsx : 调查笔记(左抽屉)：扉页+人物轮播+场景缩略图+目标+道具格+属性+音乐。Reorder拖拽排序
tab-dialogue.tsx     : 对话Tab：富消息路由(SceneCard/ChapterCard/NPC头像气泡) + 可折叠选项面板 + 快捷操作 + 背包
tab-scene.tsx        : 场景Tab：9:16大图 + 角色标签行 + 地点列表
tab-character.tsx    : 人物Tab：SVG关系图 + 玩家属性 + 角色列表 + 全屏档案
```

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
