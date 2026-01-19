export default async function recalculateStudentEconomySnapshot({ studentEmail, reason = 'manual', previewOnly = true } = {}) {
  try {
    console.log("💰 Called with:", { studentEmail, reason, previewOnly });

    if (!studentEmail) {
      throw new Error("Missing studentEmail");
    }

    // In Base44 backend, context is a global - test logging it
    console.log("🔍 Available globals:", {
      hasContext: typeof context !== 'undefined',
      contextKeys: typeof context !== 'undefined' ? Object.keys(context || {}) : 'N/A'
    });

    // Return test response
    return {
      ok: true,
      studentEmail,
      message: "Backend function working - check logs for context"
    };

  } catch (error) {
    console.error("❌ Error:", {
      message: error?.message,
      status: error?.response?.status,
      data: error?.response?.data,
      stack: error?.stack
    });

    return {
      ok: false,
      error: error?.message || 'Unknown error'
    };
  }
}