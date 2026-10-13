import { describe, expect, it } from 'vitest';
import { distanceLabel } from './format';
import page from './NurseryPlanPage.tsx?raw';
import worker from '../worker/index.ts?raw';
describe('nursery schedule confirmation', () => {
  it('labels today and every overdue day without dropping the item', () => {
    expect(distanceLabel(0)).toBe('今天');
    expect(distanceLabel(-1)).toBe('逾期1天');
    expect(distanceLabel(-2)).toBe('逾期2天');
    expect(distanceLabel(-400)).toBe('逾期400天');
    expect(distanceLabel(60)).toBe('60天');
  });
  it('shows due actions anonymously, gates submission behind login and confirmation, and guards racing reads', () => {
    expect(page).toContain('item.daysAway <= 0 ? <button');
    expect(page).toContain('onClick={() => requestConfirmation(item)}');
    expect(page).toContain('user && pendingConfirmation && !loggingIn ? <NurseryConfirmationDialog');
    expect(page).toContain('disabled={confirming !== null}');
    expect(page).toContain('if (!user || item.daysAway > 0 || confirmationLock.current) return');
    expect(page).toContain('request === revision.current');
    expect(page).toContain('value.id !== item.id');
    expect(page).toContain('onLogin={result => { setUser(result); setLoggingIn(false);');
  });
  it('uses the authenticated cookie proxy for writes', () => {
    expect(worker).toContain("nurseryConfirm && method === 'POST'");
    expect(worker).toContain('proxyAuthenticated(request, env, `/nursery-move-in-plan/shares/');
  });
});
