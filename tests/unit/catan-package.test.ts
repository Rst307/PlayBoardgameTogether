import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { beforeAll, describe, expect, it } from 'vitest';
import { zipSync } from 'fflate';
import { DeterministicRng, type GameExtension } from '../../packages/game-sdk/src/index.js';
import { PackageRuntime } from '../../apps/api/src/registry/package-runtime.js';
import { readGamePackage } from '../../apps/api/src/catalog/game-package.js';

type Action = { type: string; [key: string]: unknown };
type State = {
  seats: string[]; start: number; terrain: number[]; numbers: number[]; resources: number[][]; bank: number[];
  cards: { type: number; bought: number }[][]; deck: number[]; used: number[]; buildings: ({ owner: number; level: number } | null)[];
  roads: (number | null)[]; robber: number; turn: number; turnNumber: number; phase: string; setupStep: number;
  anchor: number | null; discards: number[]; returnPhase: string; played: boolean; freeRemaining: number;
  offer: { from: number; to: number; give: number[]; want: number[] } | null;
  knights: number[]; longestOwner: number | null; armyOwner: number | null; winner: number | null; dice: number[] | null; move: number;
};
type View = { you: number; current: number; hand: number[]; cards: { type: number; playable: boolean }[];
  players: { points: number; longest: number; resources: number }[]; actions: Action[]; rates: number[]; phase: string };
type Map = { hexes: { corners: number[]; sides: number[] }[]; nodes: { x: number; y: number; edges: number[]; hexes: number[] }[];
  edges: { a: number; b: number; hexes: number[] }[]; ports: { edge: number; resource: number }[] };
type Event = { type: string; [key: string]: unknown };
let game: GameExtension<State, Record<string, never>, Action, View, Event, Event>, map: Map;
const viewer = (seatId: string) => ({ kind: 'seat' as const, seatId });
const actor = (seatId: string) => ({ kind: 'seat' as const, seatId, controllerEpoch: 0 });
const sum = (v: number[]) => v.reduce((a, b) => a + b, 0);
function initial(count = 3, seed = 123) {
  const rng = new DeterministicRng(seed);
  return { state: game.setup({ seats: ['a', 'b', 'c', 'd'].slice(0, count), options: {}, rng }).state, rng };
}
function act(s: State, a: Action, p = s.turn, rng = new DeterministicRng(8)) {
  return game.applyAction(s, actor(s.seats[p]!), a, rng).state;
}
function opening(count = 3) {
  const setup = initial(count), rng = setup.rng;
  let s = setup.state;
  while (s.phase.startsWith('setup_')) {
    const p = game.getView(s, viewer(s.seats[0]!)).current;
    const a = game.getView(s, viewer(s.seats[p]!)).actions[0]!;
    s = act(s, a, p, rng);
  }
  return s;
}
function hands(s: State, values: number[][]) {
  s.resources = values; s.bank = Array.from({ length: 5 }, (_, r) => 19 - values.reduce((v, h) => v + h[r]!, 0)); return s;
}
function card(s: State, p: number, type: number, bought = 0) {
  const i = s.deck.indexOf(type); s.deck.splice(i, 1); s.cards[p]!.push({ type, bought });
}
function main() { const s = opening(); s.phase = 'main'; return s; }

