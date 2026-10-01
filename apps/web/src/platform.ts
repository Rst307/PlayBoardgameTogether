import { ApiClient } from '@boardgame/client-sdk';
export const api=new ApiClient(import.meta.env.VITE_API_BASE??'/api/v1');
export function navigate(path:string,state?:unknown,replace=false){if(replace)history.replaceState(state??null,'',path);else history.pushState(state??null,'',path);window.dispatchEvent(new PopStateEvent('popstate',{state}));}
export const command=()=>crypto.randomUUID();
