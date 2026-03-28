export interface VoiceConfig {
  readonly voice:
    | "alloy"
    | "ash"
    | "ballad"
    | "coral"
    | "echo"
    | "sage"
    | "shimmer"
    | "verse";
  readonly language: string;
  readonly speed: number;
  readonly pitch: number;
}

export type CallState =
  | "queued"
  | "ringing"
  | "in-progress"
  | "completed"
  | "busy"
  | "no-answer"
  | "canceled"
  | "failed";

export interface CallInfo {
  readonly callSid: string;
  readonly from: string;
  readonly to: string;
  readonly status: CallState;
  readonly direction: "outbound-api" | "inbound";
  readonly startTime: string;
}

export interface CallStatus {
  readonly callSid: string;
  readonly status: CallState;
  readonly duration: number;
  readonly cost: number;
  readonly currency: string;
  readonly startTime: string;
  readonly endTime: string;
}

export interface SmsResult {
  readonly messageSid: string;
  readonly status: string;
  readonly to: string;
  readonly from: string;
  readonly body: string;
}

export interface BroadcastConfig {
  readonly recipients: readonly string[];
  readonly message: string;
  readonly schedule?: string;
}

export interface BroadcastResult {
  readonly broadcastId: string;
  readonly totalRecipients: number;
  readonly successCount: number;
  readonly failureCount: number;
  readonly results: readonly SmsResult[];
}

export interface RealtimeSessionConfig {
  readonly systemPrompt: string;
  readonly tools: readonly RealtimeTool[];
  readonly voice: VoiceConfig;
  readonly inputAudioFormat: "g711_ulaw" | "g711_alaw" | "pcm16";
  readonly outputAudioFormat: "g711_ulaw" | "g711_alaw" | "pcm16";
  readonly turnDetection: {
    readonly type: "server_vad";
    readonly threshold: number;
    readonly silenceDurationMs: number;
  };
}

export interface RealtimeTool {
  readonly name: string;
  readonly description: string;
  readonly parameters: Record<string, unknown>;
}

export interface RealtimeSession {
  readonly sessionId: string;
  readonly config: RealtimeSessionConfig;
  readonly status: "active" | "closed" | "error";
  readonly createdAt: string;
}

export interface ConversationMessage {
  readonly role: "user" | "assistant" | "system";
  readonly content: string;
  readonly timestamp: string;
  readonly audioUrl?: string;
}

export interface ConversationLog {
  readonly callSid: string;
  readonly sessionId: string;
  readonly messages: readonly ConversationMessage[];
  readonly duration: number;
  readonly summary?: string;
}

export interface TwilioMediaStreamEvent {
  readonly event: "connected" | "start" | "media" | "stop" | "mark";
  readonly sequenceNumber?: string;
  readonly streamSid?: string;
  readonly media?: {
    readonly track: "inbound" | "outbound";
    readonly chunk: string;
    readonly timestamp: string;
    readonly payload: string;
  };
  readonly start?: {
    readonly streamSid: string;
    readonly accountSid: string;
    readonly callSid: string;
    readonly tracks: readonly string[];
    readonly mediaFormat: {
      readonly encoding: string;
      readonly sampleRate: number;
      readonly channels: number;
    };
  };
}

export interface HealthCheckResult {
  readonly twilio: {
    readonly connected: boolean;
    readonly accountSid: string;
    readonly error?: string;
  };
  readonly openai: {
    readonly connected: boolean;
    readonly model: string;
    readonly error?: string;
  };
  readonly webhook: {
    readonly running: boolean;
    readonly port: number;
    readonly error?: string;
  };
}

export interface EnvConfig {
  readonly twilioAccountSid: string;
  readonly twilioAuthToken: string;
  readonly twilioPhoneNumber: string;
  readonly openaiRealtimeApiKey: string;
  readonly openaiRealtimeModel: string;
  readonly webhookPort: number;
  readonly webhookBaseUrl: string;
}

export function loadEnvConfig(): EnvConfig {
  return {
    twilioAccountSid: process.env.TWILIO_ACCOUNT_SID ?? "",
    twilioAuthToken: process.env.TWILIO_AUTH_TOKEN ?? "",
    twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER ?? "",
    openaiRealtimeApiKey: process.env.OPENAI_REALTIME_API_KEY ?? "",
    openaiRealtimeModel:
      process.env.OPENAI_REALTIME_MODEL ?? "gpt-4o-realtime-preview",
    webhookPort: parseInt(process.env.VOICE_WEBHOOK_PORT ?? "3100", 10),
    webhookBaseUrl:
      process.env.VOICE_WEBHOOK_BASE_URL ?? "http://localhost:3100",
  };
}
