import { Container, TextStyle, Rectangle } from "pixi.js";
import { effectManager } from "./effects/EffectManager"; 
import { parser } from "./parser/Parser"; 
import { TextLayoutEngine } from "./layout/TextLayoutEngine";
import { LayoutStreamBuilder } from "./layout/LayoutStreamBuilder";
import { EffectProcessor } from "./effects/EffectProcessor";
import { TokenWrapper } from "./TokenWrapper"; 
import { KineticChar } from "./KineticChar"; 
import { stageManager } from "./stage/StageManager";

import type { KMDParagraphData, BlockOptions } from "./parser/types";
import type { MarkerMap } from "./layout/types";

export interface KineticTextOptions extends BlockOptions {
  externalMarkers: MarkerMap;
  baseOffset?: { x: number; y: number };
}
export type FullOptions = Required<KineticTextOptions>;

export class KineticText extends Container {
  private _options: FullOptions;
  private _sourceKMD: string = "";
  private _currentOptions: KineticTextOptions;

  public tokens: TokenWrapper[] = [];
  private _pendingGlobalEffects: any[] = [];
  private _allCharsCached: KineticChar[] = [];

  constructor(baseOptions: KineticTextOptions) {
    super();
    this._currentOptions = { ...baseOptions };
    this._options = Object.assign(
      {
        maxWidth: 800,
        lineHeight: 60,
        fontSize: 36,
        indent: 0,
        align: "left",
        letterSpacing: 0,
        speed: 50,
        mode: "normal",
        baseOffset: { x: 0, y: 0 },
        externalMarkers: baseOptions.externalMarkers,
      },
      baseOptions,
    ) as FullOptions;
  }

  public async init(kmdString: string) {
    this._sourceKMD = kmdString;
    // 关键：确保浏览器字体已完全加载并注册，否则 measureText 会拿到错误的 fallback 数据
    if ((document as any).fonts) {
        await (document as any).fonts.ready;
    }
    await this.build(kmdString);
  }

  public async applyParagraphEffects() {
    await EffectProcessor.applyGroupEffects(this as any, this._pendingGlobalEffects);
  }

  public async rebuild(newOptions?: any) {
    this._currentOptions = { ...this._currentOptions, ...newOptions };
    this._options = {
      maxWidth: 800, lineHeight: 60, fontSize: 36, indent: 0,
      align: "left", letterSpacing: 0, speed: 50, mode: "normal",
      ...this._currentOptions,
    } as FullOptions;
    this.tokens.forEach((t) => t.destroy({ children: true }));
    this.tokens = [];
    this.removeChildren();
    await this.build(this._sourceKMD);
  }

  private async build(kmdString: string) {
    const { blockOptions, tokens, globalEffects } = parser.parseParagraph(kmdString) as KMDParagraphData;
    this._pendingGlobalEffects = globalEffects as any[];
    Object.assign(this._options, blockOptions);

    const baseStyle = new TextStyle({ 
        fontSize: this._options.fontSize, 
        fill: "#ffffff",
        padding: 0 // 核心：必须强制为 0 以保证 ascent/height 比例精确
    });
    const { stream: layoutStream } = LayoutStreamBuilder.build(tokens, baseStyle, globalEffects);
    
    const layoutResults = TextLayoutEngine.calculate(layoutStream, {
      ...this._options,
      baseOffset: { x: this.x, y: this.y }
    });

    let currentWrapper: TokenWrapper | null = null;
    let currentTokenIdx = -1;
    let currentLineY = -1;

    layoutResults.forEach(({ item: data, x, y, inFlow, stepDistance }) => {
      const { char, effects, tokenIdx, stageInstructions, timingSugars, ascent, height } = data.charData;
      const isNewLine = Math.abs(y - currentLineY) > 1;

      if (!char) {
        const dummy = new KineticChar("", new TextStyle({ padding: 0 }));
        dummy.visible = false;
        dummy.layoutX = x; dummy.layoutY = y; dummy.inFlow = false;
        dummy.stageInstructions = stageInstructions || [];
        dummy.visualEffects = effects || [];
        dummy.timingSugars = timingSugars || [];
        dummy.tokenIdx = tokenIdx;
        const wrapper = new TokenWrapper();
        wrapper.addChild(dummy); wrapper.chars.push(dummy); wrapper.tokenIdx = tokenIdx;
        this.tokens.push(wrapper); this.addChild(wrapper);
        return;
      }

      char.layoutX = x; 
      char.layoutY = y; 
      char.inFlow = inFlow;

      if (char.text.trim()) {
          const globalScaleX = char.worldTransform.a;
          console.log(`[Realize-Trace] Char: "${char.text}", layoutW: ${data.width.toFixed(2)}, objW: ${char.width.toFixed(2)}, step: ${stepDistance?.toFixed(2)}, scaleX: ${globalScaleX.toFixed(2)}, res: ${char.resolution}, layoutX: ${x.toFixed(2)}`);
      }
      
      // 核心修正：基于物理度量动态设置锚点
      // 这使得 layoutY 即使是基线坐标，字符也能正确显示
      if (height > 0) {
          char.anchor.y = ascent / height;
      }

      char.stageInstructions = stageInstructions || [];
      char.visualEffects = effects || [];
      char.timingSugars = timingSugars || [];
      char.tokenIdx = tokenIdx;
      char.visible = false;

      if (tokenIdx !== currentTokenIdx || isNewLine) {
        if (currentWrapper) {
          this.addChild(currentWrapper);
        }
        currentWrapper = new TokenWrapper();
        currentWrapper.tokenIdx = tokenIdx;
        currentTokenIdx = tokenIdx;
        currentLineY = y;
        this.tokens.push(currentWrapper);
      }
      currentWrapper!.addChild(char);
      currentWrapper!.chars.push(char);
    });

    if (currentWrapper) {
      this.addChild(currentWrapper);
    }
    this._allCharsCached = this.tokens.flatMap(t => t.chars);
  }

