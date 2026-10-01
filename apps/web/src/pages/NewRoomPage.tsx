import {useEffect,useState} from 'react';
import {api,navigate} from '../platform.js';
import {RoomCreateForm} from './RoomCreateForm.js';

export function NewRoomPage() {
  const [ready,setReady]=useState(false);
  useEffect(() => {
    let active = true;
    void api.me().then(() => { if (active) setReady(true); })
      .catch(() => { if (active) navigate('/login'); });
    return () => { active = false; };
  }, []);
  if(!ready)return <p>正在验证会话…</p>;
  return <><p><a href="/">← 返回游戏大厅</a></p><section className="panel auth-card"><p className="eyebrow">开始一局游戏</p><h1>创建房间</h1><RoomCreateForm/></section></>;
}
