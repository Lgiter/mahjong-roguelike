import type { Tile, HandCombo, GameState, ScoreContext } from '../data/types';
import { STAGES } from '../data/stages';
import { countSuit, formatNum, formatInt, deltaText } from './utils';

export interface ScoreResult {
  base: number;
  mult: number;
  total: number;
  log: string[];
  triggers: { id: string; name: string }[];
}

export function calculateScore(tiles: Tile[], combo: HandCombo, state: GameState): ScoreResult {
  const c: ScoreContext = {
    tiles, combo, state,
    base: combo.base, mult: combo.mult, factor: 1,
    log: [`牌型：${combo.name} ${combo.base}点 × ${formatNum(combo.mult)}番`],
    triggers: [],
  };

  if (combo.tags.includes('straight')) addBase(c, state.upgrades.straightBase, '顺子升级');
  if (combo.tags.includes('triplet')) addBase(c, state.upgrades.tripletBase, '刻子升级');
  if (combo.tags.includes('flush')) addMult(c, state.upgrades.flushMult, '清一色升级');

  if (state.upgradeFlags.straightFirstBurst && combo.tags.includes('straight') && !state.upgradeUses.straightFirstBurstUsed) {
    c.factor *= 1.8;
    c.log.push('顺势而为：本关首次顺子最终 ×1.8');
    state.upgradeUses.straightFirstBurstUsed = true;
  }
  if (state.upgradeFlags.flushFirstFan && combo.tags.includes('flush') && !state.upgradeUses.flushFirstFanUsed) {
    c.mult += 3;
    c.log.push('一色入魂：本关首次清一色番数 +3');
    state.upgradeUses.flushFirstFanUsed = true;
  }

  const rule = STAGES[state.stageIndex]?.rule;
  if (rule?.id === 'noWan')          addBase(c, -countSuit(tiles, 'wan') * 18, 'Boss 断门');
  if (rule?.id === 'noDragon')       addBase(c, -countSuit(tiles, 'dragon') * 45, 'Boss 压元');
  if (rule?.id === 'straightHalf' && combo.tags.includes('straight')) {
    c.mult *= 0.5;
    c.log.push('Boss 封顺：番数 ×0.5');
  }
  if (rule?.id === 'repeatTax' && state.lastCombo === combo.name) addMult(c, -3, 'Boss 重复');

  state.artifacts.forEach(a => {
    const before: [number, number, number] = [c.base, c.mult, c.factor];
    a.apply(c, state);
    if (before[0] !== c.base || before[1] !== c.mult || before[2] !== c.factor) {
      c.log.push(`${a.name}：${deltaText(before, c)}`);
      c.triggers.push({ id: a.id, name: a.name });
    }
  });

  c.base = Math.max(1, Math.round(c.base));
  c.mult = Math.max(1, c.mult);
  const total = Math.round(c.base * c.mult * c.factor);
  c.log.push(`最终：${c.base}点 × ${formatNum(c.mult)}番 × ${formatNum(c.factor)} = ${formatInt(total)}`);

  return { base: c.base, mult: c.mult, total, log: c.log, triggers: c.triggers };
}

function addBase(c: ScoreContext, delta: number, label: string): void {
  if (delta === 0) return;
  c.base += delta;
  c.log.push(`${label}：点 ${delta > 0 ? '+' : ''}${Math.round(delta)}`);
}

function addMult(c: ScoreContext, delta: number, label: string): void {
  if (delta === 0) return;
  c.mult += delta;
  c.log.push(`${label}：番 ${delta > 0 ? '+' : ''}${formatNum(delta)}`);
}
