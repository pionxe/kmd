# Phase 6 (1.6AV) Implementation Plan

> 状态：Completed (Closed on 2026-05-07)
> 目标：统一 diagnostics / audit 总线，推进 `StageManager` 第二轮瘦身，并继续拆解 layout / execution 中残余的单体逻辑与 legacy 出口，为 Phase B 建立更干净的 runtime surface

## 背景

Phase 5 已经把 paragraph build 主链路收口到：

```text
ParagraphBuildInput
  -> LayoutPlanner
  -> DisplayAssembler
  -> CompatBinder
  -> KineticText / ParagraphUnit
```

但当下还有三块明显未完成的结构债，且它们已经在代码中形成可见热点：

1. diagnostics / audit 仍是多套并存
   - parser 使用 `ParserDiagnostic[]`
   - execution 侧已有 `DiagnosticEvent`
   - `TextPlayer.reportPlanDiagnostics()` 直接 `console.*`
   - `StageManager` 仍通过 `StageAuditPort` / `camAuditLog` / `dumpCamReport()` 暴露审计
   - `LayoutEngine.dumpReport()` 仍直接向本地 `localhost` collector `POST`
2. `StageManager` 仍保留 host 绑定、resize/ticker、letterbox、world transform、audit compat export 等多类职责
3. layout / execution 仍有几块“能跑但过厚”的核心模块
   - `TextPlayer.ts` 约 900+ 行
   - `SegmentBuilder.ts` 约 480 行
   - `TextLayoutEngine.ts` 仍同时维护 preflight / final placement 双路径
   - `LayoutEngine.ts` 仍混有宿主、审计导出与旧布局管理职责

如果不先收掉这些面，Phase B 的 graph / state / control-flow 很容易直接踩在多套 diagnostics、过厚 façade 和 legacy export path 之上继续增长。

## 当前进展

- 已完成 `WP1 Unified DiagnosticsCollector / AuditBus` 的第一刀落地：
  - 新增 `src/core/diagnostics/AuditBus.ts`
  - 新增 `src/core/diagnostics/DiagnosticsCollector.ts`
  - 新增 `src/core/diagnostics/ConsoleDiagnosticsSink.ts`
  - `ScriptPlayer` parse/build diagnostics 已接入 collector / bus
  - `TextPlayer` plan diagnostics 已脱离“只打 console”的旧路径
  - `StageAuditPort` 已具备统一 collector / bus 适配器
  - `LayoutEngine.dumpReport()` / `StageManager.dumpCamReport()` 已降级为 compat wrapper，不再承担网络导出
- 已完成 `WP2 StageManager Round 2 Slimming` 的第一刀落地：
  - 新增 `src/core/stage/StageHostSession.ts`
  - `StageManager` 不再直接持有 host listener / ticker / resize / world transform 细节
  - host mount、viewport 更新、letterbox/world transform 已收口到 `StageHostSession`
  - 新增 `getAuditSnapshot()` 作为 stage audit 的 canonical 读取入口
  - `camAuditLog` / `stageConflictDiagnostics` 已退回 compat getter
- 已完成 `WP3 Layout Diagnostics and Pass Tightening` 的第一刀落地：
  - 新增 `src/core/layout/LayoutPassRunner.ts`
  - `TextLayoutEngine.preflight()` / `calculate()` 已共用 stream 遍历、context 初始化、overflow/newline 判定与步进计算骨架
  - `LayoutEngine.dumpReport()` 已明确退回 compat wrapper；layout audit 继续走统一 bus / collector 主路径
- 已完成 `WP4 Execution Monolith Split and Legacy Tightening` 的第一刀落地：
  - 新增 `src/core/render/text/TextPlanDiagnosticsSink.ts`
  - 新增 `src/core/render/text/TextStageCueScheduler.ts`
  - 新增 `src/core/render/text/TextTimelineCursor.ts`
  - 新增 `src/core/player/ScriptSourceLoader.ts`
  - 新增 `src/core/player/ScriptBuildReporter.ts`
  - `TextPlayer` 已将 diagnostics sink、stage cue scheduling、timing cursor 状态从主类中拆出
  - `ScriptPlayer` 已将 source loading、parse/build report 与 diagnostics 汇聚从主类中收口到旁路模块
