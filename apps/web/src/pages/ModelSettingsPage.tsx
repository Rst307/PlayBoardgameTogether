import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ApiError } from '@boardgame/client-sdk';
import type { ModelEndpoint, ModelProfile } from '@boardgame/protocol';
import { api, navigate } from '../platform.js';
import {
  PROVIDER_PRESETS,
  detectProvider,
  type PresetModel,
  type ProviderPreset,
} from './model-presets.js';

type Draft = {
  name: string;
  endpointId: string;
  baseUrl: string;
  modelId: string;
  apiKey: string;
  temperature: number | '';
  maxOutputTokens: number | '';
  enabled: boolean;
};

const emptyDraft = (): Draft => ({
  name: '',
  endpointId: 'openai',
  baseUrl: '',
  modelId: 'gpt-4o-mini',
  apiKey: '',
  temperature: 0.5,
  maxOutputTokens: 256,
  enabled: true,
});

const message = (cause: unknown) => (cause instanceof Error ? cause.message : '操作失败，请重试');

type TestResult = {
  error?: string;
  success?: string;
  latencyMs?: number;
};

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
  const [results, setResults] = useState<Record<string, TestResult>>({});

  // UI state
  const [showApiKey, setShowApiKey] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>('openai');
  const [filterType, setFilterType] = useState<'all' | 'real' | 'mock' | 'uncredentialed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const nameInput = useRef<HTMLInputElement>(null);
  const formSectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let active = true;
    void api.me()
      .then(() => Promise.all([api.modelProfiles(), api.modelEndpoints(), api.modelSettingsStatus()]))
      .then(([saved, catalog, status]) => {
        if (!active) return;
        setProfiles(saved);
        setEndpoints(catalog);
        setCredentialsAvailable(status.credentialsAvailable);
      })
      .catch(cause => {
        if (!active) return;
        if (cause instanceof ApiError && cause.code === 'UNAUTHENTICATED') navigate('/login');
        else setLoadError(message(cause));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const isMock = draft.endpointId === 'mock';
  const originalEndpoint = editing?.endpoint_id.startsWith('custom-') ? 'custom' : editing?.endpoint_id;
  const endpointChanged =
    editing !== null &&
    (draft.endpointId !== originalEndpoint ||
      (draft.endpointId === 'custom' && draft.baseUrl.replace(/\/+$/, '') !== editing.base_url.replace(/\/+$/, '')));
  const needsKey = !isMock && (!editing?.has_credential || endpointChanged);
  const cannotSave = !isMock && !credentialsAvailable && (needsKey || !!draft.apiKey);

  function reset() {
    setEditing(null);
    setDraft(emptyDraft());
    setError('');
    setShowApiKey(false);
    setSelectedPresetId('openai');
  }

  function edit(profile: ModelProfile) {
    setEditing(profile);
    const endpointId = profile.endpoint_id.startsWith('custom-') ? 'custom' : profile.endpoint_id;
    setDraft({
      name: profile.name,
      endpointId,
      baseUrl: profile.base_url,
      modelId: profile.model_id,
      apiKey: '',
      temperature: typeof profile.parameters?.temperature === 'number' ? profile.parameters.temperature : '',
      maxOutputTokens: typeof profile.parameters?.maxOutputTokens === 'number' ? profile.parameters.maxOutputTokens : '',
      enabled: profile.enabled ?? true,
    });
    setError('');
    setNotice('');
    setDeleteId(null);
    setShowApiKey(false);
    if (profile.parameters?.temperature !== undefined || profile.parameters?.maxOutputTokens !== undefined) {
      setShowAdvanced(true);
    }
    const detected = detectProvider(profile.endpoint_id, profile.base_url);
    setSelectedPresetId(detected?.id ?? null);

    nameInput.current?.focus();
    formSectionRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }

  function clone(profile: ModelProfile) {
    setEditing(null);
    const endpointId = profile.endpoint_id.startsWith('custom-') ? 'custom' : profile.endpoint_id;
    setDraft({
      name: `${profile.name} (副本)`,
      endpointId,
      baseUrl: profile.base_url,
      modelId: profile.model_id,
      apiKey: '',
      temperature: typeof profile.parameters?.temperature === 'number' ? profile.parameters.temperature : '',
      maxOutputTokens: typeof profile.parameters?.maxOutputTokens === 'number' ? profile.parameters.maxOutputTokens : '',
      enabled: profile.enabled ?? true,
    });
    setError('');
    setNotice(`已基于「${profile.name}」载入配置，请设置新名称并保存。`);
    setDeleteId(null);
    setShowApiKey(false);
    if (profile.parameters?.temperature !== undefined || profile.parameters?.maxOutputTokens !== undefined) {
      setShowAdvanced(true);
    }
    const detected = detectProvider(profile.endpoint_id, profile.base_url);
    setSelectedPresetId(detected?.id ?? null);

    nameInput.current?.focus();
    formSectionRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }

  function applyPreset(preset: ProviderPreset) {
    setSelectedPresetId(preset.id);
    setDraft(current => {
      const isDefaultName = !current.name || PROVIDER_PRESETS.some(p => current.name.startsWith(p.shortName) || current.name.startsWith(p.name));
      return {
        ...current,
        name: isDefaultName ? `${preset.shortName} 推荐配置` : current.name,
        endpointId: preset.endpointId,
        baseUrl: preset.baseUrl,
        modelId: preset.defaultModelId,
        temperature: preset.defaultTemperature,
        maxOutputTokens: preset.defaultMaxTokens,
      };
    });
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy('save');
    setError('');
    setNotice('');
    try {
      const parameters: Record<string, number> = {};
      if (typeof draft.temperature === 'number') {
        parameters.temperature = draft.temperature;
      }
      if (typeof draft.maxOutputTokens === 'number') {
        parameters.maxOutputTokens = draft.maxOutputTokens;
      }

      const body = {
        name: draft.name.trim(),
        endpointId: draft.endpointId,
        modelId: draft.modelId.trim(),
        parameters,
        enabled: draft.enabled,
        ...(draft.endpointId === 'custom' ? { baseUrl: draft.baseUrl.trim() } : {}),
        ...(!isMock && draft.apiKey.trim() ? { apiKey: draft.apiKey.trim() } : {}),
      };

      const saved = editing
        ? await api.updateModelProfile(editing.id, { ...body, expectedVersion: editing.profile_version })
        : await api.createModelProfile(body);

      const name = draft.name;
      reset();
      setResults(current => ({ ...current, [saved.id]: { success: '配置已保存，尚未测试连接' } }));
      setNotice(`已保存「${name}」。可在下方测试连接或继续编辑。`);
      try {
        setProfiles(await api.modelProfiles());
      } catch {
        setError('保存已成功，但列表刷新失败，请刷新页面查看。');
      }
    } catch (cause) {
      setError(message(cause));
    } finally {
      setBusy('');
    }
  }

  async function action(profile: ModelProfile, kind: 'test' | 'delete' | 'revoke') {
    setBusy(`${kind}:${profile.id}`);
    setResults(current => ({ ...current, [profile.id]: {} }));
    const startTime = performance.now();
    try {
      if (kind === 'test') {
        const result = await api.testModelProfile(profile.id);
        const elapsed = Math.round(performance.now() - startTime);
        const successText =
          result.kind === 'mock'
            ? `模拟连接测试通过`
            : `真实服务连接测试通过`;
        setResults(current => ({
          ...current,
          [profile.id]: {
            success: successText,
            latencyMs: elapsed,
          },
        }));
      } else {
        if (kind === 'delete') {
          await api.deleteModelProfile(profile.id);
        } else {
          await api.revokeModelCredential(profile.id);
        }
        if (editing?.id === profile.id) reset();
        setDeleteId(null);
        setProfiles(await api.modelProfiles());
        setNotice(
          kind === 'delete'
            ? `已删除「${profile.name}」`
            : `已撤销「${profile.name}」的密钥，可通过编辑重新填写。`,
        );
      }
    } catch (cause) {
      setResults(current => ({
        ...current,
        [profile.id]: { error: message(cause) },
      }));
    } finally {
      setBusy('');
    }
  }

  // Filter profiles based on search and pill
  const filteredProfiles = profiles.filter(profile => {
    if (filterType === 'real' && profile.endpoint_id === 'mock') return false;
    if (filterType === 'mock' && profile.endpoint_id !== 'mock') return false;
    if (filterType === 'uncredentialed' && (profile.has_credential || profile.endpoint_id === 'mock')) return false;

    if (!searchQuery.trim()) return true;
    const query = searchQuery.trim().toLowerCase();
    return (
      profile.name.toLowerCase().includes(query) ||
      profile.model_id.toLowerCase().includes(query) ||
      profile.base_url.toLowerCase().includes(query)
    );
  });

  // Calculate metrics
  const totalCount = profiles.length;
  const readyCount = profiles.filter(p => p.has_credential || p.endpoint_id === 'mock').length;
  const realCount = profiles.filter(p => p.endpoint_id !== 'mock').length;
  const mockCount = profiles.filter(p => p.endpoint_id === 'mock').length;

  const currentPreset =
    selectedPresetId ? PROVIDER_PRESETS.find(p => p.id === selectedPresetId) : null;
  const availablePresetModels: PresetModel[] = currentPreset?.models ?? [];

  return (
    <div className="model-settings-shell">
      {/* Page Header */}
      <section className="page-heading model-page-header">
        <div>
          <p className="eyebrow">个人设置 · AI 推理中心</p>
          <h1>模型配置</h1>
          <p>配置大语言模型推理端点与密钥，为对局注入高智能 AI 玩家。支持 DeepSeek、OpenAI、通义千问等主流服务商及沙盒模拟。</p>
          <p className="muted">保存不会调用模型；点击“测试连接”会发送一次简短请求，可能产生服务商少量费用。</p>
        </div>
      </section>

      {/* Global Status Notices */}
      {!credentialsAvailable && (
        <p className="error-notice" role="alert">
          服务器尚未启用密钥加密，请联系管理员配置后使用真实模型。模拟模型仍可使用。
        </p>
      )}
      {notice && <p role="status">{notice}</p>}

      {/* Metrics Banner */}
      {!loading && !loadError && (
        <div className="model-metrics-grid">
          <div className="model-metric-card">
            <div className="model-metric-icon">🧩</div>
            <div className="model-metric-info">
              <span className="model-metric-val">{totalCount}</span>
              <span className="model-metric-label">已配置模型</span>
            </div>
          </div>
          <div className="model-metric-card">
            <div className="model-metric-icon">🟢</div>
            <div className="model-metric-info">
              <span className="model-metric-val">{readyCount}</span>
              <span className="model-metric-label">就绪可用</span>
            </div>
          </div>
          <div className="model-metric-card">
            <div className="model-metric-icon">⚡</div>
            <div className="model-metric-info">
              <span className="model-metric-val">{realCount}</span>
              <span className="model-metric-label">真实云端模型</span>
            </div>
          </div>
          <div className="model-metric-card">
            <div className="model-metric-icon">🧪</div>
            <div className="model-metric-info">
              <span className="model-metric-val">{mockCount}</span>
              <span className="model-metric-label">内置模拟沙盒</span>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <p role="status">正在加载模型设置…</p>
      ) : loadError ? (
        <section className="panel">
          <p role="alert">加载失败：{loadError}</p>
          <button onClick={() => location.reload()}>重新加载</button>
        </section>
      ) : (
        <div className="model-workbench">
          {/* LEFT COLUMN: Saved Profiles Directory */}
          <section className="model-directory">
            <div className="model-directory-header">
              <h2>
                <span>已保存配置</span>
                <span className="model-count-badge">{filteredProfiles.length}</span>
              </h2>
              <button
                type="button"
                className="secondary model-btn-sm"
                onClick={() => {
                  reset();
                  nameInput.current?.focus();
                  formSectionRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
                }}
              >
                + 新增配置
              </button>
            </div>

            {/* Toolbar: Search and Filter Pills */}
            <div className="model-toolbar">
              <div className="model-search-box">
                <span className="model-search-icon">🔍</span>
                <input
                  type="search"
                  className="model-search-input"
                  placeholder="搜索模型名称、ID 或端点…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="model-filter-pills">
                <button
                  type="button"
                  className={`model-filter-pill ${filterType === 'all' ? 'active' : ''}`}
                  onClick={() => setFilterType('all')}
                >
                  全部 ({profiles.length})
                </button>
                <button
                  type="button"
                  className={`model-filter-pill ${filterType === 'real' ? 'active' : ''}`}
                  onClick={() => setFilterType('real')}
                >
                  云端模型 ({realCount})
                </button>
                <button
                  type="button"
                  className={`model-filter-pill ${filterType === 'mock' ? 'active' : ''}`}
                  onClick={() => setFilterType('mock')}
                >
                  模拟沙盒 ({mockCount})
                </button>
                <button
                  type="button"
                  className={`model-filter-pill ${filterType === 'uncredentialed' ? 'active' : ''}`}
                  onClick={() => setFilterType('uncredentialed')}
                >
                  待配密钥 ({profiles.filter(p => !p.has_credential && p.endpoint_id !== 'mock').length})
                </button>
              </div>
            </div>

            {/* Cards List */}
            <div className="model-cards-list">
              {profiles.length === 0 ? (
                <div className="model-empty-state">
                  <span className="model-empty-icon">🤖</span>
                  <p style={{ fontWeight: 700, fontSize: 16, margin: 0 }}>尚未保存模型配置。</p>
                  <p className="muted" style={{ margin: 0 }}>
                    在右侧选择 DeepSeek、OpenAI 或内置模拟，一键添加你的第一个模型配置。
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      if (PROVIDER_PRESETS[0]) applyPreset(PROVIDER_PRESETS[0]);
                      nameInput.current?.focus();
                    }}
                  >
                    🚀 一键添加 DeepSeek 配置
                  </button>
                </div>
              ) : filteredProfiles.length === 0 ? (
                <div className="model-empty-state">
                  <span className="model-empty-icon">🔍</span>
                  <p style={{ fontWeight: 700, fontSize: 16, margin: 0 }}>未找到匹配的模型</p>
                  <p className="muted">尝试更换关键词或清除筛选标签。</p>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => {
                      setSearchQuery('');
                      setFilterType('all');
                    }}
                  >
                    重置筛选条件
                  </button>
                </div>
              ) : (
                filteredProfiles.map(profile => {
                  const detected = detectProvider(profile.endpoint_id, profile.base_url);
                  const isMockItem = profile.endpoint_id === 'mock';
                  const isCurrentEditing = editing?.id === profile.id;
                  const res = results[profile.id];

                  return (
                    <article
                      className={`panel model-profile ${isCurrentEditing ? 'is-editing' : ''}`}
                      key={profile.id}
                    >
                      {/* Top Brand & Status Line */}
                      <div className="model-profile-top">
                        <div className="model-profile-brand">
                          <span
                            className="model-brand-avatar"
                            style={{ borderColor: detected?.color ? `${detected.color}40` : undefined }}
                          >
                            {detected?.icon ?? '🧩'}
                          </span>
                          <div className="model-title-group">
                            <h3>{profile.name}</h3>
                            <div className="model-profile-meta">
                              <span>{detected?.shortName ?? 'OpenAI 兼容'}</span>
                              <span>•</span>
                              <span>{isMockItem ? '沙盒环境' : 'HTTPS 端点'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Status Badge */}
                        {isMockItem ? (
                          <span className="model-status-badge status-mock">🧪 模拟免密</span>
                        ) : profile.has_credential ? (
                          <span className="model-status-badge status-ready">🟢 凭证就绪</span>
                        ) : (
                          <span className="model-status-badge status-missing-key">🟡 待配 API Key</span>
                        )}
                      </div>

                      {/* Technical Details Box */}
                      <div className="model-profile-details">
                        <div className="model-detail-row">
                          <p style={{ margin: 0, fontWeight: 600 }}>
                            {profile.model_id} · 版本 {profile.profile_version}
                          </p>
                          <div className="model-chips-row">
                            {typeof profile.parameters?.temperature === 'number' && (
                              <span className="model-chip" title="采样温度">
                                🌡️ {profile.parameters.temperature}
                              </span>
                            )}
                            {typeof profile.parameters?.maxOutputTokens === 'number' && (
                              <span className="model-chip" title="最大输出 Token">
                                📏 {profile.parameters.maxOutputTokens}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Endpoint URL */}
                        <p className="muted model-endpoint-url" title={profile.base_url}>
                          {isMockItem ? '沙盒内置虚拟环境（无需公网调用）' : profile.base_url}
                        </p>

                        <p className="model-credential-line">
                          {profile.endpoint_id === 'mock'
                            ? '未配置凭证 · 模拟模型无需密钥'
                            : profile.has_credential
                            ? '凭证已配置'
                            : '未配置凭证，请编辑并填写 API key'}
                        </p>
                      </div>

                      {/* Actions Bar */}
                      <div className="model-actions">
                        <button
                          className="secondary model-btn-sm"
                          disabled={
                            !!busy ||
                            (profile.endpoint_id !== 'mock' &&
                              (!profile.has_credential || !credentialsAvailable))
                          }
                          onClick={() => void action(profile, 'test')}
                        >
                          {busy === `test:${profile.id}` ? '测试中…' : '测试连接'}
                        </button>
                        <button
                          className="secondary model-btn-sm"
                          disabled={!!busy}
                          onClick={() => edit(profile)}
                        >
                          编辑
                        </button>
                        <button
                          type="button"
                          className="secondary model-btn-sm"
                          disabled={!!busy}
                          onClick={() => clone(profile)}
                          title="基于此配置创建副本"
                        >
                          复制
                        </button>
                        {profile.has_credential && (
                          <button
                            className="secondary model-btn-sm"
                            disabled={!!busy}
                            onClick={() => void action(profile, 'revoke')}
                          >
                            撤销凭证
                          </button>
                        )}
                        <button
                          className="secondary model-btn-sm model-btn-danger"
                          disabled={!!busy}
                          onClick={() => setDeleteId(profile.id)}
                        >
                          删除
                        </button>
                      </div>

                      {/* Delete Confirmation Box */}
                      {deleteId === profile.id && (
                        <div className="model-delete-box">
                          <p>
                            确定删除「{profile.name}」？密钥也会撤销。正在使用此配置的对局请先收回控制。
                          </p>
                          <div className="model-actions">
                            <button
                              className="model-btn-sm"
                              disabled={!!busy}
                              onClick={() => void action(profile, 'delete')}
                            >
                              确认删除
                            </button>
                            <button
                              type="button"
                              className="secondary model-btn-sm"
                              disabled={!!busy}
                              onClick={() => setDeleteId(null)}
                            >
                              取消删除
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Test or Operation Results */}
                      {res?.error && (
                        <div className="model-result-box is-error">
                          <span>⚠️</span>
                          <p className="error-notice" role="alert" style={{ margin: 0, padding: 0, background: 'none' }}>
                            {res.error}
                          </p>
                        </div>
                      )}
                      {res?.success && (
                        <div className="model-result-box is-success">
                          <span>✅</span>
                          <p role="status" style={{ margin: 0 }}>
                            {res.success}
                            {res.latencyMs !== undefined ? ` (${res.latencyMs}ms)` : ''}
                          </p>
                        </div>
                      )}
                    </article>
                  );
                })
              )}
            </div>
          </section>

          {/* RIGHT COLUMN: Configuration Workbench / Editor */}
          <section className="panel model-editor-panel" ref={formSectionRef}>
            <div className="model-editor-header">
              <h2>
                <span>{editing ? `编辑「${editing.name}」` : '新增配置'}</span>
                <span className="model-editor-mode-badge">{editing ? '编辑模式' : '新建模式'}</span>
              </h2>
              {editing && (
                <button type="button" className="secondary model-btn-sm" onClick={reset}>
                  切换新建
                </button>
              )}
            </div>

            {/* Quick Provider Presets Grid (shown when creating or freely tweaking) */}
            <div className="provider-presets-section">
              <div className="provider-presets-label">
                <span>🚀 快捷厂商模板推荐</span>
                <span className="muted" style={{ fontSize: 11, textTransform: 'none' }}>
                  点击即可一键填入端点与模型
                </span>
              </div>
              <div className="provider-presets-grid">
                {PROVIDER_PRESETS.map(preset => (
                  <button
                    key={preset.id}
                    type="button"
                    className={`provider-preset-btn ${selectedPresetId === preset.id ? 'is-active' : ''}`}
                    onClick={() => applyPreset(preset)}
                    disabled={!!busy}
                  >
                    <div className="provider-preset-top">
                      <span className="provider-preset-icon">{preset.icon}</span>
                      <span className="provider-preset-tag">{preset.tag}</span>
                    </div>
                    <span className="provider-preset-name">{preset.shortName}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Main Form */}
            <form className="form-stack" onSubmit={save}>
              <label>
                配置名称
                <input
                  ref={nameInput}
                  name="name"
                  maxLength={60}
                  placeholder="例如：主力推理 DeepSeek-V3"
                  value={draft.name}
                  onChange={e => setDraft({ ...draft, name: e.target.value })}
                  disabled={!!busy}
                  required
                />
              </label>

              <label>
                服务端点
                <select
                  value={draft.endpointId}
                  onChange={e => {
                    const epId = e.target.value;
                    const detected = PROVIDER_PRESETS.find(p => p.endpointId === epId);
                    setSelectedPresetId(detected?.id ?? null);
                    setDraft({ ...draft, endpointId: epId, apiKey: '' });
                  }}
                  disabled={!!busy}
                  required
                >
                  {endpoints.map(endpoint => (
                    <option key={endpoint.id} value={endpoint.id}>
                      {endpoint.name}
                      {endpoint.protocol === 'mock' ? '（模拟，不调用真实模型）' : ''}
                    </option>
                  ))}
                  <option value="custom">自定义 OpenAI 兼容服务</option>
                </select>
              </label>

              {draft.endpointId === 'custom' && (
                <label>
                  Base URL（HTTPS）
                  <input
                    name="baseUrl"
                    type="url"
                    placeholder="https://api.example.com/v1"
                    value={draft.baseUrl}
                    onChange={e => {
                      const url = e.target.value;
                      const detected = detectProvider('custom', url);
                      if (detected) setSelectedPresetId(detected.id);
                      setDraft({ ...draft, baseUrl: url });
                    }}
                    disabled={!!busy}
                    required
                  />
                  <span className="muted model-field-hint">
                    填写服务商提供的 API 基础地址（通常以 /v1 结尾）。仅支持公网 HTTPS 协议。
                  </span>
                </label>
              )}

              <label>
                模型标识
                <input
                  name="modelId"
                  list="model-id-suggestions"
                  placeholder="例如：deepseek-chat 或 gpt-4o-mini"
                  value={draft.modelId}
                  onChange={e => setDraft({ ...draft, modelId: e.target.value })}
                  disabled={!!busy}
                  maxLength={120}
                  required
                />
                <datalist id="model-id-suggestions">
                  {availablePresetModels.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                  <option value="deepseek-chat">DeepSeek-V3</option>
                  <option value="deepseek-reasoner">DeepSeek-R1 (深度思考)</option>
                  <option value="gpt-4o-mini">GPT-4o Mini</option>
                  <option value="gpt-4o">GPT-4o</option>
                  <option value="qwen-plus">通义千问 Plus</option>
                  <option value="glm-4-flash">智谱 GLM-4 Flash</option>
                  <option value="moonshot-v1-8k">Kimi Moonshot 8k</option>
                  <option value="mock-v1">Mock V1 沙盒模型</option>
                </datalist>
                {/* Quick Model Chips */}
                {availablePresetModels.length > 0 && (
                  <div className="model-suggest-chips">
                    {availablePresetModels.map(m => (
                      <button
                        key={m.id}
                        type="button"
                        className={`model-suggest-chip ${draft.modelId === m.id ? 'is-active' : ''}`}
                        onClick={() => setDraft(cur => ({ ...cur, modelId: m.id }))}
                      >
                        {m.label} ({m.id})
                      </button>
                    ))}
                  </div>
                )}
                <span className="muted model-field-hint">
                  须与服务商提供的 model ID 完全一致，并支持 Chat Completions 协议。
                </span>
              </label>

              <label>
                API key（仅写入，不会回显）
                <div className="api-key-input-wrapper">
                  <input
                    name="apiKey"
                    type={showApiKey ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={draft.apiKey}
                    onChange={e => setDraft({ ...draft, apiKey: e.target.value })}
                    minLength={8}
                    maxLength={4096}
                    disabled={!!busy || isMock || !credentialsAvailable}
                    required={needsKey}
                    placeholder={
                      editing?.has_credential && !endpointChanged
                        ? '留空保留已保存的密钥'
                        : '填写此服务商的 API key'
                    }
                  />
                  <div className="api-key-actions">
                    {draft.apiKey && (
                      <button
                        type="button"
                        className="api-key-toggle-btn"
                        onClick={() => setDraft({ ...draft, apiKey: '' })}
                        title="清空输入"
                      >
                        ✕
                      </button>
                    )}
                    <button
                      type="button"
                      className="api-key-toggle-btn"
                      onClick={() => setShowApiKey(v => !v)}
                      title={showApiKey ? '隐藏明文' : '查看明文'}
                    >
                      {showApiKey ? '🙈 隐藏' : '👁️ 显示'}
                    </button>
                  </div>
                </div>
              </label>

              {editing?.has_credential && !endpointChanged && !draft.apiKey && (
                <div className="model-security-tag">
                  <span>🔒</span>
                  <span>已保存安全凭证（仅可覆盖，系统永不回显明文）。若不需要更换，请直接留空。</span>
                </div>
              )}

              {currentPreset?.websiteUrl && !isMock && (
                <div className="model-field-hint" style={{ fontSize: 12 }}>
                  💡 {currentPreset.keyHelpText}，前往{' '}
                  <a href={currentPreset.websiteUrl} target="_blank" rel="noopener noreferrer">
                    {currentPreset.websiteName ?? '服务商平台'} ↗
                  </a>
                </div>
              )}

              {endpointChanged && !isMock && (
                <p className="muted" style={{ color: '#f59e0b' }}>
                  ⚠️ 更换服务地址后需要重新填写密钥。
                </p>
              )}
              {isMock && (
                <p className="muted" style={{ color: '#10b981' }}>
                  🧪 模拟模型无需密钥，由平台沙盒内置驱动，仅用于验证平台与对局流程。
                </p>
              )}

              {/* Advanced Reasoning Parameters Accordion */}
              <div className="model-advanced-box">
                <div
                  className="model-advanced-toggle"
                  onClick={() => setShowAdvanced(v => !v)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && setShowAdvanced(v => !v)}
                >
                  <span>⚙️ 高级推理参数配置 (可选)</span>
                  <span>{showAdvanced ? '▲ 收起' : '▼ 展开'}</span>
                </div>

                {showAdvanced && (
                  <div className="model-advanced-content">
                    <label className="model-switch-label">
                      <input
                        type="checkbox"
                        checked={draft.enabled}
                        onChange={e => setDraft({ ...draft, enabled: e.target.checked })}
                        disabled={!!busy}
                      />
                      <span>启用此模型配置（允许在房间和对局中指派给玩家座位）</span>
                    </label>

                    <div className="model-slider-control">
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                        <strong>Temperature (采样温度)</strong>
                        <span className="muted">
                          {typeof draft.temperature === 'number' ? draft.temperature.toFixed(2) : '默认 (0.5)'}
                        </span>
                      </div>
                      <div className="model-slider-row">
                        <input
                          type="range"
                          min="0"
                          max="2"
                          step="0.05"
                          value={typeof draft.temperature === 'number' ? draft.temperature : 0.5}
                          onChange={e => setDraft({ ...draft, temperature: parseFloat(e.target.value) })}
                          disabled={!!busy}
                        />
                        <input
                          type="number"
                          min="0"
                          max="2"
                          step="0.05"
                          value={draft.temperature}
                          placeholder="0.5"
                          onChange={e => {
                            const val = e.target.value === '' ? '' : parseFloat(e.target.value);
                            setDraft({ ...draft, temperature: val });
                          }}
                          disabled={!!busy}
                        />
                      </div>
                      <span className="muted model-field-hint">
                        较低值（0.1~0.4）更专注守序，适合棋盘策略推理；较高值（0.8+）更富变化。
                      </span>
                    </div>

                    <div className="model-slider-control">
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                        <strong>Max Output Tokens (最大输出上限)</strong>
                        <span className="muted">
                          {typeof draft.maxOutputTokens === 'number' ? `${draft.maxOutputTokens} tokens` : '默认 (256)'}
                        </span>
                      </div>
                      <div className="model-slider-row">
                        <input
                          type="range"
                          min="16"
                          max="512"
                          step="16"
                          value={typeof draft.maxOutputTokens === 'number' ? draft.maxOutputTokens : 256}
                          onChange={e => setDraft({ ...draft, maxOutputTokens: parseInt(e.target.value, 10) })}
                          disabled={!!busy}
                        />
                        <input
                          type="number"
                          min="16"
                          max="512"
                          step="16"
                          value={draft.maxOutputTokens}
                          placeholder="256"
                          onChange={e => {
                            const val = e.target.value === '' ? '' : parseInt(e.target.value, 10);
                            setDraft({ ...draft, maxOutputTokens: val });
                          }}
                          disabled={!!busy}
                        />
                      </div>
                      <span className="muted model-field-hint">
                        控制单步动作生成的最大 Token 数（16 ~ 512）。桌游动作建议保持在 128~256，既快又省费用。
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <p className="error-notice" role="alert">
                  {error}
                </p>
              )}

              <div className="model-actions" style={{ marginTop: 12 }}>
                <button disabled={!!busy || cannotSave}>
                  {busy === 'save' ? '保存中…' : editing ? '保存修改' : '保存配置'}
                </button>
                {editing && (
                  <button type="button" className="secondary" disabled={!!busy} onClick={reset}>
                    取消编辑
                  </button>
                )}
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
