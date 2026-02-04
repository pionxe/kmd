import type { LayoutExpander, TokenContext } from "./types";

/**
 * 通用单位与变量解析工具 (不解析 Marker，留给 Operator 运行时处理)
 */
const resolveValue = (val: any, ctx: TokenContext, axis: 'x' | 'y'): any => {
  if (typeof val !== 'string' || !val) return val;

  // 1. 变量引用解析 (保持 literal 属性以便 moveCursor 加 960)
  const varMatch = val.match(/^var\.([\w-]+)$/);
  if (varMatch) {
    const v = ctx.markers.get(`var.${varMatch[1]}`);
    if (v) return v.x; 
  }

  // 2. 解析几何单位 (self, char, line)
  const unitMatch = val.match(/^([\d\.\-]+)(self|char|line)$/);
  if (unitMatch) {
    const num = parseFloat(unitMatch[1]!);
    const unit = unitMatch[2];
    switch (unit) {
      case 'self': return axis === 'x' ? num * ctx.width : num * ctx.fontSize;
      case 'char': return num * ctx.fontSize;
      case 'line': return num * ctx.lineHeight;
    }
  }
  
  // 3. 预留标记名、三段式坐标名等，原样返回字符串
  return val;
};

/**
 * 快捷标记扩展器
 */
export const markStart: LayoutExpander = (p) => {
  const name = p.name || p.label || p.val || p[0];
  return { pre: [{ type: "mark", params: { 0: 0, 1: 0, 2: name }, isCommand: true }] };
};

export const markEnd: LayoutExpander = (p, ctx) => {
  const name = p.name || p.label || p.val || p[0];
  // 标记在文字结束处
  return { pre: [{ type: "mark", params: { 0: ctx.width, 1: 0, 2: name }, isCommand: true }] };
};

export const markMiddle: LayoutExpander = (p, ctx) => {
  const name = p.name || p.label || p.val || p[0];
  return { pre: [{ type: "mark", params: { 0: ctx.width / 2, 1: 0, 2: name }, isCommand: true }] };
};

export const markChar: LayoutExpander = (p, ctx) => {
  const charIdx = Number(p.index || p[0] || 0);
  const label = p.label || p[1] || p.val;
  let dx = 0;
  for (let i = 0; i < Math.min(charIdx, ctx.charWidths.length); i++) {
    dx += ctx.charWidths[i]! + ctx.letterSpacing;
  }
  return { pre: [{ type: "mark", params: { 0: dx, 1: 0, 2: label }, isCommand: true }] };
};

/**
 * 核心指令扩展器
 */
export const left: LayoutExpander = (p, ctx) => ({
  pre: [{ type: "left", params: { 0: resolveValue(p.val || p[0], ctx, 'x') }, isCommand: true }]
});

export const right: LayoutExpander = (p, ctx) => ({
  pre: [{ type: "right", params: { 0: resolveValue(p.val || p[0], ctx, 'x') }, isCommand: true }]
});

export const up: LayoutExpander = (p, ctx) => ({
  pre: [{ type: "up", params: { 0: resolveValue(p.val || p[0], ctx, 'y') }, isCommand: true }]
});

export const down: LayoutExpander = (p, ctx) => ({
  pre: [{ type: "down", params: { 0: resolveValue(p.val || p[0], ctx, 'y') }, isCommand: true }]
});

export const goto: LayoutExpander = (p, ctx) => {
    const params: any = { ...p };
    if (p[0] !== undefined) params[0] = resolveValue(p[0], ctx, 'x');
    if (p[1] !== undefined) params[1] = resolveValue(p[1], ctx, 'y');
    return { pre: [{ type: "goto", params, isCommand: true }] };
};

export const offset: LayoutExpander = (p, ctx) => {
  const params: any = { ...p };
  if (p[0] !== undefined) params[0] = resolveValue(p[0], ctx, 'x');
  if (p[1] !== undefined) params[1] = resolveValue(p[1], ctx, 'y');
  return { pre: [{ type: "offset", params, isCommand: true }] };
};
