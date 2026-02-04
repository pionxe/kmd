import { Container } from "pixi.js";
import { KineticText } from "../KineticText";
import { readerApp } from "../App";
import type { KineticTextOptions } from "../KineticText";
import type { MarkerMap, LayoutAuditRecord } from "./types";
import { TextLayoutEngine } from "./TextLayoutEngine";
import { stageManager } from "../stage/StageManager";
import gsap from "gsap";

class LayoutEngine {
  currentY: number = 0;
  public maxWidth: number = 800;
  private paragraphSpacing: number = 20;
  private startY: number = 100;
  container: Container | null = null;

  public enableManualScroll = true;
  public globalMarkers: MarkerMap = new Map();

  public init(container: Container, startY: number = 100) {
    this.container = container;
    this.startY = startY;
    this.maxWidth = readerApp.pixiApp.screen.width * 0.8;
    this.reset(); // 初始重置
    readerApp.pixiApp.ticker.add(this.update, this);

    readerApp.pixiApp.renderer.on("resize", () => {
      this.recenterAll();
    });
  }

  private async recenterAll() {
    if (!this.container) return;
    const newWidth = readerApp.pixiApp.screen.width;
    const newMaxWidth = stageManager.isFixedRatio ? stageManager.designWidth * 0.8 : newWidth * 0.8;

    this.currentY = this.startY;
    for (const child of this.container.children) {
      if (child instanceof KineticText) {
        await child.rebuild({ maxWidth: newMaxWidth });
        const logicalScreenWidth = stageManager.isFixedRatio ? stageManager.designWidth : newWidth;
        child.x = (logicalScreenWidth - newMaxWidth) / 2;
        child.y = this.currentY;
        this.currentY += child.getLayoutHeight() + this.paragraphSpacing;
      }
    }
  }

  private targetScrollY: number = 0;

  /**
   * 重置排版引擎状态
   * @param clearVariables 是否连同文件头定义的变量一起清除 (默认为 false)
   */
  public reset(clearVariables: boolean = false) {
    this.currentY = this.startY;
    this.targetScrollY = 0;
    
    if (clearVariables) {
      this.globalMarkers.clear();
    } else {
      // 仅清理非变量标记 (即清理那些不以 var. 开头的运行时 Marker)
      for (const key of this.globalMarkers.keys()) {
        if (!key.startsWith("var.")) {
          this.globalMarkers.delete(key);
        }
      }
    }
    
    TextLayoutEngine.lastAuditLog = [];
  }

  private updateLineMarkers(posX: number, posY: number, width: number, isNext = false, isCurrent = false) {
    let prefix = isNext ? "next" : "prev";
    if (isCurrent) prefix = "line";
    const markers = this.globalMarkers;
    const start = { x: posX, y: posY };
    const mid = { x: posX + width / 2, y: posY };
    const end = { x: posX + width, y: posY };
    markers.set(`${prefix}.start`, start);
    markers.set(`${prefix}.mid`, mid);
    markers.set(`${prefix}.end`, end);
  }

  public async addLine(kmdString: string, options?: KineticTextOptions): Promise<KineticText> {
    const line = await this.createLine(kmdString, options);
    this.appendLine(line);
    return line;
  }

  public get remainingHeight(): number {
    const screenHeight = stageManager.isFixedRatio ? stageManager.designHeight : readerApp.pixiApp.screen.height;
    const bottomPadding = 100;
    return screenHeight - bottomPadding - this.currentY;
  }

  public async createLine(kmdString: string, options?: KineticTextOptions): Promise<KineticText> {
    const logicalScreenWidth = stageManager.isFixedRatio ? stageManager.designWidth : readerApp.pixiApp.screen.width;
    const posX = (logicalScreenWidth - this.maxWidth) / 2;

    this.updateLineMarkers(posX, this.currentY, this.maxWidth, false, true);
    this.updateLineMarkers(posX, this.currentY + 60, this.maxWidth, true);

    const finalOptions: KineticTextOptions = {
      maxWidth: this.maxWidth,
      align: "left",
      externalMarkers: this.globalMarkers,
      baseOffset: { x: posX, y: this.currentY },
      ...options,
    };

    const line = new KineticText(finalOptions);
    await line.init(kmdString);
    
    line.x = posX;
    line.y = this.currentY;
    return line;
  }

  public appendLine(line: KineticText) {
    if (!this.container) return;

    if (Math.abs(line.y - this.currentY) > 0.1) {
      const logicalScreenWidth = stageManager.isFixedRatio ? stageManager.designWidth : readerApp.pixiApp.screen.width;
      const posX = (logicalScreenWidth - this.maxWidth) / 2;
      line.x = posX;
      line.y = this.currentY;
      line.rebuild({ baseOffset: { x: posX, y: this.currentY } });
    }

    this.container.addChild(line);
    // line.applyParagraphEffects(); // 由策略模式调用

    const logicalHeight = line.getLayoutHeight();
    const logicalWidth = line.getLayoutWidth();
    this.updateLineMarkers(line.x, this.currentY, logicalWidth, false);

    if (logicalHeight > 0) {
      this.currentY += logicalHeight + this.paragraphSpacing;
    }
  }

  public dumpReport(): LayoutAuditRecord[] {
    const logs = TextLayoutEngine.lastAuditLog;
    console.log("=== KMD Layout Audit Report ===");
    fetch("http://localhost:9999/", {
      method: "POST",
      body: JSON.stringify(logs, null, 2),
      headers: { "Content-Type": "application/json" }
    }).catch(err => console.warn("Log collector not running:", err));
    return logs;
  }

  private update() {
    if (!this.container || stageManager.isFixedRatio) return;
    const screenHeight = readerApp.pixiApp.screen.height;
    const containerY = this.container.y;
    this.container.children.forEach((child) => {
      const absY = child.y + containerY;
      const isVisible = absY + child.height > 0 && absY < screenHeight;
      child.renderable = isVisible;
    });
  }

  public scrollBy(delta: number) {
    if (!this.container || stageManager.isFixedRatio) return;
    if (Math.abs(this.container.y - this.targetScrollY) > 50) {
      this.targetScrollY = this.container.y;
    }
    const newY = this.targetScrollY - delta;
    const minY = -this.currentY + readerApp.pixiApp.screen.height;
    const effectiveMin = Math.min(minY, 0);
    this.targetScrollY = Math.max(Math.min(newY, 0), effectiveMin);
    gsap.to(this.container, {
      y: this.targetScrollY,
      duration: 0.5,
      ease: "power2.out",
      overwrite: "auto"
    });
  }
}

export const layout = new LayoutEngine();