import { lookup } from 'node:dns/promises';
import { request as httpsRequest } from 'node:https';
import { BlockList } from 'node:net';
import { z } from 'zod';
import { AppError } from './errors.js';

export type ModelChoice={decisionId:string;choiceId:string};
export type ModelReply={choice:ModelChoice;requestId?:string;model?:string;usage:{inputTokens:number|null;outputTokens:number|null};};
const blockedAddresses=new BlockList();
for(const [address,prefix] of [['0.0.0.0',8],['10.0.0.0',8],['100.64.0.0',10],['127.0.0.0',8],['169.254.0.0',16],['172.16.0.0',12],['192.0.0.0',24],['192.0.2.0',24],['192.168.0.0',16],['198.18.0.0',15],['198.51.100.0',24],['203.0.113.0',24],['224.0.0.0',4],['240.0.0.0',4]] as const)blockedAddresses.addSubnet(address,prefix,'ipv4');
for(const [address,prefix] of [['::',128],['::1',128],['64:ff9b::',96],['100::',64],['2001::',23],['2001:db8::',32],['fc00::',7],['fe80::',10],['ff00::',8]] as const)blockedAddresses.addSubnet(address,prefix,'ipv6');
const ipv4MappedAddresses=new BlockList();
ipv4MappedAddresses.addSubnet('::ffff:0:0',96,'ipv6');
type PublicTarget={url:URL;address:string;family:4|6};
export async function resolvePublicHttpsTarget(raw:string):Promise<PublicTarget>{let url:URL;try{url=new URL(raw);}catch{throw new AppError('VALIDATION_ERROR','Base URL 格式无效',400);}if(url.protocol!=='https:'||url.username||url.password||url.hash||url.search||(url.port&&url.port!=='443')||!url.hostname||url.hostname.endsWith('.'))throw new AppError('VALIDATION_ERROR','Base URL 必须是标准端口的公网 HTTPS 地址',400);const hostname=url.hostname.toLowerCase();const addresses=await lookup(hostname,{all:true,verbatim:true}).catch(()=>[]);if(!addresses.length||addresses.some(item=>item.family===4?blockedAddresses.check(item.address,'ipv4'):blockedAddresses.check(item.address,'ipv6')||ipv4MappedAddresses.check(item.address,'ipv6')))throw new AppError('VALIDATION_ERROR','Base URL 解析到不可访问的网络地址',400);url.hostname=hostname;url.port='';url.pathname=url.pathname.replace(/\/+$/,'')||'/';return {url,address:addresses[0]!.address,family:addresses[0]!.family as 4|6};}
export function parseModelChoice(raw:string,decisionId:string,choiceIds:ReadonlySet<string>):ModelChoice {
  if(raw.length>2048)throw new AppError('AI_INVALID_OUTPUT','模型响应格式不符合要求',422);
  const text=raw.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
  let value:unknown;try{value=JSON.parse(text);}catch{throw new AppError('AI_INVALID_OUTPUT','模型响应格式不符合要求',422);}
  const parsed=z.object({decisionId:z.string().min(1).max(100),choiceId:z.string().regex(/^[a-z0-9]{1,12}$/)}).strict().safeParse(value);
  if(!parsed.success||parsed.data.decisionId!==decisionId||!choiceIds.has(parsed.data.choiceId))throw new AppError('AI_INVALID_OUTPUT','模型选择无效',422);
  return parsed.data;
}

export interface ModelAdapter {readonly kind:'real'|'mock';decide(input:{endpoint:string;model:string;apiKey:string;decisionId:string;choices:{id:string;description:string}[];rules:string;view:unknown;timeoutMs:number},signal:AbortSignal):Promise<{raw:string;requestId?:string;model?:string;inputTokens:number|null;outputTokens:number|null}>;}
function providerFailure(status: number | undefined) {
  const messages: Record<number, string> = {
    400: '模型服务拒绝请求（HTTP 400），请检查模型标识与 Chat Completions 参数兼容性',
    401: 'API key 无效或已过期（HTTP 401），请编辑配置并更新密钥',
    403: '模型服务拒绝访问（HTTP 403），请检查密钥权限或服务商访问限制',
    404: '接口路径或模型标识不存在（HTTP 404），请核对 Base URL 和模型标识',
    429: '模型服务限流或额度不足（HTTP 429），请检查余额、配额后重试',
  };
  return new AppError('AI_PROVIDER_FAILED', messages[status ?? 0] ?? `模型服务暂不可用（HTTP ${status ?? '未知'}），请稍后重试`, 503, status === 429 || (status ?? 0) >= 500);
}

