import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from './api';
import { formatDateTime, severityLabels, slotPosition, statusLabel, typeLabels } from './format';
import { PhotoGallery, PhotoUploader } from './photos';
import type { Issue, MediaAsset, User } from './types';
import { InspectionPage } from './InspectionPage';

type Route = { kind: 'share'; token: string } | { kind: 'issue'; id: string } | { kind: 'patrol'; token: string } | { kind: 'inspection'; id: string } | { kind: 'unknown' };
function currentRoute(): Route {
  const patrol = location.pathname.match(/^\/p\/([^/]+)\/?$/);
  if (patrol) return { kind: 'patrol', token: decodeURIComponent(patrol[1]) };
  const inspection = location.pathname.match(/^\/inspections\/([^/]+)\/?$/);
  if (inspection) return { kind: 'inspection', id: decodeURIComponent(inspection[1]) };
  const share = location.pathname.match(/^\/s\/([^/]+)\/?$/);
  if (share) return { kind: 'share', token: decodeURIComponent(share[1]) };
  const issue = location.pathname.match(/^\/issues\/([^/]+)\/?$/);
  if (issue) return { kind: 'issue', id: decodeURIComponent(issue[1]) };
  return { kind: 'unknown' };
}

export function App() {
  const [route] = useState<Route>(currentRoute);
  const [user, setUser] = useState<User | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  useEffect(() => { api.session().then(setUser).catch(() => setUser(null)).finally(() => setCheckingSession(false)); }, []);
  if (route.kind === 'unknown') return <StatePage icon="leaf" title="Yarden 异常协作" message="请通过有效的异常分享链接访问。" />;
  if (checkingSession) return <StatePage loading title="正在安全加载" message="正在验证登录状态…" />;
  if (!user) return <LoginPage onLogin={setUser} />;
  if (route.kind === 'patrol' || route.kind === 'inspection') return <InspectionPage route={route} onLogout={() => api.logout().finally(() => setUser(null))} />;
  return <IssuePage route={route} user={user} onLogout={() => api.logout().finally(() => setUser(null))} />;
}

function LoginPage({ onLogin }: { onLogin: (user: User) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError(''); setLoading(true);
    try {
      const user = await api.login(username.trim(), password);
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      onLogin(user);
    }
    catch (caught) { setError(caught instanceof Error ? caught.message : '登录失败'); }
    finally { setLoading(false); }
  };
  return <main className="login-shell"><section className="login-card"><div className="brand-mark">Y</div><p className="eyebrow">YARDEN TEAM</p><h1>登录后查看记录</h1><p className="muted">记录仅对获得授权的团队成员开放</p><form onSubmit={submit}><label>账号<input autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="请输入账号" /></label><label>密码<input autoComplete="current-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="请输入密码" /></label>{error && <p className="form-error">{error}</p>}<button className="primary-button" disabled={loading || !username.trim() || !password}>{loading ? '正在登录…' : '登录并继续'}</button></form><p className="security-note">🔒 账号验证由 Yarden 安全服务完成</p></section></main>;
}

