export default async function recalculateStudentEconomySnapshot(params) {
  try {
    const { studentEmail, reason = 'manual', previewOnly = true } = params || {};

    console.log("💰 Function called with params:", {
      studentEmail,
      reason,
      previewOnly,
      paramsType: typeof params,
      paramsKeys: params ? Object.keys(params) : 'null'
    });

    if (!studentEmail) {
      throw new Error("Missing studentEmail in params");
    }

    // Return minimal test
    return {
      ok: true,
      studentEmail,
      reason,
      previewOnly,
      received: true
    };

  } catch (error) {
    console.error("❌ Backend function error:", {
      message: error?.message,
      status: error?.response?.status,
      data: error?.response?.data,
      stack: error?.stack
    });

    return {
      ok: false,
      error: error?.message || 'Unknown error',
      stack: error?.stack
    };
  }
}