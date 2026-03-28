import WebSocket from "ws";
import type { OpenAIRealtimeClient } from "../clients/openai-realtime-client.js";
import type { TwilioMediaStreamEvent } from "../types.js";

interface BridgeConnection {
  readonly sessionId: string;
  readonly callSid: string;
  readonly streamSid: string;
  readonly twilioWs: WebSocket;
}

export class MediaStreamBridge {
  private readonly openaiClient: OpenAIRealtimeClient;
  private readonly connections: Map<string, BridgeConnection> = new Map();

  constructor(openaiClient: OpenAIRealtimeClient) {
    this.openaiClient = openaiClient;
  }

  async handleTwilioConnection(
    twilioWs: WebSocket,
    sessionId: string
  ): Promise<void> {
    const openaiWs = this.openaiClient.getWebSocket(sessionId);
    if (!openaiWs) {
      throw new Error(`No OpenAI session found for sessionId: ${sessionId}`);
    }

    twilioWs.on("message", (data: Buffer) => {
      try {
        const event = JSON.parse(data.toString()) as TwilioMediaStreamEvent;
        this.handleTwilioEvent(sessionId, event, twilioWs);
      } catch {
        // ignore malformed messages
      }
    });

    openaiWs.on("message", (data: Buffer) => {
      try {
        const event = JSON.parse(data.toString()) as {
          type: string;
          [key: string]: unknown;
        };
        this.handleOpenAIEvent(sessionId, event, twilioWs);
      } catch {
        // ignore malformed messages
      }
    });

    twilioWs.on("close", () => {
      this.cleanup(sessionId);
    });

    twilioWs.on("error", () => {
      this.cleanup(sessionId);
    });
  }

  private handleTwilioEvent(
    sessionId: string,
    event: TwilioMediaStreamEvent,
    twilioWs: WebSocket
  ): void {
    switch (event.event) {
      case "connected":
        break;

      case "start": {
        if (event.start) {
          const connection: BridgeConnection = {
            sessionId,
            callSid: event.start.callSid,
            streamSid: event.start.streamSid,
            twilioWs,
          };
          this.connections.set(sessionId, connection);
          this.openaiClient.linkCallSid(sessionId, event.start.callSid);
        }
        break;
      }

      case "media": {
        if (event.media?.payload) {
          this.openaiClient.sendAudioToOpenAI(sessionId, event.media.payload);
        }
        break;
      }

      case "stop": {
        this.cleanup(sessionId);
        break;
      }

      default:
        break;
    }
  }

  private handleOpenAIEvent(
    sessionId: string,
    event: { type: string; [key: string]: unknown },
    twilioWs: WebSocket
  ): void {
    const connection = this.connections.get(sessionId);
    if (!connection) {
      return;
    }

    switch (event.type) {
      case "response.audio.delta": {
        const delta = event.delta as string | undefined;
        if (delta && twilioWs.readyState === WebSocket.OPEN) {
          const mediaMessage = {
            event: "media",
            streamSid: connection.streamSid,
            media: {
              payload: delta,
            },
          };
          twilioWs.send(JSON.stringify(mediaMessage));
        }
        break;
      }

      case "response.audio.done": {
        if (twilioWs.readyState === WebSocket.OPEN) {
          const markMessage = {
            event: "mark",
            streamSid: connection.streamSid,
            mark: {
              name: `response-end-${Date.now()}`,
            },
          };
          twilioWs.send(JSON.stringify(markMessage));
        }
        break;
      }

      default:
        break;
    }
  }

  private cleanup(sessionId: string): void {
    this.connections.delete(sessionId);
  }

  getActiveConnections(): number {
    return this.connections.size;
  }
}