  public getLayoutHeight(): number {
    const inFlowChars = this._allCharsCached.filter((c) => c.inFlow);
    if (inFlowChars.length === 0) return 0;
    let minY = Infinity, maxY = -Infinity;
    inFlowChars.forEach((c) => {
      // 核心修正：基于 anchor 计算物理边界
      const h = c.height;
      const top = c.layoutY - h * c.anchor.y;
      const bottom = top + h;
      minY = Math.min(minY, top);
      maxY = Math.max(maxY, bottom);
    });
    return maxY - minY;
  }

  public getLayoutWidth(): number {
    const inFlowChars = this._allCharsCached.filter((c) => c.inFlow);
    if (inFlowChars.length === 0) return 0;
    let minX = Infinity, maxX = -Infinity;
    inFlowChars.forEach((c) => {
      const w = c.width;
      const left = c.layoutX - w * c.anchor.x;
      const right = left + w;
      minX = Math.min(minX, left);
      maxX = Math.max(maxX, right);
    });
    return maxX - minX;
  }

  public getContentBounds(): Rectangle {
    const allChars = this._allCharsCached;
    if (allChars.length === 0) return new Rectangle(0, 0, 0, 0);
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    allChars.forEach((c) => {
      const w = c.width, h = c.height;
      const left = c.layoutX - w * c.anchor.x;
      const top = c.layoutY - h * c.anchor.y;
      minX = Math.min(minX, left);
      maxX = Math.max(maxX, left + w);
      minY = Math.min(minY, top);
      maxY = Math.max(maxY, top + h);
    });
    return new Rectangle(minX, minY, maxX - minX, maxY - minY);
  }

  public applyDynamicLayout(type: string, params: any) {
    const stream = [{ isCommand: true, type, params }];
    TextLayoutEngine.calculate(stream as any, {
       ...this._options,
       baseOffset: { x: this.x, y: this.y },
    });
  }

  public async play(options: { speed?: number; mode?: string; onAdvance?: () => void } = {}): Promise<{ skipAutoPause?: boolean }> {
    return this._playInternal(this._allCharsCached, 0, options);
  }

