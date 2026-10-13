import { describe, expect, it } from 'vitest';
import page from './NurseryPlanPage.tsx?raw';

describe('nursery share layout', () => {
  it('shows factory ownership in a separate fifth column', () => {
    expect(page).toContain('>房间名称<svg');
    expect(page).toContain('>所属工厂<svg');
    expect(page).toContain('<span>计划进树</span><span>距今还剩</span><span>植物数量</span>');
  });

  it('keeps the public summary compact and information dense', () => {
    expect(page).toContain('nursery-hero-inner');
    expect(page).toContain('nursery-hero-top');
    expect(page).toContain('<img src="/yarden-brand-logo.png" alt="" />');
    expect(page).toContain('<h1>进树日程计划</h1><small>CZW GROUP</small>');
    expect(page).not.toContain('查看排班计划');
    expect(page).not.toContain('筛选工厂');
    expect(page).not.toContain('nursery-hero-copy');
    expect(page).not.toContain('nursery-facility-filter');
    expect(page).not.toContain('待确认进树排期');
    expect(page).not.toContain('刷新计划');
    expect(page).not.toContain('<strong>御花园</strong>');
    expect(page).not.toContain('<span>Y</span>');
    expect(page).toContain("quantity.toLocaleString('zh-CN')");
  });
});
