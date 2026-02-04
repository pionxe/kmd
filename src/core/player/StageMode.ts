import { layout } from "../layout/LayoutEngine";
import { stageManager } from "../stage/StageManager";
import type { PresentationMode } from "./PresentationMode";

export class StageMode implements PresentationMode {
  constructor() {
    stageManager.setMode("stage");
  }

  async present(content: string): Promise<void> {
    // 舞台模式下，使用 createLine -> appendLine (需 await)
    const line = await layout.createLine(content);
    layout.appendLine(line);
    
    // 关键：等待段落级指令 (包括 wait) 执行完毕
    await line.applyParagraphEffects();
    
    // 关键：等待打字机播放完毕
    await line.play();
  }

  onScroll(deltaY: number): void {
    // 使用组件化的指令进行平移
    stageManager.apply("cam.move", {
      x: stageManager.camera.x,
      y: stageManager.camera.y + deltaY * 0.5,
      duration: 0.1
    });
  }

  reset() {
    layout.reset();
    stageManager.setMode("scroll");
  }
}