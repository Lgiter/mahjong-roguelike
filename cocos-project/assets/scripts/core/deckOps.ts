import type { Tile, GameState } from '../data/types';
import { NUMERIC_SUITS, WIND_NAMES, DRAGON_NAMES } from '../data/constants';
import { uid, shuffle, sample, getCounts, cloneTile } from './utils';

export function createDeck(mode: string): Tile[] {
  const tiles: Tile[] = [];
  const add = (suit: string, rank: number, copies: number) => {
    for (let i = 0; i < copies; i++) tiles.push({ id: uid(), suit: suit as any, rank });
  };
  NUMERIC_SUITS.forEach(suit => {
    for (let rank = 1; rank <= 9; rank++) {
      let copies = 4;
      if (mode === 'bamboo' && suit === 'tiao' && rank >= 2 && rank <= 8) copies = 5;
      if (mode === 'pairs' && rank >= 3 && rank <= 7) copies = 5;
      add(suit, rank, copies);
    }
  });
  WIND_NAMES.forEach((_, i) => add('wind', i + 1, mode === 'honor' ? 5 : 3));
  DRAGON_NAMES.forEach((_, i) => add('dragon', i + 1, mode === 'honor' ? 5 : 3));
  return shuffle(tiles);
}

export function removeTilesWhere(tiles: Tile[], predicate: (t: Tile) => boolean, limit: number): void {
  let removed = 0;
  for (let i = tiles.length - 1; i >= 0 && removed < limit; i--) {
    if (predicate(tiles[i])) { tiles.splice(i, 1); removed++; }
  }
}

export function addRandomNumericTiles(target: Tile[], count: number, minRank = 1, maxRank = 9): void {
  for (let i = 0; i < count; i++) {
    target.push({
      id: uid(),
      suit: sample(NUMERIC_SUITS) as any,
      rank: minRank + Math.floor(Math.random() * (maxRank - minRank + 1)),
    });
  }
}

export function findPairSource(tiles: Tile[]): Tile | null {
  const counts = getCounts(tiles);
  const key = [...counts.entries()].find(e => e[1] >= 2)?.[0];
  return key ? tiles.find(t => `${t.suit}-${t.rank}` === key) ?? null : null;
}

export function repaintNumericTiles(s: GameState, count: number): void {
  const numeric = shuffle([...s.deck, ...s.hand].filter(t => NUMERIC_SUITS.includes(t.suit)));
  if (!numeric.length) return;
  const suit = sample(NUMERIC_SUITS);
  numeric.slice(0, count).forEach(t => { t.suit = suit as any; });
}

export function addHonorTiles(target: Tile[], count: number): void {
  for (let i = 0; i < count; i++) {
    const dragon = Math.random() > 0.45;
    target.push({
      id: uid(),
      suit: dragon ? 'dragon' : 'wind',
      rank: dragon ? 1 + Math.floor(Math.random() * 3) : 1 + Math.floor(Math.random() * 4),
    });
  }
}

export function seedStarterPairs(target: Tile[]): void {
  const seeds = shuffle(target.filter(t => NUMERIC_SUITS.includes(t.suit) && t.rank >= 2 && t.rank <= 8)).slice(0, 4);
  seeds.forEach(t => target.push(cloneTile(t)));
}

export function seedDeckPairs(target: Tile[], pairCount: number): void {
  const seeds = shuffle(target.filter(t => NUMERIC_SUITS.includes(t.suit) && t.rank >= 2 && t.rank <= 8)).slice(0, pairCount);
  seeds.forEach(t => target.push(cloneTile(t)));
}

export function addAdjacentRunSeeds(target: Tile[], count: number): void {
  for (let i = 0; i < count; i++) {
    const suit = sample(NUMERIC_SUITS);
    const rank = 2 + Math.floor(Math.random() * 6);
    target.push({ id: uid(), suit: suit as any, rank }, { id: uid(), suit: suit as any, rank: rank + 1 });
  }
}

export function mergeSameNumberTiles(s: GameState, limit: number): void {
  const tiles = shuffle([...s.deck, ...s.hand].filter(t => NUMERIC_SUITS.includes(t.suit)));
  const byRank = new Map<number, Tile[]>();
  tiles.forEach(t => {
    if (!byRank.has(t.rank)) byRank.set(t.rank, []);
    byRank.get(t.rank)!.push(t);
  });
  const group = [...byRank.values()].find(items => new Set(items.map(t => t.suit)).size >= 2);
  if (!group) return;
  const targetTile = group[0];
  group.slice(0, limit).forEach(t => { t.suit = targetTile.suit; t.rank = targetTile.rank; });
}

export function purgeSingles(tiles: Tile[], limit: number): void {
  const counts = getCounts(tiles);
  removeTilesWhere(tiles, t => (counts.get(`${t.suit}-${t.rank}`) ?? 0) === 1, limit);
}

export function drawTiles(state: GameState, count: number): Tile[] {
  reshuffleIfNeeded(state, count);
  return state.deck.splice(0, count);
}

export function reshuffleIfNeeded(state: GameState, count: number): void {
  if (state.deck.length >= count) return;
  state.deck = shuffle([...state.deck, ...state.discard]);
  state.discard = [];
}

export function handLimit(): number {
  return 8;
}

export function refillHand(state: GameState): void {
  const need = handLimit() - state.hand.length;
  if (need > 0) state.hand.push(...drawTiles(state, need));
  topUpHand(state);
  trimHandToLimit(state);
}

export function topUpHand(state: GameState): void {
  while (state.hand.length < handLimit()) {
    reshuffleIfNeeded(state, 1);
    if (!state.deck.length) break;
    state.hand.push(...drawTiles(state, 1));
  }
}

export function trimHandToLimit(state: GameState): void {
  while (state.hand.length > handLimit()) state.discard.push(state.hand.pop()!);
}

export function selectedTiles(state: GameState): Tile[] {
  return state.hand.filter(t => state.selected.has(t.id));
}

export function moveSelectedToDiscard(state: GameState): void {
  const sel = selectedTiles(state);
  state.discard.push(...sel);
  state.hand = state.hand.filter(t => !state.selected.has(t.id));
  state.selected.clear();
}
