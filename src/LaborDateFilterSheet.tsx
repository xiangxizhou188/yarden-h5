import { useEffect, useRef, useState } from 'react';
import type { ArrangementFilter } from './labor-plan';
import './nursery-filter-sheet.css';

export function LaborDateFilterSheet({ date, status, onApply, onCancel }: { date: string; status: ArrangementFilter; onApply: (date: string, status: ArrangementFilter) => void; onCancel: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [selectedDate, setDate] = useState(date);
  const [selectedStatus, setStatus] = useState(status);
  useEffect(() => { const element = dialog.current; element?.showModal(); return () => element?.close(); }, []);
  return <dialog ref={dialog} className="nursery-filter-sheet" aria-labelledby="labor-date-filter-title" onCancel={event => { event.preventDefault(); onCancel(); }} onClick={event => { if (event.target === event.currentTarget) onCancel(); }}>
    <div className="nursery-filter-header"><h2 id="labor-date-filter-title">筛选计划日期</h2><button type="button" aria-label="关闭日期筛选" onClick={onCancel}>×</button></div>
    <div className="nursery-filter-field"><span>安排状态</span><div className="nursery-filter-options" role="group" aria-label="安排状态">{([{ value: 'all', label: '全部' }, { value: 'pending', label: '未安排' }, { value: 'arranged', label: '已安排' }] as const).map(option => <button key={option.value} type="button" aria-pressed={selectedStatus === option.value} onClick={() => setStatus(option.value)}><span>{option.label}</span><span aria-hidden="true">{selectedStatus === option.value ? '✓' : ''}</span></button>)}</div></div>
    <div className="nursery-filter-field"><label htmlFor="labor-filter-date">计划日期（留空为全部）</label><input id="labor-filter-date" className="labor-date-input" type="date" value={selectedDate} onChange={event => setDate(event.target.value)}/></div>
    <div className="nursery-filter-actions"><button className="nursery-filter-reset" type="button" onClick={() => { setDate(''); setStatus('all'); }}>重置</button><button className="nursery-filter-apply" type="button" onClick={() => onApply(selectedDate, selectedStatus)}>应用</button></div>
  </dialog>;
}
