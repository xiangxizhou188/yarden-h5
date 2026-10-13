import { useEffect, useRef } from 'react';
import { formatNurseryDate } from './format';
import type { NurseryMoveInPlan } from './types';
import './login-dialog.css';

export function NurseryConfirmationDialog({ item, facilityName, pending, error, onConfirm, onCancel }: { item: NurseryMoveInPlan['items'][number]; facilityName: string; pending: boolean; error: string; onConfirm: () => void; onCancel: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    element.showModal();
    return () => element.close();
  }, []);
  return <dialog ref={dialog} className="nursery-login-dialog nursery-confirmation-dialog" aria-labelledby="nursery-confirm-title" aria-busy={pending} onCancel={event => { event.preventDefault(); if (!pending) onCancel(); }} onClick={event => { if (event.target === event.currentTarget && !pending) onCancel(); }}>
    <button className="nursery-login-close" type="button" aria-label="关闭确认" disabled={pending} onClick={onCancel}>×</button>
    <section className="login-card">
      <h2 id="nursery-confirm-title">是否确认已完成进树</h2>
      <p className="nursery-confirm-context">{item.facilityDisplayName || facilityName} · {item.roomName}</p>
      <p className="nursery-confirm-context">计划进树 {formatNurseryDate(item.moveInDate)} · {item.quantity.toLocaleString('zh-CN')} 棵</p>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <button className="primary-button" type="button" disabled={pending} onClick={onConfirm}>{pending ? '确认中…' : '确认已完成进树'}</button>
      <button className="secondary-button" type="button" disabled={pending} onClick={onCancel}>取消</button>
    </section>
  </dialog>;
}
