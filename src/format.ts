import type { Issue, TargetSlot } from './types';

export const typeLabels: Record<string, string> = { ENVIRONMENT: '环境异常', PEST: '病虫害', DEVICE: '设备故障', IRRIGATION: '灌溉异常', PLANT: '植物异常', OTHER: '其他异常' };
export const severityLabels = { CRITICAL: '紧急', HIGH: '高', MEDIUM: '中', LOW: '低' } as const;

export function formatDateTime(value?: string | null) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return new Intl.DateTimeFormat('zh-CN', { timeZone: 'America/Los_Angeles', year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(date);
}

export function statusLabel(status: Issue['issueStatus']) {
  return status === 'ARCHIVED' ? '已归档' : status === 'OPEN' ? '待处理' : status === 'IN_PROGRESS' ? '处理中' : '已处理';
}

export function slotPosition(slot: TargetSlot) {
  if (slot.columnNumber && slot.rowNumber) return `${String.fromCharCode(64 + slot.columnNumber)}${slot.rowNumber}`;
  return slot.slotCode || (slot.slotNumber ? `#${slot.slotNumber}` : '位置未记录');
}

// Batch start dates are calendar dates; UTC formatting avoids shifting midnight back a day.
export function formatBatchStartDate(value?: string | null) {
  const dateKey = value?.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  if (!dateKey) return '未记录';
  const date = new Date(`${dateKey}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== dateKey) return '未记录';
  return new Intl.DateTimeFormat('zh-CN', { timeZone: 'UTC', year: 'numeric', month: 'numeric', day: 'numeric' }).format(date);
}
export function patrolLightScheduleText(schedule: { onTime: string; offTime: string } | null | undefined): string {
  if (schedule === undefined) return '已确认每日开灯 18 小时';
  if (schedule === null) return '已确认现场灯光设置 · 当时尚未配置工厂时段';
  return `已确认 ${schedule.onTime} 开灯 · ${schedule.offTime <= schedule.onTime ? '次日 ' : ''}${schedule.offTime} 关灯（工厂当地时间）`;
}
