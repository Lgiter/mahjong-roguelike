import type { UpgradeDef, GameState, StartBuildDef } from './types';
import {
  addRandomNumericTiles, removeTilesWhere, addHonorTiles, findPairSource, purgeSingles,
  mergeSameNumberTiles, repaintNumericTiles, seedStarterPairs,
} from '../core/deckOps';
import { shuffle, sample, cloneTile } from '../core/utils';

export const UPGRADES: UpgradeDef[] = [
  {
    id: 'upgradeStraight', type: '牌型升级', lane: '顺子', name: '顺势而为',
    desc: '顺子点数 +40；本关首次顺子最终 ×1.8。',
    choose: (s) => { s.upgrades.straightBase += 40; s.upgradeFlags.straightFirstBurst = true; },
  },
  {
    id: 'upgradeTriplet', type: '牌型升级', lane: '刻子', name: '重门叠影',
    desc: '刻子系点数 +80；刻子系出牌后复制其中 1 张入牌山。',
    choose: (s) => { s.upgrades.tripletBase += 80; s.upgradeFlags.tripletEcho = true; },
  },
  {
    id: 'upgradeFlush', type: '牌型升级', lane: '清一色', name: '一色入魂',
    desc: '清一色番数 +2；本关首次清一色额外 +3 番。',
    choose: (s) => { s.upgrades.flushMult += 2; s.upgradeFlags.flushFirstFan = true; },
  },
  {
    id: 'moreHands', type: '局内资源', lane: '通用', name: '添香续局',
    desc: '下一关出牌次数 +1。',
    choose: (s) => { s.nextHandBonus += 1; },
  },
  {
    id: 'coinPouch', type: '金币', lane: '金币', name: '小钱袋',
    desc: '立刻获得 7 金币。',
    choose: (s) => { s.coins += 7; },
  },
  {
    id: 'copyCore', type: '牌山改造', lane: '牌山', name: '拓印术',
    desc: '复制手牌中随机 2 张加入牌山。',
    choose: (s) => { shuffle([...s.hand]).slice(0, 2).forEach(t => s.deck.push(cloneTile(t))); },
  },
  {
    id: 'purgeHonors', type: '牌山改造', lane: '顺子', name: '清风扫叶',
    desc: '从牌山移除最多 5 张字牌，更容易摸到数牌。',
    choose: (s) => { removeTilesWhere(s.deck, t => t.suit === 'wind' || t.suit === 'dragon', 5); },
  },
  {
    id: 'seedMiddle', type: '牌山改造', lane: '顺子', name: '聚中张',
    desc: '向牌山加入 4 张 3-7 的数牌。',
    choose: (s) => { addRandomNumericTiles(s.deck, 4, 3, 7); },
  },
  {
    id: 'copyPair', type: '牌山改造', lane: '刻子', name: '摹对子',
    desc: '复制一张已有对子 2 次，没有对子则复制随机手牌。',
    choose: (s) => {
      const src = findPairSource([...s.hand, ...s.deck]) ?? sample(s.hand);
      if (src) s.deck.push(cloneTile(src), cloneTile(src));
    },
  },
  {
    id: 'mergeNumber', type: '牌山改造', lane: '对子', name: '并牌术',
    desc: '把 3 张同数字不同门的数牌改成同一牌面。',
    choose: (s) => { mergeSameNumberTiles(s, 3); },
  },
  {
    id: 'seedTriplet', type: '牌山改造', lane: '刻子', name: '聚刻令',
    desc: '选择一张手牌，向牌山加入 3 张相同牌。',
    choose: (s) => {
      const src = sample(s.hand);
      if (src) s.deck.push(cloneTile(src), cloneTile(src), cloneTile(src));
    },
  },
  {
    id: 'purgeSingles', type: '牌山改造', lane: '刻子', name: '删孤张',
    desc: '移除最多 4 张当前没有重复的牌。',
    choose: (s) => { purgeSingles(s.deck, 4); },
  },
  {
    id: 'sameSuitPaint', type: '牌山改造', lane: '清一色', name: '染一门',
    desc: '把 4 张随机数牌改成同一门。',
    choose: (s) => { repaintNumericTiles(s, 4); },
  },
  {
    id: 'feedLoose', type: '牌山改造', lane: '散牌', name: '散牌补给',
    desc: '加入 3 张高价值字牌，并获得 1 次换牌。',
    choose: (s) => { addHonorTiles(s.deck, 3); s.discardsLeft += 1; },
  },
  {
    id: 'cashReserve', type: '牌山改造', lane: '金币', name: '留财不动',
    desc: '获得 5 金币；下关出牌次数 +1。',
    choose: (s) => { s.coins += 5; s.nextHandBonus += 1; },
  },
];

export const START_BUILDS: StartBuildDef[] = [
  {
    id: 'balanced', name: '均衡试炼', lane: '通用', deckMode: 'balanced', coins: 6,
    desc: '标准牌山和金币。适合第一次体验完整节奏。',
    apply: () => {},
  },
  {
    id: 'bamboo', name: '青竹顺道', lane: '顺子', deckMode: 'bamboo', coins: 5,
    desc: '条子与中张更多，开局顺子更容易成型。',
    apply: (s) => { s.upgrades.straightBase += 20; },
  },
  {
    id: 'pair', name: '重楼对子', lane: '对子', deckMode: 'pairs', coins: 5,
    desc: '牌山会预埋重复牌，方便对子、刻子起步。',
    apply: (s) => { seedStarterPairs(s.deck); },
  },
  {
    id: 'honor', name: '散修字门', lane: '散牌', deckMode: 'honor', coins: 7,
    desc: '字牌和金币更多，适合散牌与高价值单牌过渡。',
    apply: (s) => { addHonorTiles(s.deck, 2); },
  },
];
