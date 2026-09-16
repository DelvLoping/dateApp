import { getScenario } from '@/lib/scenarios';

type Payload = {
  kind?: 'confirmation' | 'review';
  scenarioId?: string;
  sender?: string;
  guest?: string;
  date?: string | null;
  time?: string | null;
  venue?: string | null;
  address?: string;
  review?: string;
};

async function telegram(text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) throw new Error('Telegram is not configured');
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
  if (!response.ok) throw new Error('Telegram rejected the message');
}

export async function POST(request: Request) {
  try {
    const payload = await request.json() as Payload;
    const scenario = getScenario(payload.scenarioId ?? '');
    const validScenario = Boolean(scenario) && payload.guest === scenario?.guest && payload.sender === scenario?.sender;
    if (!validScenario) return Response.json({ error: 'Invalid payload' }, { status: 400 });

    if (payload.kind === 'confirmation') {
      const validConfirmation = Boolean(payload.date && payload.time && payload.venue?.trim() && payload.address?.trim()) && (payload.address?.length ?? 0) <= 240;
      if (!validConfirmation) return Response.json({ error: 'Invalid confirmation' }, { status: 400 });
      await telegram([
        `💌 Nouveau date confirmé`,
        `${scenario?.sender} × ${scenario?.guest}`,
        `📅 ${payload.date} à ${payload.time}`,
        `🍽️ ${payload.venue}`,
        `📍 ${payload.address?.trim()}`,
        `🔑 ${payload.scenarioId}`,
      ].join('\n'));
    } else if (payload.kind === 'review') {
      const review = payload.review?.trim();
      if (!review || review.length > 1000) return Response.json({ error: 'Invalid review' }, { status: 400 });
      await telegram(`💬 Message de ${scenario?.guest}\n${review}`);
    } else {
      return Response.json({ error: 'Invalid notification kind' }, { status: 400 });
    }
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: 'Notification failed' }, { status: 503 });
  }
}
