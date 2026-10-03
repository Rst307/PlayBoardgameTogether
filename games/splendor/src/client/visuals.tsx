import { createContext, useContext, useState, type ReactNode } from 'react';
import type { AssetResolverPort } from '@boardgame/game-sdk/assets';
import type { Token } from '../shared/index.js';

export const inks: Record<Token, string> = {
  white: '#cfe5ee', blue: '#6aaaf1', green: '#65c8a6', red: '#e78891', black: '#a8a2c1', gold: '#e8c272',
};
export const AssetContext = createContext<AssetResolverPort | undefined>(undefined);
function AssetVisual({ src, className, fallback }: {
  src: string | undefined; className: string; fallback: ReactNode;
}) {
  const [failed, setFailed] = useState(false);
  return src && !failed ? <img src={src} className={className} alt="" aria-hidden="true"
    onError={() => setFailed(true)} /> : <>{fallback}</>;
}
export function Visual({ assetKey, className, children }: {
  assetKey: string; className: string; children?: ReactNode;
}) {
  const src = useContext(AssetContext)?.resolveImage(assetKey);
  return <AssetVisual key={src ?? assetKey} src={src} className={className} fallback={children} />;
}
export function Gem({ color, small = false }: { color: Token; small?: boolean }) {
  const className = small ? 'sp-gem sp-gem--small' : 'sp-gem';
  return <Visual assetKey={'token.' + color} className={className}><svg className={className} viewBox="0 0 64 64" aria-hidden="true">
    <path d={color === 'gold' ? 'M32 4 55 18 55 46 32 60 9 46 9 18Z' : 'M17 10 47 10 60 27 32 58 4 27Z'} fill={inks[color]} />
    <path d="M17 10 24 27 4 27M47 10 40 27 60 27M24 27 32 58 40 27M17 10 32 18 47 10M32 18 24 27 40 27Z" fill="none" stroke="#fff" strokeOpacity=".62" strokeWidth="1.5" />
    <path d="M4 27 24 27 32 58Z" fill="#11172c" opacity=".22" />
    <path d="M17 10 32 18 24 27Z" fill="#fff" opacity=".4" />
  </svg></Visual>;
}
