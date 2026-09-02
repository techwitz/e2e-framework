export class WebhookNotifier {
  static async sendSlackNotification(webhookUrl: string, message: string): Promise<void> {
    if (!webhookUrl) return;
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: message }),
      });
    } catch {
      // ignore webhook failures in test execution
    }
  }

  static async sendTeamsNotification(webhookUrl: string, title: string, text: string): Promise<void> {
    if (!webhookUrl) return;
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          '@type': 'MessageCard',
          summary: title,
          title,
          text,
        }),
      });
    } catch {
      // ignore webhook failures
    }
  }
}
