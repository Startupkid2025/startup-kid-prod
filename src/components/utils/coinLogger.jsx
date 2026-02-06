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

    // Ensure we always calculate networth values
    const investmentsValue = metadata.investments_value ?? 0;
    const itemsValue = metadata.items_value ?? 0;
    const userNetworth = metadata.user_networth ?? (newCoins + investmentsValue + itemsValue);
    const leaderboardNetworth = metadata.leaderboard_networth ?? metadata.new_leaderboard_value ?? userNetworth;

    await base44.entities.CoinLog.create({
      student_email: studentEmail,
      amount: amount,
      reason: reason,
      previous_balance: oldCoins,
      new_balance: newCoins,
      metadata: {
        timestamp: new Date().toISOString(),
        investments_value: investmentsValue,
        items_value: itemsValue,
        user_networth: userNetworth,
        leaderboard_networth: leaderboardNetworth,
        ...metadata
      }
    });
    
    console.log(`📝 Logged coin change: ${studentEmail} ${amount > 0 ? '+' : ''}${amount} (${reason}) | Net Worth: ${userNetworth} | Leaderboard: ${leaderboardNetworth}`);
  } catch (error) {
    console.error("Error logging coin change:", error);
  }
}