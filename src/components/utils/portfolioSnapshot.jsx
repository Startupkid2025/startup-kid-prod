// components/utils/portfolioSnapshot.js
import { base44 } from "@/api/base44Client";

const BUSINESS_TYPES = [
  "government_bonds",
  "gold",
  "real_estate",
  "stock_market",
  "crypto",
  "tech_startup"
];

const DATE_TZ = "Asia/Jerusalem";
const fmtIL = new Intl.DateTimeFormat("en-CA", {
  timeZone: DATE_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function getTodayKey() {
  return fmtIL.format(new Date());
}

/**
 * Recomputes full portfolio snapshot by fetching all investments for a user.
 * Should only be called:
 * - By the daily 00:00 job after updating Investment.current_value
 * - As a fallback repair if snapshot is missing/corrupted
 * 
 * @param {string} studentEmail - User email
 * @returns {Promise<object>} The computed snapshot
 */
export async function recomputeAndPersistPortfolioSnapshot(studentEmail) {
  try {
    // Fetch all investments for this user
    const investments = await base44.entities.Investment.filter({ 
      student_email: studentEmail 
    });

    // Initialize snapshot
    const snapshot = {
      investments_value: 0,
      total_invested_amount: 0,
      investment_count_total: investments.length,
      investment_count_by_type: {},
      investment_value_by_type: {},
      investment_invested_by_type: {},
      last_portfolio_snapshot_date_key: getTodayKey()
    };

    // Initialize all business types to 0
    BUSINESS_TYPES.forEach(type => {
      snapshot.investment_count_by_type[type] = 0;
      snapshot.investment_value_by_type[type] = 0;
      snapshot.investment_invested_by_type[type] = 0;
    });

    // Compute totals
    investments.forEach(inv => {
      const currentValue = inv.current_value || 0;
      const investedAmount = inv.invested_amount || 0;
      const businessType = inv.business_type;

      snapshot.investments_value += currentValue;
      snapshot.total_invested_amount += investedAmount;

      if (businessType && BUSINESS_TYPES.includes(businessType)) {
        snapshot.investment_count_by_type[businessType] = 
          (snapshot.investment_count_by_type[businessType] || 0) + 1;
        snapshot.investment_value_by_type[businessType] = 
          (snapshot.investment_value_by_type[businessType] || 0) + currentValue;
        snapshot.investment_invested_by_type[businessType] = 
          (snapshot.investment_invested_by_type[businessType] || 0) + investedAmount;
      }
    });

    // Round all values
    snapshot.investments_value = Math.round(snapshot.investments_value);
    snapshot.total_invested_amount = Math.round(snapshot.total_invested_amount);
    
    Object.keys(snapshot.investment_value_by_type).forEach(key => {
      snapshot.investment_value_by_type[key] = Math.round(snapshot.investment_value_by_type[key]);
      snapshot.investment_invested_by_type[key] = Math.round(snapshot.investment_invested_by_type[key]);
    });

    // Try to update via asServiceRole if available, otherwise use updateMe
    try {
      // For admin/backend jobs, update specific user by email
      const users = await base44.asServiceRole.entities.User.filter({ email: studentEmail });
      if (users.length > 0) {
        await base44.asServiceRole.entities.User.update(users[0].id, snapshot);
        console.log(`✅ Portfolio snapshot updated for ${studentEmail}:`, snapshot);
        return snapshot;
      }
    } catch (err) {
      // If asServiceRole not available or user not found, try updateMe
      console.log('Using updateMe for snapshot update');
    }

    // Fallback: if this is the current logged-in user
    const currentUser = await base44.auth.me();
    if (currentUser.email === studentEmail) {
      await base44.auth.updateMe(snapshot);
      console.log(`✅ Portfolio snapshot updated for ${studentEmail}:`, snapshot);
      return snapshot;
    }

    console.error(`❌ Could not update snapshot for ${studentEmail} - user not found`);
    return snapshot;
  } catch (error) {
    console.error(`Error recomputing portfolio snapshot for ${studentEmail}:`, error);
    throw error;
  }
}

/**
 * Ensures all business types exist in snapshot objects with 0 values
 */
export function ensureSnapshotDefaults(user) {
  const snapshot = {
    investment_count_by_type: user.investment_count_by_type || {},
    investment_value_by_type: user.investment_value_by_type || {},
    investment_invested_by_type: user.investment_invested_by_type || {}
  };

  BUSINESS_TYPES.forEach(type => {
    if (!(type in snapshot.investment_count_by_type)) {
      snapshot.investment_count_by_type[type] = 0;
    }
    if (!(type in snapshot.investment_value_by_type)) {
      snapshot.investment_value_by_type[type] = 0;
    }
    if (!(type in snapshot.investment_invested_by_type)) {
      snapshot.investment_invested_by_type[type] = 0;
    }
  });

  return snapshot;
}