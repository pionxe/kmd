import type { LayoutStream, LayoutContext, MarkerMap, LayoutItem, LayoutCommand, LayoutResult, LayoutAuditRecord, CursorState } from './types';
import { layoutManager } from './LayoutManager';
import type { FullOptions } from "../KineticText";

export class TextLayoutEngine {
  public static lastAuditLog: LayoutAuditRecord[] = [];

  private static toGlobal(ctx: { options: { baseOffset: CursorState } }, local: { x: number, y: number }): CursorState {
    return {
      x: local.x + ctx.options.baseOffset.x,
      y: local.y + ctx.options.baseOffset.y,
    };
  }

  private static calculateBounds(lineResults: LayoutResult[]) {
    if (lineResults.length === 0) return null;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    lineResults.forEach(r => {
        const halfW = r.item.width / 2;
        const halfH = r.item.height / 2;
        minX = Math.min(minX, r.x - halfW);
        maxX = Math.max(maxX, r.x + halfW);
        minY = Math.min(minY, r.y - halfH);
        maxY = Math.max(maxY, r.y + halfH);
    });
    return { minX, maxX, minY, maxY, midX: (minX + maxX) / 2, midY: (minY + maxY) / 2 };
  }

  /**
   * 幻影预扫描：模拟完整路径，建立基于 Baseline 的标记图
   */
  private static runPhantomPass(stream: LayoutStream, options: FullOptions, globalMarkers: MarkerMap): Map<string, CursorState> {
    let phantomBaselineY = 0;
    const ctx: LayoutContext = {
        activeCursor: { x: options.indent * options.fontSize, y: 0 },
        isFlowBroken: false, 
        justMoved: false, 
        markers: new Map(globalMarkers), 
        touchedMarkers: [],
        options: { ...options, baseOffset: { x: 0, y: 0 } }
    };
    
    const lines: LayoutResult[][] = [[]];
    const lineBaseYs: number[] = [0]; 
    let lIdx = 0;

    for (const node of stream) {
        if (node.isCommand) {
            const cmd = node as LayoutCommand;
            const op = layoutManager.getOperator(cmd.type);
            if (op) op(ctx, cmd.params);
            continue;
        }
        const item = node as LayoutItem;
        const charText = (item as any).charData?.char?.text || "";

        const handleWrap = () => {
            const currentLine = lines[lIdx];
            if (currentLine && currentLine.some(r => r.inFlow)) phantomBaselineY += options.lineHeight;
            lIdx++; lines[lIdx] = [];
            lineBaseYs[lIdx] = phantomBaselineY;
            ctx.activeCursor.x = 0;
            ctx.activeCursor.y = phantomBaselineY;
            ctx.isFlowBroken = false;
        };

        if (charText === '\n') { handleWrap(); continue; }
        if (!ctx.isFlowBroken && !ctx.justMoved && ctx.activeCursor.x + item.width > options.maxWidth * 1.05) {
            handleWrap();
        }

        const currentLine = lines[lIdx];
        if (currentLine) {
            const res = { 
                item, x: ctx.activeCursor.x + item.width / 2, y: ctx.activeCursor.y + item.height / 2, inFlow: !ctx.isFlowBroken 
            };
            currentLine.push(res);
        }
        ctx.activeCursor.x += item.width + options.letterSpacing;
        ctx.justMoved = false;
    }

    lines.forEach((line, idx) => {
        if (line.length > 0 && options.align !== 'left') {
            const inFlows = line.filter(r => r.inFlow);
            if (inFlows.length > 0) {
                const first = inFlows[0]!, last = inFlows[inFlows.length-1]!;
                const w = (last.x + last.item.width/2) - (first.x - first.item.width/2);
                const corr = (options.align === 'center' ? (options.maxWidth - w)/2 : options.maxWidth - w) - (first.x - first.item.width/2);
                line.forEach(r => { if(r.inFlow) r.x += corr; });
            }
        }
        const bounds = this.calculateBounds(line);
        const baseline = lineBaseYs[idx] ?? (idx * options.lineHeight);
        ctx.markers.set(`phantom_${idx}.start`, { x: bounds ? bounds.minX : 0, y: baseline });
        ctx.markers.set(`phantom_${idx}.mid`,   { x: bounds ? bounds.midX : options.maxWidth/2, y: baseline });
        ctx.markers.set(`phantom_${idx}.end`,   { x: bounds ? bounds.maxX : 0, y: baseline });
    });
    return ctx.markers;
  }

