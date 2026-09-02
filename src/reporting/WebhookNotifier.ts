import { DiagnosticLogger } from './DiagnosticLogger.js';

export class WebhookNotifier {
  /** Posts an arbitrary Slack Block Kit payload (`{blocks, attachments?, text}`) to an incoming
   * webhook. `text` is required by Slack as a plain-text fallback for notifications/screen
   * readers even when `blocks` is present. */
  static async sendSlackNotification(webhookUrl: string, payload: Record<string, unknown>): Promise<boolean> {
    if (!webhookUrl) return false;
    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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

  /** Posts an Adaptive Card to a Microsoft Teams incoming webhook, using the
   * `attachments: [{contentType: 'application/vnd.microsoft.card.adaptive', content: card}]`
   * envelope Teams expects for rich cards (the legacy flat `MessageCard` format only supports
   * plain themeColor/sections and renders far less colorfully). */
  static async sendTeamsNotification(webhookUrl: string, card: Record<string, unknown>): Promise<boolean> {
    if (!webhookUrl) return false;
    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'message',
          attachments: [
            {
              contentType: 'application/vnd.microsoft.card.adaptive',
              content: card,
            },
          ],
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
