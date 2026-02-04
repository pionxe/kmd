import { layout } from "../layout/LayoutEngine";
import { readerApp } from "../App";
import gsap from "gsap";
import type { PresentationMode } from "./PresentationMode";

export class ScrollMode implements PresentationMode {
  async present(content: string): Promise<void> {
    // 1. 检查滚屏
    const threshold = readerApp.pixiApp.screen.height * 0.7;
    const container = layout.container;
    if (layout.currentY > threshold && container) {
      const offset = layout.currentY - threshold;
      gsap.to(container, { y: -offset, duration: 0.5 });
    }

    // 2. 添加行 (需 await)
    const line = await layout.addLine(content);
    
    // 应用段落效果
    await line.applyParagraphEffects();

    // 3. 播放打字机
    await line.play();
  }

  reset() {
    layout.reset();
    gsap.to(layout.container, { y: 0, duration: 0 });
  }

  onScroll(deltaY: number) {
    layout.scrollBy(deltaY);
  }
}