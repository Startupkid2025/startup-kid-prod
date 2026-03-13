import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Normalizes daily collaboration records.
 * Converted from legacy export-default format to Deno.serve.
 */
Deno.serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const { collabs } = body;

    if (!collabs || !Array.isArray(collabs)) {
      return Response.json({ success: true, result: [] });
    }

    const normalized = collabs
      .filter(c => c && typeof c === 'object' && c.email && c.date)
      .map(c => ({
        email: c.email,
        date: c.date,
        completed: Boolean(c.completed)
      }));

    return Response.json({ success: true, result: normalized });
  } catch (error) {
    console.error('normalizeDailyCollabs error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});
