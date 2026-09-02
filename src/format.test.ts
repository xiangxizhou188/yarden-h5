import { describe, expect, it } from 'vitest';
import { slotPosition, statusLabel } from './format';

describe('issue formatting', () => {
  it('translates workflow statuses', () => {
    expect(statusLabel('OPEN')).toBe('待处理');
    expect(statusLabel('IN_PROGRESS')).toBe('处理中');
    expect(statusLabel('RESOLVED')).toBe('已处理');
  });

  it('formats plant coordinates consistently with the mobile app', () => {
    expect(slotPosition({ id: '1', columnNumber: 2, rowNumber: 3, slotCode: null, slotNumber: null, varietyName: null, plantStatus: null })).toBe('B3');
    expect(slotPosition({ id: '2', columnNumber: null, rowNumber: null, slotCode: 'C-12', slotNumber: null, varietyName: null, plantStatus: null })).toBe('C-12');
  });
});
