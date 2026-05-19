# Roadmap Index

> 最近更新：2026-05-19

这里只放阶段级路线图。包级计划放 `../packages/`，应用级计划放 `../apps/`，跨生态策略放 `../ecosystem/`。

## 当前决策

Phase B 的语言与 Segment Graph 设计已经膨胀为一个完整新语法阶段，不再适合作为当前下一步直接实施对象。

当前优先级改为：

```text
Phase R: Reader Runtime Web Extraction
  -> Phase B: Language / State / Control Flow / Segment Graph
  -> Phase C: Interactive Runtime / Game-like Segments
  -> v1.7+: Plugin and Tooling Ecosystem
```

## 阶段文档

- `implementation-roadmap.md`：当前主路线摘要与阶段顺序。
- `phase-r-reader-runtime-web.md`：Phase R reader-runtime-web 抽离实施路线。
- `phase-b/1.6-phase-b-plan.md`：Phase B 功能设计，当前作为延后路线图保留。
- `phase-a-refactor/`：Phase A 与 Phase B Prep 的重构路线、实施方案和审查记录。

## 参考

- `../../knowledge/language/design.md`：语言设计探索草稿。
- `apps/android-reader/docs/core-portability-webview-feasibility.md`：Android WebView 宿主可行性审计。
