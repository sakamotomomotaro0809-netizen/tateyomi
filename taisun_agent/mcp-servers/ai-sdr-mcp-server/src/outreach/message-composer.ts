import { v4 as uuidv4 } from "uuid";
import type { Lead, OutreachChannel, OutreachMessage } from "../types.js";

const CHANNEL_LIMITS: Record<OutreachChannel, number | null> = {
  line: 300,
  email: null,
  sms: 70,
  voice: null,
};

const DEFAULT_TEMPLATES: Record<string, string> = {
  immediate_line_hot:
    "{name}様、お世話になっております。{company}の件で、すぐにお役に立てる情報がございます。お時間ございましたら、ぜひ一度お話しさせてください。",
  followup_call_hot:
    "{name}様へのフォローアップコール。{company}での{position}としてのご課題について詳しくお伺いしたい。",
  summary_email_hot:
    "{name}様\n\nお世話になっております。\n先日お話しさせていただいた件について、改めてご案内させていただきます。\n{company}様の{position}としてのお立場から、弊社サービスがお役に立てるポイントをまとめました。\n\nご不明な点がございましたら、お気軽にお問い合わせください。",
  initial_line_warm:
    "{name}様、はじめまして。{company}の{position}としてご活躍のことと存じます。弊社サービスについてご興味をお持ちいただき、ありがとうございます。詳しいご案内をお送りしてもよろしいでしょうか？",
  followup_email_warm:
    "{name}様\n\nお世話になっております。\n先日ご案内させていただいた件、その後いかがでしょうか。\n{company}様のお役に立てる追加情報がございますので、よろしければお時間をいただけますと幸いです。",
  reminder_sms_warm:
    "{name}様、先日のご案内について、ご質問等ございましたらお気軽にご連絡ください。",
  nurture_email_cold_1:
    "{name}様\n\nはじめまして。\n{industry}業界で多くの企業様にご利用いただいている弊社サービスについて、ご紹介させてください。\n{company}様のお役に立てる事例がございます。",
  nurture_email_cold_2:
    "{name}様\n\nお世話になっております。\n{industry}業界の最新トレンドについてまとめたレポートを公開しました。\n{position}としてのお立場からも、ぜひご一読いただけますと幸いです。",
  nurture_email_cold_3:
    "{name}様\n\nお世話になっております。\n弊社の{industry}業界向けセミナーを開催いたします。\n{company}様にも関連する内容となっておりますので、ぜひご参加ください。",
  reactivation_email:
    "{name}様\n\nご無沙汰しております。\nその後、お変わりなくお過ごしでしょうか。\n{industry}業界の最新情報をお届けしたく、ご連絡いたしました。",
};

function replacePlaceholders(template: string, lead: Lead): string {
  return template
    .replace(/\{name\}/g, lead.name)
    .replace(/\{company\}/g, lead.company)
    .replace(/\{position\}/g, lead.position)
    .replace(/\{industry\}/g, lead.industry)
    .replace(/\{region\}/g, lead.region)
    .replace(/\{email\}/g, lead.email);
}

function truncateToLimit(text: string, channel: OutreachChannel): string {
  const limit = CHANNEL_LIMITS[channel];
  if (limit === null) {
    return text;
  }
  if (text.length <= limit) {
    return text;
  }
  return text.slice(0, limit - 3) + "...";
}

export function composeMessage(
  lead: Lead,
  channel: OutreachChannel,
  templateKey?: string
): OutreachMessage {
  const key = templateKey ?? getDefaultTemplateKey(lead.rank, channel);
  const rawTemplate = DEFAULT_TEMPLATES[key] ?? DEFAULT_TEMPLATES[`nurture_email_cold_1`];

  const personalizedBody = replacePlaceholders(rawTemplate, lead);
  const body = truncateToLimit(personalizedBody, channel);

  const subject =
    channel === "email"
      ? `${lead.name}様へのご案内`
      : undefined;

  return {
    id: uuidv4(),
    leadId: lead.id,
    channel,
    subject,
    body,
    status: "draft",
    metadata: {
      templateKey: key,
      composedAt: new Date().toISOString(),
    },
  };
}

function getDefaultTemplateKey(
  rank: string,
  channel: OutreachChannel
): string {
  const mapping: Record<string, Record<string, string>> = {
    HOT: {
      line: "immediate_line_hot",
      voice: "followup_call_hot",
      email: "summary_email_hot",
      sms: "immediate_line_hot",
    },
    WARM: {
      line: "initial_line_warm",
      email: "followup_email_warm",
      sms: "reminder_sms_warm",
      voice: "initial_line_warm",
    },
    COLD: {
      email: "nurture_email_cold_1",
      line: "nurture_email_cold_1",
      sms: "nurture_email_cold_1",
      voice: "nurture_email_cold_1",
    },
    DISQUALIFIED: {
      email: "reactivation_email",
      line: "reactivation_email",
      sms: "reactivation_email",
      voice: "reactivation_email",
    },
  };

  return mapping[rank]?.[channel] ?? "nurture_email_cold_1";
}

export function getAvailableTemplates(): readonly string[] {
  return Object.keys(DEFAULT_TEMPLATES);
}
