export class GraphAdapter {
  constructor(private refreshToken: string, private clientId: string, private clientSecret: string) {}

  private async getAccessToken(): Promise<string> {
    const res = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: this.refreshToken,
        grant_type: 'refresh_token',
        scope: 'https://graph.microsoft.com/Mail.ReadWrite https://graph.microsoft.com/Mail.Send offline_access',
      }),
    });
    const data = await res.json() as any;
    return data.access_token;
  }

  async listMessages(top = 20) {
    const token = await this.getAccessToken();
    const res = await fetch(
      `https://graph.microsoft.com/v1.0/me/messages?$top=${top}&$orderby=receivedDateTime desc`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await res.json() as any;
    return data.value || [];
  }

  async sendMessage(to: string, subject: string, body: string) {
    const token = await this.getAccessToken();
    const res = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: {
          subject,
          body: { contentType: 'HTML', content: body },
          toRecipients: [{ emailAddress: { address: to } }],
        },
      }),
    });
    return { status: res.status };
  }
  }
