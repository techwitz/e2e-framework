import { DiagnosticLogger } from './DiagnosticLogger.js';

export class WebhookNotifier {
  static async sendSlackNotification(webhookUrl: string, message: string): Promise<boolean> {
    if (!webhookUrl) return false;
    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: message }),
      });
      if (!res.ok) {
        DiagnosticLogger.warn('Slack webhook responded with a non-OK status', {
          status: res.status,
        });
        return false;
      }
      return true;
    } catch (err) {
      // A notification failure must never fail the test run itself — log and move on.
      DiagnosticLogger.warn('Slack webhook call failed', { error: String(err) });
      return false;
    }
  }

  static async sendTeamsNotification(
    webhookUrl: string,
    title: string,
    text: string,
  ): Promise<boolean> {
    if (!webhookUrl) return false;
    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          '@type': 'MessageCard',
          '@context': 'http://schema.org/extensions',
          summary: title,
          title,
          text,
        }),
      });
      if (!res.ok) {
        DiagnosticLogger.warn('Teams webhook responded with a non-OK status', {
          status: res.status,
        });
        return false;
      }
      return true;
    } catch (err) {
      DiagnosticLogger.warn('Teams webhook call failed', { error: String(err) });
      return false;
    }
  }
}
