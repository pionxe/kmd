# Pre-Phase-B Reader Runtime Extraction Plan

> 状态：Draft
> 最近更新：2026-05-19
> 代号：Phase R

## 1. 背景

Phase B 的语言设计已经扩展为完整新语法体系，不能再和 Android Reader 的可交付 runtime 需求绑在同一阶段里推进。

Android Reader 当前更急需的是：

- 一个可被 WebView 加载的 KMD reader runtime bundle。
- 一个稳定的 JS bridge / message protocol。
- 一个不依赖 Pinia、Vue、Monaco 和 editor panels 的 runtime API。

因此 Phase B 前先插入 Phase R：抽离 reader-runtime-web，而不是直接抽纯 `@kmd/core`。

## 2. 决策

当前抽离目标是：

```text
@kmd/reader-runtime-web
```

不是：

```text
@kmd/core
```

原因：

- 当前 runtime 仍依赖 Pixi、GSAP、DOM font loading、Canvas/WebGL 和 browser timing。
- Android WebView 可以承载这些 Web runtime 依赖。
- 纯 core 的边界仍会被 command registry、layout measurement、stage runtime 和 asset loading 牵扯。

长期顺序应为：

```text
packages/language
  -> packages/reader-runtime-web
      -> packages/core
```

## 3. 目标 API

Reader runtime 应暴露 session factory：

```ts
const runtime = await createReaderRuntime(container, {
  assetBaseUrl,
  typography,
  viewport,
  callbacks: {
    onReady,
    onProgress,
    onPlaybackStateChanged,
    onTimelineChanged,
    onDiagnostic,
    onError,
  },
});

await runtime.loadSource(source);
runtime.play();
runtime.pause();
runtime.seek(seconds);
runtime.setTimeScale(1.25);
runtime.inspect();
runtime.dispose();
```

runtime 内部可以继续复用当前 parser/layout/effect/stage 实现，但对外不暴露 editor store、Vue component 或 global app shell。

## 4. 工作包

### R0. Scope And Inventory

任务：

- 固定 Phase R 不引入 Phase B 新语法。
- 列出 reader runtime 禁止导入项：`pinia`、Vue components、Monaco、TextMate、editor views。
- 对齐 Android 文档 `apps/android-reader/docs/core-portability-webview-feasibility.md` 的 D0-D3 路线。

验收：

- 主路线文档明确 Phase R 位于 Phase B 前。

### R1. Runtime Host Contract

任务：

- 定义 `ReaderRuntimeOptions`、`ReaderRuntimeCallbacks`、`ReaderRuntimeSession`。
- 将 typography、viewport、assetBaseUrl、presentation mode 作为 host config 注入。
- 明确 progress、timeline markers、diagnostics、error 的 callback payload。

验收：

- runtime API 可以不引用 Pinia 类型表达完整 host 交互。

### R2. Remove Editor Store From Runtime Hot Path

任务：

- 从 `ScriptPlayer`、`TextPlayer`、`TextBuildContextResolver` 中移除直接 `useEditorStore()`。
- 改为通过 runtime callbacks / build context / host adapter 更新 currentTime、currentLine、timelineMarkers、base style。
- editor 侧增加 adapter，把 callbacks 写回 Pinia。

验收：

- `apps/editor/src/core` 的 reader hot path 不再 import `store/editorStore`。
- editor 行为保持兼容。

### R3. Runtime Session And Lifecycle

任务：

- 引入 `createReaderRuntime(container, options)`。
- 将 `scriptPlayer` / `stageManager` / layout state 的使用收口到 session lifecycle。
- 增加 `dispose()`，清理 ticker、GSAP tween、Pixi containers、active behaviors。

验收：

- 同一页面可销毁并重建 runtime session。
- WebView 返回、旋转、重载有明确 lifecycle 入口。

### R4. Reader-Only Web Bundle

任务：

- 建立 reader runtime entry，不复用 editor app shell。
- 明确排除 Vue、Pinia、Monaco、TextMate、editor panels。
- 注入 fonts/assets 路径，不依赖站点根 `/fonts/...`。
- 输出 Android 可复制的静态 bundle。

验收：

- bundle 可在普通浏览器独立加载最小 KMD 脚本。
- `pnpm build` 仍构建 editor；新增 reader build 命令或 workspace script。

### R5. Android Bridge Contract Alignment

任务：

- 对齐 Android `ReaderRuntimeBridge` 与 JS runtime message envelope。
- 消息携带 `version`、`id`、`type`、`payload`。
- 保留 fake bridge 做 Android 单元测试。

验收：

- Android D0/D1 WebView shell 能与 reader runtime bundle 交换 `ready / progressChanged / playbackStateChanged / error`。

### R6. Packaging Decision Point

任务：

- 评估 reader runtime 是否已经适合落入 `packages/reader-runtime-web`。
- 若 package boundary 清晰，则移动；否则先保留 reader entry，但禁止 editor-only imports 回流。
- 记录是否、何时再抽 `packages/core`。

验收：

- Android 可消费 runtime artifact。
- repository strategy 更新完成。
- Phase B 是否恢复实施有明确判断。

## 5. Gate

每个阶段至少保持：

- `pnpm build`
- `pnpm test:parser`
- `pnpm language:check`
- editor 样例脚本人工回归

R4 起新增：

- reader runtime browser smoke test
- Android WebView shell smoke test

## 6. Phase B 恢复条件

Phase B 只有在以下条件满足后恢复：

- reader-runtime-web 已有可用入口或 package。
- runtime hot path 无 Pinia/editor shell direct import。
- Android WebView 已能加载最小 runtime bundle。
- Phase B 语言设计经过一次文档审查，确认不会重新污染 runtime boundary。

在此之前，`docs/planning/roadmap/phase-b/1.6-phase-b-plan.md` 保持为路线图与设计材料，不作为当前实施计划。
