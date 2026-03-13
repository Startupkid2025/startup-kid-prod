import { syncGroups } from '../scripts/sync-monday-groups.mjs';

/**
 * Vercel serverless function — receives Monday.com webhook events
 * when קבוצה or סטטוס changes in the מנויים board, then syncs
 * the סיכום קבוצות board.
 *
 * Monday.com sends a challenge request on webhook creation —
 * we must echo it back.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body;

  // Monday.com webhook challenge handshake
  if (body.challenge) {
    return res.status(200).json({ challenge: body.challenge });
  }

  // Verify the webhook has an event
  if (!body.event) {
    return res.status(400).json({ error: 'No event in payload' });
  }

  const token = process.env.MONDAY_API_TOKEN;
  if (!token) {
    console.error('MONDAY_API_TOKEN not set');
    return res.status(500).json({ error: 'Server misconfigured' });
  }

  try {
    const result = await syncGroups(token);
    return res.status(200).json({ ok: true, ...result });
  } catch (err) {
    console.error('Sync failed:', err);
    return res.status(500).json({ error: err.message });
  }
}