  private async _playInternal(allChars: KineticChar[], absoluteOffset: number, options: { speed?: number; mode?: string; onAdvance?: () => void } = {}, isAsyncBranch: boolean = false): Promise<{ skipAutoPause?: boolean }> {
    let currentRevealSpeed = options.speed ?? this._options.speed ?? 50;
    if (!isAsyncBranch) {
        this._allCharsCached.forEach((c) => (c.visible = false));
    }
    
    let lastWasInstantGo = false;

    for (let i = 0; i < allChars.length; i++) {
      const char = allChars[i]!;
      const realIdx = i + absoluteOffset;
      const isNewLine = char.isNewLine || char.text === "\n";
      
      // 3. 执行单字效果 (Visual Phase)
      // 核心修正：节奏糖衣决定的速度应该是独立于 baseSpeed 的，不应在循环中累加
      currentRevealSpeed = options.speed ?? this._options.speed ?? 50; 
      
      const timing = EffectProcessor.resolveTiming(char.timingSugars);
      if (timing.speedMultiplier !== undefined) {
          currentRevealSpeed *= timing.speedMultiplier;
          console.log(`[Play-Trace] Char: "${char.text}", speedMultiplier: ${timing.speedMultiplier}, finalSpeed: ${currentRevealSpeed}`);
      }
      
      const delayOverride = timing.delayOverride;
      const advanceLevel = timing.advanceLevel;

      // 核心修正 5.1：精准控制持续加速状态
      const isSugarGo = (delayOverride === 0);
      const isPersistentGo = isSugarGo && advanceLevel === "char";
      
      const isInstantGo = isPersistentGo || lastWasInstantGo || isSugarGo;

      if (char.text.trim()) {
          char.visible = true;
          // 更新持久化状态
          if (isPersistentGo) {
              lastWasInstantGo = true;
          } else if (delayOverride !== 0) {
              // 只要不是明确的 0 延迟（即不是 Go 信号），就重置持续加速状态
              lastWasInstantGo = false;
          }

          if (!isInstantGo) {
            if (char.pendingEnterConfig) effectManager.apply(char, char.pendingEnterConfig.name, char.pendingEnterConfig.params);
            else effectManager.apply(char, "fadeIn", { duration: 0.3 });
          }
      } else {
          if (isPersistentGo) lastWasInstantGo = true;
      }

      // 执行演出：如果是 Go 模式，不等待
      const perfTask = this.executePerformance(char, isInstantGo, realIdx);
      if (!isInstantGo) {
          await perfTask; 
      } else {
          perfTask.catch(() => {});
      }
      
      // 信号分流
      if (advanceLevel === "block" && options.onAdvance && !isAsyncBranch) {
          options.onAdvance();
          options.onAdvance = undefined;
      } else if (advanceLevel === "group" && !isAsyncBranch) {
          let nextLineIdx = -1;
          for(let j=i+1; j<allChars.length; j++) {
              const targetChar = allChars[j];
              if (targetChar && (targetChar.isNewLine || targetChar.text === "\n")) { nextLineIdx = j; break; }
          }
          if (nextLineIdx !== -1) {
              this._playInternal(allChars.slice(nextLineIdx + 1), absoluteOffset + nextLineIdx + 1, { ...options, onAdvance: undefined }, true);
              const thisLineRemaining = allChars.slice(i + 1, nextLineIdx + 1);
              // 并发处理本行剩余部分
              this._playInternal(thisLineRemaining, absoluteOffset + i + 1, { ...options, onAdvance: undefined }, true);
              return { skipAutoPause: lastWasInstantGo };
          }
      }

      if (isNewLine) {
          if (!isInstantGo) {
              const breathingDelay = currentRevealSpeed * 10;
              await new Promise(resolve => setTimeout(resolve, breathingDelay));
          }
          continue;
      }

      if (char.text === "") continue;

      if (!isInstantGo) {
          if (delayOverride !== undefined && delayOverride >= 0) {
              if (delayOverride > 0) await new Promise(resolve => setTimeout(resolve, delayOverride * 1000));
          } else {
              const isPunctuation = /[，。！？]/.test(char.text);
              const waitTime = isPunctuation ? currentRevealSpeed * 5 : currentRevealSpeed;
              await new Promise(resolve => setTimeout(resolve, waitTime));
          }
      }
    }
    return { skipAutoPause: lastWasInstantGo };
  }

  private async executePerformance(char: KineticChar, isInstantGo: boolean, charIdx: number) {
    if (char.stageInstructions.length > 0) {
      for (const instr of char.stageInstructions) {
        const result = stageManager.apply(instr.type, instr.params);
        if (!isInstantGo && (instr.type === "wait" || instr.blocking) && result) await result; 
      }
    }

    if (char.visualEffects.length > 0) {
      const visualTask = EffectProcessor.applyCharEffects(char, char.visualEffects, charIdx);
      if (!isInstantGo) await visualTask;
      
      const nextChar = this._allCharsCached[charIdx + 1];
      const isTokenEnd = !nextChar || nextChar.tokenIdx !== char.tokenIdx;
      if (isTokenEnd) {
          const wrapper = this.tokens.find(t => t.tokenIdx === char.tokenIdx);
          if (wrapper) {
              const groupTask = EffectProcessor.applyGroupEffects(wrapper, char.visualEffects);
              if (!isInstantGo) {
                  await groupTask;
              } else {
                  groupTask.catch(() => {});
              }
          }
      }
    }
  }
}
