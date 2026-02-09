# KMD Editor - Rhythm Standard Implementation Plan

## 1. 韵律语法解糖 (Rhythm Syntax Desugaring)
在 `KMDScanner.ts` 中实现对 MD 语法的识别与转换。

- [x] **重音强调 (`**Bold**`)**
  - [x] 识别正则: `\*\*(.*?)\*\*`
  - [x] 转换逻辑: `{text} @ bold.~`
  - [x] 效果细节: 字重加粗，播放速度减慢 (`slow`)。

- [x] **轻声私语 (`*Italic*`)**
  - [x] 识别正则: `\*(.*?)\*`
  - [x] 转换逻辑: `{text} @ thin.dim.^`
  - [x] 效果细节: 字重变细 (100)，透明度 0.7，播放速度加快 (`fast`)。

- [x] **情境转场 (`---`)**
  - [x] 识别逻辑: 单独一行的 `---`。
  - [x] 转换逻辑: 映射为 `clear` 指令并附加 `wait(0.5s)`。
  - [x] 播放器支持: `ScriptPlayer` 捕获 `isSceneClear` 并执行 `clearScreen()`。

- [x] **特殊字体/身份 (`# Text`)**
  - [x] 识别逻辑: 行首的 `# `。
  - [x] 转换逻辑: 为该行所有 Token 附加 `special` 样式。
  - [x] 样式定制: 在 `styles.ts` 中定义 `special` 预设（Smiley Sans, Oblique）。

## 2. 引擎底层支持 (Engine Support)

- [x] **Baseline V2 排版进化**
  - [x] 实现基于物理 `ascent` 的动态锚点对齐。
  - [x] 修复大小字混排时的“下沉/上浮”问题。
  - [x] 引入 `0.02em` 相对字距（Tracking）。

- [x] **生产级字体系统**
  - [x] 使用原生 `FontFace` API 解决 CJK 字体加载竞赛。
  - [x] 强制等待 `document.fonts.ready`。

- [x] **逻辑健壮性**
  - [x] 修复“双重缩放”Bug（样式去重）。
  - [x] 修复速度糖衣的累加效应。
  - [x] 支持 MD 语法在 `{}` 内的嵌套。

## 3. 验证与测试
- [x] 编写并运行 `src/test-markdown-parser.ts` 验证语法解析。
- [x] 运行 `npx vue-tsc -b` 完成全项目类型检查。

---

## 4. 后续规划 (Next Steps)
- [ ] **视觉质感增强**
  - [ ] 实现针对西文的 Kerning Pair 自动微调。
  - [ ] 探索基于 `---` 的 3D 转场或纹理溶解特效。
- [ ] **编辑器集成**
  - [ ] 为 VS Code 提供基于 v1.1.0 语法的实时高亮插件。