- 已完成 `WP5 Validation and Guard Rails` 的自动验证与审查收口：
  - `AuditBus`、`DiagnosticsCollector` 与 `StageAudit` 已增加 bounded retention
  - `ScriptBuildReporter.beginBuildSession()` / `ScriptPlayer.load()` 已补 build-scope reset
  - `script.parse.complete` 的 severity 已改为 `error / warn / info`
  - `test:parser` 已切换为本地 `tsx` + `node --import tsx`，不再依赖 `npx`
  - `.gitignore` 已补 `.codex` 与 `parser-output.json`
- 已完成 `WP6 Execution Payload Decoupling`：
  - `TextBuildTarget` / `KineticText` 已增加独立 execution payload surface
  - `DisplayAssembler` 已输出 display token + execution payload 的 assembly 结果
  - `SegmentBuilder` / `createParagraphExecutionPlan()` / `TextPlayer.buildTimeline()` 主路径已切到 payload
  - legacy `play()` / `bakeTimeline()` / `fastForward()` 也已切到 payload，不再反读 `KineticChar` 语义字段
  - `KineticChar.visualEffects / timingSugars / stageInstructions / tokenIdx` 已降级为 mirrored compat surface，并显式标注为 deprecated
- 已完成 `WP7 Layout Middleware Seed`：
  - 新增 `src/core/layout/LineAccumulator.ts`
  - 新增 `src/core/layout/AnchorCoordinator.ts`
  - 新增 `src/core/layout/LayoutAuditEmitter.ts`
  - `TextLayoutEngine` 已收口为 pass orchestration，本体不再内联主要的 line alignment / reserved marker / audit emit 细节
  - preflight 与 final placement 的 reserved marker 同步、line-break 状态推进已改由中间件辅助模块承担
- 已完成 `WP8 Display Host / Runtime Entity Split Prep`：
  - 新增 `ParagraphDisplayAssembly` 作为 paragraph build 的 canonical assembly surface
  - `KineticText` 已持有 `_displayAssembly`，并将 `tokens / _allCharsCached / _executionItems` 明确降级为 legacy compat mirror
  - `DisplayAssembler` / `CompatBinder` 已通过显式 assembly 连接 display host 与 execution payload
  - `SegmentBuilder`、`createParagraphExecutionPlan()` 与 legacy `play()` / `bakeTimeline()` / `skipToEnd()` 已切到 assembly 驱动，而不是依赖 `KineticChar` 可变语义字段
- 已验证：
  - `vue-tsc -b`
  - `pnpm build`
  - `pnpm test:parser`（本地 `tsx` + `node --import tsx`）
  - 关键样例脚本人工回归（`scene.clear / page / seek / resize / diagnostics parity`）

## 本阶段定位

这不是 Phase B。

本阶段仍属于 Phase A 的“主链路收口”工作，重点是：

- 给 parser / layout / execution / stage 准备统一 diagnostics surface
- 继续瘦身 `StageManager`
- 让 layout / execution 的剩余 monolith 开始按角色裂解
- 收紧旧的调试/审计输出路径，防止 compat API 继续演化成主路径

## 范围

### In Scope

1. 统一 `DiagnosticsCollector / AuditBus` 的最小骨架与适配层
2. `StageManager` 第二轮瘦身
3. `TextLayoutEngine` / `LayoutEngine` / `TextPlayer` / `ScriptPlayer` 的剩余单体职责再拆分一轮
4. 旧调试/审计导出路径的兼容收紧
5. 针对 diagnostics / audit / stage resize / seek 的回归验证

### Out of Scope

1. `DocumentSemanticIR` / `SegmentGraphPlan` 的真实 rollout
2. `StateStore` / `@if` / `@loop` / `@jump` / `@wait` 等 Phase B 功能
3. plugin hook 的正式开放
4. `KineticText / KineticChar` 的最终形态收缩
5. `init(rawText)` compat path 与 legacy `play()` 的彻底删除

## 当前已确认的热点

### 1. diagnostics / audit 已有共享类型，但没有共享落点

当前 `src/core/types/diagnostics.ts` 已经定义了：

- `DiagnosticEvent`
- `AuditEvent`
- `SourceOrigin`

但真正的消费路径仍分散在多处：

