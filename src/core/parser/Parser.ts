import type { KMDParseResult, KMDParagraphData } from "./types";
import { effectManager } from "../effects/EffectManager";
import { styleManager } from "../effects/StyleManager";
import { layoutManager } from "../layout/LayoutManager";
import { stageManager } from "../stage/StageManager";
import { KMDScanner } from "./KMDScanner";
import { KMDCommandParser } from "./KMDCommandParser";

export class KMDParser {
  private scanner = new KMDScanner();

  public parse(input: any): KMDParseResult {
    const result: KMDParseResult = { metadata: { variables: {} }, paragraphs: [], rawParagraphs: [] };
    if (typeof input !== 'string') return result;

    try {
      let content = input.replace(/\r\n/g, "\n").trim();

      // 1. 提取 Metadata (索引搜索)
      if (content.startsWith("---")) {
        const endIdx = content.indexOf("---", 3);
        if (endIdx !== -1) {
          const metaStr = content.substring(3, endIdx).trim();
          this.parseMetadata(metaStr, result.metadata);
          content = content.substring(endIdx + 3).trim();
        }
      }

      // 2. 分段 (双换行或以上)
      const rawBlocks = content.split(/\n{2,}/).filter(s => s.trim());
      result.rawParagraphs = rawBlocks;

      // 3. 逐段解析
      result.paragraphs = rawBlocks.map(block => this.parseParagraph(block));

      return result;
    } catch (e: any) {
      console.error("[KMD Global Parser Error]", e);
      return result;
    }
  }

  private parseMetadata(metaStr: string, metadata: any) {
    let inVar = false;
    metaStr.split("\n").forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("//")) return;
      if (trimmed === "var:") { inVar = true; return; }

      const colonIdx = line.indexOf(":");
      if (colonIdx !== -1) {
        const key = line.substring(0, colonIdx).trim();
        const val = line.substring(colonIdx + 1).trim();
        const parsed = KMDCommandParser.autoConvert(val);
        const indentMatch = line.match(/^\s*/);
        const indent = indentMatch ? indentMatch[0].length : 0;
        if (inVar && indent >= 2) {
          if (metadata.variables) metadata.variables[key] = parsed;
        } else {
          inVar = false;
          metadata[key] = parsed;
        }
      }
    });
  }

  public parseParagraph(input: string): KMDParagraphData {
    const lines = input.split("\n").map(l => {
      const idx = l.indexOf("//");
      return (idx !== -1 && (idx === 0 || l[idx-1] === " ")) ? l.substring(0, idx) : l;
    }).map(l => l.trimEnd());

    let blockOptions: any = { options: {}, globalEffects: [] };
    let startIdx = 0;
    while (startIdx < lines.length && !lines[startIdx]?.trim()) startIdx++;

    const firstLine = lines[startIdx]?.trim() || "";
    if (firstLine.startsWith("[") && firstLine.includes("]")) {
      const endIdx = firstLine.indexOf("]");
      const content = firstLine.substring(1, endIdx);
      
      const parts: string[] = [];
      let cur = ""; let depth = 0;
      for (let i=0; i<content.length; i++) {
        if (content[i] === "(") depth++; else if (content[i] === ")") depth--;
        if (content[i] === " " && depth === 0) { if (cur) parts.push(cur); cur = ""; }
        else cur += content[i];
      }
      if (cur) parts.push(cur);

      parts.forEach(p => {
        if (p.includes("=")) {
          const eq = p.indexOf("=");
          blockOptions.options[p.substring(0, eq).trim()] = KMDCommandParser.autoConvert(p.substring(eq + 1).trim());
        } else if (KMDCommandParser.isVisual(p)) {
          blockOptions.globalEffects.push(...KMDCommandParser.parseEffectChain(p));
        } else {
          // 核心修正：尝试将 [] 内部的裸指令解析为舞台指令或布局指令
          const subChain = KMDCommandParser.parseEffectChain(p);
          subChain.forEach(eff => {
            blockOptions.globalEffects.push({ 
              name: eff.name, 
              level: "block", 
              params: eff.params, 
              blocking: eff.blocking 
            });
          });
        }
      });

      const remaining = firstLine.substring(endIdx + 1).trim();
      if (remaining) lines[startIdx] = remaining; else startIdx++;
    }

    const { tokens, globalEffects } = this.scanner.scan(lines.slice(startIdx).join("\n"));
    return {
      blockOptions: blockOptions.options,
      tokens,
      globalEffects: [...blockOptions.globalEffects, ...globalEffects]
    };
  }

  public validate(input: string): string[] {
    const errors: string[] = [];
    try {
      const result = this.parse(input);
      result.paragraphs.forEach((p) => {
        p.tokens.forEach(token => {
          token.effects.forEach((eff) => {
            if (!effectManager.has(eff.name) && !styleManager.has(eff.name) && !layoutManager.has(eff.name) && !stageManager.has(eff.name)) {
              errors.push(`Unknown effect: "${eff.name}"`);
            }
          });
        });
      });
    } catch (e: any) {
      errors.push(`Syntax Error: ${e.message}`);
    }
    return errors;
  }
}

export const parser = new KMDParser();