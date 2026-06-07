# Package Planning

> 最近更新：2026-05-20

这里放 KMD 生态包的计划。它回答“这个包负责什么、对外 API 是什么、什么时候可以抽离或发布”。

## 当前包边界

- `@kmd/language`：已存在，承接 grammar 和 language configuration 等低耦合语言资产。
- `@kmd/reader-runtime-web`：已建立，承接 Android WebView 可宿主的 Web runtime artifact。
- `@kmd/core`：未来包，等 runtime hot path、IR、layout measurement 和 host boundary 稳定后再抽离。
- `@kmd/language-service`：未来包，承接 LSP、诊断、补全和编辑器语义能力。

## 放置规则

- 包 API、export surface、发布条件、拆包触发条件放这里。
- 阶段执行顺序仍放 `../roadmap/`。
- 某个应用如何消费这些包放 `../apps/`。

## 当前入口

- `reader-runtime-web.md`：`@kmd/reader-runtime-web` 的包边界、构建产物和后续抽 core 条件。
