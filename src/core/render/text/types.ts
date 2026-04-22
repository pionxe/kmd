import type { TextStyle } from "pixi.js";
import type { LayoutEngineOptions, LayoutResult, LayoutStream } from "../../layout/types";
import type {
  BlockOptions,
  EffectConfig,
  KMDParagraphData,
  ParagraphIR,
} from "../../parser/types";
import type { KineticChar } from "../../KineticChar";
import type { TokenWrapper } from "../../TokenWrapper";
import type {
  LayoutPlanResult,
  LayoutGlyphPlan,
  PlannedStageInstruction,
  PlannedTimingSugar,
} from "../../layout/LayoutPlanner";

export type ParagraphWithIr = KMDParagraphData & { ir: ParagraphIR };

export type ParagraphBuildInput =
  | {
      paragraph: ParagraphWithIr;
      sourceKMD?: string;
    }
  | {
      paragraph: KMDParagraphData;
      // Compat fallback for legacy source-driven callers when IR is unexpectedly missing.
      sourceKMD: string;
    };

export interface TextHostOptions extends LayoutEngineOptions, Required<Pick<BlockOptions, "speed" | "mode">> {}

export interface TextBuildContext {
  baseStyle: TextStyle;
  layoutOptions: LayoutEngineOptions;
}

export type TextBuildContextFactory = (target: TextBuildTarget) => TextBuildContext;

export interface TextBuildTarget {
  x: number;
  y: number;
  _options: TextHostOptions;
  _pendingGlobalEffects: any[];
  tokens: TokenWrapper[];
  _allCharsCached: KineticChar[];
  addChild(child: any): any;
}

export interface LegacyCharData {
  char: KineticChar | null;
  effects: EffectConfig[];
  timingSugars: PlannedTimingSugar[];
  tokenIdx: number;
  charIdx: number;
  width: number;
  height: number;
  ascent: number;
  descent: number;
  stageInstructions: PlannedStageInstruction[];
  line?: number;
}

export interface LegacyLayoutItem {
  isCommand?: false;
  width: number;
  height: number;
  charData: LegacyCharData;
}

export interface MaterializedLayoutAssembly {
  stream: LayoutStream;
  allCharsData: LegacyCharData[];
}

export interface PositionedLegacyLayoutResult extends Omit<LayoutResult, "item"> {
  item: LegacyLayoutItem;
}

export type { LayoutGlyphPlan, LayoutPlanResult };