  public static calculate(
    stream: LayoutStream,
    options: FullOptions,
    globalMarkers: MarkerMap = options.externalMarkers
  ): LayoutResult[] {
    
    const phantomMarkers = this.runPhantomPass(stream, options, globalMarkers);
    const results: LayoutResult[] = [];
    let baselineY = 0;

    const context: LayoutContext = {
      activeCursor: { x: options.indent * options.fontSize, y: 0 },
      isFlowBroken: false,
      justMoved: false,
      markers: globalMarkers,
      touchedMarkers: [],
      options: { ...options }
    };

    // 核心修正 5.3：同步幻影扫描发现的新标记。
    // 我们只注入那些不在原始 globalMarkers 中，或者在 phantom_ 命名空间之外的标记。
    phantomMarkers.forEach((v, k) => {
        if (!k.startsWith('phantom_') && !globalMarkers.has(k)) {
            globalMarkers.set(k, this.toGlobal(context, v));
        }
    });

    const lines: LayoutResult[][] = [[]];
    let currentLineIndex = 0;

    const updateReservedMarkers = () => {
        context.markers.set('line.start', this.toGlobal(context, { x: 0, y: baselineY }));
        context.markers.set('line.mid',   this.toGlobal(context, { x: options.maxWidth/2, y: baselineY }));
        context.markers.set('line.end',   this.toGlobal(context, { x: context.activeCursor.x, y: baselineY }));

        const nS = phantomMarkers.get(`phantom_${currentLineIndex + 1}.start`);
        if (nS) {
            context.markers.set('next.start', this.toGlobal(context, nS));
            const nM = phantomMarkers.get(`phantom_${currentLineIndex + 1}.mid`);
            if (nM) context.markers.set('next.mid', this.toGlobal(context, nM));
            const nE = phantomMarkers.get(`phantom_${currentLineIndex + 1}.end`);
            if (nE) context.markers.set('next.end', this.toGlobal(context, nE));
        }
    };

    for (const node of stream) {
      updateReservedMarkers();

      if (node.isCommand) {
        const cmd = node as LayoutCommand;
        const operator = layoutManager.getOperator(cmd.type);
        if (operator) operator(context, cmd.params);
        continue;
      }

      const item = node as LayoutItem;
      const charText = (item as any).charData?.char?.text || ""; 
      
      const handleLineBreak = () => {
        const currentLine = lines[currentLineIndex];
        let hasInFlow = currentLine ? currentLine.some(r => r.inFlow) : false;

        if (currentLine) {
            const inFlows = currentLine.filter(r => r.inFlow);
            if (inFlows.length > 0 && options.align !== 'left') {
                const first = inFlows[0]!, last = inFlows[inFlows.length-1]!;
                const w = (last.x + last.item.width/2) - (first.x - first.item.width/2);
                const corr = (options.align === 'center' ? (options.maxWidth - w)/2 : options.maxWidth - w) - (first.x - first.item.width/2);
                currentLine.forEach(r => { if(r.inFlow) r.x += corr; });
                context.touchedMarkers.forEach(m => { 
                    const v = context.markers.get(m); 
                    if(v) v.x += corr; 
                });
            }
            context.markers.set('prev.start', this.toGlobal(context, { x: 0, y: baselineY }));
            context.markers.set('prev.mid',   this.toGlobal(context, { x: options.maxWidth/2, y: baselineY }));
            context.markers.set('prev.end',   this.toGlobal(context, { x: context.activeCursor.x, y: baselineY }));
        }

        if (hasInFlow) baselineY += options.lineHeight;
        context.activeCursor.x = 0;
        context.activeCursor.y = baselineY;
        
        currentLineIndex++;
        lines[currentLineIndex] = [];
        context.touchedMarkers = [];
      };

      if (charText === '\n') {
          const res: LayoutResult = { item, x: context.activeCursor.x, y: context.activeCursor.y + options.lineHeight / 2, inFlow: false };
          results.push(res);
          const currentLine = lines[currentLineIndex];
          if (currentLine) currentLine.push(res);
          handleLineBreak();
          context.isFlowBroken = false; 
          continue;
      }

      if (!context.isFlowBroken && !context.justMoved && context.activeCursor.x + item.width > options.maxWidth * 1.05) {
          handleLineBreak();
      }

      const result: LayoutResult = {
        item,
        x: context.activeCursor.x + item.width / 2,
        y: context.activeCursor.y + item.height / 2,
        inFlow: !context.isFlowBroken
      };

      const currentLine = lines[currentLineIndex];
      if (currentLine) currentLine.push(result);
      results.push(result);

      context.activeCursor.x += item.width + options.letterSpacing;
      context.justMoved = false;
    }

    const finalLine = lines[currentLineIndex];
    if (finalLine && finalLine.length > 0) {
        const inFlows = finalLine.filter(r => r.inFlow);
        if (inFlows.length > 0 && options.align !== 'left') {
            const first = inFlows[0]!, last = inFlows[inFlows.length-1]!;
            const w = (last.x + last.item.width/2) - (first.x - first.item.width/2);
            const corr = (options.align === 'center' ? (options.maxWidth - w)/2 : options.maxWidth - w) - (first.x - first.item.width/2);
            finalLine.forEach(r => { if(r.inFlow) r.x += corr; });
            context.touchedMarkers.forEach(m => { 
                const v = context.markers.get(m); 
                if(v) v.x += corr; 
            });
        }
    }

    return results;
  }
}
