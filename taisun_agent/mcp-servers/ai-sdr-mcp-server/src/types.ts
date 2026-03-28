// Lead types
export type LeadRank = "HOT" | "WARM" | "COLD" | "DISQUALIFIED";

export type PipelineStage =
  | "discovery"
  | "qualification"
  | "outreach"
  | "follow_up"
  | "meeting"
  | "closed_won"
  | "closed_lost";

export type OutreachChannel = "line" | "email" | "sms" | "voice";

export type SequenceStatus = "active" | "paused" | "completed" | "cancelled";

export interface Lead {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly phone?: string;
  readonly lineUserId?: string;
  readonly company: string;
  readonly position: string;
  readonly industry: string;
  readonly companySize: "small" | "medium" | "large" | "enterprise";
  readonly region: string;
  readonly source: string;
  readonly score: number;
  readonly rank: LeadRank;
  readonly pipelineStage: PipelineStage;
  readonly tags: readonly string[];
  readonly customFields: Record<string, string>;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface LeadScore {
  readonly leadId: string;
  readonly demographic: number;
  readonly behavioral: number;
  readonly engagement: number;
  readonly intent: number;
  readonly totalScore: number;
  readonly rank: LeadRank;
  readonly scoredAt: string;
  readonly signals: readonly ScoreSignal[];
}

export interface ScoreSignal {
  readonly dimension: "demographic" | "behavioral" | "engagement" | "intent";
  readonly signal: string;
  readonly points: number;
  readonly description: string;
}

export interface OutreachMessage {
  readonly id: string;
  readonly leadId: string;
  readonly channel: OutreachChannel;
  readonly subject?: string;
  readonly body: string;
  readonly status:
    | "draft"
    | "scheduled"
    | "sent"
    | "delivered"
    | "opened"
    | "clicked"
    | "replied"
    | "bounced"
    | "failed";
  readonly scheduledAt?: string;
  readonly sentAt?: string;
  readonly metadata: Record<string, string>;
}

export interface Sequence {
  readonly id: string;
  readonly name: string;
  readonly leadId: string;
  readonly steps: readonly SequenceStep[];
  readonly currentStep: number;
  readonly status: SequenceStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface SequenceStep {
  readonly stepNumber: number;
  readonly channel: OutreachChannel;
  readonly delayHours: number;
  readonly messageTemplate: string;
  readonly status: "pending" | "sent" | "skipped";
  readonly executedAt?: string;
}

export interface PipelineMetrics {
  readonly totalLeads: number;
  readonly byStage: Record<PipelineStage, number>;
  readonly byRank: Record<LeadRank, number>;
  readonly conversionRate: number;
  readonly avgResponseTime: number;
  readonly followupCompletionRate: number;
}

export interface AnalyticsReport {
  readonly period: string;
  readonly metrics: PipelineMetrics;
  readonly topPerformingChannels: readonly ChannelMetrics[];
  readonly recommendations: readonly string[];
  readonly generatedAt: string;
}

export interface ChannelMetrics {
  readonly channel: OutreachChannel;
  readonly sent: number;
  readonly delivered: number;
  readonly opened: number;
  readonly replied: number;
  readonly openRate: number;
  readonly replyRate: number;
}

export interface FollowupSchedule {
  readonly id: string;
  readonly leadId: string;
  readonly channel: OutreachChannel;
  readonly scheduledAt: string;
  readonly message: string;
  readonly status: "scheduled" | "sent" | "cancelled";
}
