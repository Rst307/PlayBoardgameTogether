export type PresetModel = {
  id: string;
  label: string;
  tag?: string;
};

export type ProviderPreset = {
  id: string;
  name: string;
  shortName: string;
  tag: string;
  icon: string;
  description: string;
  endpointId: string;
  baseUrl: string;
  defaultModelId: string;
  models: PresetModel[];
  defaultTemperature: number;
  defaultMaxTokens: number;
  websiteUrl?: string;
  websiteName?: string;
  keyHelpText: string;
  color: string;
};

export const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    id: 'deepseek',
    name: 'DeepSeek (深度求索)',
    shortName: 'DeepSeek',
    tag: '强烈推荐',
    icon: '🐳',
    description: '国产顶尖大模型，超强逻辑推理与博弈决策，极致性价比',
    endpointId: 'custom',
    baseUrl: 'https://api.deepseek.com/v1',
    defaultModelId: 'deepseek-chat',
    models: [
      { id: 'deepseek-chat', label: 'DeepSeek-V3', tag: '通用对局首选' },
      { id: 'deepseek-reasoner', label: 'DeepSeek-R1', tag: '慢思考深度推理' },
    ],
    defaultTemperature: 0.3,
    defaultMaxTokens: 256,
    websiteUrl: 'https://platform.deepseek.com',
    websiteName: 'DeepSeek 开放平台',
    keyHelpText: '在 DeepSeek 平台创建以 sk- 开头的 API Key',
    color: '#0ea5e9',
  },
  {
    id: 'openai',
    name: 'OpenAI 官方',
    shortName: 'OpenAI',
    tag: '官方直连',
    icon: '🟢',
    description: '国际主流标准，GPT-4o 系列敏捷规范，出牌判断沉稳',
    endpointId: 'openai',
    baseUrl: '',
    defaultModelId: 'gpt-4o-mini',
    models: [
      { id: 'gpt-4o-mini', label: 'GPT-4o Mini', tag: '极速高性价比' },
      { id: 'gpt-4o', label: 'GPT-4o 全功能', tag: '复杂大局观' },
      { id: 'o3-mini', label: 'o3-mini 推理', tag: '新一代推理' },
    ],
    defaultTemperature: 0.5,
    defaultMaxTokens: 256,
    websiteUrl: 'https://platform.openai.com',
    websiteName: 'OpenAI 控制台',
    keyHelpText: '在 OpenAI Platform 创建 Project API key',
    color: '#10b981',
  },
  {
    id: 'qwen',
    name: '通义千问 (阿里百炼)',
    shortName: '通义千问',
    tag: '阿里云高并发',
    icon: '☁️',
    description: '阿里百炼兼容接口，中文理解深刻，规则遵从与长思考扎实',
    endpointId: 'custom',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    defaultModelId: 'qwen-plus',
    models: [
      { id: 'qwen-plus', label: 'Qwen Plus', tag: '全面均衡' },
      { id: 'qwen-turbo', label: 'Qwen Turbo', tag: '秒级出牌' },
      { id: 'qwen-max', label: 'Qwen Max', tag: '旗舰深思' },
    ],
    defaultTemperature: 0.5,
    defaultMaxTokens: 256,
    websiteUrl: 'https://bailian.console.aliyun.com',
    websiteName: '阿里百炼控制台',
    keyHelpText: '在阿里云百炼创建 API-KEY',
    color: '#6366f1',
  },
  {
    id: 'zhipu',
    name: '智谱 AI (GLM-4)',
    shortName: '智谱 GLM',
    tag: '清华基座',
    icon: '⚡',
    description: '清华自研基座模型，提供超高速 GLM-4-Flash 极速对弈',
    endpointId: 'custom',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    defaultModelId: 'glm-4-flash',
    models: [
      { id: 'glm-4-flash', label: 'GLM-4 Flash', tag: '超快低成本' },
      { id: 'glm-4-plus', label: 'GLM-4 Plus', tag: '高阶智商' },
      { id: 'glm-4-air', label: 'GLM-4 Air', tag: '性价比旗舰' },
    ],
    defaultTemperature: 0.5,
    defaultMaxTokens: 256,
    websiteUrl: 'https://bigmodel.cn',
    websiteName: '智谱大模型开放平台',
    keyHelpText: '在智谱开放平台创建 API Key',
    color: '#3b82f6',
  },
  {
    id: 'moonshot',
    name: 'Kimi (月之暗面)',
    shortName: 'Kimi',
    tag: '长思维链',
    icon: '🌙',
    description: '长上下文与细致推导能力优秀，适合多回合博弈信息推演',
    endpointId: 'custom',
    baseUrl: 'https://api.moonshot.cn/v1',
    defaultModelId: 'moonshot-v1-8k',
    models: [
      { id: 'moonshot-v1-8k', label: 'Moonshot 8k', tag: '标准推荐' },
      { id: 'moonshot-v1-32k', label: 'Moonshot 32k', tag: '长记性增强' },
    ],
    defaultTemperature: 0.3,
    defaultMaxTokens: 256,
    websiteUrl: 'https://platform.moonshot.cn',
    websiteName: 'Moonshot 开放平台',
    keyHelpText: '在 Moonshot Platform 创建以 sk- 开头的 API Key',
    color: '#8b5cf6',
  },
  {
    id: 'siliconflow',
    name: '硅基流动 (SiliconFlow)',
    shortName: '硅基流动',
    tag: '开源聚合',
    icon: '🌊',
    description: '一站式高并发托管 DeepSeek、Qwen 等开源顶尖权重',
    endpointId: 'custom',
    baseUrl: 'https://api.siliconflow.cn/v1',
    defaultModelId: 'deepseek-ai/DeepSeek-V3',
    models: [
      { id: 'deepseek-ai/DeepSeek-V3', label: 'DeepSeek-V3 (硅基版)', tag: '高并发首选' },
      { id: 'deepseek-ai/DeepSeek-R1', label: 'DeepSeek-R1 (硅基版)', tag: '深度思考' },
      { id: 'Qwen/Qwen2.5-7B-Instruct', label: 'Qwen 2.5 7B', tag: '开源轻快' },
    ],
    defaultTemperature: 0.5,
    defaultMaxTokens: 256,
    websiteUrl: 'https://cloud.siliconflow.cn',
    websiteName: '硅基流动控制台',
    keyHelpText: '在 SiliconFlow 控制台创建以 sk- 开头的 API Key',
    color: '#06b6d4',
  },
  {
    id: 'ollama',
    name: 'Ollama 本地模型',
    shortName: 'Ollama 本地',
    tag: '私有离线',
    icon: '🦙',
    description: '本地独立运行开源模型，完全离线、零外部流量依赖',
    endpointId: 'custom',
    baseUrl: 'https://localhost:11434/v1',
    defaultModelId: 'qwen2.5',
    models: [
      { id: 'qwen2.5', label: 'Qwen 2.5', tag: '通用优选' },
      { id: 'llama3.1', label: 'Llama 3.1', tag: 'Meta 旗舰' },
      { id: 'deepseek-r1:7b', label: 'DeepSeek-R1 7B', tag: '本地轻量' },
    ],
    defaultTemperature: 0.6,
    defaultMaxTokens: 256,
    websiteUrl: 'https://ollama.com',
    websiteName: 'Ollama 官方网站',
    keyHelpText: '本地环境若无需认证可输入任意字符（如 ollama-local）',
    color: '#f59e0b',
  },
  {
    id: 'mock',
    name: '平台内置模拟 (Mock)',
    shortName: '内置模拟',
    tag: '免密钥测试',
    icon: '🧪',
    description: '平台原生沙盒模拟，无需任何网络外联与 API Key，专供开发和流程测试',
    endpointId: 'mock',
    baseUrl: '',
    defaultModelId: 'mock-v1',
    models: [
      { id: 'mock-v1', label: 'Mock V1 沙盒模型', tag: '瞬时响应' },
    ],
    defaultTemperature: 0,
    defaultMaxTokens: 64,
    keyHelpText: '模拟沙盒无需 API Key，由系统本地状态机直接出牌',
    color: '#10b981',
  },
];

