# KMD Editor - Implementation Plan

## 1. 韵律标准与排版进化 (v1.1.0) - [DONE]
- [x] MD 语法解糖、Baseline V2、相对字距。

## 2. Monaco 编辑器与智能增强 (v1.1.5) - [DONE]
- [x] Monarch 高亮、IntelliSense 补全、实时错误诊断。

## 3. 生产力工具集 (v1.2.0 - v1.3.0) - [DONE]
- [x] Pinia 状态抽离、WindowFrame 容器、标签页系统。

## 4. 自由布局引擎 (v1.4.0 - Docking System) - [DONE]
- [x] 递归 `LayoutTree`、拖拽停靠 (DnD)、原子布局重构。

## 5. 深度联调与同步 (v1.5.0 - Front Matter Sync) - [DONE]
- [x] 双向同步引擎、科技感 Inspector、布局审计系统。

## 6. 下一阶段：时间之主 (v1.6.0 - Timeline & Interaction) - [Current]
### 6.1 全局时间轴内核
- [ ] **时间戳注入**: 在扫描阶段为每个 Token 计算预估的起始时间 (`startTime`)。
- [ ] **主时间轴控制器**: 引入全局 GSAP Master Timeline，管理所有并发动画。
- [ ] **进度条组件**: 实现可视化进度条，支持点击跳转与拖拽 Scrubbing。

### 6.2 编辑器 - 播放器联动
- [ ] **行高亮系统**: 根据播放进度，实时在 Monaco 中添加 `current-line-decoration`。
- [ ] **反向定位**: 在编辑器点击某行，播放器跳转至该行对应的 `startTime`。

### 6.3 交互式属性调参 (Inspector v2)
- [ ] **指令元数据**: 为 `EffectManager` 增加指令描述与参数 Schema。
- [ ] **可视化调参**: 在 Inspector 中选中行时，动态生成滑块、开关来修改指令参数。

## 7. 资产与视觉进阶
- [ ] **资产库 (Asset Explorer)**: 管理图片、音频资源。
- [ ] **西文 Kerning Pair 自动微调**。
