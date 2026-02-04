import type { LayoutCommand, LayoutOperator, LayoutExpander } from "./types";
import * as Presets from "./layoutPresets";
import * as Expanders from "./layoutExpanders";

class LayoutManager {
  private registry: Record<string, LayoutOperator> = {};
  private expanders: Record<string, LayoutExpander> = {};

  constructor() {
    // 自动加载所有运行期算子
    Object.keys(Presets).forEach((key) => {
      this.register(key, (Presets as any)[key]);
    });

    // 自动加载所有构建期扩展器
    Object.keys(Expanders).forEach((key) => {
      this.registerExpander(key, (Expanders as any)[key]);
    });
    
    const isDev = typeof import.meta.env !== 'undefined' ? import.meta.env.DEV : false;
    if (isDev) {
      console.log("[LayoutManager] All Expanders:", Object.keys(this.expanders));
      console.log("[LayoutManager] All Operators:", Object.keys(this.registry));
    }
  }

  public register(name: string, operator: LayoutOperator) {
    this.registry[name] = operator;
  }

  public registerExpander(name: string, expander: LayoutExpander) {
    this.expanders[name] = expander;
  }

  public has(name: string): boolean {
    if (!name) return false;
    return (name in this.registry) || (name in this.expanders);
  }

  public getOperator(name: string): LayoutOperator | null {
    return this.registry[name] || null;
  }

  public getExpander(name: string): LayoutExpander | null {
    return this.expanders[name] || null;
  }

  public generate(name: string, params: any): LayoutCommand | null {
    // 只要是已注册的算子或扩展器，都允许生成指令对象
    if (this.registry[name] || this.expanders[name]) {
      return { type: name as any, params, isCommand: true };
    }
    return null;
  }
}

export const layoutManager = new LayoutManager();
