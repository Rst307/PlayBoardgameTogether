import { useState } from "react";
import { audioManager } from "./audio-manager.js";
export function AudioControls() {
  const [preferences, setPreferences] = useState({
    ...audioManager.preferences,
  });
  const [notice, setNotice] = useState("");
  const update = (value: typeof preferences) => {
    audioManager.setPreferences(value);
    setPreferences({ ...audioManager.preferences });
  };
  return (
    <details className="panel audio-controls">
      <summary>声音设置</summary>
      <button
        type="button"
        onClick={() =>
          void audioManager
            .test()
            .then((ok) =>
              setNotice(
                ok
                  ? "声音已启用，只播放新的实时事件。"
                  : "声音未启用或已静音，不影响游戏。",
              ),
            )
        }
      >
        启用声音 / 测试声音
      </button>
      <label>
        <input
          type="checkbox"
          checked={preferences.muted}
          onChange={(event) =>
            update({ ...preferences, muted: event.target.checked })
          }
        />
        总静音
      </label>
      <label>
        游戏音量
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={preferences.game}
          onChange={(event) =>
            update({ ...preferences, game: Number(event.target.value) })
          }
        />
      </label>
      <label>
        界面音量
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={preferences.ui}
          onChange={(event) =>
            update({ ...preferences, ui: Number(event.target.value) })
          }
        />
      </label>
      {!navigator.locks && (
        <p>
          当前浏览器不支持标签页声音协调，自动游戏音效已停用，仍可主动测试。
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
    </details>
  );
}
