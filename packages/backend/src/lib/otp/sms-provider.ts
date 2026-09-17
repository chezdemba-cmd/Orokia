export interface SmsProvider {
  sendOtp(phoneE164: string, code: string, channel: "SMS" | "VOICE"): Promise<void>;
}

/** Dev-only stub: logs the code instead of sending a real SMS/voice call. */
export class ConsoleStubSmsProvider implements SmsProvider {
  async sendOtp(phoneE164: string, code: string, channel: "SMS" | "VOICE"): Promise<void> {
    console.log(`[OTP STUB] ${channel} vers ${phoneE164} : code = ${code}`);
  }
}

export const smsProvider: SmsProvider = new ConsoleStubSmsProvider();
