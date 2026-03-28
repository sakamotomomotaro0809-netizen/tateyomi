import express from "express";
import { createServer, type Server as HttpServer } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import type { OpenAIRealtimeClient } from "../clients/openai-realtime-client.js";
import { MediaStreamBridge } from "../bridge/media-stream-bridge.js";
import { generateStreamTwiml } from "./twiml-generator.js";
import type { EnvConfig } from "../types.js";

export class WebhookServer {
  private readonly app: express.Application;
  private readonly httpServer: HttpServer;
  private readonly wss: WebSocketServer;
  private readonly bridge: MediaStreamBridge;
  private readonly openaiClient: OpenAIRealtimeClient;
  private readonly port: number;
  private readonly baseUrl: string;
  private running = false;

  constructor(openaiClient: OpenAIRealtimeClient, config: EnvConfig) {
    this.openaiClient = openaiClient;
    this.port = config.webhookPort;
    this.baseUrl = config.webhookBaseUrl;
    this.bridge = new MediaStreamBridge(openaiClient);

    this.app = express();
    this.app.use(express.urlencoded({ extended: false }));
    this.app.use(express.json());

    this.httpServer = createServer(this.app);
    this.wss = new WebSocketServer({ server: this.httpServer, path: "/voice/stream" });

    this.setupRoutes();
    this.setupWebSocket();
  }

  private setupRoutes(): void {
    this.app.get("/health", (_req, res) => {
      res.json({ status: "ok", connections: this.bridge.getActiveConnections() });
    });

    this.app.post("/voice", async (_req, res) => {
      try {
        const session = await this.openaiClient.createSession();
        const wsUrl = `${this.baseUrl.replace(/^http/, "ws")}/voice/stream?sessionId=${session.sessionId}`;
        const twiml = generateStreamTwiml({ websocketUrl: wsUrl });

        res.type("text/xml");
        res.send(twiml);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[WebhookServer] /voice error: ${message}`);
        res.status(500).send("<Response><Say>An error occurred.</Say></Response>");
      }
    });

    this.app.post("/voice/status", (req, res) => {
      const body = req.body as Record<string, string>;
      const callSid = body.CallSid ?? "unknown";
      const callStatus = body.CallStatus ?? "unknown";
      console.error(`[WebhookServer] Call status update: ${callSid} -> ${callStatus}`);
      res.sendStatus(200);
    });
  }

  private setupWebSocket(): void {
    this.wss.on("connection", (ws: WebSocket, req) => {
      const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
      const sessionId = url.searchParams.get("sessionId");

      if (!sessionId) {
        ws.close(1008, "Missing sessionId parameter");
        return;
      }

      const session = this.openaiClient.getSession(sessionId);
      if (!session) {
        ws.close(1008, "Invalid sessionId");
        return;
      }

      this.bridge.handleTwilioConnection(ws, sessionId).catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[WebhookServer] Bridge error: ${message}`);
        ws.close(1011, "Bridge setup failed");
      });
    });
  }

  async start(): Promise<void> {
    if (this.running) {
      return;
    }

    return new Promise((resolve, reject) => {
      this.httpServer.listen(this.port, () => {
        this.running = true;
        console.error(`[WebhookServer] Listening on port ${this.port}`);
        resolve();
      });

      this.httpServer.on("error", (error) => {
        reject(new Error(`WebhookServer start failed: ${error.message}`));
      });
    });
  }

  async stop(): Promise<void> {
    if (!this.running) {
      return;
    }

    return new Promise((resolve) => {
      this.wss.close(() => {
        this.httpServer.close(() => {
          this.running = false;
          resolve();
        });
      });
    });
  }

  isRunning(): boolean {
    return this.running;
  }

  getPort(): number {
    return this.port;
  }

  getBridge(): MediaStreamBridge {
    return this.bridge;
  }
}