- parser parse/build 返回局部数组
- `TextPlayer` 即时打印 plan diagnostics
- `StageAuditPort` 维护 stage 私有内存日志
- `LayoutEngine.dumpReport()` 直接承担网络导出

也就是说，共享类型已经有了，但“共享 collector / bus”仍未落地。

### 2. `StageManager` 仍不是纯 façade

当前它除了委托 `StageRuntime` / `PresentationManager` 外，还直接保留：

- `ReaderHost` attach/init
- resize 监听绑定与解绑
- world / letterbox transform 更新
- stage audit compat export
- 兼容期的 `dumpCamReport()`

这会使“舞台执行”“宿主呈现”“审计导出”继续挤在同一个入口上。

### 3. `TextLayoutEngine` 的双 pass 还只是“并列实现”

`preflight()` 与 `calculate()` 虽已正式命名，但仍重复维护：

- 首行 ascent 计算
- wrap 逻辑
- tracking / stepDistance
- 行对齐与边界估算

这已经不是单纯的风格问题，而是后续语义漂移风险。

### 4. `TextPlayer` 仍兼具 planner 尾巴、scheduler 与 assembler

当前它同时处理：

- plan diagnostics 输出
- timing sugar 解释
- cursor 推进策略
- empty-char stage 指令触发
- token-end stage 指令调度
- group/char chain 展开

它虽然已经从旧 `play()` 前进了一大步，但还没有完全退回到 timeline assembler 的角色。

### 5. 旧调试导出路径仍在“主工程可见面”上

尤其包括：

- `StageManager.camAuditLog`
- `StageManager.dumpCamReport()`
- `LayoutEngine.dumpReport()`
- `TextLayoutEngine.lastAuditLog`

这些路径短期可以保留，但不能再被新代码继续依赖。

## 工作包

### WP1. Unified DiagnosticsCollector / AuditBus

目标：为 parser / layout / execution / stage 建立同一套 diagnostics 与 audit 汇聚出口。

建议方向：

- 新增共享设施，例如：
  - `src/core/diagnostics/DiagnosticsCollector.ts`
  - `src/core/diagnostics/AuditBus.ts`
  - 视情况补充 adapter / snapshot 类型
- 以现有 `DiagnosticEvent` / `AuditEvent` 为 canonical 事件形状
- 区分两类使用方式：
  - build-scope collector
  - runtime-scope bus

建议先接入这些入口：

- parser parse/load diagnostics
- `TextPlayer.reportPlanDiagnostics()`
- `StageAuditPort` -> bus adapter
- layout audit trace / export

验收标准：

1. 新增核心逻辑不再直接用 `console.*` 作为唯一 diagnostics sink
2. `StageManager` 与 `LayoutEngine` 不再承担网络导出职责
3. 至少能够拿到一次 build 和一次 runtime 的统一快照

### WP2. StageManager Round 2 Slimming

目标：让 `StageManager` 从“多职责入口”继续收缩为 composition root + compat façade。

建议方向：

- 抽出 host/session 相关角色，例如：
  - `StageHostSession`
  - 或 `StageViewportController`
- 让其承接：
  - mount / unmount
  - resize 监听
  - ticker 绑定
  - letterbox/world transform 更新
- `StageManager` 只保留：
  - runtime façade
  - presentation façade
  - compat API
  - audit collector 注入入口

同步收紧：

- `camAuditLog`
- `dumpCamReport()`
- 任何 stage 私有日志导出逻辑

验收标准：

1. `StageManager.ts` 不再直接拥有 host listener 生命周期细节
2. world transform / resize 更新职责有明确归属
3. stage audit 导出改走统一 bus / collector，而不是 manager 私有接口

### WP3. Layout Diagnostics and Pass Tightening

目标：继续把 layout core 从“兼顾执行与导出”的大块实现，收缩为更清晰的 pass + audit 边界。

建议方向：

- 从 `TextLayoutEngine` 中抽出共享 pass runner 骨架，例如：
  - `LayoutPassRunner`
  - `LineAccumulator`
  - `AnchorCoordinator`
  - `LayoutAuditEmitter`
- 让 `preflight()` 与 `calculate()` 共享：
  - wrap 决策
  - first-line ascent / baseline 初始化
  - stepDistance 计算
  - 行边界与对齐策略
