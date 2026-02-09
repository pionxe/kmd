import { Container } from "pixi.js";
import { parser } from "../parser/Parser";
import { KineticText } from "../KineticText";
import { layout } from "../layout/LayoutEngine";
import type { KMDParseResult, KMDParagraphData } from "../parser/types";
import { stageManager } from "../stage/StageManager";
import gsap from "gsap";

export class ScriptPlayer {
  private container: Container;
  private metadata: any = {};
  private paragraphs: KMDParagraphData[] = [];
  private rawParagraphs: string[] = [];
  private currentIndex: number = -1;
  private activeTexts: KineticText[] = [];
  
  private isAutoPlaying: boolean = false;
  private autoPlayTimer: any = null;
  private isProcessingNext: boolean = false;

  private currentMode: "stage" | "scroll" | "page" = "stage";

  constructor(container: Container) {
    this.container = container;
  }

  public async load(kmdSource: string) {
    let finalSource = kmdSource;
    if (kmdSource.endsWith(".kmd") || kmdSource.startsWith("/")) {
      try {
        const response = await fetch(kmdSource);
        const blob = await response.blob();
        finalSource = await blob.text(); // 浏览器通常默认按 UTF-8 处理 blob.text()
      } catch (err) {
        console.error("[ScriptPlayer] Failed to fetch KMD source:", err);
        return;
      }
    }

    const result: KMDParseResult = parser.parse(finalSource);
    this.metadata = result.metadata;
    this.paragraphs = result.paragraphs;
    this.rawParagraphs = result.rawParagraphs;
    this.currentIndex = -1;

    if (this.metadata.mode) this.setMode(this.metadata.mode);
    
    stageManager.setDesignResolution(
      this.metadata.designWidth || 1920,
      this.metadata.designHeight || 1080
    );

    if (this.metadata.variables) {
      Object.entries(this.metadata.variables).forEach(([k, v]) => {
        const val = Number(v);
        layout.globalMarkers.set(`var.${k}`, { x: val, y: val });
      });
    }
  }

  public setMode(mode: "stage" | "scroll" | "page") {
    this.currentMode = mode;
    stageManager.setMode(mode === "stage" ? "stage" : "scroll");
  }

  public async clearScreen() {
    if (this.activeTexts.length === 0) return;
    await Promise.all(this.activeTexts.map(kt => 
      gsap.to(kt, { alpha: 0, duration: 0.3 }).then(() => kt.destroy({ children: true }))
    ));
    this.activeTexts = [];
  }

  public async next(force: boolean = false) {
    if (!force && this.isProcessingNext) return;
    clearTimeout(this.autoPlayTimer);
    if (!force) this.isProcessingNext = true;

    try {
      if (this.currentIndex >= this.paragraphs.length - 1) {
        console.log("[KMD-TRACE] ScriptPlayer: End reached.");
        return;
      }

      this.currentIndex++;
      const snapshotIndex = this.currentIndex;
      const pData = this.paragraphs[snapshotIndex];
      const rawKMD = this.rawParagraphs[snapshotIndex];

      if (!pData || rawKMD === undefined) return;

      if (this.currentMode === "page" || pData.tokens.some((t: any) => t.isSceneClear)) {
          await this.clearScreen();
      }

      console.log(`[KMD-TRACE] ScriptPlayer: Presenting p[${snapshotIndex}]`);
      this.present(pData, rawKMD, snapshotIndex);

    } finally {
      this.isProcessingNext = false;
    }
  }

  public get autoPlay(): boolean {
    return this.isAutoPlaying;
  }

  private async present(pData: KMDParagraphData, rawKMD: string, paragraphIndex: number) {
    const dWidth = stageManager.designWidth;
    
    // 1. 测量相：使用独立的临时 Map 避免污染全局记录
    const measureMarkers = new Map(layout.globalMarkers);
    const kt = new KineticText({
      maxWidth: this.metadata.maxWidth || dWidth * 0.8,
      ...pData.blockOptions,
      externalMarkers: measureMarkers,
      baseOffset: { x: 0, y: 0 },
    });

    await kt.init(rawKMD);
    
    // 2. 定位相：计算容器坐标
    const dHeight = stageManager.designHeight;
    let currentY = 0;
    this.activeTexts.forEach(at => currentY += at.getLayoutHeight() + 20);
    
    const align = (kt as any)._options.align;
    const maxWidth = (kt as any)._options.maxWidth;
    if (this.currentMode === "stage" || this.currentMode === "scroll") {
        kt.x = align === "center" ? (dWidth - maxWidth) / 2 : dWidth * 0.1;
        kt.y = currentY;
    } else {
        kt.x = align === "center" ? (dWidth - kt.getLayoutWidth()) / 2 : dWidth * 0.1;
        kt.y = dHeight * 0.7;
    }

    // 3. 正式相：带上真实的 baseOffset 重新排版
    await kt.rebuild({ 
        baseOffset: { x: kt.x, y: kt.y },
        externalMarkers: layout.globalMarkers 
    });
    
    this.container.addChild(kt);
    this.activeTexts.push(kt);

    await kt.applyParagraphEffects();

    return new Promise<void>((resolve) => {
      let isResolved = false;
      let hasSignaled = false;

      kt.play({
        speed: this.metadata.speed,
        onAdvance: () => {
          console.log(`[KMD-TRACE] ScriptPlayer: Concurrency signal from p[${paragraphIndex}]`);
          hasSignaled = true; 
          this.next(true); 
        }
      }).then(async (playResult) => {
        if (!isResolved) {
          if (this.isAutoPlaying) {
             const skipPause = playResult?.skipAutoPause === true;
             if (!skipPause) {
                await new Promise(r => setTimeout(r, 2000));
             }
             if (!hasSignaled && paragraphIndex === this.currentIndex) {
                console.log(`[KMD-TRACE] ScriptPlayer: p[${paragraphIndex}] triggering normal AUTO-NEXT`);
                this.next();
             }
          }
          isResolved = true;
          resolve();
        }
      });
    });
  }

  public toggleAutoPlay(force?: boolean) {
    this.isAutoPlaying = force ?? !this.isAutoPlaying;
    if (this.isAutoPlaying && this.currentIndex === -1) {
        this.next();
    }
  }
}
