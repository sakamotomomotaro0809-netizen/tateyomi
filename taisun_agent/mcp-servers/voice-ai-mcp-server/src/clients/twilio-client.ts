import Twilio from "twilio";
import type { EnvConfig, CallInfo, CallStatus, CallState, SmsResult } from "../types.js";

export class TwilioClient {
  private readonly client: ReturnType<typeof Twilio>;
  private readonly phoneNumber: string;
  private readonly accountSid: string;

  constructor(config: EnvConfig) {
    this.client = Twilio(config.twilioAccountSid, config.twilioAuthToken);
    this.phoneNumber = config.twilioPhoneNumber;
    this.accountSid = config.twilioAccountSid;
  }

  getAccountSid(): string {
    return this.accountSid;
  }

  async makeCall(params: {
    readonly to: string;
    readonly from?: string;
    readonly twimlUrl: string;
  }): Promise<CallInfo> {
    try {
      const call = await this.client.calls.create({
        to: params.to,
        from: params.from ?? this.phoneNumber,
        url: params.twimlUrl,
      });

      return {
        callSid: call.sid,
        from: call.from,
        to: call.to,
        status: call.status as CallState,
        direction: call.direction as "outbound-api" | "inbound",
        startTime: call.startTime?.toISOString() ?? new Date().toISOString(),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Twilio makeCall failed: ${message}`);
    }
  }

  async endCall(callSid: string): Promise<boolean> {
    try {
      await this.client.calls(callSid).update({ status: "completed" });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Twilio endCall failed: ${message}`);
    }
  }

  async getCallStatus(callSid: string): Promise<CallStatus> {
    try {
      const call = await this.client.calls(callSid).fetch();

      return {
        callSid: call.sid,
        status: call.status as CallState,
        duration: parseInt(call.duration ?? "0", 10),
        cost: parseFloat(call.price ?? "0"),
        currency: call.priceUnit ?? "USD",
        startTime: call.startTime?.toISOString() ?? "",
        endTime: call.endTime?.toISOString() ?? "",
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Twilio getCallStatus failed: ${message}`);
    }
  }

  async listActiveCalls(): Promise<readonly CallInfo[]> {
    try {
      const calls = await this.client.calls.list({ status: "in-progress" });

      return calls.map((call) => ({
        callSid: call.sid,
        from: call.from,
        to: call.to,
        status: call.status as CallState,
        direction: call.direction as "outbound-api" | "inbound",
        startTime: call.startTime?.toISOString() ?? "",
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Twilio listActiveCalls failed: ${message}`);
    }
  }

  async sendSms(params: {
    readonly to: string;
    readonly from?: string;
    readonly body: string;
  }): Promise<SmsResult> {
    try {
      const message = await this.client.messages.create({
        to: params.to,
        from: params.from ?? this.phoneNumber,
        body: params.body,
      });

      return {
        messageSid: message.sid,
        status: message.status,
        to: message.to,
        from: message.from,
        body: message.body ?? params.body,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Twilio sendSms failed: ${msg}`);
    }
  }

  async checkConnection(): Promise<boolean> {
    try {
      const account = await this.client.api.accounts(this.accountSid).fetch();
      return account.status === "active";
    } catch {
      return false;
    }
  }
}
