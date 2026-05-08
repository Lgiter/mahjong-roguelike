import type { Tile, GameState } from '../data/types';
import { NUMERIC_SUITS, SUIT_LABELS, WIND_NAMES, DRAGON_NAMES } from '../data/constants';

let _uidCounter = 0;
export function uid(): string {
  return `t${++_uidCounter}_${Math.random().toString(36).slice(2, 6)}`;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function sample<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function getCounts(tiles: Tile[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const t of tiles) {
    const k = `${t.suit}-${t.rank}`;
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}

export function cloneTile(tile: Tile): Tile {
  return { id: uid(), suit: tile.suit, rank: tile.rank };
}

export function tileValue(tile: Tile): number {
  if (NUMERIC_SUITS.includes(tile.suit)) return tile.rank * 2;
  if (tile.suit === 'dragon') return 12;
  return 8;
}

export function tileText(tile: Tile): string {
  if (tile.suit === 'wind') return WIND_NAMES[tile.rank - 1] ?? String(tile.rank);
  if (tile.suit === 'dragon') return DRAGON_NAMES[tile.rank - 1] ?? String(tile.rank);
  return `${tile.rank}${SUIT_LABELS[tile.suit]}`;
}

export function countSuit(tiles: Tile[], suit: string): number {
  return tiles.filter(t => t.suit === suit).length;
}

export function deckPairPotential(state: GameState): number {
  const counts = getCounts([...state.deck, ...state.hand]);
  let total = 0;
  for (const v of counts.values()) if (v >= 2) total += 1;
  return total;
}

export function cashFanBonus(coins: number): number {
  return Math.floor(coins / 5);
}

export function formatInt(n: number): string {
  return Math.round(n).toLocaleString();
}

export function formatNum(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export function deltaText(before: [number, number, number], c: { base: number; mult: number; factor: number }): string {
  const parts: string[] = [];
  if (c.base !== before[0]) parts.push(`点 ${c.base > before[0] ? '+' : ''}${Math.round(c.base - before[0])}`);
  if (c.mult !== before[1]) parts.push(`番 ${c.mult > before[1] ? '+' : ''}${formatNum(c.mult - before[1])}`);
  if (c.factor !== before[2]) parts.push(`终 ×${formatNum(c.factor / before[2])}`);
  return parts.join('、') || '触发';
}

export function hasTag(c: { combo: { tags: string[] } }, tag: string): boolean {
  return c.combo.tags.includes(tag);
}

export function colorToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}
