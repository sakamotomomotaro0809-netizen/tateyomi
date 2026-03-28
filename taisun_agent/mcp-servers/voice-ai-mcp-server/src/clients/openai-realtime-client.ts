import WebSocket from "ws";
import { v4 as uuidv4 } from "uuid";
import type {
  EnvConfig,
  RealtimeSession,
  RealtimeSessionConfig,
  ConversationMessage,
  ConversationLog,
  VoiceConfig,
  RealtimeTool,
} from "../types.js";

interface SessionEntry {
  readonly session: RealtimeSession;
  readonly ws: WebSocket;
  readonly messages: ConversationMessage[];
  readonly callSid?: string;
}

const DEFAULT_VOICE_CONFIG: VoiceConfig = {
  voice: "alloy",
  language: "en",
  speed: 1.0,
  pitch: 1.0,
};

const DEFAULT_SESSION_CONFIG: RealtimeSessionConfig = {
  systemPrompt: "You are a helpful voice assistant.",
  tools: [],
  voice: DEFAULT_VOICE_CONFIG,
  inputAudioFormat: "g711_ulaw",
  outputAudioFormat: "g711_ulaw",
  turnDetection: {
    type: "server_vad",
    threshold: 0.5,
    silenceDurationMs: 500,
  },
};

export class OpenAIRealtimeClient {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly sessions: Map<string, SessionEntry> = new Map();

  constructor(config: EnvConfig) {
    this.apiKey = config.openaiRealtimeApiKey;
    this.model = config.openaiRealtimeModel;
  }

  getModel(): string {
    return this.model;
  }

  async createSession(params?: {
    readonly systemPrompt?: string;
    readonly tools?: readonly RealtimeTool[];
    readonly voice?: Partial<VoiceConfig>;
  }): Promise<RealtimeSession> {
    const sessionId = uuidv4();

    const voiceConfig: VoiceConfig = {
      ...DEFAULT_VOICE_CONFIG,
      ...(params?.voice ?? {}),
    };

    const config: RealtimeSessionConfig = {
      ...DEFAULT_SESSION_CONFIG,
      systemPrompt: params?.systemPrompt ?? DEFAULT_SESSION_CONFIG.systemPrompt,
      tools: params?.tools ?? DEFAULT_SESSION_CONFIG.tools,
      voice: voiceConfig,
    };

    const wsUrl = `wss://api.openai.com/v1/realtime?model=${this.model}`;

    const ws = await this.connectWebSocket(wsUrl);

    this.sendSessionUpdate(ws, config);

    const session: RealtimeSession = {
      sessionId,
      config,
      status: "active",
      createdAt: new Date().toISOString(),
    };

    const entry: SessionEntry = {
      session,
      ws,
      messages: [],
    };

    this.sessions.set(sessionId, entry);

    this.setupEventHandlers(sessionId, ws);

    return session;
  }

  async configureSession(
    sessionId: string,
    configUpdate: Partial<RealtimeSessionConfig>
  ): Promise<RealtimeSession> {
    const entry = this.sessions.get(sessionId);
    if (!entry) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const updatedConfig: RealtimeSessionConfig = {
      ...entry.session.config,
      ...configUpdate,
      voice: {
        ...entry.session.config.voice,
        ...(configUpdate.voice ?? {}),
      },
      turnDetection: {
        ...entry.session.config.turnDetection,
        ...(configUpdate.turnDetection ?? {}),
      },
    };

    this.sendSessionUpdate(entry.ws, updatedConfig);

    const updatedSession: RealtimeSession = {
      ...entry.session,
      config: updatedConfig,
    };

    const updatedEntry: SessionEntry = {
      ...entry,
      session: updatedSession,
    };

    this.sessions.set(sessionId, updatedEntry);

    return updatedSession;
  }

  async closeSession(sessionId: string): Promise<void> {
    const entry = this.sessions.get(sessionId);
    if (!entry) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    entry.ws.close();
    this.sessions.delete(sessionId);
  }

  getSession(sessionId: string): RealtimeSession | undefined {
    return this.sessions.get(sessionId)?.session;
  }

  getWebSocket(sessionId: string): WebSocket | undefined {
    return this.sessions.get(sessionId)?.ws;
  }

  addMessage(sessionId: string, message: ConversationMessage): void {
    const entry = this.sessions.get(sessionId);
    if (entry) {
      entry.messages.push(message);
    }
  }

