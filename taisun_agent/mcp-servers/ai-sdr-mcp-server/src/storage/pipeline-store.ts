import * as fs from "node:fs";
import * as path from "node:path";
import type {
  AnalyticsReport,
  ChannelMetrics,
  FollowupSchedule,
  Lead,
  LeadRank,
  OutreachChannel,
  OutreachMessage,
  PipelineMetrics,
  PipelineStage,
  Sequence,
} from "../types.js";
import type { LeadStore } from "./lead-store.js";

const DEFAULT_STORAGE_DIR = "output/sdr";
const PIPELINE_FILE = "pipeline.json";

interface PipelineData {
  readonly messages: readonly OutreachMessage[];
  readonly sequences: readonly Sequence[];
  readonly followups: readonly FollowupSchedule[];
}

const PIPELINE_STAGES: readonly PipelineStage[] = [
  "discovery",
  "qualification",
  "outreach",
  "follow_up",
  "meeting",
  "closed_won",
  "closed_lost",
];

const LEAD_RANKS: readonly LeadRank[] = ["HOT", "WARM", "COLD", "DISQUALIFIED"];

export class PipelineStore {
  private readonly storagePath: string;
  private readonly leadStore: LeadStore;
  private data: PipelineData;

  constructor(leadStore: LeadStore, storageDir?: string) {
    const dir = storageDir ?? DEFAULT_STORAGE_DIR;
    this.storagePath = path.resolve(dir, PIPELINE_FILE);
    this.leadStore = leadStore;
    this.ensureDirectoryExists(dir);
    this.data = this.loadFromDisk();
  }

  private ensureDirectoryExists(dir: string): void {
    const resolvedDir = path.resolve(dir);
    if (!fs.existsSync(resolvedDir)) {
      fs.mkdirSync(resolvedDir, { recursive: true });
    }
  }

  private loadFromDisk(): PipelineData {
    try {
      if (fs.existsSync(this.storagePath)) {
        const raw = fs.readFileSync(this.storagePath, "utf-8");
        return JSON.parse(raw) as PipelineData;
      }
    } catch {
      // Fall through to default
    }
    return { messages: [], sequences: [], followups: [] };
  }

  private saveToDisk(): void {
    fs.writeFileSync(
      this.storagePath,
      JSON.stringify(this.data, null, 2),
      "utf-8"
    );
  }

  addMessage(message: OutreachMessage): void {
    this.data = {
      ...this.data,
      messages: [...this.data.messages, message],
    };
    this.saveToDisk();
  }

  updateMessageStatus(
    messageId: string,
    status: OutreachMessage["status"]
  ): OutreachMessage {
    const index = this.data.messages.findIndex((m) => m.id === messageId);
    if (index === -1) {
      throw new Error(`Message not found: ${messageId}`);
    }

    const existing = this.data.messages[index];
    const updated: OutreachMessage = {
      ...existing,
      status,
      sentAt: status === "sent" ? new Date().toISOString() : existing.sentAt,
    };

    this.data = {
      ...this.data,
      messages: [
        ...this.data.messages.slice(0, index),
        updated,
        ...this.data.messages.slice(index + 1),
      ],
    };
    this.saveToDisk();
    return updated;
  }

  addSequence(sequence: Sequence): void {
    this.data = {
      ...this.data,
      sequences: [...this.data.sequences, sequence],
    };
    this.saveToDisk();
  }

  getSequenceById(id: string): Sequence | null {
    return this.data.sequences.find((s) => s.id === id) ?? null;
  }

  updateSequence(id: string, updated: Sequence): void {
    const index = this.data.sequences.findIndex((s) => s.id === id);
    if (index === -1) {
      throw new Error(`Sequence not found: ${id}`);
    }

    this.data = {
      ...this.data,
      sequences: [
        ...this.data.sequences.slice(0, index),
        updated,
        ...this.data.sequences.slice(index + 1),
      ],
    };
    this.saveToDisk();
  }

  getSequencesByLeadId(leadId: string): readonly Sequence[] {
    return this.data.sequences.filter((s) => s.leadId === leadId);
  }

  addFollowup(followup: FollowupSchedule): void {
    this.data = {
      ...this.data,
      followups: [...this.data.followups, followup],
    };
    this.saveToDisk();
  }

  getFollowupsByLeadId(leadId: string): readonly FollowupSchedule[] {
    return this.data.followups.filter((f) => f.leadId === leadId);
  }

  updateStage(leadId: string, stage: PipelineStage): void {
    this.leadStore.updateLead(leadId, { pipelineStage: stage });
  }

