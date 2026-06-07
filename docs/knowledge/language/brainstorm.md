# Language Brainstorm

> 最近更新：2026-05-27
> 状态：Brainstorm / Not Implemented

这里收纳尚未收敛、但可能影响 Phase B 语言形状的想法。本文不是当前 runtime 契约，也不是 parser 已支持语法。

## Cross-KMD References

当前 runtime 仍以宿主传入的单个入口 `.kmd` 为播放源。未来如果 `.kmd` 可以引用另一个 `.kmd`，它不应该只是“把文本拼进去”的 include。更健康的语义是：入口 `.kmd` 声明文档依赖，resolver 在 parser/lowering 前形成受控的 document dependency graph。

可能存在三类引用：

- 特效宏库：只导入宏、特效对象和命名空间，不产生可播放段落。
- 片段/章节引用：允许 `@ jump` 或未来 `@ call` 跳到外部文档中的 tag / segment。
- 资源脚本：作为 shader、layout preset、game segment config 等数据源，由 manifest 控制加载。

占位语法可以长这样，具体关键字未定：

```kmd
@ use "./effects/weather.kmd" as weather
雨夜。 @ f.weather.rain

@ link chapter2 from "./chapter-2.kmd#start"
@ jump chapter2
```

## Link To Phase B

这条想法应归入 Phase B 的三个系统，而不是当前 Community API 或 reader runtime：

- B0 syntax frontend：定义宏、特效对象、命名空间引用和 dependency declaration 的 AST 形状。
- B2 control flow：让 `@ jump` / future `@ call` 能表达跨文档 tag 或 segment target。
- B3 SegmentGraphPlan：允许 graph edge 持有 `documentId` / `moduleId`，但不让播放器热路径自由加载文件。

## Constraints

- 引用必须通过 Work revision、`assetManifest` 或未来 import map 解析。
- runtime 不应在播放热路径里自由 fetch 任意相对 `.kmd` 路径。
- 外部 `.kmd` 不应自动成为另一个 `Work`；它首先是当前 Work revision 的受控脚本依赖。
- 循环引用、命名空间遮蔽、跨文档 state 作用域都需要 diagnostics。

## Open Questions

- `.kmd` 引用另一个 `.kmd` 时，是导入宏/对象、跳到外部 segment，还是二者都允许？
- 跨文档引用的 state 是否共享，还是每个 document/module 有独立 state scope？
- effect object 是否按 namespace 隔离，还是允许显式 re-export？
- dependency graph 应属于 Work revision manifest，还是成为语言级 import map？
- Android 离线缓存应缓存展开后的单文件 bundle，还是缓存入口 `.kmd` 加依赖图？

## Runtime Viewport Switching During Playback

> 来源：Android Reader 全屏 runtime 原型讨论。

移动端阅读可能需要在同一个 `.kmd` 播放会话中切换 viewport：例如竖屏阅读流进入横屏舞台段落，或用户在播放中把手机旋转为横屏。这个能力暂时不应被设计成创作者直接调用的语言语法，而应先作为 host/runtime 协议能力脑暴。

核心目标：

- 切换 viewport 不应等价于重新加载作品。
- 播放进度、timeline 状态、变量状态和当前 segment 应尽量保持。
- `stage` / `interactive` 模式应优先保持设计坐标系，只重算 letterbox、baseScale 和交互命中映射。
- 横屏舞台不应长期作为竖屏 letterbox 内容阅读；它应被视为需要横屏观看的作品形态，竖屏 letterbox 只是过渡或兼容态。
- `scroll` / `paged` 模式可以触发 reflow，但必须明确哪些 marker、段落布局和滚动位置可被稳定恢复。
- `designWidth` / `designHeight` 属于 stage design space；普通阅读文档不应把固定设计画布作为布局事实。

可能的协议草案：

```ts
type RuntimeViewportMode = 'portrait' | 'landscape' | 'adaptive';

interface ReaderRuntimeViewport {
  width: number;
  height: number;
  devicePixelRatio?: number;
  orientation?: RuntimeViewportMode;
  backgroundColor?: string;
}

interface SetViewportCommand {
  type: 'setViewport';
  viewport: ReaderRuntimeViewport;
  preservePlayback: true;
  transition?: 'instant' | 'fade' | 'letterbox';
}
```

推荐流程：

1. Host 感知窗口变化、系统旋转或用户选择。
2. Host 根据 Work presentation、设备尺寸和安全区域生成新 viewport。
3. Runtime Bridge 发送 `setViewport`，不要销毁 WebView / player session。
4. Runtime 暂停或标记当前 tick，应用新 viewport。
5. Stage 模式更新 world transform；scroll/page 模式执行可恢复 reflow。
6. Runtime 返回 `viewportChanged`，附带恢复后的 progress / time / layout diagnostics。
7. 失败时保持旧 viewport，并返回 recoverable error。

