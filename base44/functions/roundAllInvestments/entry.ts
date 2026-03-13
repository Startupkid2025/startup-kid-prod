import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch all investments
    const allInvestments = await base44.asServiceRole.entities.Investment.list();
    
    let updatedCount = 0;
    const errors = [];

    for (const investment of allInvestments) {
      try {
        const roundedCurrentValue = Math.round(investment.current_value || 0);
        const roundedInvestedAmount = Math.round(investment.invested_amount || 0);

        // Only update if values changed
        if (roundedCurrentValue !== investment.current_value || roundedInvestedAmount !== investment.invested_amount) {
          await base44.asServiceRole.entities.Investment.update(investment.id, {
            current_value: roundedCurrentValue,
            invested_amount: roundedInvestedAmount
          });
          updatedCount++;
        }

        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error updating investment ${investment.id}:`, error);
        errors.push({ id: investment.id, error: error.message });
      }
    }

    return Response.json({
      success: true,
      message: `Rounded ${updatedCount} investments`,
      totalInvestments: allInvestments.length,
      updatedCount,
      errors
    });

  } catch (error) {
    console.error("Round investments error:", error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});