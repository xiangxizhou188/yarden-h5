import { describe, expect, it } from 'vitest';
import { formatBatchStartDate, patrolLightScheduleText, slotPosition, statusLabel } from './format';

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

describe('batch move-in date', () => {
  it('preserves date-only and UTC-midnight dates', () => {
    expect(formatBatchStartDate('2026-07-31')).toBe('2026/7/31');
    expect(formatBatchStartDate('2026-07-31T00:00:00Z')).toBe('2026/7/31');
  });
  it('does not invent an invalid or missing date', () => {
    expect(formatBatchStartDate(null)).toBe('未记录');
    expect(formatBatchStartDate('2026-02-30')).toBe('未记录');
    expect(formatBatchStartDate('bad')).toBe('未记录');
  });
});

describe('historical patrol lighting', () => {
  it('uses both snapshot times for daytime, overnight and midnight schedules', () => {
    expect(patrolLightScheduleText({ onTime: '07:00', offTime: '19:00' })).toContain('07:00 开灯 · 19:00 关灯');
    expect(patrolLightScheduleText({ onTime: '22:00', offTime: '06:00' })).toContain('22:00 开灯 · 次日 06:00 关灯');
    expect(patrolLightScheduleText({ onTime: '08:00', offTime: '00:00' })).toContain('次日 00:00 关灯');
  });
  it('distinguishes legacy reports from an explicitly unconfigured schedule', () => {
    expect(patrolLightScheduleText(undefined)).toBe('已确认每日开灯 18 小时');
    expect(patrolLightScheduleText(null)).toContain('当时尚未配置');
  });
});
