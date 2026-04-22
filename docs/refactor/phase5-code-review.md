# Phase 5 (1.6AU) 代码审查报告

> 审查范围：当前 Phase 5 增量改动（`SegmentBuilder / KineticText / TextBuilder / layout` 主链路与文档同步）
> 对照参考：`docs/refactor/phase-5-implementation-plan.md`（WP1-WP5）
> 审查时间：2026-04-23

## 结论摘要

本轮拆分方向正确，`ParagraphBuildInput -> LayoutPlanner -> DisplayAssembler -> CompatBinder` 主链路已形成，`pnpm build` 与 `pnpm test:parser` 在当前工作区均通过。

2026-04-23 收尾更新后，Findings #1 / #2 已修复并复测通过；剩余仅有 1 个低风险仓库卫生问题（Finding #3）。

## 收尾更新（2026-04-23）

- 已将 `ParagraphBuildInput` 收紧为合法联合类型，并在 `TextBuilder` 中补上显式 invariant。
- 已移除 parser-driven `rebuild(startLine)` 的误导性参数传递；source-driven rebuild 改为使用持久化的 `_sourceStartLine`。
- 已完成样例脚本人工回归，`scene.clear / page / seek / paragraph build parity` 均已确认通过。
- 当前结论：Phase 5 代码可收尾，具备进入下一阶段规划/审查的条件。

## Findings（按严重度排序）

### 1. [Medium][Resolved] `TextBuilder` 对 `paragraph.ir` 仍使用空断言，存在运行时崩溃路径

- 位置：
  - `src/core/render/text/TextBuilder.ts:46`
  - `src/core/render/text/TextBuilder.ts:59-61`
- 现象：
  - `buildResolvedParagraph()` 使用 `LayoutPlanner.plan(ir!, ...)`。
  - `resolveParagraphInput()` 在 `input.paragraph.ir` 缺失且 `input.sourceKMD` 也缺失时，会原样返回 `input.paragraph`，最终把 `undefined` 传入 `LayoutPlanner`。
- 风险：
  - 对外暴露的 `buildFromParagraph()` 缺少硬性契约保护，未来新增调用点时可能触发非预期崩溃（特别是 parser/IR 过渡期的半结构化输入）。
- 收尾结果：
  - 已将 `ParagraphBuildInput` 收紧为“带 IR”或“带 sourceKMD”的合法联合。
  - 已在 `resolveParagraphInput()` 中补上显式 invariant。

### 2. [Medium][Resolved] `rebuild(startLine)` 在 parser-driven 路径被静默忽略，API 语义发生漂移

- 位置：
  - `src/core/KineticText.ts:75`
  - `src/core/KineticText.ts:85-87`
  - `src/core/player/SegmentBuilder.ts:370-376`
- 现象：
  - `KineticText.rebuild(newOptions, startLine)` 在 `_paragraphBuildInput` 存在时直接走 `buildFromParagraph()` 并 `return`，`startLine` 不再生效。
  - 但调用侧仍在传入 `paragraph.lineOffset`，形成“参数看似有效、实际无效”的隐式行为变化。
- 风险：
  - 后续若有调用方依赖 `startLine` 重新标注行号，可能出现编辑器行号映射或诊断定位偏移。
- 收尾结果：
  - 已明确废弃 parser-driven 路径中的 `startLine` 传递。
  - `KineticText.rebuild()` 不再接受该参数；调用侧同步清理。
  - source-driven rebuild 改为使用持久化的 `_sourceStartLine`，避免兼容路径语义回退。

### 3. [Low] 存在无业务意义的空文件变更（`.codex`）

- 位置：
  - `.codex`（空文件）
- 风险：
  - 会增加提交噪音，影响审查聚焦与变更可读性。
- 建议：
  - 在提交 Phase 5 代码前排除此文件（若非刻意设计产物）。

## 验证记录

- `pnpm build`：通过
- `pnpm test:parser`：通过（首次受沙箱网络限制失败，授权后复跑通过）
- 样例脚本人工回归：通过

## 覆盖缺口与后续建议

- 当前测试仍以 parser 为主；若后续继续推进 Phase B，建议补更正式的 build seam parity 自动回归。
- 本阶段 `WP5 Validation and Guard Rails` 已完成最小收尾：
  - parser-driven / source-driven 构建结果人工 parity 已核对
  - `scene.clear`、`page`、`seek` 的样例脚本人工回归已完成