- 将 `LayoutEngine.dumpReport()` 降级为 compat wrapper，实际导出改走 `AuditBus`

如果本轮精力允许，也建议开始收紧：

- `LayoutEngine` 对 `readerApp` 的直接依赖
- 布局宿主职责与审计职责的混合

验收标准：

1. preflight / final placement 不再继续复制核心行推进逻辑
2. layout audit trace 可被统一 collector 读取
3. `LayoutEngine` 不再负责实际 report transport

### WP4. Execution Monolith Split and Legacy Tightening

目标：继续削减 execution 主链路中残余的“现场解释器”气味。

建议方向：

#### `TextPlayer`

优先拆出三类职责：

- `PlanDiagnosticSink`
  - 处理 diagnostics 输出，不再内联 `console.*`
- `TimelineCursor` / `TimingCursor`
  - 管 cursor、pause、advance、timing sugar 的推进策略
- `StageCueScheduler`
  - 管 empty-char 与 token-end stage instruction 的触发时机

若拆分顺利，再进一步收口：

- group / char chain unroll helper
- behavior/style record 记录逻辑

#### `ScriptPlayer`

第一轮不追求大拆，但建议收走这些职责：

- source text / file path 解析入口
- parse + build diagnostics 收集
- build summary / audit snapshot 暴露

可以考虑新增：

- `ScriptSourceLoader`
- `ScriptBuildSession`

#### compat / legacy 收紧

本轮不删除 compat path，但应明确“新主路径禁止继续依赖”的界线：

- `KineticText.init(rawText)` 继续保留，仅作为 source-driven compat path
- `LayoutEngine.dumpReport()` / `StageManager.dumpCamReport()` 仅保留兼容外壳
- legacy `play()` 继续视为受控兼容层，不纳入新逻辑演进

验收标准：

1. `TextPlayer` 不再自己承担 diagnostics sink
2. stage cue 调度与时间推进逻辑有独立入口
3. `ScriptPlayer` 的 load/build 过程可以产出统一的 build report
4. compat API 明确变成 wrapper，而非主路径

### WP5. Validation and Guard Rails

目标：确保本轮拆分不误伤 seek / stage / diagnostics / layout。

最低验证集：

- `pnpm build`
- `pnpm test:parser`
- 样例脚本人工回归：
  - `scene.clear`
  - `page`
  - `seek`
  - stage resize / scroll-mode reflow
  - diagnostics / audit parity

建议新增的最小自动验证：

- build diagnostics collector smoke test
- stage audit adapter smoke test
- layout preflight/final parity smoke test

文档同步：

- `docs/planning/roadmap/phase-a-refactor/README.md`
- `docs/planning/TODO.md`
- 本阶段完成后新增 `phase6-code-review.md`

### WP6. Execution Payload Decoupling

目标：让 paragraph build / execution plan / timeline build 的主链路，不再通过 `KineticChar` 上的可变语义字段传递执行信息。

建议方向：

- 在 build 结果中引入独立的 execution payload / assembly 结构
- 让 `DisplayAssembler` 输出：
  - display object（`KineticChar` / `TokenWrapper`）
  - execution payload（effects / timing sugars / stage instructions / token boundary metadata）
- 将这些主路径切到 payload：
  - `SegmentBuilder`
  - `createParagraphExecutionPlan()`
  - `TextPlayer.buildTimeline()`

本轮不要求立刻删除 legacy surface，但应明确分层：

- `KineticChar.visualEffects / timingSugars / stageInstructions` 暂时保留
- 仅供 legacy `play()` / `bakeTimeline()` / `skipToEnd()` 兼容路径使用
- 新主路径禁止继续从 `KineticChar` 反读 execution 语义

验收标准：

1. `createParagraphExecutionPlan()` 不再直接依赖 `KineticChar` 上的语义字段
2. `TextPlayer.buildTimeline()` 的主路径不再从 `char.visualEffects / stageInstructions / timingSugars` 取数
3. execution 语义来源明确为 paragraph build 输出的 assembly/payload

### WP7. Layout Middleware Seed

目标：在已有 `LayoutPassRunner` 基础上，继续把 `TextLayoutEngine` 从“共享骨架 + 大量内联状态处理”推进到更清晰的 layout middleware 结构。

建议方向：

