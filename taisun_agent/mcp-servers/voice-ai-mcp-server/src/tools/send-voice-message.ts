import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { AbstractTool } from "./AbstractTool.js";
import { createSuccessResponse, createErrorResponse } from "../common/response.js";
import type { TwilioClient } from "../clients/twilio-client.js";
import type { EnvConfig } from "../types.js";
import { generateSayTwiml, generatePlayTwiml } from "../webhook/twiml-generator.js";

export default class SendVoiceMessageTool extends AbstractTool {
  private readonly client: TwilioClient;
  private readonly config: EnvConfig;

  constructor(client: TwilioClient, config: EnvConfig) {
    super();
    this.client = client;
    this.config = config;
  }

  register(server: McpServer): void {
    server.tool(
      "voice_send_voice_message",
      "Send a one-way voice message to a phone number. Either provide text to be spoken (TTS) or an audio URL to play.",
      {
        to: z.string().describe("Recipient phone number (E.164 format)"),
        from: z.string().optional().describe("Caller ID phone number. Defaults to configured Twilio number."),
        text: z.string().optional().describe("Text message to speak via TTS. Provide either text or audioUrl."),
        audioUrl: z.string().optional().describe("URL of audio file to play. Provide either text or audioUrl."),
        voice: z.string().optional().describe("TTS voice name (e.g. Polly.Joanna). Only used with text."),
        language: z.string().optional().describe("Language code (e.g. en-US, ja-JP). Only used with text."),
      },
      async ({ to, from, text, audioUrl, voice, language }) => {
        try {
          if (!text && !audioUrl) {
            return createErrorResponse("Either 'text' or 'audioUrl' must be provided");
          }

          let twimlUrl: string;

          if (audioUrl) {
            const _twiml = generatePlayTwiml({ audioUrl });
            twimlUrl = `${this.config.webhookBaseUrl}/voice/twiml/play?url=${encodeURIComponent(audioUrl)}`;
          } else {
            const _twiml = generateSayTwiml({
              message: text!,
              voice,
              language,
            });
            twimlUrl = `${this.config.webhookBaseUrl}/voice/twiml/say?text=${encodeURIComponent(text!)}&voice=${encodeURIComponent(voice ?? "Polly.Joanna")}&lang=${encodeURIComponent(language ?? "en-US")}`;
          }

          const result = await this.client.makeCall({
            to,
            from,
            twimlUrl,
          });

          return createSuccessResponse({
            callSid: result.callSid,
            to: result.to,
            from: result.from,
            status: result.status,
            type: audioUrl ? "audio_playback" : "tts",
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          return createErrorResponse(`Failed to send voice message: ${message}`);
        }
      }
    );
  }
}
