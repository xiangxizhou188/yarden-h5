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
