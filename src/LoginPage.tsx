import { useRef, useState } from 'react';
import { api } from './api';
import type { User } from './types';

export function LoginPage({ onLogin, onCancel, title = '登录后查看记录', autoFocus = false, embedded = false }: { onLogin: (user: User) => void; onCancel?: () => void; title?: string; autoFocus?: boolean; embedded?: boolean }) {
  const [username, setUsername] = useState('');
  const [facilityName,setFacilityName]=useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const submitting = useRef(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true; setError(''); setLoading(true);
    try {
      const user = await api.login(username.trim(), password,facilityName.trim());
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      onLogin(user);
    }
    catch (caught) { setError(caught instanceof Error ? caught.message : '登录失败'); }
    finally { submitting.current = false; setLoading(false); }
  };
  const Container = embedded ? 'div' : 'main';
  return <Container className="login-shell"><section className="login-card"><div className="brand-mark"><img src="/yarden-brand-logo.png" alt="御花园" /></div><p className="eyebrow">YARDEN TEAM</p><h1>{title}</h1><p className="muted">记录仅对获得授权的团队成员开放</p><form onSubmit={submit}><label>账号归属工厂编号（选填）<input value={facilityName} onChange={event=>setFacilityName(event.target.value)} placeholder="留空使用默认工厂" /></label><label>账号<input autoFocus={autoFocus} autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="请输入账号" /></label><label>密码<input autoComplete="current-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="请输入密码" /></label>{error && <p role="alert" className="form-error">{error}</p>}<button className="primary-button" disabled={loading || !username.trim() || !password}>{loading ? '正在登录…' : '登录并继续'}</button></form><p className="security-note">🔒 账号验证由 Yarden 安全服务完成</p>{onCancel ? <button className="secondary-button" onClick={onCancel}>返回排期</button> : null}</section></Container>;
}

