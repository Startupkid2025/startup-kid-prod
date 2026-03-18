export default async function normalizeDailyCollabs({ collabs }, { base44 }) {
  if (!collabs || !Array.isArray(collabs)) {
    return { success: true, result: [] };
  }

  const normalized = collabs
    .filter(c => c && typeof c === 'object' && c.email && c.date)
    .map(c => ({
      email: c.email,
      date: c.date,
      completed: Boolean(c.completed)
    }));

  return { success: true, result: normalized };
}