# KMD Implementation Roadmap

> 状态：Active
> 最近更新：2026-05-19

## 当前判断

KMD 1.6 Phase A 与 Phase B Prep 已完成 parser、layout、execution、stage、diagnostics 和 metadata 的主链路准备。但继续推进 Phase B 时，我们发现语言设计本身需要更完整的重构：命名空间、指令封装、响应式变量、布局关系、控制流和游戏化 segment 会一起展开。

同时，Android Reader 课程项目需要一个可复用、无 Pinia、无 editor shell 耦合的 WebView runtime。因此当前路线调整为：

> 在 Phase B 前插入 Phase R，优先抽离 reader-runtime-web；Phase B 退回 roadmap/design 状态，等待 runtime 边界稳定后再实施。

## 阶段顺序

### Completed: Phase A / Phase B Prep

已完成：

- Timeline 化与 Segment 基础设施
- parser AST/IR 主链路与 compat 投影
- LayoutPlanner / DisplayAssembler / CompatBinder 起手
- StageRuntime / ReaderHost / PresentationManager 分层
- diagnostics / audit 总线统一
- effect/layout/stage metadata 与 parser syntax-only 预留
- `packages/language` 语言资产包

### Current: Phase R — Reader Runtime Web Extraction

目标：

- 形成可被 Android WebView 宿主的 reader runtime。
- runtime 不依赖 Vue、Pinia、Monaco、editor panels。
- 提供 `createReaderRuntime(container, options)` 形式的 session/factory API。
- 产出 reader-only web bundle，供 Android 作为静态 assets 加载。

非目标：

- 不发布纯 `@kmd/core`。
- 不引入 Phase B 新语法。
- 不把 parser/layout/effect 重写到 Kotlin。

详细计划见 `phase-r-reader-runtime-web.md`。

### Deferred: Phase B — Language / State / Control Flow / Segment Graph

Phase B 保留为下一轮语言与 execution graph 阶段。它包括：

- `+` 并发链、续行、文本插值
- `StateStore`、表达式、响应式绑定
- `@ if / @ loop / @ tag / @ jump / @ wait`
- `SegmentGraphPlan` 与 graph playback
- namespace provider 与 command family 正式化

进入条件：

- reader-runtime-web 已能独立构建并由 Android WebView 加载。
- core hot path 不再直接 import Pinia store。
- `ScriptPlayer` / runtime façade 具备 host callbacks。
- Phase B 语言设计文档完成一次收敛审查。

### Future: Phase C And v1.7+

Phase C：

- SignalRegistry
- game-like segment runtime
- non-deterministic / interactive segment backend
- in-flight animation continuation

v1.7+：

- plugin API
- sugar registry
- LSP / VS Code preview
- theme and grammar contribution pipeline

## 维护规则

- `docs/planning/roadmap` 放阶段路线。
- `docs/planning/packages` 放生态包计划。
- `docs/planning/apps` 放生态应用计划。
- `docs/knowledge/language` 放仍在探索的语言设计。
- `docs/planning/TODO.md` 可保留详细任务池，但阶段优先级以本目录为准。
