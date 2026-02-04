# KMD Editor - Kinetic Markdown Context

## Project Overview

**kmd-editor** 是一个针对 **Kinetic Markdown (KMD)** 的演出级渲染引擎。

*   **Core Engine:** Pixi.js (v8) GPU 加速渲染。
*   **Animation System:** GSAP 深度驱动动画生命周期。
*   **Framework:** Vue 3 + TypeScript。
*   **Version:** **v1.0.0 (Stable)** - 实现了全知排版预言机与原子级时序交错系统。

## Kinetic Markdown (KMD) Syntax

一个标准的 KMD 段落包含：
1.  **Front Matter:** YAML 配置。支持 `designWidth/Height`、`speed` 及自定义 `var` 变量。
2.  **Paragraph Block:** `[Block Options] Body @ Commands`
    *   **! (Wait):** 强制同步等待当前演出。
    *   **| (Pause):** 行内停顿，支持 `|(1s)` 显式传参。
    *   **> / >> / >>>**: 独立时序控制。分别对应“字符级 Go (速度持续)”、“行级 Go (分流推进)”、“段落级 Go (异步并发)”。
    *   **~ / ^**: 独立语速调节（慢速/快速）。

## Architecture & Pipeline (v1.0.0)

### 1. 核心管线 (The Pipeline)
1.  **Scanner (KMDScanner):** 线性扫描识别 Sugar Token。核心特性是 `braceGroupId`：当语法糖炸裂文本时，利用 GroupId 保证后续 Command 映射能精准找回被大括号包裹的逻辑整体。
2.  **Layout Oracle (TextLayoutEngine):** 
    *   **Phantom Pass**: 预扫描。模拟对齐、跳转与标记逻辑，建立基于 **Baseline 基准** 的未来坐标图。
    *   **Intelligence Sync**: 将幻影阶段发现的用户标记同步至全局表，允许脚本在文字生成前引用其坐标。
3.  **Director (ScriptPlayer):** 
    *   **Measurement Phase**: 孤立测量段落总高度。
    *   **Reify Phase**: 根据容器位置带入真实 `baseOffset` 重建排版，确保标记点的绝对坐标自洽。
4.  **Performance Phase (KineticText):** 
    *   **Go/Wait Branching**: 状态机分流。遇到 `>` 时，视觉演出被 Fork 到异步分支执行，主光标以 0ms 延迟继续推进。
    *   **Atomic Injection**: 在 `applyCharEffects` 阶段自动注入 `charIndex`，使 behavior 类型的特效（如 Wave）能自动产生单字级的相位差。

### 2. 坐标与定位体系
*   **统一设计空间**: 以 1920x1080 逻辑舞台为基准，逻辑原点位于 **屏幕中心 (960, 540)**。所有 `goto(x, y)` 指令在执行前会自动应用坐标偏移。
*   **文学对齐锚点**: 预定义标记 `prev|line|next` 的 `start|mid|end` 均动态基于文字物理包围盒（Bounding Box）边缘计算，不受对齐方式 (`align=center`) 干扰。
*   **主重力线 (BaselineY)**: 每一行拥有独立的 Y 轴基准。脱流字符 (goto) 虽不占物理流空间，但其坐标记录仍锚定于所属行的 Baseline。

### 3. 特效与 Modifier
*   **Modifier System:** `KineticChar` 的 Transform 是每一帧根据所有活跃 `Modifier` 叠加计算的结果，支持 `shake`, `wave`, `rainbow` 等多种属性并发叠加。
*   **Style Mutex**: `StyleManager` 负责管理文字样式（颜色、字号等）。支持样式持久化与动态覆盖，通过 `force` 标记解决时序链中的冲突。

## Development

### Key Commands
```bash
pnpm dev      # 启动开发环境
npm run test:parser  # 运行集成测试 (含 5.x 自动化断言)
npx vue-tsc -b  # 项目级类型检查
```