  getPipeline(): PipelineMetrics {
    const allLeads = this.leadStore.getAllLeads();

    const byStage = {} as Record<PipelineStage, number>;
    for (const stage of PIPELINE_STAGES) {
      byStage[stage] = allLeads.filter((l) => l.pipelineStage === stage).length;
    }

    const byRank = {} as Record<LeadRank, number>;
    for (const rank of LEAD_RANKS) {
      byRank[rank] = allLeads.filter((l) => l.rank === rank).length;
    }

    const closedWon = byStage.closed_won;
    const closedTotal = closedWon + byStage.closed_lost;
    const conversionRate = closedTotal > 0 ? closedWon / closedTotal : 0;

    const sentMessages = this.data.messages.filter(
      (m) => m.sentAt !== undefined
    );
    const repliedMessages = this.data.messages.filter(
      (m) => m.status === "replied"
    );
    const avgResponseTime =
      sentMessages.length > 0
        ? repliedMessages.length / sentMessages.length
        : 0;

    const totalFollowups = this.data.followups.length;
    const completedFollowups = this.data.followups.filter(
      (f) => f.status === "sent"
    ).length;
    const followupCompletionRate =
      totalFollowups > 0 ? completedFollowups / totalFollowups : 0;

    return {
      totalLeads: allLeads.length,
      byStage,
      byRank,
      conversionRate: Math.round(conversionRate * 100) / 100,
      avgResponseTime: Math.round(avgResponseTime * 100) / 100,
      followupCompletionRate:
        Math.round(followupCompletionRate * 100) / 100,
    };
  }

  getAnalytics(period?: string): AnalyticsReport {
    const metrics = this.getPipeline();
    const channels: OutreachChannel[] = ["line", "email", "sms", "voice"];

    const topPerformingChannels: ChannelMetrics[] = channels.map((channel) => {
      const channelMessages = this.data.messages.filter(
        (m) => m.channel === channel
      );
      const sent = channelMessages.filter(
        (m) => m.status !== "draft" && m.status !== "scheduled"
      ).length;
      const delivered = channelMessages.filter(
        (m) =>
          m.status === "delivered" ||
          m.status === "opened" ||
          m.status === "clicked" ||
          m.status === "replied"
      ).length;
      const opened = channelMessages.filter(
        (m) =>
          m.status === "opened" ||
          m.status === "clicked" ||
          m.status === "replied"
      ).length;
      const replied = channelMessages.filter(
        (m) => m.status === "replied"
      ).length;

      return {
        channel,
        sent,
        delivered,
        opened,
        replied,
        openRate: sent > 0 ? Math.round((opened / sent) * 100) / 100 : 0,
        replyRate: sent > 0 ? Math.round((replied / sent) * 100) / 100 : 0,
      };
    });

    const recommendations = this.generateRecommendations(
      metrics,
      topPerformingChannels
    );

    return {
      period: period ?? "all_time",
      metrics,
      topPerformingChannels,
      recommendations,
      generatedAt: new Date().toISOString(),
    };
  }

  private generateRecommendations(
    metrics: PipelineMetrics,
    channels: readonly ChannelMetrics[]
  ): readonly string[] {
    const recs: string[] = [];

    if (metrics.byRank.COLD > metrics.totalLeads * 0.5) {
      recs.push(
        "COLDリードが50%以上。ナーチャリングコンテンツの強化を推奨。"
      );
    }

    if (metrics.conversionRate < 0.1) {
      recs.push(
        "コンバージョン率が10%未満。クオリフィケーション基準の見直しを推奨。"
      );
    }

    if (metrics.followupCompletionRate < 0.5) {
      recs.push(
        "フォローアップ完了率が50%未満。自動フォローアップの活用を推奨。"
      );
    }

    const bestChannel = [...channels].sort(
      (a, b) => b.replyRate - a.replyRate
    )[0];
    if (bestChannel && bestChannel.replyRate > 0) {
      recs.push(
        `最も返信率の高いチャネルは${bestChannel.channel}(${Math.round(bestChannel.replyRate * 100)}%)。このチャネルの活用を強化推奨。`
      );
    }

    if (metrics.byStage.discovery > metrics.totalLeads * 0.4) {
      recs.push(
        "Discoveryステージに40%以上のリードが滞留。早期のクオリフィケーションを推奨。"
      );
    }

    if (recs.length === 0) {
      recs.push("現在のパフォーマンスは良好です。引き続きモニタリングを継続してください。");
    }

    return recs;
  }
}
