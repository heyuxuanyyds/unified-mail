export class GmailAdapter {
  constructor(private refreshToken: string, private clientId: string, private clientSecret: string) {}

  private async getAccessToken(): Promise<string> {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: this.refreshToken,
        grant_type: 'refresh_token',
      }),
    });
    const data = await res.json() as any;
    return data.access_token;
  }

  async listMessages(maxResults = 20) {
    const token = await this.getAccessToken();
    const res = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await res.json() as any;
    return data.messages || [];
  }

  async getMessage(id: string) {
    const token = await this.getAccessToken();
    const res = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return await res.json();
  }

  async sendMessage(to: string, subject: string, body: string) {
    const token = await this.getAccessToken();
    const raw = btoa(
      `From: me\r\nTo: ${to}\r\nSubject: ${subject}\r\nContent-Type: text/html; charset=utf-8\r\n\r\n${body}`
    );
    const res = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw }),
      }
    );
    return await res.json();
  }
}
