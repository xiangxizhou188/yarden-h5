import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError } from './api';
import { NurseryFilterSheet } from './NurseryFilterSheet';
import { LoginDialog } from './LoginDialog';
import { NurseryConfirmationDialog } from './NurseryConfirmationDialog';
import { distanceLabel, formatNurseryDate } from './format';
import { nurserySupplyHorizons } from './nursery-plan';
import type { NurseryMoveInPlan, User } from './types';
import './nursery-share.css';

export function NurseryPlanPage({ token }: { token: string }) {
  const [plan, setPlan] = useState<NurseryMoveInPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [pendingConfirmation, setPendingConfirmation] = useState<NurseryMoveInPlan['items'][number] | null>(null);
  const [selectedFactory, setSelectedFactory] = useState('');
  const [selectedRoom, setSelectedRoom] = useState('');
  const [filterField, setFilterField] = useState<'factory' | 'room' | null>(null);
  const revision = useRef(0);
  const confirmationLock = useRef(false);
  const load = useCallback(async (showLoading = true) => {
    const request = ++revision.current;
    if (showLoading) setLoading(true);
    try { const result = await api.nurseryPlan(token); if (request === revision.current) { setPlan(result); setError(''); } }
    catch (caught) { if (request === revision.current) setError(caught instanceof Error ? caught.message : '进树计划加载失败'); }
    finally { if (request === revision.current) setLoading(false); }
  }, [token]);
  useEffect(() => {
    const requests = revision;
    const refresh = () => { void load(false); };
    const refreshWhenVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    refresh();
    const timer = window.setInterval(refreshWhenVisible, 30_000);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    window.addEventListener('pageshow', refresh);
    return () => {
      requests.current++;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
      window.removeEventListener('pageshow', refresh);
    };
  }, [load]);
  useEffect(() => {
    let active = true;
    api.session().then(result => { if (active) setUser(result); }).catch(() => { if (active) setUser(null); });
    return () => { active = false; };
  }, []);

  const confirm = async (item: NurseryMoveInPlan['items'][number]) => {
    if (!user || item.daysAway > 0 || confirmationLock.current) return;
    confirmationLock.current = true; setConfirming(item.id); setError('');
    try {
      await api.confirmNurseryPlan(token, item.id, { moveInDate: item.moveInDate, quantity: item.quantity }, item.facilityName || plan!.facilityName);
      revision.current++;
      setPendingConfirmation(null);
      setPlan(current => {
        if (!current) return current;
        const items = current.items.filter(value => value.id !== item.id);
        return { ...current, items, roomCount: new Set(items.map(value => value.roomId)).size, totalQuantity: items.reduce((sum, value) => sum + value.quantity, 0) };
      });
      await load(false);
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401) { setUser(null); setLoggingIn(true); }
      setError(caught instanceof Error ? caught.message : '确认失败，请重试');
    } finally { confirmationLock.current = false; setConfirming(null); }
  };

  const requestConfirmation = (item: NurseryMoveInPlan['items'][number]) => {
    setError(''); setPendingConfirmation(item);
    if (!user) setLoggingIn(true);
  };

  if (loading) return <main className="nursery-state"><div className="nursery-loader" /><h1>正在同步最新计划</h1><p>收获日期和数量调整会自动更新</p></main>;
  if (!plan) return <main className="nursery-state"><div className="nursery-mark">!</div><h1>分享链接无法访问</h1><p>{error || '链接可能已过期或失效'}</p><button onClick={() => void load()}>重新加载</button></main>;

  const facilities = plan.facilities ?? [{ facilityName: plan.facilityName, displayName: plan.facilityName }];
  const factory = facilities.some(item => item.facilityName === selectedFactory) ? selectedFactory : '';
  const factoryItems = plan.items.filter(item => !factory || (item.facilityName || plan.facilityName) === factory);
  const room = factoryItems.some(item => item.roomId === selectedRoom) ? selectedRoom : '';
  const visibleItems = factoryItems.filter(item => !room || item.roomId === room);
  const supplyHorizons = nurserySupplyHorizons(visibleItems);

  return <main className="nursery-page">
    <header className="nursery-hero">
      <div className="nursery-hero-inner">
        <div className="nursery-hero-top">
          <div className="nursery-brand"><img src="/yarden-brand-logo.png" alt="" /><div><h1>进树日程计划</h1><small>CZW GROUP</small></div></div>
          <div className="nursery-header-entries">
            <a className="nursery-person" href={`/labor/nursery/${encodeURIComponent(token)}`} aria-label="查看排班"><img src="/nursery-schedule.svg" width="24" height="24" alt="" /><span>查看排班</span></a>
          <button className="nursery-person" type="button" aria-label={user ? `${user.displayName || user.username}，打开账号登录` : '未登录，打开账号登录'} onClick={() => { setPendingConfirmation(null); setLoggingIn(true); }}><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="12" cy="8" r="3.5" /><path d="M5 21v-2a7 7 0 0 1 14 0v2" /></svg><span>{user ? user.displayName || user.username : '未登录'}</span></button>
          </div>
        </div>
        <div className="nursery-summary">
          {supplyHorizons.map(({ days, quantity }) => <div key={days}><span>{days}天</span><b>{quantity.toLocaleString('zh-CN')}<small>棵</small></b></div>)}
        </div>
      </div>
    </header>
    <section className="nursery-content">
      {error ? <p role="alert" className="nursery-error">{error}</p> : null}
      <div className="nursery-table">
        <div className="nursery-row nursery-table-head"><button type="button" onClick={() => setFilterField('room')} aria-haspopup="dialog">房间名称<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg></button><button type="button" onClick={() => setFilterField('factory')} aria-haspopup="dialog">所属工厂<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg></button><span>计划进树</span><span>距今还剩</span><span>植物数量</span></div>
        {visibleItems.map((item) => <div className={`nursery-row${item.daysAway < 0 ? ' nursery-row-overdue' : ''}`} key={item.id}><div className="nursery-room"><strong title={item.roomName}>{item.roomName}</strong></div><span className="nursery-facility">{item.facilityDisplayName || item.facilityName || plan.facilityName}</span><span>{formatNurseryDate(item.moveInDate)}</span><span className="nursery-due"><span>{distanceLabel(item.daysAway)}</span>{item.daysAway <= 0 ? <button disabled={confirming !== null} aria-label={`确认${item.facilityName || plan.facilityName} ${item.roomName}进树排期`} onClick={() => requestConfirmation(item)}>{confirming === item.id ? '确认中…' : '请确认'}</button> : null}</span><b>{item.quantity}<small> 株</small></b></div>)}
        {!visibleItems.length ? <div className="nursery-empty">暂无待确认的进树排期</div> : null}
      </div>
      <p className="nursery-updated">更新于 {new Date(plan.generatedAt).toLocaleString('zh-CN', { timeZone: 'America/Los_Angeles', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
    </section>
    {filterField ? <NurseryFilterSheet plan={plan} facilityName={factory} roomId={room} initialField={filterField} onApply={(factory, room) => { setSelectedFactory(factory); setSelectedRoom(room); setFilterField(null); }} onCancel={() => setFilterField(null)} /> : null}
    {loggingIn ? <LoginDialog onLogin={result => { setUser(result); setLoggingIn(false); setError(''); }} onCancel={() => { setLoggingIn(false); setPendingConfirmation(null); }} /> : null}
    {user && pendingConfirmation && !loggingIn ? <NurseryConfirmationDialog item={pendingConfirmation} facilityName={pendingConfirmation.facilityName || plan.facilityName} pending={confirming !== null} error={error} onConfirm={() => void confirm(pendingConfirmation)} onCancel={() => { setPendingConfirmation(null); setError(''); }} /> : null}
  </main>;
}
