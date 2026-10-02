import { useEffect, useState } from 'react';
import { ApiError } from '@boardgame/client-sdk';
import { PageFeedback } from '@boardgame/ui';
import { DashboardPage } from '../pages/DashboardPage.js';
import { HomePage } from '../pages/HomePage.js';
import { api } from '../platform.js';

export default function RootPage() {
  const [state, setState] = useState<'loading' | 'guest' | 'member' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let disposed = false;
    setState('loading');
    void api.me().then(() => {
      if (!disposed) setState('member');
    }).catch(cause => {
      if (!disposed) setState(cause instanceof ApiError && cause.code === 'UNAUTHENTICATED' ? 'guest' : 'error');
    });
    return () => { disposed = true; };
  }, [attempt]);
  if (state === 'loading') return <PageFeedback title="正在检查登录状态…" loading />;
  if (state === 'error') return <PageFeedback title="暂时无法连接" retry={() => setAttempt(value => value + 1)}>检查连接后重新加载。</PageFeedback>;
  if (state === 'member') return <DashboardPage />;
  return <><HomePage /><p><a className="login-link" href="/login">登录后创建或加入私人房间</a></p></>;
}
