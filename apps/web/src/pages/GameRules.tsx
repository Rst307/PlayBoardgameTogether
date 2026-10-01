import {useEffect,useState} from 'react';
import {api} from '../platform.js';

export function GameRules({gameId,version}:{gameId:string;version:string}) {
  const [rules,setRules]=useState('');
  const [notice,setNotice]=useState('');
  const [loading,setLoading]=useState(true);
  const [attempt,setAttempt]=useState(0);
  useEffect(()=>{
    let disposed=false;
    setRules('');setNotice('');setLoading(true);
    void api.gameRules(gameId,version).then(result=>{if(!disposed)setRules(result.rules);})
      .catch(()=>{if(!disposed)setNotice('规则暂时无法加载。');}).finally(()=>{if(!disposed)setLoading(false);});
    return()=>{disposed=true;};
  },[gameId,version,attempt]);
  async function copy() {
    try {await navigator.clipboard.writeText(rules);setNotice('规则已复制，可用于模型提示词。');}
    catch {setNotice('复制失败，请选择下方规则文字手动复制。');}
  }
  return <details className="game-rules panel"><summary>游戏规则与 AI 提示词</summary>
    <p className="rules-text">{rules||(loading?'正在加载规则…':'请检查连接后重新加载说明。')}</p>
    {!loading&&!rules&&<button type="button" className="secondary" onClick={()=>setAttempt(value=>value+1)}>重新加载说明</button>}
    <button type="button" className="secondary" disabled={!rules} onClick={()=>void copy()}>复制规则</button>
    {notice&&<p role="status">{notice}</p>}
  </details>;
}
