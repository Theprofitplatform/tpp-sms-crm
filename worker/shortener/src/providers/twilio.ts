import twilio from 'twilio';

export interface SendMessageParams {
  from: string;
  to: string;
  body: string;
}

export interface SendResult {
  messageId: string;
  status: string;
}

export class TwilioProvider {
  private client: twilio.Twilio | null = null;

  constructor(
    private accountSid: string,
    private authToken: string,
    private defaultFrom: string
  ) {
    // Lazy initialization - don't create client until first send
  }

  private getClient(): twilio.Twilio {
    if (!this.client) {
      if (!this.accountSid || !this.authToken) {
        throw new Error('Twilio credentials not configured');
      }
      if (!this.accountSid.startsWith('AC')) {
        throw new Error('Invalid Twilio Account SID - must start with AC');
      }
      this.client = twilio(this.accountSid, this.authToken);
    }
    return this.client;
  }

  async send(params: SendMessageParams): Promise<SendResult> {
    try {
      const client = this.getClient();
      const message = await client.messages.create({
        body: params.body,
        from: params.from || this.defaultFrom,
        to: params.to,
      });

      return {
        messageId: message.sid,
        status: message.status,
      };
    } catch (error: any) {
      // Map Twilio errors
      if (error.code === 21211) {
        throw new Error('Invalid phone number');
      }

      if (error.status >= 500) {
        throw new Error(`Provider error: ${error.message}`);
      }

      throw new Error(`Send failed: ${error.message}`);
    }
  }
}
