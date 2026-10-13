import { describe, expect, it } from 'vitest';
import { nurserySupplyHorizons } from './nursery-plan';
import type { NurseryMoveInPlan } from './types';
const plan: NurseryMoveInPlan = {
  title: '未来进树计划', facilityName: 'A', groupName: 'Group One',
  facilities: [{ facilityName: 'A', displayName: 'Factory A' }, { facilityName: 'B', displayName: 'Factory B' }, { facilityName: 'empty', displayName: 'Empty' }],
  rangeDays: 60, generatedAt: '2026-10-12T19:00:00Z', expiresAt: null, roomCount: 2, totalQuantity: 60,
  items: [
    { id: 'a1', roomId: 'room-a', roomName: 'R1', facilityName: 'A', moveInDate: '2026-10-12', daysAway: 0, quantity: 10 },
    { id: 'a2', roomId: 'room-a', roomName: 'R1', facilityName: 'A', moveInDate: '2026-10-13', daysAway: 1, quantity: 20 },
    { id: 'b', roomId: 'room-b', roomName: 'R1', facilityName: 'B', moveInDate: '2026-10-12', daysAway: 0, quantity: 30 },
  ],
};
describe('cumulative nursery supply horizons', () => {
  it('includes today and each horizon boundary, and excludes overdue and later plans', () => {
    const items = [-1, 0, 7, 8, 14, 15, 21, 22, 28, 29].map((daysAway, index) => ({ ...plan.items[0], id: String(index), daysAway, quantity: 10 }));
    expect(nurserySupplyHorizons(items)).toEqual([
      { days: 7, quantity: 20 }, { days: 14, quantity: 40 },
      { days: 21, quantity: 60 }, { days: 28, quantity: 80 },
    ]);
  });
  it('handles zero quantities and confirmation updates', () => {
    expect(nurserySupplyHorizons([]).map(value => value.quantity)).toEqual([0, 0, 0, 0]);
    expect(nurserySupplyHorizons([{ ...plan.items[0], quantity: 0 }]).map(value => value.quantity)).toEqual([0, 0, 0, 0]);
    const after = plan.items.filter(item => item.id !== 'a1');
    expect(nurserySupplyHorizons(after).map(value => value.quantity)).toEqual([50, 50, 50, 50]);
  });
});
