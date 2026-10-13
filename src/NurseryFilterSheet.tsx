import { useEffect, useRef, useState } from 'react';
import type { NurseryMoveInPlan } from './types';
import './nursery-filter-sheet.css';

export function NurseryFilterSheet({ plan, facilityName, roomId, initialField, emptyRoomText = '该工厂暂无待确认排期的房间', onApply, onCancel }: { plan: NurseryMoveInPlan; facilityName: string; roomId: string; initialField: 'factory' | 'room'; emptyRoomText?: string; onApply: (factory: string, room: string) => void; onCancel: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [factory, setFactory] = useState(facilityName);
  const [room, setRoom] = useState(roomId);
  const [openField, setOpenField] = useState<'factory' | 'room' | null>(initialField);
  const facilities = plan.facilities ?? [{ facilityName: plan.facilityName, displayName: plan.facilityName }];
  const rooms = [...new Map(plan.items.filter(item => !factory || (item.facilityName || plan.facilityName) === factory).map(item => [item.roomId, item])).values()];
  const fields = [
    { id: 'factory' as const, label: '工厂', value: factory, options: [{ value: '', label: '全部工厂' }, ...facilities.map(item => ({ value: item.facilityName, label: item.displayName }))] },
    { id: 'room' as const, label: '房间', value: room, options: [{ value: '', label: '全部房间' }, ...rooms.map(item => ({ value: item.roomId, label: factory ? item.roomName : `${item.facilityDisplayName || item.facilityName || plan.facilityName} · ${item.roomName}` }))] },
  ];
  useEffect(() => { const element = dialog.current; element?.showModal(); return () => element?.close(); }, []);
  return <dialog ref={dialog} className="nursery-filter-sheet" aria-labelledby="nursery-filter-title" onCancel={event => { event.preventDefault(); onCancel(); }} onClick={event => { if (event.target === event.currentTarget) onCancel(); }}>
    <div className="nursery-filter-header"><h2 id="nursery-filter-title">筛选工厂和房间</h2><button type="button" aria-label="关闭筛选" onClick={onCancel}>×</button></div>
    {fields.map(field => <div className="nursery-filter-field" key={field.id}>
      <span>{field.label}</span>
      <button className="nursery-filter-select" type="button" aria-label={field.label} aria-expanded={openField === field.id} aria-controls={`nursery-options-${field.id}`} onClick={() => setOpenField(value => value === field.id ? null : field.id)}><span>{field.options.find(option => option.value === field.value)?.label || field.options[0].label}</span><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg></button>
      {openField === field.id ? <div className="nursery-filter-options" id={`nursery-options-${field.id}`} role="group" aria-label={field.label}>{field.options.map(option => <button key={option.value} type="button" aria-pressed={field.value === option.value} onClick={() => { if (field.id === 'factory') { setFactory(option.value); setRoom(''); } else setRoom(option.value); setOpenField(null); }}><span>{option.label}</span><span aria-hidden="true">{field.value === option.value ? '✓' : ''}</span></button>)}</div> : null}
    </div>)}
    {!rooms.length ? <p>{emptyRoomText}</p> : null}
    <div className="nursery-filter-actions"><button className="nursery-filter-reset" type="button" onClick={() => { setFactory(''); setRoom(''); setOpenField(null); }}>重置</button><button className="nursery-filter-apply" type="button" onClick={() => onApply(factory, rooms.some(item => item.roomId === room) ? room : '')}>应用</button></div>
  </dialog>;
}
