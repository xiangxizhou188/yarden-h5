import { useEffect, useRef } from 'react';
import { LoginPage } from './LoginPage';
import type { User } from './types';
import './login-dialog.css';

export function LoginDialog({ onLogin, onCancel }: { onLogin: (user: User) => void; onCancel: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    element.showModal();
    return () => element.close();
  }, []);
  return <dialog ref={dialog} className="nursery-login-dialog" aria-label="账号密码登录" onCancel={onCancel} onClick={event => { if (event.target === event.currentTarget) onCancel(); }}>
    <button className="nursery-login-close" type="button" aria-label="关闭登录" onClick={onCancel}>×</button>
    <LoginPage embedded title="账号密码登录" autoFocus onLogin={onLogin} onCancel={onCancel} />
  </dialog>;
}
