import { layout } from "../layout/LayoutEngine";
import gsap from "gsap";
import type { PresentationMode } from "./PresentationMode";

export class PageMode implements PresentationMode {
  async present(content: string): Promise<void> {
    // 1. 预构建行 (需 await)
    const line = await layout.createLine(content);
    const lineHeight = line.getLayoutHeight();

    // 2. 检查剩余空间
    if (lineHeight > layout.remainingHeight && layout.currentY > 100) {
      await this.clearPage();
    }

    // 3. 正式添加
    layout.appendLine(line);
    
    // 应用段落效果 (如 [cam.zoom])
    await line.applyParagraphEffects();

    // 4. 播放
    await line.play();
  }

  private async clearPage() {
    const container = layout.container;
    if (!container) return;
    await gsap.to(container, { alpha: 0, duration: 0.3 });
    container.removeChildren();
    container.alpha = 1;
    layout.reset();
  }

  reset() {
    this.clearPage();
  }
}