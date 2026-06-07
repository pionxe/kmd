# Work Presentation Generation Draft

> 文档状态：草案 / 待启动
> 最近更新：2026-05-27

## 1. 为什么单独放这里

Android Reader 已经暴露出一个真实问题：`.kmd` frontmatter 和 `Work.presentation` 现在可能被手写成两份事实。这个问题应该被记录，但它不适合作为 Android Reader 当前 roadmap 的 R5 阶段。

原因：

- 它横跨 editor、community-api、Android Reader 和未来社区发布流程。
- 它依赖 editor 的导出/发布能力，也依赖 community-api 从 seed/mock 走向真实作品修订。
- 当前 Android Reader 的近期目标是稳定 runtime、补阅读 UI、落地书架和审阅 companion。

因此，本文件只保存生态级草案。它不是近期实施计划。

## 2. 当前结论

长期事实定义见 `docs/knowledge/architecture/work-kmd-content-model.md`。

当前结论保持不变：

- `.kmd` source 是作者侧事实，负责脚本文本和播放本地元信息。
- `Work` 是平台作品事实，负责社区、审核、书架、推荐和生命周期。
- `Work.presentation` 是从 active `.kmd` revision 派生出的索引投影，不应长期手写。
- 如果 `.kmd` metadata 与 `Work.presentation` 不一致，应视为生成器或索引过期问题，而不是普通 runtime 选择。

## 3. 非目标

当前不做：

- 不在 Android Reader 内实现完整生成器。
- 不要求 community-api 立刻从 `.kmd` source 派生所有 seed 字段。
- 不阻塞 Android Reader 的 runtime UI、书架、本地导入和审阅 companion。
- 不把它和 Phase B 语言新特性绑定。

## 4. 未来触发条件

满足任意两个条件时，可以把本草案升级为正式计划：

1. Editor 开始设计“发布到社区”或“导出 Work 草稿”流程。
2. community-api 开始从 mock seed 走向真实修订模型。
3. Android Reader 的本地导入需要稳定生成本地 `Work`。
4. `.kmd` frontmatter 字段进入较稳定状态。
5. 社区审核需要对 revision、presentation 和 source snapshot 做一致性校验。

## 5. 可能的生成点

```text
Editor export / publish
  -> parse active .kmd source
  -> derive Work.presentation draft
  -> submit Work draft + KmdScriptRevision

Community API import / publish
  -> receive .kmd revision
  -> parse source metadata
  -> derive indexed Work.presentation
  -> store projection with revision id

Android local import
  -> read local .kmd source
  -> parse minimal metadata
  -> derive local Work presentation
  -> store in LocalLibrary
```

## 6. 最小字段草案

第一版只派生阅读和展示需要的字段：

```text
source:
  .kmd frontmatter

projection:
  presentation.mode
  presentation.designWidth
  presentation.designHeight
  presentation.estimatedDurationMs
  presentation.language
  title fallback
  subtitle / summary fallback
  declared fonts/assets summary
  capability hints
```

社区字段仍由 `Work` 自己持有：

```text
author
cover
tags
review status
comments / likes / reads
lifecycle status
ranking
```

## 7. Android Reader 当前策略

在生成器出现前：

- 播放路径优先读取 `.kmd` source metadata。
- 列表、详情、筛选、书架卡片继续使用 `Work.presentation` 或 mock projection。
- 如果二者冲突，阅读页以 `.kmd` 为准，诊断信息应标注存在 metadata divergence。
- Android roadmap 只跟踪这个风险，不承诺实现生态生成链。

## 8. 后续拆分

当本草案升级为正式计划时，建议拆成：

- `docs/planning/apps/editor/community-publish-plan.md`
- `docs/planning/apps/community-api/work-revision-plan.md`
- `docs/planning/apps/android-reader/local-import-projection-plan.md`
- `docs/knowledge/architecture/work-kmd-content-model.md` 的字段规范更新
