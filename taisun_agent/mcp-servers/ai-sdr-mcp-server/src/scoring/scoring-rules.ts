import type { ScoreSignal } from "../types.js";

export interface ScoringRule {
  readonly dimension: ScoreSignal["dimension"];
  readonly signal: string;
  readonly points: number;
  readonly description: string;
  readonly matcher: (context: SignalContext) => boolean;
}

export interface SignalContext {
  readonly industry?: string;
  readonly position?: string;
  readonly companySize?: string;
  readonly region?: string;
  readonly pagesViewed?: number;
  readonly downloadedResources?: boolean;
  readonly attendedSeminar?: boolean;
  readonly requestedDemo?: boolean;
  readonly emailOpened?: boolean;
  readonly lineResponded?: boolean;
  readonly replied?: boolean;
  readonly attendedMeeting?: boolean;
  readonly viewedPricingPage?: boolean;
  readonly requestedMaterials?: boolean;
  readonly madeInquiry?: boolean;
  readonly viewedComparisonPage?: boolean;
  readonly signals?: readonly string[];
}

export const SCORE_WEIGHTS = {
  demographic: 0.20,
  behavioral: 0.35,
  engagement: 0.25,
  intent: 0.20,
} as const;

export const RANK_THRESHOLDS = {
  HOT: 80,
  WARM: 50,
  COLD: 20,
} as const;

const TARGET_INDUSTRIES = [
  "IT", "SaaS", "マーケティング", "コンサルティング", "不動産", "金融",
];

const DECISION_MAKER_POSITIONS = [
  "代表取締役", "CEO", "CTO", "COO", "CFO", "取締役",
  "部長", "本部長", "事業部長", "VP",
];

const TARGET_COMPANY_SIZES = ["medium", "large", "enterprise"];

const TARGET_REGIONS = [
  "東京", "大阪", "名古屋", "福岡", "横浜", "関東", "関西",
];

export const DEMOGRAPHIC_RULES: readonly ScoringRule[] = [
  {
    dimension: "demographic",
    signal: "industry_match",
    points: 30,
    description: "ターゲット業種にマッチ",
    matcher: (ctx) =>
      ctx.industry !== undefined &&
      TARGET_INDUSTRIES.some((ind) =>
        ctx.industry!.toLowerCase().includes(ind.toLowerCase())
      ),
  },
  {
    dimension: "demographic",
    signal: "decision_maker",
    points: 25,
    description: "決裁者ポジション",
    matcher: (ctx) =>
      ctx.position !== undefined &&
      DECISION_MAKER_POSITIONS.some((pos) =>
        ctx.position!.includes(pos)
      ),
  },
  {
    dimension: "demographic",
    signal: "company_size_match",
    points: 20,
    description: "ターゲット企業規模にマッチ",
    matcher: (ctx) =>
      ctx.companySize !== undefined &&
      TARGET_COMPANY_SIZES.includes(ctx.companySize),
  },
  {
    dimension: "demographic",
    signal: "region_match",
    points: 15,
    description: "ターゲット地域にマッチ",
    matcher: (ctx) =>
      ctx.region !== undefined &&
      TARGET_REGIONS.some((r) => ctx.region!.includes(r)),
  },
];

export const BEHAVIORAL_RULES: readonly ScoringRule[] = [
  {
    dimension: "behavioral",
    signal: "page_views",
    points: 10,
    description: "ページ閲覧 (+10/page, max 50)",
    matcher: (ctx) =>
      ctx.pagesViewed !== undefined && ctx.pagesViewed > 0,
  },
  {
    dimension: "behavioral",
    signal: "resource_download",
    points: 20,
    description: "資料ダウンロード",
    matcher: (ctx) => ctx.downloadedResources === true,
  },
  {
    dimension: "behavioral",
    signal: "seminar_attendance",
    points: 25,
    description: "セミナー参加",
    matcher: (ctx) => ctx.attendedSeminar === true,
  },
  {
    dimension: "behavioral",
    signal: "demo_request",
    points: 35,
    description: "デモ申込",
    matcher: (ctx) => ctx.requestedDemo === true,
  },
];

export const ENGAGEMENT_RULES: readonly ScoringRule[] = [
  {
    dimension: "engagement",
    signal: "email_opened",
    points: 15,
    description: "メール開封",
    matcher: (ctx) => ctx.emailOpened === true,
  },
  {
    dimension: "engagement",
    signal: "line_response",
    points: 20,
    description: "LINE反応",
    matcher: (ctx) => ctx.lineResponded === true,
  },
  {
    dimension: "engagement",
    signal: "reply",
    points: 30,
    description: "返信あり",
    matcher: (ctx) => ctx.replied === true,
  },
  {
    dimension: "engagement",
    signal: "meeting_attendance",
    points: 35,
    description: "ミーティング参加",
    matcher: (ctx) => ctx.attendedMeeting === true,
  },
];

export const INTENT_RULES: readonly ScoringRule[] = [
  {
    dimension: "intent",
    signal: "pricing_page_view",
    points: 30,
    description: "価格ページ閲覧",
    matcher: (ctx) => ctx.viewedPricingPage === true,
  },
  {
    dimension: "intent",
    signal: "material_request",
    points: 25,
    description: "資料請求",
    matcher: (ctx) => ctx.requestedMaterials === true,
  },
  {
    dimension: "intent",
    signal: "inquiry",
    points: 35,
    description: "問合せ",
    matcher: (ctx) => ctx.madeInquiry === true,
  },
  {
    dimension: "intent",
    signal: "comparison_page_view",
    points: 20,
    description: "競合比較ページ閲覧",
    matcher: (ctx) => ctx.viewedComparisonPage === true,
  },
];

export const ALL_RULES: readonly ScoringRule[] = [
  ...DEMOGRAPHIC_RULES,
  ...BEHAVIORAL_RULES,
  ...ENGAGEMENT_RULES,
  ...INTENT_RULES,
];

export function calculatePageViewPoints(pagesViewed: number): number {
  return Math.min(pagesViewed * 10, 50);
}
