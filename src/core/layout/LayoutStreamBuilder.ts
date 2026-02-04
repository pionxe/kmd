import { KineticChar } from "../KineticChar";
import { TextStyle } from "pixi.js";
import type { LayoutStream, LayoutCommand } from "./types";
import type { KMDToken, EffectConfig } from "../parser/types";
import { EffectProcessor } from "../effects/EffectProcessor";
import { layoutManager } from "./LayoutManager";
import { stageManager } from "../stage/StageManager";
import { layout } from "./LayoutEngine";

export class LayoutStreamBuilder {
  public static build(
    tokens: KMDToken[],
    baseStyle: TextStyle,
    globalEffects: EffectConfig[],
  ): { stream: LayoutStream; allCharsData: any[] } {
    const stream: LayoutStream = [];
    const allCharsData: any[] = [];

    const { layoutCmds: globalLayouts } = EffectProcessor.partition(globalEffects);
    globalLayouts.forEach((cmd) => stream.push(cmd));

    tokens.forEach((token, tokenIdx) => {
      const { layoutCmds: effectLayouts, visualConfigs } = EffectProcessor.partition(token.effects);
      const allRawInstructions = [
        ...token.layoutInstructions,
        ...effectLayouts.map(cmd => ({ type: cmd.type as string, params: cmd.params }))
      ];

      let finalContent = token.content;
      if (finalContent.startsWith("var.")) {
        const marker = layout.globalMarkers.get(finalContent);
        if (marker !== undefined) finalContent = String(marker.x);
      }

      const measurementStyle = baseStyle.clone();
      EffectProcessor.applyInitialStylesToStyle(measurementStyle, visualConfigs);

      // 特殊处理 Sugar Token (> / >> / >>>)
      if ((token as any).isSugar && token.sugar && token.sugar.length > 0) {
        // 创建一个无宽度的隐形字符用于承载时序信号
        const dummyChar = new KineticChar("", measurementStyle);
        const charData = {
          char: dummyChar,
          effects: [],
          // 使用 s.name 确保与 Scanner 协议一致
          timingSugars: token.sugar.map((s: any) => ({ name: s.name, params: s.params, level: s.level })),
          tokenIdx, charIdx: 0, width: 0, height: 0, stageInstructions: []
        };
        allCharsData.push(charData);
        stream.push({ isCommand: false, width: 0, height: 0, charData });
        return; 
      }

      let tokenWidth = 0;
      const charWidths: number[] = [];
      const chars = Array.from(finalContent); // 稳健处理 Unicode
      chars.forEach((charText, i) => {
        const tempChar = new KineticChar(charText, measurementStyle);
        charWidths.push(tempChar.width);
        tokenWidth += tempChar.width;
        if (i < chars.length - 1) tokenWidth += measurementStyle.letterSpacing || 0;
        tempChar.destroy();
      });

      const preCmds: LayoutCommand[] = [];
      const postCmds: LayoutCommand[] = [];
      const stageInstructions: any[] = [];

      allRawInstructions.forEach(instr => {
        const expander = layoutManager.getExpander(instr.type);
        if (expander) {
          const { pre, post } = expander(instr.params, {
            width: tokenWidth, charWidths, letterSpacing: measurementStyle.letterSpacing || 0,
            fontSize: measurementStyle.fontSize as number,
            lineHeight: measurementStyle.lineHeight || (measurementStyle.fontSize as number) * 1.2,
            markers: layout.globalMarkers
          });
          if (pre) preCmds.push(...pre); if (post) postCmds.push(...post);
        } else {
          if (stageManager.has(instr.type)) stageInstructions.push(instr);
          else {
            const cmd = layoutManager.generate(instr.type, instr.params);
            if (cmd) preCmds.push(cmd);
          }
        }
      });

      preCmds.forEach(c => stream.push(c));

      if (finalContent.length === 0 && stageInstructions.length > 0) {
        const charData = {
          char: null, effects: visualConfigs, tokenIdx, charIdx: 0,
          width: 0, height: 0, stageInstructions
        };
        allCharsData.push(charData);
        stream.push({ isCommand: false, width: 0, height: 0, charData });
      }

      for (let i = 0; i < chars.length; i++) {
        const charText = chars[i]!;
        const char = new KineticChar(charText, measurementStyle.clone());
        // 核心加固：无论来源如何，只要字符是 \n，就标记为 NewLine
        if (charText === "\n") char.isNewLine = true; 
        
        const isLastChar = i === chars.length - 1;
        const charEffects = [...visualConfigs];
        const timingSugars: any[] = [];
        
        if (token.sugar) {
          token.sugar.filter((s: any) => s.charIdx === i).forEach((s: any) => {
            timingSugars.push({ name: s.type, params: s.params, level: s.level });
          });
        }
        
        const charData = {
          char, 
          effects: charEffects, 
          timingSugars, // 独立存储时序糖衣
          tokenIdx, 
          charIdx: i,
          width: char.width, 
          height: char.height,
          stageInstructions: isLastChar ? stageInstructions : []
        };
        allCharsData.push(charData);
        stream.push({ isCommand: false, width: char.width, height: char.height, charData });
      }
      postCmds.forEach(c => stream.push(c));
    });
    return { stream, allCharsData };
  }
}
