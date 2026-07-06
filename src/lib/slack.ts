export async function notifySlack(
  title: string,
  message: string,
  fields?: Record<string, string>
): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) return;

  const blocks: object[] = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*${title}*\n${message}`,
      },
    },
  ];

  if (fields && Object.keys(fields).length > 0) {
    blocks.push({
      type: 'section',
      fields: Object.entries(fields).map(([key, value]) => ({
        type: 'mrkdwn',
        text: `*${key}*\n${value}`,
      })),
    });
  }

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blocks }),
    });
  } catch (err) {
    console.error('Slack notification failed:', err);
  }
}