- 从 `TextLayoutEngine` 中继续抽出：
  - `LineAccumulator`
  - `AnchorCoordinator`
  - `LayoutAuditEmitter`
- 将这些逻辑从 engine 本体中移出：
  - reserved marker 更新
  - line break / wrap 后的状态流转
  - final audit log rebuild
- 保持 `preflight()` / `calculate()` 的共享遍历骨架不变，优先清理状态职责

验收标准：

1. `TextLayoutEngine` 不再内联主要的 line-state / anchor-state 更新细节
2. marker / line / audit 的职责边界变得可单测、可替换

### WP8. Display Host / Runtime Entity Split Prep

目标：为后续 display host 与 runtime entity 分离做准备，避免 `KineticChar` 继续同时承担显示对象与执行语义载体。

建议方向：

- 引入更显式的 paragraph display assembly 结构
- 区分：
  - display host object（Pixi `KineticChar` / `TokenWrapper`）
  - runtime execution entity / payload
- 保留 legacy fallback：
  - `play()`
  - `bakeTimeline()`
  - `skipToEnd()`
  但停止让新主路径继续扩大对这些 compat surface 的依赖

验收标准：

1. 新主路径的 execution 规划与运行不要求 `KineticChar` 自带语义字段
2. `KineticChar` 朝“纯 display host”方向收缩，而不是继续增长 execution 状态

## 推荐顺序

1. `WP1 Unified DiagnosticsCollector / AuditBus`
2. `WP2 StageManager Round 2 Slimming`
3. `WP3 Layout Diagnostics and Pass Tightening`
4. `WP4 Execution Monolith Split and Legacy Tightening`
5. `WP5 Validation and Guard Rails`
6. `WP6 Execution Payload Decoupling`
7. `WP7 Layout Middleware Seed`
8. `WP8 Display Host / Runtime Entity Split Prep`

这样排序的原因：

- 不先统一 diagnostics surface，后面每拆一刀都还会继续复制一套输出口
- `StageManager` 和 `LayoutEngine` 都带有旧导出/审计职责，先收口更能减少后续扩散
- `TextPlayer` / `ScriptPlayer` 的剩余拆分依赖更清楚的 collector / façade 边界

## 风险与控制

### 风险 1：collector / bus 设计过重，反而拖慢主线

控制方式：

- 第一轮只建立最小事件汇聚面
- 不一次做完整 Inspector / export / replay 平台
- 优先做 adapter，而不是立即推倒已有 diagnostics 结构

### 风险 2：`StageManager` 过早深拆，影响现有 stage 行为稳定性

控制方式：

- 继续保留 façade 对外 API
- host/session 先内部迁移，不急于外部改名
- `scene.clear` / `page` / `seek` 作为强制回归集

### 风险 3：layout 双 pass 抽象过快，导致 marker 语义漂移

控制方式：

- 先抽共享 runner，再动结构化 anchor 的更深层设计
- 保留现有 `LayoutPreflightResult` 契约不动
- 对 `prev.* / line.* / next.*` 做专门样例回归

### 风险 4：compat wrapper 名义上保留，实际上继续被新代码依赖

控制方式：

- 文档与代码注释同时标明 compat-only
- 新增调用点必须优先接 plan/bus/collector 主路径
- 审查重点转向“是否新增了旧出口依赖”

## 阶段完成定义

第六阶段完成后，应至少满足：

1. parser / layout / execution / stage 已有统一 diagnostics / audit 汇聚入口
2. `StageManager` 不再直接承载 host listener / resize / audit export 细节
3. `TextLayoutEngine` 的双 pass 已开始共享核心 runner，而不是继续双份复制
4. `TextPlayer` 的 diagnostics sink 与 stage cue scheduling 有明确拆分
5. 旧的 report/export API 已降级为 compat wrapper，不再作为新主路径的一部分

## 与 Phase B 的关系

Phase B 仍然是下一层真正的 graph / state / control-flow rollout。

但在这之前，Phase 6 负责把：

- diagnostics surface
- runtime façade
- layout / execution 残余 monolith
- legacy export path

先收口到一个不再继续扩散的状态。这样进入 `DocumentSemanticIR`、`ControlFlowMiddleware`、`StateMiddleware` 时，才不会再出现“新层级一落地，就必须同时接三套旧调试口和两套 manager façade”的问题。
