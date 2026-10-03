import { useEffect, useState } from 'react';
import { request } from './api';
import { PhotoGallery } from './photos';
import { formatDateTime } from './format';
import type { MediaAsset } from './types';
import './patrol.css';

type StepKey = 'moisture' | 'water' | 'ph' | 'plants' | 'lights' | 'climate' | 'drippers' | 'roots';
type WateringSetting = {times?:{startTime:string;durationMinutes:number}[];startTime:string;durationMinutes:number;mode:string;intervalHours:number|null};
const wateringText=(row:WateringSetting)=>row.mode==='timed' ? '每日 '+(row.times||[row]).length+' 次 · '+(row.times||[row]).map((t,i)=>`第 ${i+1} 次 ${t.startTime} · ${t.durationMinutes} 分钟`).join('；') : row.startTime+' 开始 · 每次 '+row.durationMinutes+' 分钟 · '+(row.mode==='cyclic'?'每 '+row.intervalHours+' 小时循环':'定时浇水');
type Report = {
  irrigationSnapshot?: {scope:string;batchDay:number|null;common:WateringSetting;beds:(WateringSetting & {bedId:string;bedName:string})[]};
  room: { name: string }; batch: { name: string }; inspectorName: string; businessDate: string;
  completedAt: string; startedAt: string; needsAttention: boolean; initialRequired: boolean;
  template: { steps: { key: StepKey; title: string; initial?: boolean }[] };
  beds: { id: string; name: string }[]; tank: { name: string; capacityGallons: number | null } | null;
  rootFormula: { photos?:MediaAsset[]; name: string; version: number; rootParts: number; waterParts: number; rootUnit?: string | null; waterUnit?: string | null } | null;
  confirmations: Partial<Record<StepKey, string>>;
  state: { plants?:string; plantPhotos?:MediaAsset[]; plantBeds?:{bedId:string;photos:MediaAsset[]}[]; noIndependentAc?: boolean; moisture: string; setting: string; water: string; ph: string; beds: { bedId: string; photos: MediaAsset[] }[]; phPhotos: MediaAsset[]; lightPhotos: MediaAsset[]; climatePhotos: MediaAsset[] };
};
type FollowUp = { needsAttention: boolean; findings: { key: string; title: string; status: string; issueStatus?: string | null; note: string | null; issueId: string | null }[]; timeline: { id: string; title: string; at: string; actorName: string; note?: string | null }[] };
type Inspection = { followUp?: FollowUp | null; id: string; report: Report | null; inspectorName: string; recordedAt: string; attachments: MediaAsset[]; room: { name: string }; batch: { name: string } | null };

