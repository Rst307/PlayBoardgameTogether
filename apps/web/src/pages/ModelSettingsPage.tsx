import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ApiError } from '@boardgame/client-sdk';
import type { ModelEndpoint, ModelProfile } from '@boardgame/protocol';
import { api, navigate } from '../platform.js';

type Draft = { name: string; endpointId: string; baseUrl: string; modelId: string; apiKey: string };
const emptyDraft = (): Draft => ({ name: '', endpointId: 'openai', baseUrl: '', modelId: 'gpt-4o-mini', apiKey: '' });
const message = (cause: unknown) => cause instanceof Error ? cause.message : '操作失败，请重试';

export function ModelSettingsPage() {
  const [profiles, setProfiles] = useState<ModelProfile[]>([]);
  const [endpoints, setEndpoints] = useState<ModelEndpoint[]>([]);
  const [credentialsAvailable, setCredentialsAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [editing, setEditing] = useState<ModelProfile | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, { error?: string; success?: string }>>({});
  const nameInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    void api.me().then(() => Promise.all([api.modelProfiles(), api.modelEndpoints(), api.modelSettingsStatus()]))
      .then(([saved, catalog, status]) => {
        if (!active) return;
        setProfiles(saved);
        setEndpoints(catalog);
        setCredentialsAvailable(status.credentialsAvailable);
      }).catch(cause => {
        if (!active) return;
        if (cause instanceof ApiError && cause.code === 'UNAUTHENTICATED') navigate('/login');
        else setLoadError(message(cause));
      }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const isMock = draft.endpointId === 'mock';
  const originalEndpoint = editing?.endpoint_id.startsWith('custom-') ? 'custom' : editing?.endpoint_id;
  const endpointChanged = editing !== null && (draft.endpointId !== originalEndpoint ||
    (draft.endpointId === 'custom' && draft.baseUrl.replace(/\/+$/, '') !== editing.base_url.replace(/\/+$/, '')));
  const needsKey = !isMock && (!editing?.has_credential || endpointChanged);
  const cannotSave = !isMock && !credentialsAvailable && (needsKey || !!draft.apiKey);

  function reset() {
    setEditing(null);
    setDraft(emptyDraft());
    setError('');
  }

  function edit(profile: ModelProfile) {
    setEditing(profile);
    setDraft({ name: profile.name, endpointId: profile.endpoint_id.startsWith('custom-') ? 'custom' : profile.endpoint_id,
      baseUrl: profile.base_url, modelId: profile.model_id, apiKey: '' });
    setError('');
    setNotice('');
    setDeleteId(null);
    nameInput.current?.focus();
    nameInput.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy('save');
    setError('');
    setNotice('');
    try {
      const body = { name: draft.name, endpointId: draft.endpointId, modelId: draft.modelId,
        parameters: editing?.parameters ?? {}, enabled: editing?.enabled ?? true,
        ...(draft.endpointId === 'custom' ? { baseUrl: draft.baseUrl } : {}),
        ...(!isMock && draft.apiKey.trim() ? { apiKey: draft.apiKey.trim() } : {}) };
      const saved = editing
        ? await api.updateModelProfile(editing.id, { ...body, expectedVersion: editing.profile_version })
        : await api.createModelProfile(body);
      const name = draft.name;
      reset();
      setResults(current => ({ ...current, [saved.id]: { success: '配置已保存，尚未测试连接' } }));
      setNotice(`已保存「${name}」。可在下方测试连接或继续编辑。`);
      try { setProfiles(await api.modelProfiles()); }
      catch { setError('保存已成功，但列表刷新失败，请刷新页面查看。'); }
    } catch (cause) { setError(message(cause)); }
    finally { setBusy(''); }
  }

  async function action(profile: ModelProfile, kind: 'test' | 'delete' | 'revoke') {
    setBusy(`${kind}:${profile.id}`);
    setResults(current => ({ ...current, [profile.id]: {} }));
    try {
      if (kind === 'test') {
        const result = await api.testModelProfile(profile.id);
        setResults(current => ({ ...current, [profile.id]: { success: result.kind === 'mock' ? '模拟连接测试通过' : '真实服务连接测试通过' } }));
      } else {
        if (kind === 'delete') await api.deleteModelProfile(profile.id);
        else await api.revokeModelCredential(profile.id);
        if (editing?.id === profile.id) reset();
        setDeleteId(null);
        setProfiles(await api.modelProfiles());
        setNotice(kind === 'delete' ? `已删除「${profile.name}」` : `已撤销「${profile.name}」的密钥，可通过编辑重新填写。`);
      }
    } catch (cause) { setResults(current => ({ ...current, [profile.id]: { error: message(cause) } })); }
    finally { setBusy(''); }
  }

  return <>
    <section className="page-heading"><div><p className="eyebrow">个人设置</p><h1>模型配置</h1>
      <p>填写服务商提供的接口地址、模型标识和 API key，保存后测试连接。</p>
      <p className="muted">保存不会调用模型；点击“测试连接”会发送一次简短请求，可能产生服务商费用。</p></div></section>
    {loading ? <p role="status">正在加载模型设置…</p> : loadError ? <section className="panel">
      <p role="alert">加载失败：{loadError}</p><button onClick={() => location.reload()}>重新加载</button>
    </section> : <>
      {!credentialsAvailable && <p className="error-notice" role="alert">服务器尚未启用密钥加密，请联系管理员配置后使用真实模型。模拟模型仍可使用。</p>}
      {notice && <p role="status">{notice}</p>}
      <section className="panel auth-card">
        <h2>{editing ? `编辑「${editing.name}」` : '新增配置'}</h2>
        <form className="form-stack" onSubmit={save}>
          <label>配置名称<input ref={nameInput} name="name" maxLength={60} value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} disabled={!!busy} required /></label>
          <label>服务端点<select value={draft.endpointId} onChange={e => setDraft({ ...draft, endpointId: e.target.value, apiKey: '' })} disabled={!!busy} required>
            {endpoints.map(endpoint => <option key={endpoint.id} value={endpoint.id}>{endpoint.name}{endpoint.protocol === 'mock' ? '（模拟，不调用真实模型）' : ''}</option>)}
            <option value="custom">自定义 OpenAI 兼容服务</option>
          </select></label>
          {draft.endpointId === 'custom' && <label>Base URL（HTTPS）<input name="baseUrl" type="url" placeholder="https://api.example.com/v1" value={draft.baseUrl} onChange={e => setDraft({ ...draft, baseUrl: e.target.value })} disabled={!!busy} required />
            <span className="muted">填写服务商的 API 基础地址（通常含 /v1），也可粘贴完整 /chat/completions 地址。只支持公网 HTTPS。</span></label>}
          <label>模型标识<input name="modelId" value={draft.modelId} onChange={e => setDraft({ ...draft, modelId: e.target.value })} disabled={!!busy} maxLength={120} required />
            <span className="muted">须与服务商提供的 model ID 完全一致，并支持 Chat Completions。</span></label>
          <label>API key（仅写入，不会回显）<input name="apiKey" type="password" autoComplete="new-password" value={draft.apiKey} onChange={e => setDraft({ ...draft, apiKey: e.target.value })} minLength={8} maxLength={4096} disabled={!!busy || isMock || !credentialsAvailable} required={needsKey} placeholder={editing?.has_credential && !endpointChanged ? '留空保留已保存的密钥' : '填写此服务商的 API key'} /></label>
          {endpointChanged && !isMock && <p className="muted">更换服务地址后需要重新填写密钥。</p>}
          {isMock && <p className="muted">模拟模型无需密钥，仅用于验证平台流程。</p>}
          {error && <p className="error-notice" role="alert">{error}</p>}
          <div className="model-actions"><button disabled={!!busy || cannotSave}>{busy === 'save' ? '保存中…' : editing ? '保存修改' : '保存配置'}</button>
            {editing && <button type="button" className="secondary" disabled={!!busy} onClick={reset}>取消编辑</button>}</div>
        </form>
      </section>
      <section className="room-list"><h2>已保存配置</h2>
        {profiles.length === 0 ? <p className="muted">尚未保存模型配置。</p> : profiles.map(profile => <article className="panel model-profile" key={profile.id}>
          <h3>{profile.name}</h3><p className="muted">{profile.base_url}</p><p>{profile.model_id} · 版本 {profile.profile_version}</p>
          <p>{profile.endpoint_id === 'mock' ? '未配置凭证 · 模拟模型无需密钥' : profile.has_credential ? '凭证已配置' : '未配置凭证，请编辑并填写 API key'}</p>
          <div className="model-actions">
            <button className="secondary" disabled={!!busy} onClick={() => edit(profile)}>编辑</button>
            <button className="secondary" disabled={!!busy || (profile.endpoint_id !== 'mock' && (!profile.has_credential || !credentialsAvailable))} onClick={() => void action(profile, 'test')}>{busy === `test:${profile.id}` ? '测试中…' : '测试连接'}</button>
            {profile.has_credential && <button className="secondary" disabled={!!busy} onClick={() => void action(profile, 'revoke')}>撤销凭证</button>}
            <button className="secondary" disabled={!!busy} onClick={() => setDeleteId(profile.id)}>删除</button>
          </div>
          {deleteId === profile.id && <div><p>确定删除「{profile.name}」？密钥也会撤销。正在使用此配置的对局请先收回控制。</p>
            <div className="model-actions"><button disabled={!!busy} onClick={() => void action(profile, 'delete')}>确认删除</button><button className="secondary" disabled={!!busy} onClick={() => setDeleteId(null)}>取消删除</button></div></div>}
          {results[profile.id]?.error && <p className="error-notice" role="alert">{results[profile.id]?.error}</p>}
          {results[profile.id]?.success && <p role="status">{results[profile.id]?.success}</p>}
        </article>)}
      </section>
    </>}
  </>;
}
