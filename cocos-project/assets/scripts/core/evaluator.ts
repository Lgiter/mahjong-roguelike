import type { Tile, HandCombo } from '../data/types';
import { NUMERIC_SUITS } from '../data/constants';
import { getCounts, tileValue } from './utils';

export function evaluateTiles(tiles: Tile[]): HandCombo {
  if (tiles.length === 1) {
    return { valid: true, name: '高牌', base: 18 + tileValue(tiles[0]), mult: 1, tags: ['high'] };
  }

  const counts = getCounts(tiles);
  const sameSuit = tiles.every(t => t.suit === tiles[0].suit);
  const numeric = tiles.every(t => NUMERIC_SUITS.includes(t.suit));
  const values = [...counts.values()].sort((a, b) => b - a);
  const ranks = tiles.map(t => t.rank).sort((a, b) => a - b);

  const straight = tiles.length === 3 && sameSuit && numeric &&
    ranks[0] + 1 === ranks[1] && ranks[1] + 1 === ranks[2];
  const run4 = tiles.length === 4 && sameSuit && numeric &&
    new Set(ranks).size === 4 && ranks.every((r, i) => i === 0 || r === ranks[i - 1] + 1);
  const run5 = tiles.length === 5 && sameSuit && numeric &&
    new Set(ranks).size === 5 && ranks.every((r, i) => i === 0 || r === ranks[i - 1] + 1);

  // 5-tile combos with same suit
  if (tiles.length === 5 && sameSuit && numeric && values[0] === 4)
    return { valid: true, name: '清一色杠子', base: 220, mult: 8, tags: ['flush', 'triplet'] };
  if (tiles.length === 5 && sameSuit && numeric && values.join(',') === '3,2')
    return { valid: true, name: '清一色满堂刻', base: 230, mult: 8, tags: ['flush', 'triplet', 'pair'] };

  // 4-5 tile generic combos
  if (tiles.length >= 4 && values[0] === 4)
    return { valid: true, name: '杠子', base: 110, mult: 4, tags: ['triplet'] };
  if (tiles.length === 5 && values.join(',') === '3,2')
    return { valid: true, name: '满堂刻', base: 170, mult: 6, tags: ['triplet', 'pair'] };

  // 5-tile flush
  if (tiles.length === 5 && sameSuit && numeric)
    return { valid: true, name: run5 ? '清一色两顺' : '清一色',
      base: run5 ? 190 : 150, mult: run5 ? 7 : 5,
      tags: run5 ? ['flush', 'straight'] : ['flush'] };

  // 3-tile triplet / straight
  if (tiles.length === 3 && values[0] === 3)
    return { valid: true, name: '刻子', base: 72, mult: 3, tags: ['triplet'] };
  if (straight)
    return { valid: true, name: '顺子', base: 58, mult: 3, tags: ['straight'] };
  if (run4)
    return { valid: true, name: '连四', base: 96, mult: 4, tags: ['straight'] };

  // 4-tile two-pair
  if (tiles.length === 4 && values.join(',') === '2,2')
    return { valid: true, name: '两对', base: 66, mult: 3, tags: ['pair'] };

  // 2-tile pair
  if (tiles.length === 2 && values[0] === 2)
    return { valid: true, name: '对子', base: 34, mult: 2, tags: ['pair'] };

  // Dragon combos
  if (isDragonFullSet(tiles) && tiles.length === 5 && values[0] >= 2)
    return { valid: true, name: '三元归位', base: 210, mult: 8, tags: ['dragon', 'pair'] };
  if (tiles.length === 3 && sameSuit && tiles[0].suit === 'dragon' && new Set(tiles.map(t => t.rank)).size === 3)
    return { valid: true, name: '小三元', base: 130, mult: 6, tags: ['dragon'] };

  // Same-number cross-suit combos
  const sameNumberCombo = evaluateSameNumberTiles(tiles);
  if (sameNumberCombo) return sameNumberCombo;

  // Fallback: loose / same-suit loose
  const looseBase = 24 + tiles.reduce((sum, t) => sum + tileValue(t), 0);
  const sameNumeric = tiles.length >= 3 && sameSuit && numeric;
  return {
    valid: true,
    name: sameNumeric ? '同门散牌' : '散牌',
    base: sameNumeric ? looseBase + 18 : looseBase,
    mult: sameNumeric ? 1.5 : 1,
    tags: sameNumeric ? ['loose', 'sameSuit'] : ['loose'],
  };
}

function evaluateSameNumberTiles(tiles: Tile[]): HandCombo | null {
  const numeric = tiles.every(t => NUMERIC_SUITS.includes(t.suit));
  if (!numeric) return null;
  const sameRank = tiles.every(t => t.rank === tiles[0].rank);
  if (!sameRank) return null;
  const suitCount = new Set(tiles.map(t => t.suit)).size;
  if (tiles.length === 2 && suitCount === 2)
    return { valid: true, name: '同数对子', base: 28, mult: 1.5, tags: ['sameNumber', 'loose'] };
  if (tiles.length === 3 && suitCount === 3)
    return { valid: true, name: '三门同数', base: 48, mult: 2, tags: ['sameNumber', 'loose'] };
  return null;
}

export function isDragonFullSet(tiles: Tile[]): boolean {
  if (!tiles.every(t => t.suit === 'dragon')) return false;
  return new Set(tiles.map(t => t.rank)).size === 3;
}

export function isBigTripletCombo(combo: HandCombo): boolean {
  return combo.tags.includes('triplet') &&
    (combo.name === '满堂刻' || combo.name === '清一色满堂刻' || combo.name === '清一色杠子' || combo.name === '三元归位');
}

export function isBigStraightCombo(combo: HandCombo): boolean {
  return combo.name === '清一色两顺';
}

export function laneForCombo(combo: HandCombo): string {
  if (combo.tags.includes('straight')) return '顺子';
  if (combo.tags.includes('triplet')) return '刻子';
  if (combo.tags.includes('flush')) return '清一色';
  if (combo.tags.includes('dragon')) return '字牌';
  if (combo.tags.includes('pair')) return '对子';
  if (combo.tags.includes('high')) return '高牌';
  if (combo.tags.includes('loose')) return '散牌';
  return '通用';
}