const providerReplySchema = z.object({
  id: z.string().optional(), model: z.string().optional(),
  choices: z.array(z.object({ message: z.object({ content: z.string() }) })).min(1),
  usage: z.object({ prompt_tokens: z.number().int().nonnegative().nullable().optional(), completion_tokens: z.number().int().nonnegative().nullable().optional() }).optional(),
});

export class OpenAiChatAdapter implements ModelAdapter {
  readonly kind = 'real' as const;

  async decide(input: Parameters<ModelAdapter['decide']>[0], signal: AbortSignal) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), input.timeoutMs);
    const abort = () => controller.abort();
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) controller.abort();
    try {
      const target = await resolvePublicHttpsTarget(input.endpoint);
      const url = new URL(target.url);
      if (!url.pathname.endsWith('/chat/completions')) {
        url.pathname = `${url.pathname.replace(/\/+$/, '')}/chat/completions`;
      }
      const payload = JSON.stringify({
        model: input.model, max_tokens: 512, stream: false,
        messages: [
          { role: 'system', content: `选择一个给定 choiceId，只输出 JSON {"decisionId":"${input.decisionId}","choiceId":"..."}。规则：${input.rules}` },
          { role: 'user', content: JSON.stringify({ decisionId: input.decisionId, view: input.view, choices: input.choices }) },
        ],
      });
      const body = await new Promise<unknown>((resolve, reject) => {
        const req = httpsRequest(url, {
          method: 'POST', servername: url.hostname,
          // Node 22 uses all:true when selecting an address family. Never re-resolve the host here.
          lookup: (_host, options, callback) => {
            if (options.all) callback(null, [{ address: target.address, family: target.family }]);
            else callback(null, target.address, target.family);
          },
          headers: { authorization: `Bearer ${input.apiKey}`, 'content-type': 'application/json', 'content-length': Buffer.byteLength(payload) },
          signal: controller.signal,
        }, response => {
          if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400) {
            response.resume();
            reject(new AppError('AI_PROVIDER_FAILED', '模型服务重定向已拒绝，请填写最终服务地址', 503));
            return;
          }
          const chunks: Buffer[] = [];
          let size = 0;
          response.on('error', reject);
          response.on('aborted', () => reject(new AppError('AI_PROVIDER_FAILED', '模型服务中断响应，请重试', 503, true)));
          response.on('data', (chunk: Buffer) => {
            size += chunk.length;
            if (size > 65536) { req.destroy(new AppError('AI_PROVIDER_FAILED', '模型响应过大', 503)); return; }
            chunks.push(chunk);
          });
          response.on('end', () => {
            if (!response.statusCode || response.statusCode < 200 || response.statusCode >= 300) {
              reject(providerFailure(response.statusCode));
              return;
            }
            try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
            catch { reject(new AppError('AI_PROVIDER_FAILED', '模型服务未返回 JSON，请检查是否填写了 API 地址而非网站首页', 503)); }
          });
        });
        req.on('error', reject);
        req.end(payload);
      });
      const parsed = providerReplySchema.safeParse(body);
      if (!parsed.success) throw new AppError('AI_INVALID_OUTPUT', '服务已响应，但返回格式不兼容 Chat Completions', 422);
      return { raw: parsed.data.choices[0]!.message.content, ...(parsed.data.id ? { requestId: parsed.data.id } : {}), ...(parsed.data.model ? { model: parsed.data.model } : {}),
        inputTokens: parsed.data.usage?.prompt_tokens ?? null, outputTokens: parsed.data.usage?.completion_tokens ?? null };
    } catch (error) {
      if (error instanceof AppError) throw error;
      if (controller.signal.aborted) throw new AppError('AI_TIMEOUT', '模型调用超时，请检查服务速度或稍后重试', 503, true);
      throw new AppError('AI_PROVIDER_FAILED', '模型服务连接失败，请检查服务器网络、服务地址与 TLS 证书', 503, true);
    } finally {
      clearTimeout(timer);
      signal.removeEventListener('abort', abort);
    }
  }
}
export class MockModelAdapter implements ModelAdapter {readonly kind='mock' as const;async decide(input:Parameters<ModelAdapter['decide']>[0]){return {raw:JSON.stringify({decisionId:input.decisionId,choiceId:input.choices[0]?.id??''}),inputTokens:null,outputTokens:null};}}
