import { useEffect, useRef, useState, type FormEvent } from 'react';
import { gameSubmissionReviewSchema } from '@boardgame/protocol';
import { PageFeedback } from '@boardgame/ui';
import { api } from '../../platform.js';
import { AdminLayout, adminError, useAdminRequestId } from './AdminLayout.js';

const statusName = {
  pending: '待审核',
  reviewed: '资料已审阅',
  rejected: '已拒绝',
};
function Submissions() {
  const requestId = useAdminRequestId();
  const [page, setPage] =
    useState<Awaited<ReturnType<typeof api.adminGameSubmissions>>>();
  const [before, setBefore] = useState<string>();
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const alive = useRef(false);
  const lock = useRef(false);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    let disposed = false;
    setPage(undefined);
    setError('');
    void api
      .adminGameSubmissions(before)
      .then((value) => {
        if (!disposed) setPage(value);
      })
      .catch((cause) => {
        if (!disposed) setError(adminError(cause));
      });
    return () => {
      disposed = true;
    };
  }, [before, attempt]);
  async function review(
    event: FormEvent<HTMLFormElement>,
    id: string,
    revision: number,
  ) {
    event.preventDefault();
    if (lock.current) return;
    const values = new FormData(event.currentTarget);
    const parsed = gameSubmissionReviewSchema.safeParse({
      requestId: requestId([
        id,
        revision,
        values.get('status'),
        values.get('reviewNote'),
      ]),
      expectedRevision: revision,
      status: values.get('status'),
      reviewNote: values.get('reviewNote'),
    });
    if (!parsed.success) {
      setError('请填写 1–1000 字纯文本审核意见。');
      return;
    }
    lock.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const saved = await api.reviewGameSubmission(id, parsed.data);
      if (!alive.current) return;
      setPage(
        (previous) =>
          previous && {
            ...previous,
            items: previous.items.map((item) =>
              item.id === id ? saved : item,
            ),
          },
      );
      setNotice(`${saved.name}：${statusName[saved.status]}。`);
    } catch (cause) {
      if (alive.current) setError(adminError(cause));
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  }
  return (
    <>
      <p className="panel">
        审核只记录游戏资料的审阅结果，不代表源码安全或已安装。上架前仍需维护者审查并部署可信版本。
      </p>
      {error && (
        <p className="error-notice" role="alert">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      {!page ? (
        error ? (
          <button
            className="secondary"
            onClick={() => setAttempt((value) => value + 1)}
          >
            刷新申请
          </button>
        ) : (
          <PageFeedback title="正在加载接入申请…" loading />
        )
      ) : (
        <>
          <div className="admin-records">
            {page.items.map((item) => (
              <article className="panel admin-submission" key={item.id}>
                <div className="admin-record">
                  <div>
                    <h2>
                      {item.name} <small>{item.version}</small>
                    </h2>
                    <p className="muted">
                      {item.gameId} ·{' '}
                      {new Date(item.createdAt).toLocaleDateString('zh-CN')}
                    </p>
                  </div>
                  <span className="status-badge">
                    {statusName[item.status]}
                  </span>
                </div>
                <p className="admin-description">{item.description}</p>
                <a
                  href={item.repositoryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  查看 GitHub 仓库 ↗
                </a>
                {item.reviewNote && (
                  <p className="admin-description">
                    审核意见：{item.reviewNote}
                  </p>
                )}
                {item.status === 'pending' && (
                  <form
                    className="form-stack"
                    onSubmit={(event) =>
                      void review(event, item.id, item.revision)
                    }
                  >
                    <fieldset disabled={busy}>
                      <legend>记录审核结果</legend>
                      <label>
                        审核结果
                        <select name="status">
                          <option value="reviewed">资料已审阅</option>
                          <option value="rejected">拒绝申请</option>
                        </select>
                      </label>
                      <label>
                        审核意见
                        <textarea
                          name="reviewNote"
                          required
                          maxLength={1000}
                          rows={3}
                          placeholder="说明审阅结果、待补充资料或拒绝原因"
                        />
                      </label>
                      <button>保存审核结果</button>
                    </fieldset>
                  </form>
                )}
              </article>
            ))}
          </div>
          {page.items.length === 0 && <p className="panel">暂无接入申请。</p>}
          <div className="admin-actions">
            <button
              className="secondary"
              disabled={busy}
              onClick={() => {
                setBefore(undefined);
                setAttempt((value) => value + 1);
              }}
            >
              刷新申请
            </button>
            {before && (
              <button
                className="secondary"
                disabled={busy}
                onClick={() => setBefore(undefined)}
              >
                返回第一页
              </button>
            )}
            {page.nextCursor && (
              <button
                disabled={busy}
                onClick={() => setBefore(page.nextCursor!)}
              >
                下一页
              </button>
            )}
          </div>
        </>
      )}
    </>
  );
}
export function AdminSubmissionsPage() {
  return (
    <AdminLayout
      path="/admin/submissions"
      title="接入审核"
      description="审阅新游戏与更新版本的资料，记录明确的处理意见。"
    >
      <Submissions />
    </AdminLayout>
  );
}
