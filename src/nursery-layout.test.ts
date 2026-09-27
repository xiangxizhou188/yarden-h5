import { describe, expect, it } from 'vitest';
import page from './NurseryPlanPage.tsx?raw';

describe('nursery share layout', () => {
  it('keeps all four plan columns in the shared table contract', () => {
    expect(page).toContain('<span>房间</span><span>计划进树日期</span><span>距今</span><span>数量</span>');
  });

  it('keeps the public summary compact and information dense', () => {
    expect(page).toContain('nursery-hero-inner');
    expect(page).toContain('nursery-hero-top');
    expect(page).toContain('nursery-hero-copy');
    expect(page).toContain('<img src="/yarden-brand-logo.png" alt="" />');
    expect(page).toContain('<strong>{plan.facilityName}</strong><small>Facility</small>');
    expect(page).not.toContain('<strong>御花园</strong>');
    expect(page).not.toContain('<span>Y</span>');
    expect(page).toContain("plan.totalQuantity.toLocaleString('zh-CN')");
  });
});
