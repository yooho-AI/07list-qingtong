# 青铜之笼 (qingtong)

> L1 | 独立 SPA 古希腊历史生存模拟游戏
> React 19 + Zustand + Immer + Framer Motion + Tailwind CSS v4 + Vite 7

公元前432年雅典，12岁少年阿莱克西斯被出售为贵族男宠 — 四位关键人物，双层时间系统，九种结局。

## 架构

```
07list-qingtong/
├── worker/index.js              - ☆ CF Worker API 代理（备用，未部署）
├── public/
│   ├── audio/bgm.mp3            - 背景音乐
│   ├── characters/              - 4 角色立绘 9:16 竖版 (1152x2048)
│   └── scenes/                  - 8 场景背景 9:16 竖版 (1152x2048)
├── src/
│   ├── main.tsx                 - ☆ React 入口
│   ├── vite-env.d.ts            - Vite 类型声明
│   ├── App.tsx                  - 根组件: 开场屏 + GameScreen(AppShell) + EndingModal + MenuOverlay
│   ├── lib/
│   │   ├── script.md            - ★ 剧本直通：五模块原文（零转换注入 prompt）
│   │   ├── data.ts              - ★ UI 薄层：类型(含富消息扩展) + 4角色 + 8场景 + 9道具 + 5章节 + 10事件 + 9结局
│   │   ├── store.ts             - ★ 状态中枢：Zustand + 富消息插入(场景/换月) + 抽屉状态 + StoryRecord + 双轨解析 + 链式反应
│   │   ├── parser.ts            - AI 回复解析（4角色着色 + 数值着色 + extractChoices）
│   │   ├── analytics.ts         - Umami 埋点（qt_ 前缀）
│   │   ├── stream.ts            - ☆ SSE 流式通信
│   │   ├── bgm.ts               - ☆ 背景音乐
│   │   └── hooks.ts             - ☆ useMediaQuery / useIsMobile
│   ├── styles/
│   │   ├── globals.css          - 全局基础样式（qt- 前缀）
│   │   ├── opening.css          - 开场样式：古希腊柱纹 + 雾气 + 金色标题
│   │   └── rich-cards.css       - 富UI组件：场景卡 + 章节卡 + NPC气泡 + Dashboard + RecordSheet + SVG关系图
│   └── components/game/
│       ├── app-shell.tsx        - 桌面居中壳 + Header + Tab路由 + 5键TabBar + 三向手势 + DashboardDrawer + RecordSheet + Toast
│       ├── dashboard-drawer.tsx - 调查笔记(左抽屉)：扉页+人物轮播+场景缩略图+目标+道具格+属性+音乐。Reorder拖拽排序
│       ├── tab-dialogue.tsx     - 对话Tab：富消息路由(SceneCard/ChapterCard/NPC头像气泡) + 可折叠选项面板 + 快捷操作 + 背包
│       ├── tab-scene.tsx        - 场景Tab：9:16大图 + 角色标签行 + 地点列表
│       └── tab-character.tsx    - 人物Tab：SVG关系图 + 玩家属性 + 角色列表 + 全屏档案
├── index.html
├── package.json
├── vite.config.ts               - ☆
├── tsconfig*.json               - ☆
└── wrangler.toml                - ☆
```

★ = 种子文件 ☆ = 零修改模板

## 核心设计

- **古希腊历史生存**：4 NPC 角色，8 场景，9 道具，5 章节，9 结局
- **双轨数值**：5 玩家属性（健康/洞察/自主/希望/技艺）+ NPC 异构属性（好感/信任/占有欲/威胁/同情）
- **暗青铜主题**：深底(#0f0d0a)+青铜(#CD7F32)，qt- CSS 前缀，STKaiti 字体
- **6 时段制**：每月 6 时段（黎明/上午/正午/午后/傍晚/深夜），共 60 月
- **剧本直通**：script.md 存五模块原文，?raw import 注入 prompt
- **9 结局**：BE×3 + TE×2 + HE×2 + NE×2，优先级 TE→HE→BE→NE

## 富UI组件系统

| 组件 | 位置 | 触发 | 视觉风格 |
|------|------|------|----------|
| StartScreen | App.tsx | 开场 | 古希腊柱纹+雾气+金色标题+角色立绘预览 |
| DashboardDrawer | dashboard-drawer | Header📓+右滑手势 | 毛玻璃+青铜渐变：扉页+人物轮播+场景缩略图+目标+道具+属性+音乐+Reorder拖拽 |
| RecordSheet | app-shell | Header📜+左滑手势 | 右侧滑入事件记录：时间线倒序+青铜圆点 |
| SceneTransitionCard | tab-dialogue | selectScene | 场景背景+Ken Burns(8s)+渐变遮罩+角标 |
| ChapterCard | tab-dialogue | 换章 | 石碑风格+月份+章节名+青铜配色 |
| NpcBubble | tab-dialogue | assistant 消息 | 28px圆形立绘+彩色左边框 |
| RelationGraph | tab-character | 始终可见 | SVG环形布局，中心"我"+4NPC立绘节点+连线+关系标签 |
| CharacterDossier | tab-character | 点击角色 | 全屏右滑入+立绘+属性条+好感阶段+秘密暗示 |
| EndingModal | App.tsx | checkEnding | ENDING_TYPE_MAP驱动+继续探索/返回标题 |
| Toast | app-shell | saveGame | TabBar上方弹出 |

## 三向手势导航

- **右滑**（任意主Tab内容区）→ 左侧调查笔记
- **左滑**（任意主Tab内容区）→ 右侧事件记录
- Header 按钮（📓/📜）同等触发
- 笔记内组件支持拖拽排序（Reorder + localStorage `qt-dash-order` 持久化）

## Store 状态扩展

- `activeTab: 'dialogue' | 'scene' | 'character'`
- `showDashboard / showRecords: boolean` — 左右抽屉开关
- `storyRecords: StoryRecord[]` — 事件记录（sendMessage 和 advanceMonth 自动追加）
- `choices: string[]` — AI 动态选项
- `selectCharacter` 末尾自动跳转 dialogue Tab

## 富消息机制

Message 类型扩展 `type` 字段路由渲染：
- `scene-transition` → SceneTransitionCard（selectScene 触发）
- `chapter-change` → ChapterCard（advanceMonth 换章时触发）
- NPC 消息带 `character` 字段 → 28px 圆形立绘头像

## Analytics 集成

- `trackGameStart` / `trackPlayerCreate` → App.tsx 开场
- `trackGameContinue` → App.tsx 继续游戏
- `trackTimeAdvance` / `trackChapterEnter` → store.ts advanceMonth
- `trackEndingReached` → store.ts checkEnding
- `trackMentalCrisis` → store.ts hope≤20
- `trackSceneUnlock` → store.ts selectScene/advanceMonth

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
