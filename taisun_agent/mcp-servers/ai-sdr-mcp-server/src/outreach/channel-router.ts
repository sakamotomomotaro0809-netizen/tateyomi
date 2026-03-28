import type { Lead, LeadRank, OutreachChannel, SequenceStep } from "../types.js";

interface ChannelRoutingRule {
  readonly rank: LeadRank;
  readonly primaryChannel: OutreachChannel;
  readonly fallbackChannels: readonly OutreachChannel[];
  readonly immediacy: "immediate" | "scheduled";
}

const ROUTING_RULES: readonly ChannelRoutingRule[] = [
  {
    rank: "HOT",
    primaryChannel: "line",
    fallbackChannels: ["voice"],
    immediacy: "immediate",
  },
  {
    rank: "WARM",
    primaryChannel: "line",
    fallbackChannels: ["email", "sms"],
    immediacy: "scheduled",
  },
  {
    rank: "COLD",
    primaryChannel: "email",
    fallbackChannels: [],
    immediacy: "scheduled",
  },
  {
    rank: "DISQUALIFIED",
    primaryChannel: "email",
    fallbackChannels: [],
    immediacy: "scheduled",
  },
];

export function selectChannel(lead: Lead): OutreachChannel {
  const rule = ROUTING_RULES.find((r) => r.rank === lead.rank);
  if (!rule) {
    return "email";
  }

  if (rule.primaryChannel === "line" && lead.lineUserId) {
    return "line";
  }

  if (rule.primaryChannel === "voice" && lead.phone) {
    return "voice";
  }

  if (rule.primaryChannel === "line" && !lead.lineUserId) {
    if (lead.phone && rule.fallbackChannels.includes("voice")) {
      return "voice";
    }
    if (lead.email && rule.fallbackChannels.includes("email")) {
      return "email";
    }
  }

  return "email";
}

export function createSequenceForRank(rank: LeadRank): readonly SequenceStep[] {
  switch (rank) {
    case "HOT":
      return createHotSequence();
    case "WARM":
      return createWarmSequence();
    case "COLD":
      return createColdSequence();
    case "DISQUALIFIED":
      return createDisqualifiedSequence();
  }
}

function createHotSequence(): readonly SequenceStep[] {
  return [
    {
      stepNumber: 1,
      channel: "line",
      delayHours: 0,
      messageTemplate: "immediate_line_hot",
      status: "pending",
    },
    {
      stepNumber: 2,
      channel: "voice",
      delayHours: 1,
      messageTemplate: "followup_call_hot",
      status: "pending",
    },
    {
      stepNumber: 3,
      channel: "email",
      delayHours: 24,
      messageTemplate: "summary_email_hot",
      status: "pending",
    },
  ];
}

function createWarmSequence(): readonly SequenceStep[] {
  return [
    {
      stepNumber: 1,
      channel: "line",
      delayHours: 0,
      messageTemplate: "initial_line_warm",
      status: "pending",
    },
    {
      stepNumber: 2,
      channel: "email",
      delayHours: 72,
      messageTemplate: "followup_email_warm",
      status: "pending",
    },
    {
      stepNumber: 3,
      channel: "sms",
      delayHours: 72,
      messageTemplate: "reminder_sms_warm",
      status: "pending",
    },
  ];
}

function createColdSequence(): readonly SequenceStep[] {
  return [
    {
      stepNumber: 1,
      channel: "email",
      delayHours: 0,
      messageTemplate: "nurture_email_cold_1",
      status: "pending",
    },
    {
      stepNumber: 2,
      channel: "email",
      delayHours: 168,
      messageTemplate: "nurture_email_cold_2",
      status: "pending",
    },
    {
      stepNumber: 3,
      channel: "email",
      delayHours: 168,
      messageTemplate: "nurture_email_cold_3",
      status: "pending",
    },
  ];
}

function createDisqualifiedSequence(): readonly SequenceStep[] {
  return [
    {
      stepNumber: 1,
      channel: "email",
      delayHours: 720,
      messageTemplate: "reactivation_email",
      status: "pending",
    },
  ];
}
