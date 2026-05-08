import type { ArtifactDef, ScoreContext, GameState, Tile } from './types';
import { NUMERIC_SUITS } from './constants';
import {
  hasTag, countSuit, cashFanBonus, deckPairPotential, cloneTile, tileText, sample,
} from '../core/utils';
import {
  addRandomNumericTiles, removeTilesWhere, addHonorTiles, findPairSource,
} from '../core/deckOps';
import { isBigTripletCombo, isBigStraightCombo } from '../core/evaluator';

function recordDeckChange(state: GameState, msg: string): void {
  state.deckChanges.push(msg);
  if (state.deckChanges.length > 4) state.deckChanges.shift();
}

function art(
  id: string, name: string, icon: string, desc: string,
  apply: (c: ScoreContext, s: GameState) => void,
  opts: Partial<ArtifactDef> = {},
): ArtifactDef {
  return { id, name, icon, desc, lane: '通用', apply, ...opts };
}

export const ARTIFACTS: ArtifactDef[] = [
  art('trialCharm', '试炼符', '初', '高牌和散牌番数 +1。', (c) => {
    if (hasTag(c, 'high') || hasTag(c, 'loose')) c.mult += 1;
  }, { lane: '通用' }),

  art('greenDragon', '青龙印', '青', '顺子番数 +2；五张顺子终局额外 ×1.5；过关时加入中张并清理字牌。', (c) => {
    if (hasTag(c, 'straight')) {
      c.mult += 2 + c.state.growth.straightFan;
      if (isBigStraightCombo(c.combo)) c.factor *= 1.5;
    }
  }, {
    lane: '顺子',
    afterPlay(s, combo) { if (combo.tags.includes('straight')) s.growth.straightFan += 1; },
    stageClear(s) {
      addRandomNumericTiles(s.deck, 2, 3, 7);
      removeTilesWhere(s.deck, t => t.suit === 'wind' || t.suit === 'dragon', 1);
      recordDeckChange(s, '青龙印：牌山加入 2 张中张，清理 1 张字牌');
    },
  }),

  art('whiteTiger', '白虎符', '虎', '刻子系点数 +80；五张刻子终局额外 ×1.5；过关时复制对子牌。', (c) => {
    if (hasTag(c, 'triplet')) {
      c.base += 80 + c.state.growth.tripletBase;
      if (isBigTripletCombo(c.combo)) c.factor *= 1.5;
    }
  }, {
    lane: '刻子',
    afterPlay(s, combo) {
      if (combo.tags.includes('triplet')) s.growth.tripletBase += isBigTripletCombo(combo) ? 80 : 50;
    },
    stageClear(s) {
      const src = findPairSource([...s.hand, ...s.deck, ...s.discard]) ?? sample([...s.hand, ...s.deck]);
      if (src) {
        s.deck.push(cloneTile(src), cloneTile(src), cloneTile(src));
        recordDeckChange(s, `白虎符：复制 ${tileText(src)} 3 张`);
      }
    },
  }),

  art('cashToFan', '财神像', '财', '每 5 金币番数 +1；过关时存钱强化经济。', (c, s) => {
    c.mult += cashFanBonus(s.coins);
  }, {
    lane: '金币',
    stageClear(s) {
      s.coins += 3;
      if (s.coins >= 12) s.nextHandBonus += 1;
      recordDeckChange(s, '财神像：获得 3 金币；金币充足时下关出牌 +1');
    },
  }),

  art('loopScript', '连环诀', '环', '连续打出顺子时最终得分 ×2.2。', (c, s) => {
    if (hasTag(c, 'straight') && s.lastComboTags.includes('straight')) c.factor *= 2.2;
  }, { lane: '顺子' }),

  art('twinHammer', '双锤令', '锤', '刻子系终局重击：普通刻子 ×2，五张刻子终局 ×2.4。', (c) => {
    if (hasTag(c, 'triplet')) c.factor *= isBigTripletCombo(c.combo) ? 2.4 : 2;
  }, { lane: '刻子' }),

  art('goldVault', '聚宝匣', '宝', '过关时金币越多，金币流成长越高。', (c, s) => {
    c.mult += s.growth.wealthFan;
  }, {
    lane: '金币',
    stageClear(s) { s.growth.wealthFan += Math.max(1, Math.floor(s.coins / 12)); },
  }),

  art('redCrane', '朱雀灯', '朱', '每张万字牌点数 +24。', (c) => {
    c.base += countSuit(c.tiles, 'wan') * 24;
  }, { lane: '万字' }),

  art('rainBell', '听雨铃', '雨', '每张筒子牌番数 +0.5。', (c) => {
    c.mult += countSuit(c.tiles, 'tong') * 0.5;
  }, { lane: '筒子' }),

  art('bambooSlip', '青竹简', '竹', '每张条子牌点数 +20，顺子再 +40。', (c) => {
    c.base += countSuit(c.tiles, 'tiao') * 20;
    if (hasTag(c, 'straight')) c.base += 40;
  }, { lane: '条子' }),

  art('clearMirror', '清门镜', '清', '清一色最终得分 ×2.5。', (c) => {
    if (hasTag(c, 'flush')) c.factor *= 2.5;
  }, { lane: '清一色' }),

  art('pairNeedle', '鸳鸯针', '双', '对子系番数 +4；牌山对子越多额外越高；两对额外 ×1.6。', (c) => {
    if (hasTag(c, 'pair')) {
      c.mult += 4 + Math.floor(deckPairPotential(c.state) / 6);
      if (c.combo.name === '两对') c.factor *= 1.6;
    }
  }, { lane: '对子' }),

  art('stonePot', '镇山炉', '山', '选择 5 张牌时点数 +110。', (c) => {
    if (c.tiles.length === 5) c.base += 110;
  }, { lane: '五张' }),

  art('windBanner', '风神幡', '风', '每张风牌番数 +1。', (c) => {
    c.mult += countSuit(c.tiles, 'wind');
  }, { lane: '字牌' }),

  art('trinityLamp', '三元灯', '元', '小三元番数 +5，三元牌点数 +30；三元归位额外 ×2.4。', (c) => {
    c.base += countSuit(c.tiles, 'dragon') * 30;
    if (hasTag(c, 'dragon')) c.mult += 5;
    if (c.combo.name === '三元归位') c.factor *= 2.4;
  }, { lane: '字牌' }),

  art('looseManual', '散修录', '散', '散牌番数 +3，每次散牌出牌成长 +1番；过关时散牌底盘 +28点、补字牌和换牌。', (c) => {
    if (hasTag(c, 'loose')) {
      c.mult += 3 + c.state.growth.looseFan;
      c.base += c.state.growth.looseBase;
    }
  }, {
    lane: '散牌',
    afterPlay(s, combo) { if (combo.tags.includes('loose')) s.growth.looseFan += 1; },
    stageClear(s) {
      addHonorTiles(s.deck, 2);
      s.discardsLeft += 1;
      s.growth.looseBase += 28;
      recordDeckChange(s, `散修录：字牌 +2、换牌 +1、散牌底盘 +28（共 +${s.growth.looseBase}点）`);
    },
  }),

  art('singleBlade', '孤锋刃', '孤', '只出 1 张牌时最终得分 ×3，每次高牌出牌成长 +0.2。', (c) => {
    if (c.tiles.length === 1) c.factor *= 3 + c.state.growth.highFactor;
  }, {
    lane: '高牌',
    afterPlay(s, combo) { if (combo.tags.includes('high')) s.growth.highFactor += 0.2; },
  }),

  art('fiveForge', '五行炉', '五', '选择 5 张牌时最终得分 ×1.6。', (c) => {
    if (c.tiles.length === 5) c.factor *= 1.6;
  }, { lane: '五张' }),

  art('middleGate', '中门令', '中', '每张 4-6 数牌点数 +28。', (c) => {
    c.base += c.tiles.filter(t => NUMERIC_SUITS.includes(t.suit) && t.rank >= 4 && t.rank <= 6).length * 28;
  }, { lane: '数牌' }),

  art('edgeLamp', '幺九灯', '幺', '每张 1/9 数牌番数 +1。', (c) => {
    c.mult += c.tiles.filter(t => NUMERIC_SUITS.includes(t.suit) && (t.rank === 1 || t.rank === 9)).length;
  }, { lane: '幺九' }),

  art('windCompass', '风盘', '盘', '打出至少 2 张风牌时最终得分 ×2。', (c) => {
    if (countSuit(c.tiles, 'wind') >= 2) c.factor *= 2;
  }, { lane: '字牌' }),

  art('sameGate', '同门契', '门', '同门散牌和清一色点数 +70。', (c) => {
    if (hasTag(c, 'sameSuit') || hasTag(c, 'flush')) c.base += 70;
  }, { lane: '清一色' }),

  art('pairEcho', '对子回声', '回', '对子、两对、满堂刻最终得分 ×2；两对额外 ×1.5；连续对子系再 ×1.4。', (c, s) => {
    if (hasTag(c, 'pair')) {
      c.factor *= 2;
      if (c.combo.name === '两对') c.factor *= 1.5;
      if (s.lastComboTags.includes('pair')) c.factor *= 1.4;
    }
  }, { lane: '对子' }),

  art('interestScroll', '利息卷', '利', '每 10 金币最终得分 +15%，最高 ×2.5。', (c, s) => {
    c.factor *= Math.min(2.5, 1 + Math.floor(s.coins / 10) * 0.15);
  }, { lane: '金币' }),

  art('wanSeal', '万字印', '万', '每张万字牌番数 +0.7。', (c) => {
    c.mult += countSuit(c.tiles, 'wan') * 0.7;
  }, { lane: '万字' }),

  art('tongDrum', '筒鼓', '筒', '每张筒子牌点数 +30。', (c) => {
    c.base += countSuit(c.tiles, 'tong') * 30;
  }, { lane: '筒子' }),

  art('tiaoThread', '条绳', '条', '条子牌达到 3 张时最终得分 ×1.8。', (c) => {
    if (countSuit(c.tiles, 'tiao') >= 3) c.factor *= 1.8;
  }, { lane: '条子' }),

  art('repeatSeal', '复诵印', '复', '连续打出同牌型时番数 +5。', (c, s) => {
    if (s.lastCombo === c.combo.name) c.mult += 5;
  }, { lane: '连打' }),

  art('lastHandBell', '残响铃', '残', '本关最后一次出牌最终得分 ×2.4。', (c, s) => {
    if (s.handsLeft === 1) c.factor *= 2.4;
  }, { lane: '爆发' }),

  art('cleanPurse', '净财袋', '袋', '每次打出清一色获得 3 金币。', () => {}, {
    lane: '清一色',
    afterPlay(s, combo) { if (combo.tags.includes('flush')) s.coins += 3; },
  }),
];

export function getArtifact(id: string): ArtifactDef {
  const a = ARTIFACTS.find(a => a.id === id);
  if (!a) throw new Error(`Unknown artifact: ${id}`);
  return a;
}

export const CORE_ARTIFACT_IDS = ['greenDragon', 'whiteTiger', 'cashToFan', 'looseManual', 'clearMirror', 'pairNeedle'];