export function InspectionPage({ route, onLogout }: { route: { kind: 'patrol'; token: string } | { kind: 'inspection'; id: string }; onLogout?: () => void }) {
  const [record, setRecord] = useState<Inspection | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    const path = route.kind === 'patrol' ? `/api/inspection-shares/${encodeURIComponent(route.token)}` : `/api/inspections/${encodeURIComponent(route.id)}`;
    request<Inspection>(path).then(data => { if (active) setRecord(data); }).catch(cause => { if (active) setError(cause.message); });
    return () => { active = false; };
  }, [route, attempt]);
  if (!record) return <main className="state-page"><div className="brand-mark"><img src="/yarden-brand-logo.png" alt="御花园" /></div><h1>{error ? '无法查看报告' : '正在加载巡房报告'}</h1><p>{error || '正在读取检查记录与现场照片…'}</p>{error && <button className="primary-button" onClick={() => { setError(''); setAttempt(n => n + 1); }}>重新加载</button>}{onLogout && <button className="patrol-link" onClick={onLogout}>切换账号</button>}</main>;
  const report = record.report;
  const needsAttention = record.followUp?.needsAttention ?? report?.needsAttention;
  return <main className="patrol-page"><header className="patrol-header"><div><strong>巡房报告</strong><small>YARDEN · 团队巡房记录</small></div>{onLogout ? <button className="patrol-link" onClick={onLogout}>退出</button> : <span className="patrol-link">分享只读</span>}</header>
    <section className="patrol-hero"><span>{report?.businessDate || formatDateTime(record.recordedAt)} · {report ? (report.initialRequired ? '首次巡房' : '日常巡房') : '巡房记录'}</span><h1>{record.room.name}</h1><p>{record.batch?.name || '历史巡房'}</p><strong>{needsAttention ? '已完成 · 有待关注项' : '已完成'}</strong><div>{record.inspectorName} · {formatDateTime(report?.completedAt || record.recordedAt)}</div></section>
    {report ? <><div className={needsAttention ? 'patrol-notice warning' : 'patrol-notice'}>{needsAttention ? '巡房发现待关注项，请查看下方处理记录。' : record.followUp?.findings.length ? '巡房关注项已处理，原始检查结果与处理过程保留如下。' : '本次检查已全部确认完成。'}{report.initialRequired && ' 已包含本批次初始检查。'}</div>
      {record.followUp?.findings.map(item => <section className="patrol-card" key={item.key}><h2>{item.title}</h2><p>{item.issueStatus === 'ARCHIVED' ? '已归档' : item.status === 'RESOLVED' ? '已解决' : item.status === 'REPORTED' ? '已上报异常 · 处理中' : '待关注'}</p>{item.note && <p>{item.note}</p>}{item.issueId && <small>已关联异常单</small>}</section>)}
      {report.template.steps.map((step, index) => <section className="patrol-card" key={step.key}><header><span className="patrol-number">{index + 1}</span><h2>{step.title.replace('两根滴灌', '两根滴管')}</h2><span className="patrol-check">✓</span></header>{step.initial && <span className="patrol-tag">批次初始检查</span>}<StepContent step={step.key} report={report} /><small className="patrol-time">确认完成 · {formatDateTime(report.confirmations[step.key] || report.completedAt)}</small></section>)}
    </> : <section className="patrol-card"><h2>历史巡房记录</h2><p>此记录使用旧版巡房格式。</p><PhotoGallery photos={record.attachments || []} /></section>}
    {record.followUp?.timeline.length ? <section className="patrol-card"><h2>巡房处理时间线</h2>{record.followUp.timeline.map(event => <div className="patrol-timeline-event" key={event.id}><strong>{event.title}</strong>{event.note && <p>{event.note}</p>}<small>{formatDateTime(event.at)} · {event.actorName || '处理人员'}</small></div>)}</section> : null}
    <p className="patrol-end">照片与配方按巡房提交时的记录展示</p>
  </main>;
}
function StepContent({ step, report }: { step: StepKey; report: Report }) {
  const state = report.state;
  if (step === 'moisture') return <><p>整个房间 · 基质{({ dry: '偏干', balanced: '适中', wet: '偏湿' } as Record<string,string>)[state.moisture]}</p><p>浇水设置：{state.setting === 'adjusted' ? '已调整' : '保持原设置'}</p>{report.irrigationSnapshot ? <div className="patrol-bed"><h3>DAY {report.irrigationSnapshot.batchDay ?? '--'} · 浇水设置</h3>{report.irrigationSnapshot.scope==='room'?<p>全房间统一 · {wateringText(report.irrigationSnapshot.common)}</p>:report.irrigationSnapshot.beds.map(b=><p key={b.bedId}>{b.bedName} · {wateringText(b)}</p>)}</div>:null}{state.beds.map(bed => <div className="patrol-bed" key={bed.bedId}><h3>{report.beds.find(b => b.id === bed.bedId)?.name || '苗床设置照片'}</h3><PhotoGallery photos={bed.photos} /></div>)}</>;
  if (step === 'water') return <><p>{report.tank?.name || '房间水桶'}{report.tank?.capacityGallons ? ` · ${report.tank.capacityGallons} gal` : ' · 档案待配置'}</p><p className={state.water === 'low' ? 'patrol-warning-text' : ''}>肥水{state.water === 'low' ? '不足 · 待关注' : '足够'}</p></>;
  if(step==='plants') return <><p>{state.plants==='abnormal'?'植物状态异常':'植物状态正常'}</p>{state.plants==='abnormal'?<PhotoGallery photos={state.plantPhotos || []}/>: (state.plantBeds || []).map(b=><div className="patrol-bed" key={b.bedId}><h3>{report.beds.find(bed=>bed.id===b.bedId)?.name || 'Table'}</h3><PhotoGallery photos={b.photos}/></div>)}</>;
  if (step === 'ph') return <><p className={state.ph === 'abnormal' ? 'patrol-warning-text' : ''}>pH {state.ph === 'abnormal' ? '不正常 · 待关注' : '正常'}</p><PhotoGallery photos={state.phPhotos} /></>;
  if (step === 'lights') return <><p>已确认每日开灯 18 小时</p><PhotoGallery photos={state.lightPhotos} /></>;
  if (step === 'climate' && state.noIndependentAc === true) return <p>当前房间没有独控空调 · 已确认，无需设置照片</p>;
  if (step === 'climate') return <><p>已确认单控空调温度、湿度设置</p><PhotoGallery photos={state.climatePhotos} /></>;
  if (step === 'drippers') return <p>已确认每棵植物插有两根滴管</p>;
  return <><p>已确认用清水与护根水浇透</p>{report.rootFormula && <div className="patrol-ratio"><strong>{report.rootFormula.name} · V{report.rootFormula.version}</strong><p>护根水 {report.rootFormula.rootParts} {report.rootFormula.rootUnit || '份'} : 清水 {report.rootFormula.waterParts} {report.rootFormula.waterUnit || '份'}{(!report.rootFormula.rootUnit || !report.rootFormula.waterUnit) && '（单位未设置）'}</p><PhotoGallery photos={report.rootFormula.photos || []}/></div>}</>;
}
