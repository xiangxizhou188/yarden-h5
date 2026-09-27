import { useCallback, useEffect, useState } from 'react';
import { api } from './api';
import type { NurseryMoveInPlan } from './types';
import './nursery-share.css';

function dateLabel(value: string) {
  const [year, month, day] = value.split('-');
  return `${year}/${month}/${day}`;
}

function distanceLabel(daysAway: number) {
  return daysAway === 0 ? '今天' : `${daysAway}天`;
}

export function NurseryPlanPage({ token }: { token: string }) {
  const [plan, setPlan] = useState<NurseryMoveInPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setPlan(await api.nurseryPlan(token)); }
    catch (caught) { setError(caught instanceof Error ? caught.message : '进树计划加载失败'); }
    finally { setLoading(false); }
  }, [token]);
  useEffect(() => {
    let active = true;
    const refresh = () => {
      api.nurseryPlan(token)
        .then((result) => { if (active) { setPlan(result); setError(''); } })
        .catch((caught) => { if (active) setError(caught instanceof Error ? caught.message : '进树计划加载失败'); })
        .finally(() => { if (active) setLoading(false); });
    };
    const refreshWhenVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    refresh();
    const timer = window.setInterval(refreshWhenVisible, 30_000);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    window.addEventListener('pageshow', refresh);
    return () => {
      active = false;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
      window.removeEventListener('pageshow', refresh);
    };
  }, [token]);

  if (loading) return <main className="nursery-state"><div className="nursery-loader" /><h1>正在同步最新计划</h1><p>收获日期和数量调整会自动更新</p></main>;
  if (!plan) return <main className="nursery-state"><div className="nursery-mark">!</div><h1>分享链接无法访问</h1><p>{error || '链接可能已过期或失效'}</p><button onClick={() => void load()}>重新加载</button></main>;

  return <main className="nursery-page">
    <header className="nursery-hero">
      <div className="nursery-hero-inner">
        <div className="nursery-hero-top">
          <div className="nursery-brand"><img src="/yarden-brand-logo.png" alt="" /><div><strong>{plan.facilityName}</strong><small>Facility</small></div></div>
          <div className="nursery-live"><i />实时计划</div>
        </div>
        <div className="nursery-hero-copy">
          <h1>未来 {plan.rangeDays} 天进树安排</h1>
          <p>计划收获次日进树，日期与数量实时同步</p>
        </div>
        <div className="nursery-summary">
          <div><span>计划房间</span><b>{plan.roomCount}</b><small>间</small></div>
          <div><span>预计供苗</span><b>{plan.totalQuantity.toLocaleString('zh-CN')}</b><small>株</small></div>
        </div>
      </div>
    </header>
    <section className="nursery-content">
      <div className="nursery-heading"><div><h2>未来进树计划</h2><p>日期或数量调整后，本页面自动同步</p></div><button aria-label="刷新计划" onClick={() => void load()}>↻</button></div>
      <div className="nursery-table">
        <div className="nursery-row nursery-table-head"><span>房间</span><span>计划进树日期</span><span>距今</span><span>数量</span></div>
        {plan.items.map((item) => <div className="nursery-row" key={item.id}><strong>{item.roomName}</strong><span>{dateLabel(item.moveInDate)}</span><span>{distanceLabel(item.daysAway)}</span><b>{item.quantity}<small> 株</small></b></div>)}
        {!plan.items.length ? <div className="nursery-empty">未来 {plan.rangeDays} 天暂无进树计划</div> : null}
      </div>
      <p className="nursery-note">数量为房间当前批次总株数，包含正常株和备用株。</p>
      <p className="nursery-updated">更新于 {new Date(plan.generatedAt).toLocaleString('zh-CN', { timeZone: 'America/Los_Angeles', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
    </section>
  </main>;
}
