# KMD Editor - Rhythm Standard Implementation Plan

## 1. 韵律语法解糖 (Rhythm Syntax Desugaring)
在 `KMDScanner.ts` 中实现对 MD 语法的识别与转换。

- [x] **重音强调 (`**Bold**`)**
  - [x] 识别正则: `\*\*(.*?)\*\*`
  - [x] 转换逻辑: `{text} @ bold.big.~`
  - [x] 效果细节: 字重加粗，字号 * 1.5，播放速度减慢 (`slow`)。

- [x] **轻声私语 (`*Italic*`)**
  - [x] 识别正则: `\*(.*?)\*`
  - [x] 转换逻辑: `{text} @ thin.small.dim.^`
  - [x] 效果细节: 字重变细 (100)，字号 * 0.8，透明度 0.7，播放速度加快 (`fast`)。

- [x] **情境转场 (`---`)**
  - [x] 识别逻辑: 单独一行的 `---`。
  - [x] 转换逻辑: 映射为 `clear` 指令并附加 `wait(0.5s)`。
  - [x] 播放器支持: `ScriptPlayer` 捕获 `isSceneClear` 并执行 `clearScreen()`。

- [x] **特殊字体/身份 (`# Text`)**
  - [x] 识别逻辑: 行首的 `# `。
  - [x] 转换逻辑: 为该行所有 Token 附加 `special` 样式。
  - [x] 样式定制: 在 `styles.ts` 中定义 `special` 预设（Georgia, italic, light gray）。

## 2. 引擎底层支持 (Engine Support)

- [x] **StyleManager 增强**
  - [x] 支持 `thin` (fontWeight: 100) 预设。
  - [x] 支持 `dim` (alpha: 0.7) 预设。
  - [x] 优化 `big`/`small` 的比例。

- [x] **KMDScanner 状态机重构**
  - [x] 在 `scanLineBody` 中增加对 `*` 的状态追踪。
  - [x] 增加行首符号扫描（Heading/Horizontal Rule）。
  - [x] **修复**: 防止具有不同效果的 Token 被错误合并。

- [x] **ScriptPlayer 指令接力**
  - [x] 完善 `next` 流程对 `isSceneClear` 的处理。
  - [x] 确保 `---` 转场时执行清屏。

## 3. 验证与测试
- [x] 编写并运行 `src/test-markdown-parser.ts` 验证语法解析。
- [ ] 在实际渲染环境中测试视觉表现（由于环境限制，暂未执行，但逻辑已跑通）。
