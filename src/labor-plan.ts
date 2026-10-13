import type { LaborPlanItem } from './types';

export function nextUnarranged(items: LaborPlanItem[]) {
  return items.filter(item => !item.arranged).sort((a,b) => a.plannedDate.localeCompare(b.plannedDate) || a.facilityName.localeCompare(b.facilityName) || a.roomName.localeCompare(b.roomName) || a.id.localeCompare(b.id))[0] ?? null;
}

export type ArrangementFilter = 'all' | 'pending' | 'arranged';
export function filterLaborPlans<T extends { id: string; plannedDate: string; arranged?: boolean }>(items: T[], date = '', status: ArrangementFilter = 'all'): T[] {
  return items.filter(item => (!date || item.plannedDate === date) && (status === 'all' || Boolean(item.arranged) === (status === 'arranged')))
    .sort((a, b) => Number(Boolean(a.arranged)) - Number(Boolean(b.arranged)) || a.plannedDate.localeCompare(b.plannedDate) || a.id.localeCompare(b.id));
}

export function cultivationDayLabel(day: number | null | undefined) {
  return day == null ? '未设转灯' : day < 1 ? '转灯前' : `D${day}`;
}