function IssuePage({ route, user, onLogout }: { route: Extract<Route, { kind: 'share' | 'issue' }>; user: User; onLogout: () => void }) {
  const [issue, setIssue] = useState<Issue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const issueRequest = useCallback(() => route.kind === 'share' ? api.sharedIssue(route.token) : api.issue(route.id), [route]);
  const errorMessage = (caught: unknown) => caught instanceof ApiError && caught.status === 403 ? '你暂无权限查看该异常' : caught instanceof Error ? caught.message : '异常加载失败';
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setIssue(await issueRequest()); }
    catch (caught) { setError(errorMessage(caught)); }
    finally { setLoading(false); }
  }, [issueRequest]);
  useEffect(() => {
    let active = true;
    issueRequest()
      .then(data => { if (active) setIssue(data); })
      .catch(caught => { if (active) setError(errorMessage(caught)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [issueRequest]);
  if (loading) return <StatePage loading title="正在加载异常" message="正在同步最新处理状态…" />;
  if (!issue) return <StatePage icon="warning" title="无法查看异常" message={error} action={<button className="secondary-button" onClick={() => void load()}>重新加载</button>} />;
  return <IssueDetail issue={issue} user={user} onChanged={setIssue} onLogout={onLogout} />;
}

function IssueDetail({ issue, user, onChanged, onLogout }: { issue: Issue; user: User; onChanged: (issue: Issue) => void; onLogout: () => void }) {
  const [solution, setSolution] = useState(issue.resolutionDescription || issue.actionTaken || '');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [resolutionPhotos, setResolutionPhotos] = useState<MediaAsset[]>([]);
  const archived = issue.issueStatus === 'ARCHIVED';
  const resolved = archived || issue.issueStatus === 'RESOLVED' || issue.issueStatus === 'CLOSED';
  const context = issue.targetContext ?? { source: 'CURRENT' as const, capturedAt: issue.reportedAt, room: issue.room ? { ...issue.room, facilityName: user.facilityName } : null, batch: issue.batch ? { id: issue.batch.id, name: issue.batch.name, strainName: issue.batch.strainName ?? null, status: null } : null, device: issue.device ? { ...issue.device } : null, table: issue.table ? { ...issue.table, roomId: issue.room?.id ?? null } : null, slots: [] };
  const reportPhotos = (issue.attachments || []).filter(photo => photo.scope !== 'ISSUE_RESOLUTION');
  const savedResolutionPhotos = (issue.attachments || []).filter(photo => photo.scope === 'ISSUE_RESOLUTION');
  const allResolutionPhotos = [...savedResolutionPhotos, ...resolutionPhotos];
  const allPhotos = [...reportPhotos, ...allResolutionPhotos];
  const run = async (operation: () => Promise<Issue>) => { setBusy(true); setMessage(''); try { onChanged(await operation()); setMessage('操作成功，异常状态已更新'); } catch (caught) { setMessage(caught instanceof Error ? caught.message : '操作失败'); } finally { setBusy(false); } };
  const share = async () => {
    setBusy(true); setMessage('');
    try {
      const { url } = await api.createShare(issue.id);
      if (navigator.share) await navigator.share({ title: issue.title || typeLabels[issue.issueType] || 'Yarden 异常', text: `${statusLabel(issue.issueStatus)} · ${issue.room?.name || '未关联房间'}`, url });
      else { await navigator.clipboard.writeText(url); setMessage('分享链接已复制'); }
    } catch (caught) { if (caught instanceof DOMException && caught.name === 'AbortError') return; setMessage(caught instanceof Error ? caught.message : '暂时无法分享'); }
    finally { setBusy(false); }
  };
  return <main className="page-shell"><header className="topbar"><div><p className="eyebrow">异常详情</p><h1>定位对象、处理并留存完整记录</h1></div><div className="top-actions"><button aria-label="分享异常" className="icon-button" onClick={() => void share()} disabled={busy}>↗</button><button className="account-button" onClick={onLogout}>{user.username} · 退出</button></div></header><div className="content">
    <section className={`hero ${issue.severity === 'CRITICAL' || issue.severity === 'HIGH' ? 'hero-danger' : ''}`}><div className="hero-top"><span className="glass-pill">⚠ {typeLabels[issue.issueType] || issue.issueType}</span><span className="severity-pill">{issue.severity ? severityLabels[issue.severity] : '未分级'}</span></div><h2>{issue.title || `${issue.room?.name || '未关联房间'}${typeLabels[issue.issueType] || '异常'}`}</h2><div className="hero-footer"><span>上报于 {formatDateTime(issue.reportedAt)}</span><span className="status"><i />{statusLabel(issue.issueStatus)}</span></div></section>
    <section className="card target-card"><div className="section-heading"><div><h3>异常对象</h3><p>现场处理定位信息</p></div><span className="snapshot">{context.source === 'SNAPSHOT' ? '📷 上报时快照' : '↻ 当前关联'}</span></div><div className="context-grid"><Info icon="⌂" label="房间" value={context.room?.name || '未关联'} /><Info icon="▱" label="批次" value={context.batch?.name || '未关联'} meta={context.batch?.strainName || undefined} />{context.table && <Info icon="▦" label="苗床" value={context.table.name || '未命名苗床'} />}{context.device && <Info icon="⚙" label="设备" value={context.device.name || '未命名设备'} meta={context.device.type || undefined} />}</div>{context.slots.length > 0 && <div className="plants"><div className="plants-head"><strong>♧ 涉及植物</strong><span>已选择 {context.slots.length} 株</span></div><div className="plant-grid">{context.slots.slice(0, 12).map(slot => <div className="plant" key={slot.id}><b>{slotPosition(slot)}</b><span>{slot.varietyName || '品种未记录'}</span><small>{slot.plantStatus || '状态未记录'}</small></div>)}</div></div>}<p className="card-footnote">对象信息记录于 {formatDateTime(context.capturedAt)}</p></section>
    <SectionTitle icon="≡" title="问题描述" /><section className="card description">{issue.description || '未填写问题描述'}</section>
    <SectionTitle icon="◷" title="处理记录" /><section className="card timeline"><Timeline active title="异常已上报" meta={`${issue.reportedBy || '系统自动上报'} · ${formatDateTime(issue.reportedAt)}`} />{archived && issue.handledBy ? <Timeline active title="归档前处理人已接单" meta={issue.handledBy + ' · ' + formatDateTime(issue.handledAt)} /> : null}<Timeline active={issue.issueStatus !== 'OPEN'} title={archived ? '批次进入干房，异常已归档' : resolved ? '已确认并完成处理' : issue.issueStatus === 'IN_PROGRESS' ? '处理人已接单' : '等待处理人确认'} meta={archived ? `${issue.metadata?.archive?.reason || '批次种植阶段结束'} · ${formatDateTime(issue.metadata?.archive?.at)}` : issue.handledBy ? `${issue.handledBy}${issue.handledAt ? ` · ${formatDateTime(issue.handledAt)}` : ''}` : '尚未分配处理人'} last /></section>
    <SectionTitle icon="✓" title={archived ? '归档前处理记录' : resolved ? '处理结果' : '解决方案'} /><section className="card"><textarea disabled={resolved} value={solution} onChange={(event) => setSolution(event.target.value)} placeholder="请描述排查过程、根因、处理措施和最终结果" />{message && <p className="inline-message">{message}</p>}</section>
    <SectionTitle icon="▣" title="现场与处理照片" />{resolved ? <section className="card photo-card">{allPhotos.length ? <PhotoGallery photos={allPhotos} /> : <p className="photo-empty">该异常没有上传照片</p>}</section> : <>{reportPhotos.length ? <section className="card photo-card"><h4>上报现场</h4><PhotoGallery photos={reportPhotos} /></section> : null}{issue.issueStatus === 'IN_PROGRESS' ? <section className="card photo-card"><h4>处理过程与结果</h4>{savedResolutionPhotos.length ? <PhotoGallery photos={savedResolutionPhotos} /> : null}<PhotoUploader value={resolutionPhotos} onChange={setResolutionPhotos} scope="ISSUE_RESOLUTION" entityId={issue.id} /></section> : <section className="card photo-card"><p className="photo-empty">确认处理后可上传处理照片</p></section>}</>}
  </div><footer className="action-footer">{resolved ? <div className="resolved-notice">{archived ? '该异常已归档' : '✓ 该异常已完成处理'}</div> : issue.issueStatus === 'OPEN' ? <button className="primary-button" disabled={busy} onClick={() => void run(() => api.acknowledge(issue.id))}>{busy ? '正在提交…' : '✋ 确认处理'}</button> : <button className="primary-button mint" disabled={busy || !solution.trim()} onClick={() => void run(() => api.resolve(issue.id, solution.trim(), allPhotos))}>{busy ? '正在提交…' : '✓ 提交处理结果'}</button>}</footer></main>;
}

function Info({ icon, label, value, meta }: { icon: string; label: string; value: string; meta?: string }) { return <div className="info"><span className="info-icon">{icon}</span><div><small>{label}</small><strong>{value}</strong>{meta && <em>{meta}</em>}</div></div>; }
function SectionTitle({ icon, title }: { icon: string; title: string }) { return <div className="section-title"><span>{icon}</span><h3>{title}</h3></div>; }
function Timeline({ active, title, meta, last }: { active: boolean; title: string; meta: string; last?: boolean }) { return <div className="timeline-row"><div className="rail"><i className={active ? 'active' : ''} />{!last && <b />}</div><div><strong>{title}</strong><p>{meta}</p></div></div>; }
function StatePage({ loading, icon, title, message, action }: { loading?: boolean; icon?: string; title: string; message: string; action?: React.ReactNode }) { return <main className="state-page"><div className={`state-icon ${loading ? 'spinner' : ''}`}>{loading ? '' : icon === 'warning' ? '!' : 'Y'}</div><h1>{title}</h1><p>{message}</p>{action}</main>; }
