import type { AssetResolverPort } from "@boardgame/game-sdk/assets";
import { ColorBoard } from "./index.js";
import type { ColorView } from "../shared/index.js";
export function ColorAssetPreview({ assets }: { assets: AssetResolverPort }) {
  const view: ColorView = {
    seats: ["demo-me", "demo-other"],
    viewingSeatId: "demo-me",
    myHand: [
      { id: "demo-red", contentId: "card.red.1", color: "red", number: 1 },
      { id: "demo-blue", contentId: "card.blue.3", color: "blue", number: 3 },
      {
        id: "demo-green",
        contentId: "card.green.2",
        color: "green",
        number: 2,
      },
    ],
    handCounts: { "demo-me": 3, "demo-other": 4 },
    topCard: {
      id: "demo-top",
      contentId: "card.red.3",
      color: "red",
      number: 3,
    },
    deckCount: 20,
    currentPlayerId: "demo-me",
    phase: "play",
    winner: null,
    winners: [],
    legalCardIds: ["demo-red", "demo-blue"],
    canDraw: true,
    targetSeatIds: [],
  };
  return (
    <>
      <p>
        固定演示：可选红 1 / 蓝
        3，绿色牌禁用；下方缺图示例始终保留文字。按钮仅演示。
      </p>
      <ColorBoard
        view={view}
        busy={false}
        events={[]}
        onAction={() => undefined}
        assets={assets}
      />
      <div className="color-card color-card--red">红 3 · 缺图占位</div>
    </>
  );
}
