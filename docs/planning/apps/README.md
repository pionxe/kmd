# Application Planning

> 最近更新：2026-05-19

这里放 KMD 生态应用和服务的计划。它回答“这个宿主或服务如何使用 KMD 能力，以及它自己的交付目标是什么”。

## 当前应用

- `editor`：当前 Web 编辑器，仍承载主要 runtime 源码。
- `android-reader`：独立 Android checkout，通过 WebView 消费 reader runtime。
- `vscode-extension`：VS Code KMD 语言扩展。
- `community-api`：课程阶段使用的社区 API mock 后端。
- `community-web`：未来社区 Web 或官网方向。

## 放置规则

- 单个应用的产品目标、集成计划、宿主职责放这里。
- 包边界和公共 API 放 `../packages/`。
- 跨应用与跨包的仓库策略放 `../ecosystem/`。
