import { useEffect, useRef } from 'react';
import type { LaborPlanItem } from './types';
import { formatNurseryDate } from './format';
import './login-dialog.css';

export function LaborArrangementDialog({item,action,pending,error,onConfirm,onCancel}:{item:LaborPlanItem;action:'confirm'|'revoke';pending:boolean;error:string;onConfirm:()=>void;onCancel:()=>void}) {
  const dialog=useRef<HTMLDialogElement>(null);
  useEffect(()=>{const element=dialog.current;element?.showModal();return()=>element?.close();},[]);
  return <dialog ref={dialog} className="nursery-login-dialog nursery-confirmation-dialog" aria-labelledby="labor-confirm-title" aria-busy={pending} onCancel={event=>{event.preventDefault();if(!pending)onCancel();}} onClick={event=>{if(event.target===event.currentTarget&&!pending)onCancel();}}>
    <button className="nursery-login-close" type="button" aria-label="关闭确认" disabled={pending} onClick={onCancel}>×</button>
    <section className="login-card">
      <h2 id="labor-confirm-title">{action==='confirm'?'确认已安排此任务？':'确认撤销安排？'}</h2>
      <p className="nursery-confirm-context">{item.facilityDisplayName} · {item.roomName}</p>
      <p className="nursery-confirm-context">{item.taskName}</p>
      <p className="nursery-confirm-context">计划日期 {formatNurseryDate(item.plannedDate)}</p>
      <p className="nursery-confirm-context">{action==='confirm'?'表示人员与资源已安排，不代表任务已完成。':'撤销后，此任务将重新进入待安排列表。'}</p>
      {error?<p className="form-error" role="alert">{error}</p>:null}
      <button className="primary-button" type="button" disabled={pending} onClick={onConfirm}>{pending?'保存中…':action==='confirm'?'确认已安排':'确认撤销'}</button>
      <button className="secondary-button" type="button" disabled={pending} onClick={onCancel}>取消</button>
    </section>
  </dialog>;
}