开放问题：

- `.kmd` 是否需要声明某些段落只能横屏、只能竖屏，还是完全由 Work metadata 负责？
- 如果播放中的特效正依赖屏幕边界、marker 或相机参数，viewport 切换时应立即重算还是等待当前 cue 结束？
- scroll/page 模式的 reflow 会不会破坏“同一时间点看到同一行”的阅读预期？
- 互动作品中，用户手势、系统返回手势和桌面切换手势的优先级如何统一？
- Android / Web / Editor Preview 是否共享同一套 `setViewport` 协议，还是 Android 先实验？

## Community Overlay Around Runtime

> 来源：横屏舞台在手机竖屏中 letterbox 的体验讨论。

横屏舞台如果在竖屏中播放，上下两侧会出现大量空白。普通阅读内容不应该放进这些空白里，因为舞台本体仍然太小；但未来社区体验可以把这些区域用作非阻塞浮层。

可能形态：

- 横屏视频式浏览：舞台内容居中，上下信息带显示标题、作者、评论摘要、审核提示、相关推荐和轻量操作。
- 竖屏阅读式浏览：正文自适应容器，社区信息以左/右侧栏、抽屉或半透明 companion 形式出现。
- 审核视角：横屏舞台旁边或上下区域展示脚本问题、性能提示、资源缺失和一键定位，但不遮挡舞台主体。

约束：

- 社区浮层不是 runtime viewport 的一部分，不改变 `.kmd` 的设计坐标系。
- 浮层不得成为横屏舞台在竖屏中“可读”的借口；舞台作品仍应提供横屏观看路径。
- 这属于社区体验层和审核工具层，不属于当前 Android Reader runtime UI MVP。

## Future Mobile Editor

> 来源：Android Reader 审阅源码查看器边界讨论。

移动端 editor 的方向暂时只作为脑暴，不进入当前 Android Reader runtime UI 任务。原因是未来 KMD script editor 很可能是高度 UI 化的：它不只是一个文本框，而是源码、时间线、舞台预览、特效参数和社区 revision 的组合工作台。现在如果在 Reader 里做一个半成品编辑器，很可能会在真正 editor 启动时重做。

### 可能形态

移动端 editor 可以分成几层，而不是直接复制桌面 Monaco：

- 快速修正模式：改错字、调参数、增删少量行。
- 片段编辑模式：围绕当前播放行或 issue source range 编辑一个小片段。
- 视觉参数模式：把常用特效参数做成滑块、颜色、时间和 easing 控件。
- 时间线模式：围绕 marker / line / cue 调整节奏。
- 审阅回放模式：从 Reader issue 或 discussion 进入，对照播放表现修改。
- Revision 模式：保存本地 snapshot，提交 community revision。

### Reader 到 Editor 的交接

Reader 不直接编辑源码，而是生成上下文：

```text
Reader playback line / source range / issue
  -> review note / discussion / edit intent
  -> Mobile Editor opens same Work revision
  -> author edits working draft
  -> save local snapshot
  -> submit community revision
```

这意味着当前 Reader 只需要稳定这些基础对象：

- `KmdSourceSnapshot`
- source range / source anchor
- playback position
- issue anchor
- review draft / edit intent

这些对象未来可以被移动端 editor 复用，但 Reader 不需要提前实现 editor 行为。

### 编辑能力分级

```text
Level 0: Read-only source context
  - 行号、播放行、issue 定位、discussion anchor
  - 当前 Android Reader 应做到这里

Level 1: Patch suggestion
  - 对某几行提出替换建议
  - 不直接覆盖源码

Level 2: Light text edit
  - 改少量文字、增删几行
  - 需要 undo、dirty state、本地 snapshot

Level 3: Structured effect edit
  - 特效参数 UI、时间线 marker、颜色/速度/位置调节
  - 需要 parser/diagnostics 与 runtime preview 紧密配合

Level 4: Full mobile editor
  - 多文件、版本、社区提交、协作讨论、完整 preview
```

当前 Android Reader 只承诺 Level 0；Level 1 可以作为 review suggestion 出现；Level 2 之后应由独立 mobile editor 计划承接。

### 开放问题

- 移动端 editor 是 Android Reader 的一个模式，还是独立 app / 独立 workspace？
- 轻量编辑是否允许离线保存本地 snapshot？
- 视觉化编辑如何避免和文本源码产生两个事实来源？
- 高级特效参数 UI 应从 command catalog 自动生成，还是人工设计常用面板？
- Reader 中的 issue/discussion anchor 是否能无损跳转到 editor 的对应片段？
