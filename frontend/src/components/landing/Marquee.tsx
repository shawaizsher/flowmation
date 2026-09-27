const ROW_A = ['Slack', 'GitHub', 'Stripe', 'OpenAI', 'Google Sheets', 'PostgreSQL', 'Redis', 'Telegram', 'Notion', 'HubSpot'];
const ROW_B = ['Webhooks', 'Cron', 'HTTP', 'Gmail', 'Jira', 'Discord', 'Airtable', 'Claude', 'S3', 'Twilio'];

function Row({ items, reverse }: { items: string[]; reverse?: boolean }) {
  const loop = [...items, ...items];
  return (
    <div className={`fx-marquee__row${reverse ? ' fx-marquee__row--rev' : ''}`}>
      <div className="fx-marquee__track">
        {loop.map((t, i) => (
          <span key={i} className="fx-marquee__item fx-mono" aria-hidden={i >= items.length}>
            <span className="fx-marquee__dot" />
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function Marquee() {
  return (
    <div className="fx-marquee" aria-label="Supported integrations">
      <Row items={ROW_A} />
      <Row items={ROW_B} reverse />
    </div>
  );
}
