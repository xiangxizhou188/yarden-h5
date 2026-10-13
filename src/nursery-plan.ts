import type { NurseryMoveInPlan } from './types';

export function nurserySupplyHorizons(items: NurseryMoveInPlan['items']) {
  return [7, 14, 21, 28].map(days => ({
    days,
    quantity: items.reduce((sum, item) => sum + (item.daysAway >= 0 && item.daysAway <= days ? item.quantity : 0), 0),
  }));
}
