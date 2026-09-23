import { connect as imapConnect, fetchRecent } from 'edgeport/imap';
import { send as smtpSend } from 'edgeport/smtp';

export class ImapAdapter {
  constructor(
    private imapHost: string,
    private imapPort: number,
    private smtpHost: string,
    private smtpPort: number,
    private username: string,
    private password: string
  ) {}

  async fetchInbox(count = 10) {
    return await fetchRecent({
      hostname: this.imapHost,
      port: this.imapPort,
      auth: { username: this.username, password: this.password },
      mailbox: 'INBOX',
      count,
    });
  }

  async sendMail(to: string, subject: string, body: string) {
    await smtpSend({
      hostname: this.smtpHost,
      port: this.smtpPort,
      tls: 'implicit',
      auth: { username: this.username, password: this.password },
      from: this.username,
      to,
      subject,
      html: body,
      text: body.replace(/<[^>]*>/g, ''),
    });
  }
}
