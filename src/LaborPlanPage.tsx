import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError } from './api';
import { LaborArrangementDialog } from './LaborArrangementDialog';
import { LaborDateFilterSheet } from './LaborDateFilterSheet';
import { cultivationDayLabel, filterLaborPlans, type ArrangementFilter } from './labor-plan';
import { nextUnarranged } from './labor-plan';
import { LoginDialog } from './LoginDialog';
import { NurseryFilterSheet } from './NurseryFilterSheet';
import { formatNurseryDate, distanceLabel } from './format';
import type { NurseryMoveInPlan, LaborPlan, LaborPlanItem, User } from './types';
import './nursery-share.css';
import './labor-plan.css';
export function LaborPlanPage({token,nursery=false}:{token:string;nursery?:boolean}) {
  const [plan,setPlan]=useState<LaborPlan|null>(null);
  const [error,setError]=useState('');
  const [user,setUser]=useState<User|null>(null);
  const [loggingIn,setLoggingIn]=useState(false);
  const [access,setAccess]=useState<string[]>([]);
  const [confirmation,setConfirmation]=useState<{item:LaborPlanItem;action:'confirm'|'revoke';requestId:string}|null>(null);
  const [saving,setSaving]=useState(false);
  const [confirmationError,setConfirmationError]=useState('');
  const savingRef=useRef(false);
  const revision=useRef(0);
  const [factory,setFactory]=useState('');
  const [room,setRoom]=useState('');
  const [dateFilterOpen,setDateFilterOpen]=useState(false);
  const [filterDate,setFilterDate]=useState('');
  const [filterStatus,setFilterStatus]=useState<ArrangementFilter>('all');
  const [field,setField]=useState<'factory'|'room'|null>(null);
  const load=useCallback(async()=>{
    const request=++revision.current;
    const result=await api.laborPlan(token,nursery);
    if(request===revision.current)setPlan(result);
  },[token,nursery]);
  useEffect(()=>{
    let active=true;
    api.session().then(result=>{if(active)setUser(result);}).catch(()=>{if(active)setUser(null);});
    return()=>{active=false;};
  },[]);
  useEffect(()=>{
    let active=true;
    if(user)api.laborAccess().then(result=>{if(active)setAccess(result.facilities);}).catch(()=>{if(active)setAccess([]);});
    return()=>{active=false;};
  },[user]);
  useEffect(()=>{
    let active=true;
    const requests=revision;
    const refresh=()=>{if(!savingRef.current)void load().catch(cause=>{if(active)setError(cause instanceof Error?cause.message:'排班计划加载失败');});};
    refresh();
    const visible=()=>{if(document.visibilityState==='visible')refresh();};
    const timer=window.setInterval(visible,30000);
    document.addEventListener('visibilitychange',visible);
    return()=>{active=false;requests.current++;window.clearInterval(timer);document.removeEventListener('visibilitychange',visible);};
  },[load]);
  const requestArrangement=(item:LaborPlanItem,action:'confirm'|'revoke')=>{
    if(!user){setLoggingIn(true);return;}
    if(!access.includes(item.facilityName))return;
    setConfirmationError('');setError('');
    setConfirmation({item,action,requestId:crypto.randomUUID()});
  };
  const confirmArrangement=async()=>{
    if(!confirmation||savingRef.current)return;
    savingRef.current=true;setSaving(true);setConfirmationError('');revision.current++;
    try{
      const result=await api.arrangeLabor(token,nursery,confirmation.item,confirmation.action,confirmation.requestId);
      setPlan(current=>current?{...current,items:current.items.map(item=>item.id===result.id?{...item,...result}:item)}:current);
      setConfirmation(null);
      try{await load();}catch{setError('安排状态已保存，列表同步失败，请刷新页面。');}
    }catch(cause){
      const message=cause instanceof Error?cause.message:'保存失败，请重试';
      if(cause instanceof ApiError&&[401,403,404,409].includes(cause.status)){
        setConfirmation(null);setError(message);
        if(cause.status===401){setUser(null);setAccess([]);setLoggingIn(true);}
        if(cause.status===403)setAccess([]);
        try{await load();}catch{/* Keep the server error visible. */}
      }else setConfirmationError(message);
    }finally{savingRef.current=false;setSaving(false);}
  };
  if(!plan)return <main className="nursery-state"><h1>{error?'分享链接无法访问':'正在同步排班计划'}</h1><p>{error||'加载最新计划日期与工作量'}</p></main>;
  const selectedFactory=plan.facilities.some(site=>site.facilityName===factory)?factory:'';
  const factoryItems=plan.items.filter(item=>!selectedFactory||item.facilityName===selectedFactory);
  const selectedRoom=factoryItems.some(item=>item.roomId===room)?room:'';
  const items=filterLaborPlans(factoryItems.filter(item=>!selectedRoom||item.roomId===selectedRoom),filterDate,filterStatus);
  const next=nextUnarranged(items);
  const filterPlan:NurseryMoveInPlan={title:'排班计划',facilityName:'',facilities:plan.facilities,rangeDays:plan.rangeDays,generatedAt:plan.generatedAt,expiresAt:null,roomCount:0,totalQuantity:0,items:plan.items.map(item=>({...item,moveInDate:item.plannedDate}))};
  return <main className="nursery-page labor-public-page">
    <header className="nursery-hero"><div className="nursery-hero-inner">
      <div className="nursery-hero-top">
        <div className="nursery-brand"><img src="/yarden-brand-logo.png" alt=""/><div><h1>排班日程计划</h1><small>CZW GROUP</small></div></div>
        <div className="nursery-header-entries">
          {nursery ? <a className="nursery-person" href={`/nursery/${encodeURIComponent(token)}`} aria-label="查看进树排期"><img src="/nursery-schedule.svg" width="24" height="24" alt=""/><span>进树排期</span></a> : null}
          <button className="nursery-person" type="button" aria-label={user ? `${user.displayName || user.username}，打开账号登录` : '未登录，打开账号登录'} onClick={()=>setLoggingIn(true)}><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/></svg><span>{user ? user.displayName || user.username : '未登录'}</span></button>
        </div>
      </div>
      <section className="labor-next" aria-label="最近待安排任务" aria-live="polite">
        {next ? <>
          <div className="labor-next-copy"><p>{next.facilityDisplayName} · {next.roomName}</p><h2>{next.taskName}</h2><p>计划日期 {formatNurseryDate(next.plannedDate)} · {distanceLabel(next.daysAway)}</p></div>
          <button className="labor-arrange-button" type="button" disabled={saving||Boolean(user&&!access.includes(next.facilityName))} onClick={()=>requestArrangement(next,'confirm')}>已安排</button>
          {user&&!access.includes(next.facilityName)?<p className="labor-next-note">当前账号无此工厂排班管理权限</p>:null}
        </> : <p>暂无待安排任务</p>}
      </section>
    </div></header>
    <section className="nursery-content">{error?<p className="nursery-error" role="alert">{error}</p>:null}<div className="nursery-table"><div className="nursery-row nursery-table-head"><div className="labor-cell"><button type="button" aria-haspopup="dialog" onClick={()=>setField('factory')}>工厂房间<DownArrow/></button></div><span>排班任务</span><button type="button" aria-haspopup="dialog" aria-label="筛选计划日期和安排状态" className={filterDate||filterStatus!=='all'?'labor-filter-active':undefined} onClick={()=>setDateFilterOpen(true)}>计划日期<DownArrow/></button><span>距今还剩</span><span>建议人数</span></div>{items.map(item=><div className="nursery-row" key={item.id}><div className="labor-cell"><span>{item.roomName}</span><small>{item.facilityDisplayName}</small></div><div className="labor-cell"><span>{item.taskName}</span><small>{item.quantity} 棵</small>{item.teamName?<small>{item.teamName}</small>:null}</div><div className="labor-cell"><span>{formatNurseryDate(item.plannedDate)}</span><small>{cultivationDayLabel(item.cultivationDay)}</small>{item.arranged?(user&&access.includes(item.facilityName)?<button type="button" className="labor-arranged" aria-label={`撤销${item.roomName}${item.taskName}的安排`} onClick={()=>requestArrangement(item,'revoke')}>已安排</button>:<span className="labor-arranged">已安排</span>):null}</div><div className="labor-cell"><span>{item.arranged?'已完成':distanceLabel(item.daysAway)}</span></div><div className="labor-cell labor-people"><b>{item.people}<span className="labor-person-unit">人</span></b><small>{item.totalHours}小时</small></div></div>)}{!items.length?<div className="nursery-empty">当前筛选下暂无排班计划</div>:null}</div><p className="nursery-updated">人数按每人每天8小时四舍五入估算 · 更新于 {new Date(plan.generatedAt).toLocaleString('zh-CN',{timeZone:'America/Los_Angeles',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'})}</p></section>
    {field?<NurseryFilterSheet plan={filterPlan} facilityName={selectedFactory} roomId={selectedRoom} initialField={field} emptyRoomText="该工厂暂无排班计划的房间" onApply={(factory,room)=>{setFactory(factory);setRoom(room);setField(null);}} onCancel={()=>setField(null)}/>:null}
    {dateFilterOpen?<LaborDateFilterSheet date={filterDate} status={filterStatus} onCancel={()=>setDateFilterOpen(false)} onApply={(date,status)=>{setFilterDate(date);setFilterStatus(status);setDateFilterOpen(false);}}/>:null}
    {confirmation?<LaborArrangementDialog item={confirmation.item} action={confirmation.action} pending={saving} error={confirmationError} onConfirm={()=>void confirmArrangement()} onCancel={()=>{if(!savingRef.current)setConfirmation(null);}}/>:null}
    {loggingIn ? <LoginDialog onLogin={result=>{setUser(result);setLoggingIn(false);}} onCancel={()=>setLoggingIn(false)}/> : null}
  </main>;
}
function DownArrow(){return <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>;}
