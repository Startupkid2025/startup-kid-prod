import { base44 } from "@/api/base44Client";

/**
 * Logs coin changes to CoinLog entity
 * Call this function whenever you update a user's coins
 */
export async function logCoinChange(studentEmail, oldCoins, newCoins, reason, metadata = {}) {
  try {
    const amount = newCoins - oldCoins;
    
    // Skip if no change
    if (amount === 0) return;

    await base44.entities.CoinLog.create({
      student_email: studentEmail,
      amount: amount,
      reason: reason,
      previous_balance: oldCoins,
      new_balance: newCoins,
      metadata: {
        timestamp: new Date().toISOString(),
        ...metadata
      }
    });
    
    console.log(`📝 Logged coin change: ${studentEmail} ${amount > 0 ? '+' : ''}${amount} (${reason})`);
  } catch (error) {
    console.error("Error logging coin change:", error);
  }
}