import type { ReactNode } from 'react';
import type { AssetResolverPort } from '@boardgame/game-sdk/assets';
import { viewSchema as counterViewSchema } from '@boardgame/test-counter/shared';
import { viewSchema as colorViewSchema } from '@boardgame/color-match/shared';
import { viewSchema as gardenViewSchema } from '@boardgame/grid-garden/shared';

export type GameBoard = (view: unknown, busy: boolean, events: unknown[], onAction: (action: unknown) => void, assets?:AssetResolverPort) => ReactNode;
export const clientGames = [
  {
    id: 'demo.counter-room', version: '1.0.0', name: '计数房间', defaultOptions: { targetScore: 3 },
    load: async (): Promise<GameBoard> => {
      return raw => {
        const view = counterViewSchema.parse(raw);
        return <section className="panel match-view"><h2>你的初始视图</h2>
          <div className="score-grid">{view.seats.map(seat => <div className="score" key={seat}>
            <span>{seat === view.viewingSeatId ? '我的座位' : '对手'}</span><strong>{view.scores[seat]}</strong>
          </div>)}</div>
          <p>你的私密提示：<strong>{view.myHint}</strong></p>
          <p className="lab-warning">计数房间仅用于正式身份验收，暂无玩法操作。</p>
        </section>;
      };
    },
  },
  {
    id: 'color-match', version: '1.0.0', name: 'Color Match', defaultOptions: {},
    load: async (): Promise<GameBoard> => {
      const { ColorBoard } = await import('@boardgame/color-match/client');
      return (view, busy, events, onAction, assets) => <ColorBoard view={colorViewSchema.parse(view)} busy={busy} events={events} onAction={onAction} assets={assets}/>;
    },
  },
  {
    id: 'grid-garden', version: '1.0.0', name: 'Grid Garden', defaultOptions: {},
    load: async (): Promise<GameBoard> => {
      const { GridGardenBoard } = await import('@boardgame/grid-garden/client');
      return (view, busy, events, onAction, assets) => <GridGardenBoard view={gardenViewSchema.parse(view)} busy={busy} onAction={onAction} assets={assets} events={events} />;
    },
  },
] as const;

export function clientGame(id: string, version: string) {
  return clientGames.find(game => game.id === id && game.version === version);
}

export const assetPreviews:Record<string,()=>Promise<(assets:AssetResolverPort)=>ReactNode>>={
  'color-match':async()=>{const {ColorAssetPreview}=await import('@boardgame/color-match/client');return assets=><ColorAssetPreview assets={assets}/>;},
  'grid-garden':async()=>{const {GridGardenAssetPreview}=await import('@boardgame/grid-garden/client');return assets=><GridGardenAssetPreview assets={assets}/>;},
};
