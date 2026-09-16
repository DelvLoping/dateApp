import { getScenario } from '@/lib/scenarios';

type Payload = {
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
    const validText = Boolean(payload.address?.trim()) && (payload.address?.length ?? 0) <= 240 && (payload.review?.length ?? 0) <= 1000;
    if (!validScenario || !validText) return Response.json({ error: 'Invalid payload' }, { status: 400 });
    await telegram([
      `💌 Nouveau date confirmé`,
      `${payload.sender ?? 'Florent'} × ${payload.guest}`,
      `📅 ${payload.date ?? 'Non renseigné'} à ${payload.time ?? 'Non renseignée'}`,
      `🍽️ ${payload.venue ?? 'Non renseigné'}`,
      `📍 ${payload.address}`,
      `🔑 ${payload.scenarioId}`,
    ].join('\n'));
    if (payload.review?.trim()) await telegram(`💬 Message de ${payload.guest}\n${payload.review.trim()}`);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: 'Notification failed' }, { status: 503 });
  }
}