  getConversationLog(
    sessionId: string,
    callSid?: string
  ): ConversationLog | undefined {
    const entry = this.sessions.get(sessionId);
    if (!entry) {
      return undefined;
    }

    return {
      callSid: callSid ?? "",
      sessionId,
      messages: [...entry.messages],
      duration: this.calculateDuration(entry),
    };
  }

  findSessionByCallSid(callSid: string): string | undefined {
    for (const [sessionId, entry] of this.sessions.entries()) {
      if (entry.callSid === callSid) {
        return sessionId;
      }
    }
    return undefined;
  }

  linkCallSid(sessionId: string, callSid: string): void {
    const entry = this.sessions.get(sessionId);
    if (entry) {
      const updated: SessionEntry = { ...entry, callSid };
      this.sessions.set(sessionId, updated);
    }
  }

  async checkConnection(): Promise<boolean> {
    try {
      const wsUrl = `wss://api.openai.com/v1/realtime?model=${this.model}`;
      const ws = await this.connectWebSocket(wsUrl);
      ws.close();
      return true;
    } catch {
      return false;
    }
  }

  sendAudioToOpenAI(sessionId: string, audioPayload: string): void {
    const entry = this.sessions.get(sessionId);
    if (!entry || entry.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const event = {
      type: "input_audio_buffer.append",
      audio: audioPayload,
    };

    entry.ws.send(JSON.stringify(event));
  }

  private connectWebSocket(url: string): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "OpenAI-Beta": "realtime=v1",
        },
      });

      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error("WebSocket connection timeout (10s)"));
      }, 10_000);

      ws.on("open", () => {
        clearTimeout(timeout);
        resolve(ws);
      });

      ws.on("error", (err) => {
        clearTimeout(timeout);
        reject(new Error(`WebSocket connection error: ${err.message}`));
      });
    });
  }

  private sendSessionUpdate(
    ws: WebSocket,
    config: RealtimeSessionConfig
  ): void {
    if (ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const event = {
      type: "session.update",
      session: {
        instructions: config.systemPrompt,
        voice: config.voice.voice,
        input_audio_format: config.inputAudioFormat,
        output_audio_format: config.outputAudioFormat,
        turn_detection: {
          type: config.turnDetection.type,
          threshold: config.turnDetection.threshold,
          silence_duration_ms: config.turnDetection.silenceDurationMs,
        },
        tools: config.tools.map((tool) => ({
          type: "function",
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
        })),
      },
    };

    ws.send(JSON.stringify(event));
  }

  private setupEventHandlers(sessionId: string, ws: WebSocket): void {
    ws.on("message", (data: Buffer) => {
      try {
        const event = JSON.parse(data.toString()) as {
          type: string;
          [key: string]: unknown;
        };
        this.handleRealtimeEvent(sessionId, event);
      } catch {
        // ignore malformed messages
      }
    });

    ws.on("close", () => {
      const entry = this.sessions.get(sessionId);
      if (entry) {
        const closed: SessionEntry = {
          ...entry,
          session: { ...entry.session, status: "closed" },
        };
        this.sessions.set(sessionId, closed);
      }
    });

    ws.on("error", () => {
      const entry = this.sessions.get(sessionId);
      if (entry) {
        const errored: SessionEntry = {
          ...entry,
          session: { ...entry.session, status: "error" },
        };
        this.sessions.set(sessionId, errored);
      }
    });
  }

  private handleRealtimeEvent(
    sessionId: string,
    event: { type: string; [key: string]: unknown }
  ): void {
    const entry = this.sessions.get(sessionId);
    if (!entry) {
      return;
    }

    switch (event.type) {
      case "conversation.item.created": {
        const item = event.item as {
          role?: string;
          content?: Array<{ text?: string }>;
        } | undefined;
        if (item?.role && item?.content) {
          const text = item.content
            .map((c) => c.text ?? "")
            .filter(Boolean)
            .join(" ");
          if (text) {
            entry.messages.push({
              role: item.role as "user" | "assistant" | "system",
              content: text,
              timestamp: new Date().toISOString(),
            });
          }
        }
        break;
      }
      case "response.audio_transcript.done": {
        const transcript = event.transcript as string | undefined;
        if (transcript) {
          entry.messages.push({
            role: "assistant",
            content: transcript,
            timestamp: new Date().toISOString(),
          });
        }
        break;
      }
      default:
        break;
    }
  }

  private calculateDuration(entry: SessionEntry): number {
    if (entry.messages.length === 0) {
      return 0;
    }
    const first = new Date(entry.messages[0].timestamp).getTime();
    const last = new Date(
      entry.messages[entry.messages.length - 1].timestamp
    ).getTime();
    return Math.round((last - first) / 1000);
  }
}