describe('Catan classical rules through isolated QuickJS', () => {
  beforeAll(async () => {
    const base = new URL('../../game-packages/catan/', import.meta.url);
    const shared = await readFile(new URL('shared.txt', base), 'utf8');
    map = runInNewContext(shared + '; MAP') as Map;
    const parsed = readGamePackage(Buffer.from(zipSync({
      'game.json': await readFile(new URL('game.json', base)),
      'server.js': Buffer.from(shared + '\n' + await readFile(new URL('server.txt', base), 'utf8')),
      'client.html': Buffer.from((await readFile(new URL('client.html', base), 'utf8')).replace('/* CATAN_SHARED */', shared)),
    })));
    game = (await PackageRuntime.create()).extension(parsed.server) as unknown as typeof game;
  });
  it('has exact board topology, deterministic min/max setup, red separation and snake placement', () => {
    expect([map.hexes.length, map.nodes.length, map.edges.length, map.ports.length]).toEqual([19, 54, 72, 9]);
    expect(new Set(map.ports.flatMap(p => [map.edges[p.edge]!.a, map.edges[p.edge]!.b])).size).toBe(18);
    for (const count of [3, 4]) {
      for (const seed of [1, 123, 999]) {
        const { state: s, rng } = initial(count, seed);
        expect(s).toEqual(initial(count, seed).state); expect(rng.snapshot()).toEqual(initial(count, seed).rng.snapshot());
        expect(game.deserialize(game.serialize(s))).toEqual(s);
        expect(map.edges.every(e => e.hexes.length < 2 || !e.hexes.every(h => [6, 8].includes(s.numbers[h]!)))).toBe(true);
      }
      const s = opening(count);
      expect(s.phase).toBe('roll'); expect(s.turn).toBe(s.start);
      expect(s.buildings.filter(Boolean)).toHaveLength(count * 2); expect(s.roads.filter(p => p !== null)).toHaveLength(count * 2);
      for (let p = 0; p < count; p++) expect(s.buildings.filter(b => b?.owner === p)).toHaveLength(2);
    }
  });
  it('enforces actor/geometry and failed moves leave state and RNG untouched', () => {
    const { state: s, rng } = initial(); const before = structuredClone(s), random = rng.snapshot();
    const p = game.getView(s, viewer('a')).current;
    expect(() => act(s, { type: 'settlement', node: 0 }, (p + 1) % 3, rng)).toThrow();
    expect(() => game.parseAction({ type: 'road', edge: -1 })).toThrow();
    expect(() => game.parseAction({ type: 'roll', seatId: 'a' })).toThrow();
    expect(s).toEqual(before); expect(rng.snapshot()).toEqual(random);
    const node = game.getView(s, viewer(s.seats[p]!)).actions[0]!.node as number;
    const placed = act(s, { type: 'settlement', node }, p, rng);
    expect(() => act(placed, { type: 'road', edge: map.nodes.find(n => !n.edges.some(e => map.nodes[node]!.edges.includes(e)))!.edges[0] }, p)).toThrow();
  });
  it('produces settlement/city resources, blocks robber tiles and handles bank shortages', () => {
    const s = main(); s.buildings.fill(null); s.roads.fill(null); s.longestOwner = null;
    const h = s.terrain.findIndex((r, id) => r >= 0 && id !== s.robber), hex = map.hexes[h]!;
    s.buildings[hex.corners[0]!] = { owner: 0, level: 2 }; s.buildings[hex.corners[2]!] = { owner: 1, level: 1 };
    s.phase = 'roll'; hands(s, s.seats.map(() => [0, 0, 0, 0, 0]));
    const number = s.numbers[h]!, resource = s.terrain[h]!;
    let seed = 1;
    while (true) { const rng = new DeterministicRng(seed); if (rng.nextInt(1, 7) + rng.nextInt(1, 7) === number) break; seed++; }
    const produced = act(s, { type: 'roll' }, s.turn, new DeterministicRng(seed));
    expect(produced.resources[0]![resource]).toBeGreaterThanOrEqual(2); expect(produced.resources[1]![resource]).toBeGreaterThanOrEqual(1);
    s.robber = h; expect(act(s, { type: 'roll' }, s.turn, new DeterministicRng(seed)).resources[0]![resource]).toBe(0);
    s.robber = s.terrain.indexOf(-1); s.resources[2]![resource] = 18; s.bank[resource] = 1;
    const shortage = act(s, { type: 'roll' }, s.turn, new DeterministicRng(seed));
    expect(shortage.resources[0]![resource]).toBe(0); expect(shortage.resources[1]![resource]).toBe(0);
    s.buildings[hex.corners[2]!] = null;
    expect(act(s, { type: 'roll' }, s.turn, new DeterministicRng(seed)).resources[0]![resource]).toBe(1);
  });
  it('handles seven, serial half discards, robber targets, theft and secret projection', () => {
    let s = opening(); hands(s, [[3, 3, 3, 0, 0], [4, 4, 0, 0, 0], [1, 1, 1, 1, 1]]);
    let seed = 1; while (true) { const r = new DeterministicRng(seed); if (r.nextInt(1, 7) + r.nextInt(1, 7) === 7) break; seed++; }
    s = act(s, { type: 'roll' }, s.turn, new DeterministicRng(seed)); expect(s.discards).toEqual([0, 1]);
    expect(() => act(s, { type: 'discard', give: [0, 0, 0, 0, 0] }, 0)).toThrow();
    for (const p of [0, 1]) { const action = game.getView(s, viewer(s.seats[p]!)).actions[0]!; s = act(s, action, p); }
    expect(s.phase).toBe('robber'); expect(s.resources.map(sum)).toEqual([5, 4, 5]);
    expect(() => act(s, { type: 'robber', hex: s.robber })).toThrow();
    const target = (s.turn + 1) % 3, building = s.buildings.findIndex(b => b?.owner === target);
    const h = map.nodes[building]!.hexes.find(h => h !== s.robber)!; s = act(s, { type: 'robber', hex: h });
    expect(s.phase).toBe('steal'); const before = s.resources.map(sum);
    const result = game.applyAction(s, actor(s.seats[s.turn]!), { type: 'steal', target }, new DeterministicRng(6));
    expect(sum(result.state.resources[s.turn]!)).toBe(before[s.turn]! + 1);
    expect(sum(result.state.resources[target]!)).toBe(before[target]! - 1);
    const events = game.projectEvents(result.events, viewer(s.seats[(target + 1) % 3]!));
    expect(events.find((e: { type: string }) => e.type === 'stolen')).not.toHaveProperty('resource');
  });
  it('supports consent, arbitrary offers/counteroffers, cancellations and disallows gifts/outside trades', () => {
    let s = main(); s.turn = 0; hands(s, [[4, 0, 0, 0, 0], [0, 3, 0, 0, 0], [0, 0, 2, 0, 0]]);
    const offer = { type: 'offer', target: 1, give: [2, 0, 0, 0, 0], want: [0, 1, 0, 0, 0] };
    expect(() => act(s, { ...offer, want: [0, 0, 0, 0, 0] }, 0)).toThrow();
    expect(() => act(s, { ...offer, target: 2 }, 1)).toThrow();
    s = act(s, offer, 0); expect(s.resources[0]).toEqual([4, 0, 0, 0, 0]);
    expect(() => act(s, { type: 'accept' }, 2)).toThrow();
    s = act(s, { type: 'counter', target: 0, give: [0, 2, 0, 0, 0], want: [3, 0, 0, 0, 0] }, 1);
    s = act(s, { type: 'accept' }, 0); expect(s.resources[0]).toEqual([1, 2, 0, 0, 0]); expect(s.resources[1]).toEqual([3, 1, 0, 0, 0]);
    s = act(s, { type: 'offer', target: 0, give: [0, 0, 1, 0, 0], want: [0, 1, 0, 0, 0] }, 2);
    s = act(s, { type: 'cancel' }, 0); expect(s.phase).toBe('main'); expect(s.offer).toBeNull();
  });
  it('applies harbor ratios, costs, upgrades, and bank inventory checks', () => {
    let s = main(); s.turn = 0; s.buildings.fill(null); s.roads.fill(null); s.longestOwner = null;
    const port = map.ports.find(p => p.resource === 0)!, edge = map.edges[port.edge]!;
    s.buildings[edge.a] = { owner: 0, level: 1 }; hands(s, [[4, 4, 3, 4, 5], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0]]);
    expect(game.getView(s, viewer('a')).rates[0]).toBe(2);
    s = act(s, { type: 'bank', give: 0, take: 1 }, 0); expect(s.resources[0]![0]).toBe(2); expect(s.resources[0]![1]).toBe(5);
    s = act(s, { type: 'city', node: edge.a }, 0); expect(s.buildings[edge.a]!.level).toBe(2); expect(s.resources[0]!.slice(3)).toEqual([2, 2]);
    s = act(s, { type: 'road', edge: port.edge }, 0); expect(s.roads[port.edge]).toBe(0);
    expect(() => act(s, { type: 'road', edge: port.edge }, 0)).toThrow();
    s.resources[1]![4] = 17; s.bank[4] = 0; expect(() => act(s, { type: 'bank', give: 1, take: 4 }, 0)).toThrow();
  });
  it('enforces new-card timing, one card per turn, pre-roll knight, monopoly and plenty', () => {
    let s = main(); s.turn = 0; hands(s, [[2, 2, 2, 2, 2], [0, 0, 3, 0, 0], [0, 0, 4, 0, 0]]);
    card(s, 0, 3, s.turnNumber); expect(() => act(s, { type: 'monopoly', resource: 2 }, 0)).toThrow();
    s.cards[0]![0]!.bought = 0; card(s, 0, 2);
    s = act(s, { type: 'monopoly', resource: 2 }, 0); expect(s.resources.map(h => h[2])).toEqual([9, 0, 0]);
    expect(() => act(s, { type: 'plenty', take: [1, 1, 0, 0, 0] }, 0)).toThrow();
    s.played = false; s = act(s, { type: 'plenty', take: [1, 1, 0, 0, 0] }, 0); expect(s.resources[0]!.slice(0, 2)).toEqual([3, 3]);
    s.played = false; s.phase = 'roll'; card(s, 0, 0); s = act(s, { type: 'knight' }, 0);
    expect(s.phase).toBe('robber'); expect(s.returnPhase).toBe('roll'); expect(s.knights[0]).toBe(1);
  });
  it('handles free roads and exhausted bank year of plenty', () => {
    let s = main(); s.turn = 0; card(s, 0, 1); s = act(s, { type: 'road_card' }, 0);
    for (let i = 0; i < 2; i++) s = act(s, game.getView(s, viewer('a')).actions[0]!, 0);
    expect(s.phase).toBe('main'); expect(s.roads.filter(p => p === 0)).toHaveLength(4);
    s.played = false; card(s, 0, 2); hands(s, [[18, 19, 19, 19, 19], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0]]);
    s = act(s, { type: 'plenty', take: [1, 0, 0, 0, 0] }, 0); expect(s.bank).toEqual([0, 0, 0, 0, 0]);
  });
  it('computes closed roads/branches, tie retention, interruption and army transfer', () => {
    const s = main(); s.turn = 0; s.buildings.fill(null); s.roads.fill(null); s.longestOwner = null;
    const loop = map.hexes[9]!.sides; loop.forEach(e => { s.roads[e] = 0; }); s.longestOwner = 0;
    expect(game.deserialize(s).longestOwner).toBe(0); expect(game.getView(s, viewer('a')).players[0]!.longest).toBe(6);
    const node = map.hexes[9]!.corners[0]!, branch = map.nodes[node]!.edges.find(e => !loop.includes(e))!;
    s.roads[branch] = 0; expect(game.getView(s, viewer('a')).players[0]!.longest).toBe(7);
    s.buildings[node] = { owner: 1, level: 1 }; expect(game.getView(s, viewer('a')).players[0]!.longest).toBe(6);
    for (let i = 0; i < 3; i++) { s.deck.splice(s.deck.indexOf(0), 1); s.used[0]++; } s.knights[0] = 3; s.armyOwner = 0;
    expect(game.deserialize(s).armyOwner).toBe(0);
    for (let i = 0; i < 3; i++) { s.deck.splice(s.deck.indexOf(0), 1); s.used[0]++; } s.knights[1] = 3;
    expect(game.deserialize(s).armyOwner).toBe(0);
    s.deck.splice(s.deck.indexOf(0), 1); s.used[0]++; s.knights[1] = 4; s.armyOwner = 1;
    expect(game.deserialize(s).armyOwner).toBe(1);
  });
  it('hides resource mix/deck/new cards and scores secret victory points only on own turn', () => {
    let s = main(); s.turn = 0; card(s, 0, 4, s.turnNumber);
    expect(game.getView(s, viewer('a')).players[0]!.points).toBe(3);
    expect(game.getView(s, viewer('b')).players[0]!.points).toBe(2);
    for (const who of [{ kind: 'spectator' as const }, viewer('intruder')]) {
      const v = game.getView(s, who); expect(v.hand).toEqual([0, 0, 0, 0, 0]); expect(v.cards).toEqual([]); expect(v.actions).toEqual([]);
      expect(v).not.toHaveProperty('deck'); expect(v).not.toHaveProperty('resources');
    }
    s.buildings.forEach(b => { if (b?.owner === 0) b.level = 2; });
    for (let i = 0; i < 4; i++) card(s, 0, 4);
    for (let i = 0; i < 3; i++) { s.deck.splice(s.deck.indexOf(0), 1); s.used[0]++; } s.knights[0] = 3; s.armyOwner = 0;
    s.turn = 1; expect(() => act(s, { type: 'claim' }, 0)).toThrow();
    s.turn = 0; s = act(s, { type: 'claim' }, 0); expect(game.getOutcome(s)).toEqual({ status: 'finished', winners: ['a'] });
    expect(game.getView(s, viewer('b')).players[0]!.points).toBe(11);
    expect(game.deserialize(game.serialize(s))).toEqual(s);
  });
  it('retains tied longest road, then transfers it when a legal opponent settlement cuts the old route', () => {
    let s = main(); s.turn = 1; s.buildings.fill(null); s.roads.fill(null); s.longestOwner = 0;
    const coast = map.edges.map((e, id) => ({ ...e, id })).filter(e => e.hexes.length === 1)
      .sort((a, b) => Math.atan2(map.nodes[a.a]!.y + map.nodes[a.b]!.y, map.nodes[a.a]!.x + map.nodes[a.b]!.x)
        - Math.atan2(map.nodes[b.a]!.y + map.nodes[b.b]!.y, map.nodes[b.a]!.x + map.nodes[b.b]!.x));
    coast.slice(0, 6).forEach(e => { s.roads[e.id] = 0; });
    coast.slice(15, 21).forEach(e => { s.roads[e.id] = 1; });
    expect(game.deserialize(s).longestOwner).toBe(0);
    const cut = [2, 3, 1, 4].find(i => {
      const left = coast[i]!, right = coast[i + 1]!;
      const shared = [left.a, left.b].find(n => n === right.a || n === right.b)!;
      return map.nodes[shared]!.edges.length === 3;
    })!;
    const third = coast[cut]!, fourth = coast[cut + 1]!;
    const node = [third.a, third.b].find(n => n === fourth.a || n === fourth.b)!;
    const feeder = map.nodes[node]!.edges.find(e => e !== third.id && e !== fourth.id)!;
    s.roads[feeder] = 1; hands(s, [[0, 0, 0, 0, 0], [1, 1, 1, 1, 0], [0, 0, 0, 0, 0]]);
    s = act(s, { node, type: 'settlement' }, 1); // JSON object key ordering cannot affect legality.
    expect(game.getView(s, viewer('a')).players[0]!.longest).toBe(Math.max(cut + 1, 5 - cut));
    expect(s.longestOwner).toBe(1); expect(game.deserialize(s)).toEqual(s);
  });
  it('rejects broken conservation, topology, phases and extra saved fields', () => {
    const s = main();
    expect(() => game.deserialize({ ...s, bank: [0, 0, 0, 0, 0] })).toThrow();
    expect(() => game.deserialize({ ...s, deck: [] })).toThrow();
    expect(() => game.deserialize({ ...s, phase: 'discard', discards: [] })).toThrow();
    expect(() => game.deserialize({ ...s, privateDebug: true })).toThrow();
    expect(() => game.deserialize({ ...s, roads: [] })).toThrow();
  });
  it('basic policies can complete a real four-player game and every stage recovers', () => {
    const setup = initial(4, 777), rng = setup.rng;
    let s = setup.state;
    let moves = 0;
    while (s.winner === null && moves++ < 3500) {
      const p = game.getView(s, viewer('a')).current, who = viewer(s.seats[p]!);
      const context = game.getDecisionContext!(s, who)!;
      expect(context).not.toBeNull();
      const a = game.getFallbackAction(game.getView(s, who), game.getActionSpec(s, who));
      expect(context.legalActions).toContainEqual(a); expect(a).not.toBeNull(); s = act(s, a!, p, rng);
      if (moves % 100 === 0) expect(game.deserialize(game.serialize(s))).toEqual(s);
    }
    expect(s.winner).not.toBeNull(); expect(moves).toBeLessThan(3500);
  }, 120000);
});