export function detectProvider(endpointId: string, baseUrl: string): ProviderPreset | null {
  if (endpointId === 'mock') {
    return PROVIDER_PRESETS.find(p => p.id === 'mock') ?? null;
  }
  if (endpointId === 'openai') {
    return PROVIDER_PRESETS.find(p => p.id === 'openai') ?? null;
  }
  const urlLower = (baseUrl || '').toLowerCase();
  if (urlLower.includes('deepseek.com')) {
    return PROVIDER_PRESETS.find(p => p.id === 'deepseek') ?? null;
  }
  if (urlLower.includes('dashscope') || urlLower.includes('aliyun')) {
    return PROVIDER_PRESETS.find(p => p.id === 'qwen') ?? null;
  }
  if (urlLower.includes('bigmodel.cn')) {
    return PROVIDER_PRESETS.find(p => p.id === 'zhipu') ?? null;
  }
  if (urlLower.includes('moonshot.cn')) {
    return PROVIDER_PRESETS.find(p => p.id === 'moonshot') ?? null;
  }
  if (urlLower.includes('siliconflow')) {
    return PROVIDER_PRESETS.find(p => p.id === 'siliconflow') ?? null;
  }
  if (urlLower.includes('ollama') || urlLower.includes('11434')) {
    return PROVIDER_PRESETS.find(p => p.id === 'ollama') ?? null;
  }
  return null;
}
