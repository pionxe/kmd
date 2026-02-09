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

### v1.0.0: 精准协作与原子演出
*   **全知坐标系**: 确立以 `(960, 540)` 为原点的中心化设计空间，自动处理全局/局部偏移补偿。
*   **情报同步机制**: 完善了预言机对用户自定义标记 (User Markers) 的同步。
*   **原子级 Parameter Injection**: 实现 `charIndex` 自动注入，使特效产生单字级相位差。

### v1.1.0: 韵律标准与生产级表现 (Latest)
*   **Rhythm Standard**: 引入基于 MD 的韵律语法（`**` 加粗, `*` 轻声, `#` 特殊样式），极大降低了演出编排的复杂度。
*   **Baseline V2**: 彻底重构排版基准，从“中心对齐”进化为“基线锚定 + 动态锚点”，解决了大小字混排时的垂直错位问题。
*   **Production Font System**: 使用原生 `FontFace` API 解决了 CJK 大字体的加载与匹配问题，并引入 `0.02em` 相对字距提升视觉密度。
*   **Pipeline Optimization**: 实现了样式去重逻辑，修复了 relative 样式（如 `big`）在多相构建中产生的“双重缩放”Bug。

---

## 3. 技术栈演进对照表

| 功能模块 | v1.0.0 | v1.1.0 (Latest) |
| :--- | :--- | :--- |
| **坐标系** | 统一设计空间 (960, 540) | **物理基线 (Baseline) 锚定体系** |
| **排版对齐** | 行中线中心对齐 | **动态锚点 (Ascent/Height) 基线对齐** |
| **字间距** | 固定间距 | **相对字距 (0.02em Tracking)** |
| **字体加载** | Pixi Assets 自动加载 | **原生 FontFace API 显式注册** |
| **样式生命周期** | 逐帧执行叠加 | **初始状态快照 + 播放期增量更新** |

---

## 4. 关键技术突破 (Milestones)

### 4.1 全知预言机 (Omniscient Oracle)
通过 Phantom Pass 模拟未来的对齐与算子执行。1.0.0 彻底打通了情报链路，使脚本能精准捕捉到尚未生成的文字边缘或未来定义的坐标点（如 `p2`）。

### 4.2 基线锚定排版 (Baseline-Anchored Layout)
1.1.0 引入的核心技术。通过 `CanvasTextMetrics` 获取物理 `ascent`，动态计算每个字符的 `anchor.y`。这使得不同字号、不同字体的文字都能完美地踩在同一条视觉地平线上。

### 4.3 生产级 CJK 字体机制
针对中文字体文件大、加载慢、名称复杂的特点，建立了“FontFace 强制注册 -> Fonts Ready 阻塞 -> 物理度量快照”的一整套加载链条，确保了文字渲染的绝对稳定性。

---
*Last Updated: 2026-02-05*