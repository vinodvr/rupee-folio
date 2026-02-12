// Auto-assign assets to goals based on asset type and goal timeline
import { SHORT_TERM_ONLY, LONG_TERM_ONLY, BOTH_TERMS, NOT_LINKABLE } from './assets.js';
import { getUnifiedCategory, getYearsRemaining, calculateInflationAdjustedAmount } from './calculator.js';
import { saveData } from './storage.js';

/**
 * Auto-assign all linkable assets to eligible goals using a greedy algorithm.
 * Clears existing linkedAssets and re-assigns from scratch (idempotent).
 *
 * Algorithm:
 * 1. Clear all existing linkedAssets from all goals
 * 2. Partition linkable assets into shortTermPool, longTermPool, bothTermPool
 * 3. Allocate to short-term goals (< 5yr):
 *    - First pass: exhaust SHORT_TERM_ONLY assets (they can't go anywhere else)
 *    - Second pass: use BOTH_TERMS assets for any remaining gap
 *    - Process goals closest-first, largest available assets first (fewest per goal)
 *    - Cap per goal at inflation-adjusted targetAmount
 * 4. Allocate to long-term goals (>= 5yr):
 *    - First pass: exhaust LONG_TERM_ONLY assets (they can't go anywhere else)
 *    - Second pass: use remaining BOTH_TERMS assets for any remaining gap
 *    - Same greedy approach
 * 5. Save and return updated data
 *
 * @param {object} data - App data (mutated in place)
 * @returns {object} The updated data
 */
export function autoAssignAssets(data) {
  if (!data || !data.goals || !data.assets || !data.assets.items) {
    return data;
  }

  // Step 1: Clear all existing linkedAssets
  data.goals.forEach(goal => {
    goal.linkedAssets = [];
  });

  // Partition goals into short-term and long-term, sorted by yearsRemaining asc
  const shortTermGoals = [];
  const longTermGoals = [];

  data.goals.forEach(goal => {
    const years = getYearsRemaining(goal.targetDate);
    if (years <= 0) return; // Skip past goals
    const category = getUnifiedCategory(goal.targetDate);
    const target = calculateInflationAdjustedAmount(
      goal.targetAmount || 0,
      goal.inflationRate || 0,
      years
    );
    if (target <= 0) return; // Skip zero-target goals

    const goalInfo = { goal, years, category, target, allocated: 0 };
    if (category === 'short') {
      shortTermGoals.push(goalInfo);
    } else {
      longTermGoals.push(goalInfo);
    }
  });

  shortTermGoals.sort((a, b) => a.years - b.years);
  longTermGoals.sort((a, b) => a.years - b.years);

  // Step 2: Partition assets into pools
  const shortTermPool = [];
  const longTermPool = [];
  const bothTermPool = [];

  data.assets.items.forEach(asset => {
    if (NOT_LINKABLE.includes(asset.category)) return;
    if (!asset.value || asset.value <= 0) return;

    const assetInfo = { asset, remaining: asset.value };

    if (SHORT_TERM_ONLY.includes(asset.category)) {
      shortTermPool.push(assetInfo);
    } else if (LONG_TERM_ONLY.includes(asset.category)) {
      longTermPool.push(assetInfo);
    } else if (BOTH_TERMS.includes(asset.category)) {
      bothTermPool.push(assetInfo);
    }
  });

  // Step 3: Allocate to short-term goals (closest first, largest assets first)
  // First pass: exhaust SHORT_TERM_ONLY assets (they can't go anywhere else)
  greedyAssignToGoals(shortTermPool, shortTermGoals, data);
  // Second pass: use BOTH_TERMS assets for any remaining gap
  greedyAssignToGoals(bothTermPool, shortTermGoals, data);

  // Step 4: Allocate to long-term goals
  // First pass: exhaust LONG_TERM_ONLY assets (they can't go anywhere else)
  greedyAssignToGoals(longTermPool, longTermGoals, data);
  // Second pass: use remaining BOTH_TERMS assets for any remaining gap
  const remainingBoth = bothTermPool.filter(a => a.remaining > 0);
  greedyAssignToGoals(remainingBoth, longTermGoals, data);

  // Step 5: Save
  saveData(data);
  return data;
}

/**
 * Greedy assignment: process goals in order (closest first),
 * for each goal pick largest available assets until goal is covered.
 * Minimizes the number of assets linked to each goal.
 */
function greedyAssignToGoals(assetPool, goalInfos, data) {
  if (assetPool.length === 0 || goalInfos.length === 0) return;

  for (const goalInfo of goalInfos) {
    const needed = goalInfo.target - goalInfo.allocated;
    if (needed <= 0.01) continue;

    assignToSingleGoal(assetPool, goalInfo, needed, data);
  }
}

/**
 * Assign assets to a single goal greedily — largest available assets first.
 */
function assignToSingleGoal(assetPool, goalInfo, needed, data) {
  // Sort available assets by remaining value descending (largest first)
  const available = assetPool
    .filter(a => a.remaining > 0.01)
    .sort((a, b) => b.remaining - a.remaining);

  let remaining = needed;
  for (const assetInfo of available) {
    if (remaining <= 0.01) break;

    const assignAmount = Math.min(assetInfo.remaining, remaining);
    linkAssetToGoalDirect(data, goalInfo.goal, assetInfo.asset, assignAmount);
    goalInfo.allocated += assignAmount;
    assetInfo.remaining -= assignAmount;
    remaining -= assignAmount;
  }
}

/**
 * Directly link an asset amount to a goal (accumulates if already linked)
 */
function linkAssetToGoalDirect(data, goal, asset, amount) {
  if (!goal.linkedAssets) {
    goal.linkedAssets = [];
  }

  const existing = goal.linkedAssets.find(la => la.assetId === asset.id);
  if (existing) {
    existing.amount += amount;
  } else {
    goal.linkedAssets.push({ assetId: asset.id, amount });
  }
}
