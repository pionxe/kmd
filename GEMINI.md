# KMD Editor - Kinetic Markdown Context

## Project Overview

**kmd-editor** 是一个针对 **Kinetic Markdown (KMD)** 的演出级渲染引擎。

*   **Core Engine:** Pixi.js (v8) GPU 加速渲染。
*   **Animation System:** GSAP 深度驱动动画生命周期。
*   **Framework:** Vue 3 + TypeScript。
*   **Version:** **v1.1.0 (Rhythm Standard)** - 实现了基于 MD 的韵律标准、Baseline V2 精准排版与生产级字体系统。

## Kinetic Markdown (KMD) Syntax

一个标准的 KMD 段落包含：
1.  **Front Matter:** YAML 配置。支持 `designWidth/Height`、`speed` 及自定义 `var` 变量。
2.  **Paragraph Block:** `[Block Options] Body @ Commands`
3.  **Rhythm Standard (v1.1.0):**
    *   **\*\*Bold\*\*:** 重音强调。自动解糖为 `bold` 样式 + `slow` 节奏。
    *   **\*Italic\*:** 轻声私语。自动解糖为 `thin` + `dim` 样式 + `fast` 节奏。
    *   **# Heading:** 特殊身份/字体。为全行应用 `special` 样式预设。
    *   **---**: 情境转场。强制清屏并等待 0.5s。
4.  **Control Sugars:**
    *   **! (Wait):** 强制同步等待当前演出。
    *   **| (Pause):** 行内停顿，支持 `|(1s)` 显式传参。
    *   **> / >> / >>>**: 独立时序控制。分别对应“字符级 Go”、“行级 Go”、“段落级 Go”。
    *   **~ / ^**: 独立语速调节（慢速/快速）。

## Architecture & Pipeline (v1.1.0)

### 1. 核心管线 (The Pipeline)
1.  **Scanner (KMDScanner):** 线性扫描识别 Sugar Token。支持 MD 语法嵌套识别与 `braceGroupId` 隔离。
2.  **Layout Oracle (TextLayoutEngine):** 
    *   **Phantom Pass**: 建立基于 **Baseline V2** 的未来坐标图。
    *   **Baseline V2**: 坐标系锚定于字符基线，通过物理 `ascent` 动态计算 `anchor.y`，彻底解决大小字混排时的上下漂浮问题。
3.  **Director (ScriptPlayer):** 
    *   **Measure Phase**: 孤立测量段落总高度。
    *   **Reify Phase**: 带入真实 `baseOffset` 重建排版。
    *   **Font Readiness**: 强制等待 `document.fonts.ready` 确保度量数据绝对精确。
4.  **Performance Phase (KineticText):** 
    *   **Style De-duplication**: 自动识别并跳过已应用的初始样式（如 `big`），解决双重缩放 Bug。
    *   **Relative Tracking**: 引入基于字号的比例间距 (`0.02em`)，提供专业级紧凑排版质感。

### 2. 坐标与定位体系
*   **统一设计空间**: 以 1920x1080 逻辑舞台为基准，逻辑原点位于屏幕中心 (960, 540)。
*   **物理基线锚定**: 所有 `prev|line|next` 标记均基于字符基线（Baseline）计算。
*   **动态步进**: `stepDistance` 实时记录光标推进值，支持精确的原子级位移。

### 3. 特效与字体系统
*   **Style Mutex**: 管理颜色、字号、字重等。支持 `font(name)` 显式切换。
*   **Production Font Loading**: 使用原生 `FontFace` API 强制注册 CJK 字体别名，彻底解决中文字体加载与匹配失败问题。

## Development

### Key Commands
```bash
pnpm dev      # 启动开发环境
npm run test:parser  # 运行集成测试 (含 5.x 自动化断言)
npx vue-tsc -b  # 项目级类型检查
```