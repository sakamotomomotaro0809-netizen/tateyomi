import type { Lead, LeadRank, LeadScore, ScoreSignal } from "../types.js";
import {
  ALL_RULES,
  SCORE_WEIGHTS,
  RANK_THRESHOLDS,
  calculatePageViewPoints,
  type SignalContext,
} from "./scoring-rules.js";

function buildContextFromLead(lead: Lead, signals: SignalContext): SignalContext {
  return {
    industry: lead.industry,
    position: lead.position,
    companySize: lead.companySize,
    region: lead.region,
    ...signals,
  };
}

function computeDimensionScore(
  matchedSignals: readonly ScoreSignal[],
  dimension: ScoreSignal["dimension"],
  pagesViewed?: number
): number {
  let total = matchedSignals
    .filter((s) => s.dimension === dimension)
    .reduce((sum, s) => sum + s.points, 0);

  if (dimension === "behavioral" && pagesViewed !== undefined && pagesViewed > 0) {
    total += calculatePageViewPoints(pagesViewed);
  }

  return Math.min(total, 100);
}

export function determineRank(score: number): LeadRank {
  if (score >= RANK_THRESHOLDS.HOT) return "HOT";
  if (score >= RANK_THRESHOLDS.WARM) return "WARM";
  if (score >= RANK_THRESHOLDS.COLD) return "COLD";
  return "DISQUALIFIED";
}

export function scoreLead(lead: Lead, signals: SignalContext): LeadScore {
  const context = buildContextFromLead(lead, signals);

  const matchedSignals: ScoreSignal[] = ALL_RULES
    .filter((rule) => rule.matcher(context))
    .map((rule) => ({
      dimension: rule.dimension,
      signal: rule.signal,
      points: rule.points,
      description: rule.description,
    }));

  const demographic = computeDimensionScore(matchedSignals, "demographic");
  const behavioral = computeDimensionScore(
    matchedSignals,
    "behavioral",
    signals.pagesViewed
  );
  const engagement = computeDimensionScore(matchedSignals, "engagement");
  const intent = computeDimensionScore(matchedSignals, "intent");

  const totalScore = Math.round(
    demographic * SCORE_WEIGHTS.demographic +
    behavioral * SCORE_WEIGHTS.behavioral +
    engagement * SCORE_WEIGHTS.engagement +
    intent * SCORE_WEIGHTS.intent
  );

  const rank = determineRank(totalScore);

  return {
    leadId: lead.id,
    demographic,
    behavioral,
    engagement,
    intent,
    totalScore,
    rank,
    scoredAt: new Date().toISOString(),
    signals: matchedSignals,
  };
}

export function scoreBulk(
  leads: readonly Lead[],
  signalsMap: Record<string, SignalContext>
): readonly LeadScore[] {
  return leads.map((lead) => {
    const signals = signalsMap[lead.id] ?? {};
    return scoreLead(lead, signals);
  });
}
