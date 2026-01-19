export default async function recalculateStudentEconomySnapshot({ studentEmail, reason = 'manual', previewOnly = true } = {}) {
  try {
    console.log("💰 recalculateStudentEconomySnapshot called:", {
      studentEmail,
      reason,
      previewOnly,
      ts: new Date().toISOString(),
    });

    if (!studentEmail) {
      throw new Error("Missing studentEmail parameter");
    }

    // TEST: Return OK
    return { ok: true, studentEmail, reason, previewOnly };

  } catch (error) {
    console.error("❌ recalculateStudentEconomySnapshot error:", {
      message: error?.message,
      status: error?.response?.status,
      data: error?.response?.data,
      stack: error?.stack,
    });

    return {
      ok: false,
      error: error?.message || 'Unknown error',
      stack: error?.stack,
    };
  }
}