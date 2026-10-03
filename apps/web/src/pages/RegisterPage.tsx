import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ApiError } from '@boardgame/client-sdk';
import { registrationInputSchema } from '@boardgame/protocol';
import { api, navigate } from '../platform.js';

export function RegisterPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const pending = useRef(false);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    const data = new FormData(event.currentTarget);
    const input = {
      displayName: String(data.get('displayName') ?? ''),
      userId: String(data.get('userId') ?? ''),
      password: String(data.get('password') ?? ''),
    };
    const parsed = registrationInputSchema.safeParse(input);
    if (!parsed.success) {
      const field = parsed.error.issues[0]?.path[0];
      setError(field === 'displayName' ? '用户名须为 1–32 字，不能全为空格。'
        : field === 'userId' ? '用户 ID 须为 3–32 位字母、数字或下划线，开头可加 @。'
          : '密码须为 12–128 位，至少包含一个字母和一个数字。');
      return;
    }
    if (input.password !== String(data.get('confirmPassword') ?? '')) {
      setError('两次输入的密码不一致。');
      return;
    }
    pending.current = true;
    setBusy(true);
    setError('');
    try {
      const result = await api.register(parsed.data);
      if (mounted.current) navigate('/login', { registeredUserId: result.username });
    } catch (cause) {
      if (!mounted.current) return;
      setError(cause instanceof ApiError && cause.code === 'STATE_CONFLICT'
        ? '这个用户 ID 已被使用，请换一个。'
        : cause instanceof ApiError && cause.code === 'RATE_LIMITED'
          ? '注册尝试过于频繁，请一分钟后重试。'
          : cause instanceof ApiError && cause.code === 'VALIDATION_ERROR'
            ? '注册信息不符合要求，请检查后重试。'
            : '暂时无法注册，请检查连接后重试。');
    } finally {
      pending.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  return <section className="auth-shell">
    <div className="panel auth-card">
      <p className="eyebrow">账号注册</p>
      <h1>加入游戏桌</h1>
      <p className="muted">选一个名字，让朋友找到你。</p>
      <form className="form-stack" onSubmit={submit} aria-busy={busy} aria-describedby={error ? 'register-error' : undefined}>
        <fieldset className="login-fields" disabled={busy}>
          <label>用户名<input name="displayName" autoComplete="nickname" minLength={1} maxLength={32} required aria-describedby="register-name-help" /></label>
          <p className="muted" id="register-name-help">1–32 字，支持中文，可在个人资料中修改。</p>
          <label>用户 ID<input name="userId" autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder="@rst307" minLength={3} maxLength={33} required aria-describedby="register-id-help" /></label>
          <p className="muted" id="register-id-help">3–32 位字母、数字或下划线，不区分大小写。用于登录和初始好友查找，@ 可省略；登录 ID 固定，好友 ID 可另行修改。</p>
          <label>密码<input name="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" minLength={12} maxLength={128} required aria-describedby="register-password-help" /></label>
          <p className="muted" id="register-password-help">12–128 位，至少包含一个字母和一个数字，允许符号。建议使用更长的独有密码。</p>
          <label>确认密码<input name="confirmPassword" type={showPassword ? 'text' : 'password'} autoComplete="new-password" minLength={12} maxLength={128} required /></label>
          <button type="button" className="secondary password-toggle" aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)}>
            {showPassword ? '隐藏密码' : '显示密码'}
          </button>
        </fieldset>
        {error && <p id="register-error" className="error-notice" role="alert">{error}</p>}
        <button type="submit" disabled={busy}>{busy ? '注册中…' : '注册账号'}</button>
      </form>
      <a className="auth-back" href="/login">已有账号？去登录</a>
    </div>
  </section>;
}
