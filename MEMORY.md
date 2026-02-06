# Project Memory: Kinetic Typography Engine (KMD)

> **Goal:** 构建一个高性能、插件化、支持复杂排版、艺术化演出和交互式阅读的 KMD 渲染引擎。
> **Stack:** Vue 3 + TypeScript + PixiJS v8 + GSAP

---

## 1. 核心设计哲学 (Core Philosophy)

1.  **文字即演员 (Text as Actor):** 文字拥有物理属性（位置、速度、震动、颜色、滤镜）的实体。
2.  **所见即所读 (WYSIWYR):** 演出指令深度内嵌于文本流，节奏与语义高度统一。
3.  **文学直觉排版 (Literary Intuition):** 定位算子 (`prev`, `next`, `line`) 遵循创作者对“文字盒子”的感知，而非物理像素。
4.  **全异步导演系统 (Director System):** [v0.9.0] 指令执行移至播放期，支持复杂的动画等待、信号分流与节奏控制。

---

## 2. 架构演进历程 (Version History)

### v0.9.0 - v0.9.5: 奠基与重构
*   **异步管线**: 确立了 `init -> applyEffects -> play` 的三相生命周期。
*   **Scanner v2**: 放弃 PEG.js 改为手写状态机扫描仪，彻底解决转义字符、独立 Sugar 符号（`>` `~` `^`）与花括号组 (`braceGroupId`) 的隔离映射。

### v0.9.6: 预言机架构 (Oracle)
*   **Oracle Pass**: 引入双通扫描（Phantom Pass），通过预模拟全段落排版，建立“未来坐标图”，使脚本能超前引用 `next.*` 点位。
*   **状态机分流**: 实现 **Go/Wait Branching**，解决了推进信号与演出阻塞的逻辑冲突。

### v1.0.0: 精准协作与原子演出 (Latest)
*   **全知坐标系**: 确立以 `(960, 540)` 为原点的中心化设计空间，自动处理全局/局部偏移补偿，修复了所有已知的坐标漂移问题。
*   **情报同步机制**: 完善了预言机对用户自定义标记 (User Markers) 的同步，支持跨行、跨段落的精准超前定位。
*   **原子级 Parameter Injection**: 实现 `charIndex` 自动注入，使 `wave`, `rainbow` 等效果能根据文字顺序自动产生优雅的时序交错 (Staggering)。
*   **排版闭环**: 修正了最后一行对齐、0ms 速度传染、以及脱流行 Collapse 逻辑，达成几何与演出逻辑的绝对自洽。

---

## 3. 技术栈演进对照表

| 功能模块 | v0.9.6 | v1.0.0 (Latest) |
| :--- | :--- | :--- |
| **坐标系** | 容器局部坐标 | **统一设计空间 (960, 540) 映射** |
| **排版预言** | 内部保留字预测 | **跨行情报共享与用户标记同步** |
| **效果粒度** | Token 级整体应用 | **原子级 (Char-level) 时序交错** |
| **并发模型** | 分流截断模型 | **状态机加固 (防止速度传染与溢出)** |
| **映射策略** | 组 ID 隔离 | **花括号优先 + 组级效果持久化** |

---

## 4. 关键技术突破 (Milestones)

### 4.1 全知预言机 (Omniscient Oracle)
通过 Phantom Pass 模拟未来的对齐与算子执行。1.0.0 彻底打通了情报链路，使脚本能精准捕捉到尚未生成的文字边缘或未来定义的坐标点（如 `p2`）。

### 4.2 分相重建架构 (Phased Realization)
ScriptPlayer 采用“测量 (measure) -> 物理定位 -> 重建 (rebuild)”流程。通过带入真实 `baseOffset` 的二次排版，消除了 UI 容器定位与文字物理坐标之间的累积误差。

### 4.3 物理包围盒锚点 (Physical Bounding Box)
所有 `prev|line|next` 的标记点均基于文字的物理包围盒（Bounding Box）或 Baseline 计算。即便在 `align=center` 模式下，也能精准命中文字的真实边缘。

---
*Last Updated: 2026-02-05*
