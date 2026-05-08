/**
 * Pure game logic — no rendering, no Cocos APIs.
 * All mutations happen on a GameState object passed in.
 */
import type { GameState, ArtifactDef, HandCombo, Tile, StartBuildDef, UpgradeDef } from '../data/types';
import { STAGES, STAGE_EVENTS } from '../data/stages';
import { ARTIFACTS, getArtifact, CORE_ARTIFACT_IDS } from '../data/artifacts';
import { UPGRADES, START_BUILDS } from '../data/upgrades';
import { createInitialState, stageTarget } from './gameState';
import { createDeck, drawTiles, reshuffleIfNeeded, handLimit, refillHand,
         selectedTiles, moveSelectedToDiscard, topUpHand, trimHandToLimit,
         addRandomNumericTiles, removeTilesWhere, addHonorTiles, seedDeckPairs,
         addAdjacentRunSeeds, purgeSingles, findPairSource, repaintNumericTiles,
         mergeSameNumberTiles, cloneTile as deckCloneTile } from './deckOps';
import { evaluateTiles, laneForCombo, isDragonFullSet, isBigTripletCombo } from './evaluator';
import { calculateScore } from './scoring';
import { shuffle, sample, cloneTile, tileText, formatInt, colorToRgb, getCounts } from './utils';
import { NUMERIC_SUITS } from '../data/constants';

// ── Public event emitter (UI listens here) ────────────────────────────────────

type EventName = 'stateChange' | 'toast' | 'stageClear' | 'runEnd' | 'scoreAnim';
const _listeners = new Map<EventName, Set<Function>>();
export function on(ev: EventName, fn: Function): void {
  if (!_listeners.has(ev)) _listeners.set(ev, new Set());
  _listeners.get(ev)!.add(fn);
}
export function off(ev: EventName, fn: Function): void {
  _listeners.get(ev)?.delete(fn);
}
function emit(ev: EventName, ...args: any[]): void {
  _listeners.get(ev)?.forEach(fn => fn(...args));
}

// ── Singleton state ───────────────────────────────────────────────────────────

export let state: GameState = createInitialState();

function recordDeckChange(msg: string): void {
  state.deckChanges.push(msg);
  if (state.deckChanges.length > 4) state.deckChanges.shift();
}

function toast(msg: string): void {
  state.toast = msg;
  state.toastUntil = Date.now() + 2200;
  emit('toast', msg);
}

// ── Run / Stage lifecycle ─────────────────────────────────────────────────────

export function startRun(startIndex = 0, debugMode = false, startBuild: StartBuildDef = START_BUILDS[0]): void {
  const s = state;
  s.screen = 'game';
  s.stageIndex = startIndex;
  s.debugMode = debugMode;
  if (!debugMode) s.runCount += 1;
  s.score = 0;
  s.coins = debugMode ? 12 : startBuild.coins;
  s.hand = [];
  s.selected = new Set();
  s.deck = createDeck(debugMode ? 'balanced' : startBuild.deckMode);
  s.discard = [];
  s.artifacts = debugMode && startIndex > 0
    ? ['trialCharm', 'greenDragon', 'whiteTiger', 'cashToFan', 'looseManual'].map(getArtifact)
    : [getArtifact('trialCharm')];
  s.startLane = startBuild.lane || '通用';
  s.artifactSlots = 5;
  s.upgrades = { straightBase: 0, tripletBase: 0, flushMult: 0 };
  s.upgradeFlags = { straightFirstBurst: false, tripletEcho: false, flushFirstFan: false };
  s.upgradeUses = { straightFirstBurstUsed: false, flushFirstFanUsed: false };
  s.growth = { straightFan: 0, tripletBase: 0, wealthFan: 0, looseFan: 0, looseBase: 0, highFactor: 0 };
  if (!debugMode && startBuild.apply) startBuild.apply(s);
  s.nextHandBonus = 0;
  s.targetMultiplier = 1;
  s.nextTargetPenalty = 0;
  s.luckUsed = false;
  s.lastCombo = '';
  s.lastComboTags = [];
  s.stageComboCounts = {};
  s.stageBestScore = 0;
  s.stageTotalScore = 0;
  s.stagePlays = 0;
  s.stageSummary = null;
  s.lastStageLane = '';
  s.laneMisses = {};
  s.stageEvent = null;
  s.stageEventFirstHandUsed = false;
  s.catchUpAvailable = false;
  s.finalPrepAvailable = false;
  s.targetAssistNext = 0;
  s.deckChanges = [];
  s.log = [];
  s.lastTriggeredArtifacts = [];
  s.rewardChoices = [];
  s.paidUpgradeChoices = [];
  s.dmgPops = [];
  s.hpFlash = null;
  s.enemyFx = null;
  s.boughtUpgradeThisReward = false;
  s.inspectedArtifact = null;
  s.resolve = null;
  s.adPrompt = null;
  s.adsUsed = { hand: 0, discard: 0, refresh: 0, revive: 0 };
  s.showStageSelect = false;
  s.showDealDebug = false;
  s.startBuildChoices = [];
  s.showGuide = !debugMode;
  beginStage();
}

export function beginStage(): void {
  const s = state;
  const stage = STAGES[s.stageIndex];
  s.screen = 'game';
  s.score = 0;
  s.targetMultiplier = 1 + s.nextTargetPenalty;
  if (s.targetAssistNext > 0) {
    s.targetMultiplier = Math.max(0.75, s.targetMultiplier - s.targetAssistNext);
    s.targetAssistNext = 0;
  }
  s.nextTargetPenalty = 0;
  s.upgradeUses.straightFirstBurstUsed = false;
  s.upgradeUses.flushFirstFanUsed = false;
  s.handsLeft = stage.hands + s.nextHandBonus;
  s.discardsLeft = stage.discards;
  s.nextHandBonus = 0;
  s.stageEvent = stage.boss ? null : (Math.random() < 0.6 ? sample(STAGE_EVENTS) : null);
  s.stageEventFirstHandUsed = false;
  if (s.stageEvent?.id === 'elite') s.targetMultiplier *= 1.15;
  else if (s.stageEvent?.id === 'brief') { s.handsLeft = Math.max(1, s.handsLeft - 1); s.discardsLeft += 2; }
  s.stageComboCounts = {};
  s.stageBestScore = 0;
  s.stageTotalScore = 0;
  s.stagePlays = 0;
  s.selected.clear();
  prepareDeckForStage();
  reshuffleIfNeeded(s, 10);
  s.hand = drawTiles(s, handLimit());
  ensureOpeningSeed();
  topUpHand(s);
  trimHandToLimit(s);
  const stageToast = stage.boss && stage.rule ? stage.rule.text : `${stage.enemy} 出现`;
  toast(s.stageEvent ? `${stageToast}  ·  ${s.stageEvent.text}` : stageToast);
  emit('stateChange');
}

// ── Gameplay actions ──────────────────────────────────────────────────────────

export function playSelected(): string | null {
  const tiles = selectedTiles(state);
  if (tiles.length < 1 || tiles.length > 5) { toast('请选择 1-5 张牌'); return null; }
  const combo = evaluateTiles(tiles);
  const result = calculateScore(tiles, combo, state);
  const beforeScore = state.score;
  let playTotal = result.total;

  if (state.stageEvent?.id === 'lucky' && !state.stageEventFirstHandUsed) {
    playTotal = Math.floor(playTotal * 1.5);
    state.stageEventFirstHandUsed = true;
  }

  state.score += playTotal;
  state.stageBestScore = Math.max(state.stageBestScore, playTotal);
  state.stageTotalScore += playTotal;
  state.stagePlays += 1;
  triggerEnemyFx(combo, playTotal, beforeScore);
  state.handsLeft -= 1;
  state.coins += combo.tags.includes('flush') ? 2 : 1;
  if (state.stageEvent?.id === 'windfall') state.coins += 1;
  state.artifacts.forEach(a => a.afterPlay?.(state, combo, tiles));
  applyUpgradeAfterPlay(combo, tiles);
  if (state.stageEvent?.id === 'coinBleed') state.coins = Math.max(0, state.coins - 2);
  state.lastTriggeredArtifacts = result.triggers.map(t => t.id);
  recordComboLane(combo);
  state.lastCombo = combo.name;
  state.lastComboTags = [...combo.tags];
  state.log = result.log;
  state.resolve = { combo: combo.name, total: playTotal, from: beforeScore, to: state.score, log: result.log, until: Date.now() + 1400 };
  moveSelectedToDiscard(state);
  refillHand(state);
  toast(`${combo.name} +${formatInt(playTotal)}`);
  emit('scoreAnim', playTotal, combo);

  if (state.score >= stageTarget(state)) {
    setTimeout(() => completeStage(), 250);
  } else if (state.handsLeft <= 0) {
    setTimeout(() => endRun(false), 250);
  }
  emit('stateChange');
  return combo.name;
}

export function discardSelected(): void {
  if (!state.selected.size) { toast('先选择要换掉的牌'); return; }
  if (state.discardsLeft <= 0) { toast('换牌次数不足'); return; }
  state.discardsLeft -= 1;
  moveSelectedToDiscard(state);
  refillHand(state);
  emit('stateChange');
}

export function toggleSelect(tileId: string): void {
  if (state.selected.has(tileId)) state.selected.delete(tileId);
  else if (state.selected.size < 5) state.selected.add(tileId);
  emit('stateChange');
}

export function buyDiscardWithCoins(): void {
  if (state.discardsLeft > 0) { toast('还有换牌次数，先直接换牌'); return; }
  if (state.coins < 3) { toast('金币不足：补换牌需要 3 金币'); return; }
  state.coins -= 3;
  state.discardsLeft += 1;
  toast('花费 3 金币补 1 次换牌');
  emit('stateChange');
}

export function borrowLuck(): void {
  if (state.luckUsed) { toast('本局已经借运过'); return; }
  state.luckUsed = true;
  state.handsLeft += 1;
  state.discardsLeft += 1;
  state.nextTargetPenalty += 0.1;
  toast('借运：本关出牌和换牌 +1，下关目标 +10%');
  emit('stateChange');
}

// ── Stage completion ──────────────────────────────────────────────────────────

function completeStage(): void {
  const bonus = Math.max(2, state.handsLeft + 2);
  const interest = Math.min(5, Math.floor(state.coins / 5));
  state.coins += bonus + interest;
  if (interest > 0) recordDeckChange(`利息：存款额外获得 ${interest} 金币`);
  if (state.stageEvent?.id === 'elite') { state.coins += 3; recordDeckChange('精英局过关：额外奖励 3 金币'); }
  state.artifacts.forEach(a => a.stageClear?.(state));
  maybeGrantArtifactSlot();
  state.stageSummary = summarizeStage();
  state.lastStageLane = state.stageSummary.mainLane;
  if (state.stageIndex >= STAGES.length - 1) return endRun(true);
  planCatchUpForNextStage();
  state.stageIndex += 1;
  openReward(bonus);
}

function openReward(bonus: number): void {
  state.rewardChoices = createRewardChoices();
  updateLaneGuarantee(state.rewardChoices);
  (state as any).rewardBonus = bonus;
  state.boughtUpgradeThisReward = false;
  state.paidUpgradeChoices = [];
  state.screen = 'reward';
  emit('stateChange');
}

export function chooseReward(choice: any): void {
  state.paidUpgradeChoices = [];
  if (choice.type === '法器') return chooseArtifact(choice.artifact);
  (choice as UpgradeDef).choose(state);
  beginStage();
}

export function refreshRewardsWithCoins(): void {
  if (state.stageIndex === 1) { toast('核心法器不能刷新'); return; }
  if (state.coins < 3) { toast('金币不足：刷新需要 3 金币'); return; }
  state.coins -= 3;
  state.rewardChoices = createRewardChoices();
  toast('花费 3 金币刷新奖励');
  emit('stateChange');
}

export function buyDeckUpgradeWithCoins(): void {
  if (state.stageIndex === 1) { toast('核心法器阶段不能购买改造'); return; }
  if (state.boughtUpgradeThisReward) { toast('本次奖励已购买过改造'); return; }
  if (state.coins < 5) { toast('金币不足：改造需要 5 金币'); return; }
  state.paidUpgradeChoices = weightedRewardChoices(UPGRADES.filter(u => u.type === '牌山改造'), 2);
  toast('选择 1 项牌山改造');
  emit('stateChange');
}

export function choosePaidDeckUpgrade(upgrade: UpgradeDef): void {
  if (state.boughtUpgradeThisReward) { toast('本次奖励已购买过改造'); return; }
  if (state.coins < 5) { toast('金币不足：改造需要 5 金币'); return; }
  state.coins -= 5;
  state.boughtUpgradeThisReward = true;
  state.paidUpgradeChoices = [];
  upgrade.choose(state);
  recordDeckChange(`花费 5 金币购买：${upgrade.name}`);
  toast(`获得牌山改造：${upgrade.name}`);
  emit('stateChange');
}

export function takeCatchUpReward(): void {
  const lane = state.stageSummary?.mainLane || state.lastStageLane || '通用';
  const finalPrep = state.finalPrepAvailable;
  if (!state.catchUpAvailable && !finalPrep) { toast('暂无天命改造'); return; }
  state.catchUpAvailable = false;
  state.finalPrepAvailable = false;
  state.targetAssistNext = Math.max(state.targetAssistNext, finalPrep ? 0.2 : 0.15);
  state.nextHandBonus += finalPrep ? 1 : 0;
  applyLaneDeckAssist(lane, finalPrep ?? false);
  recordDeckChange(`${finalPrep ? '终局强化' : '天命改造'}：补强${lane}流，下一关目标降低`);
  toast(finalPrep ? '终局强化完成' : '天命改造完成');
  emit('stateChange');
}

export function chooseArtifact(artifactItem: ArtifactDef): void {
  if (state.artifacts.length < state.artifactSlots) {
    state.artifacts.push(artifactItem);
    return beginStage();
  }
  state.pendingArtifact = artifactItem;
  state.screen = 'replace';
  emit('stateChange');
}

export function replaceArtifact(index: number): void {
  if (!state.pendingArtifact) return;
  state.artifacts[index] = state.pendingArtifact;
  state.pendingArtifact = null;
  beginStage();
}

export function endRun(win: boolean): void {
  state.screen = 'end';
  state.win = win;
  emit('runEnd', win);
  emit('stateChange');
}

// ── Ad prompts ────────────────────────────────────────────────────────────────

export function watchAdForHand(): void {
  if (state.adsUsed.hand >= 1) { toast('本关已使用过加次广告'); return; }
  state.adPrompt = {
    kind: 'hand', title: '模拟激励视频', desc: '看完后本关出牌次数 +1。',
    onDone: () => { state.adsUsed.hand += 1; state.handsLeft += 1; emit('stateChange'); },
  };
  emit('stateChange');
}

export function watchAdForDiscard(): void {
  if (state.adsUsed.discard >= 1) { toast('本关已使用过换牌广告'); return; }
  state.adPrompt = {
    kind: 'discard', title: '模拟激励视频', desc: '看完后本关换牌次数 +1。',
    onDone: () => { state.adsUsed.discard += 1; state.discardsLeft += 1; emit('stateChange'); },
  };
  emit('stateChange');
}

export function watchAdForRevive(): void {
  if (state.win || state.adsUsed.revive >= 1) return;
  state.adPrompt = {
    kind: 'revive', title: '模拟激励视频', desc: '看完后回到本关，并获得 2 次出牌机会。',
    onDone: () => {
      state.adsUsed.revive += 1;
      state.screen = 'game';
      state.score = Math.floor(stageTarget(state) * 0.35);
      state.handsLeft = 2;
      state.discardsLeft = Math.max(state.discardsLeft, 1);
      state.selected.clear();
      refillHand(state);
      emit('stateChange');
    },
  };
  emit('stateChange');
}

export function finishAdPrompt(): void {
  const p = state.adPrompt;
  state.adPrompt = null;
  p?.onDone();
  toast('模拟广告完成');
}

export function closeAdPrompt(): void {
  state.adPrompt = null;
  emit('stateChange');
}

export function openBuildSelect(): void {
  if (state.runCount === 0) {
    const balanced = START_BUILDS.find(b => b.id === 'balanced')!;
    const others = shuffle(START_BUILDS.filter(b => b.id !== 'balanced')).slice(0, 2);
    state.startBuildChoices = shuffle([balanced, ...others]);
  } else {
    state.startBuildChoices = shuffle(START_BUILDS).slice(0, 3);
  }
  state.screen = 'build';
  emit('stateChange');
}

// ── VFX helpers ───────────────────────────────────────────────────────────────

function triggerEnemyFx(combo: HandCombo, total: number, prevScore: number): void {
  const style = attackStyle(combo);
  const tier = attackTier(total, prevScore);
  state.enemyFx = {
    until: Date.now() + (tier >= 4 ? 700 : tier >= 3 ? 600 : 520),
    attack: attackLabel(combo),
    damage: total, tier,
    comboName: combo.name,
    kind: style.kind,
    color: style.color,
  };
  const target = stageTarget(state);
  state.hpFlash = {
    prevRatio: Math.max(0, 1 - prevScore / target),
    newRatio: Math.max(0, 1 - state.score / target),
    until: Date.now() + 550,
  };
  state.dmgPops.push({
    value: total,
    x: 0.5 + (Math.random() * 0.1 - 0.05),  // normalized 0-1, UI resolves to pixels
    y: 0,
    until: Date.now() + (tier >= 3 ? 1000 : 700),
    tier,
    color: style.color,
  });
}

export function attackTier(total: number, prevScore: number): number {
  const handsLeft = Math.max(1, state.handsLeft);
  const needed = Math.ceil(Math.max(1, stageTarget(state) - prevScore) / handsLeft);
  const ratio = total / needed;
  if (ratio >= 5) return 4;
  if (ratio >= 2) return 3;
  if (ratio >= 0.7) return 2;
  return 1;
}

function attackLabel(combo: HandCombo): string {
  if (combo.tags.includes('flush'))   return '绝式';
  if (combo.tags.includes('triplet')) return combo.tiles && combo.tiles.length >= 4 ? '碎甲' : '重击';
  if (combo.tags.includes('straight')) return '连斩';
  if (combo.tags.includes('pair'))    return '双击';
  if (combo.tags.includes('dragon'))  return '法印';
  if (combo.tags.includes('high'))    return '点刺';
  return '压制';
}

function attackStyle(combo: HandCombo): { kind: string; color: string } {
  if (combo.tags.includes('flush'))   return { kind: 'burst', color: '#f26d6d' };
  if (combo.tags.includes('triplet')) return { kind: 'crush', color: '#f2bd55' };
  if (combo.tags.includes('straight')) return { kind: 'slash', color: '#60d394' };
  if (combo.tags.includes('pair'))    return { kind: 'echo',  color: '#d38cff' };
  if (combo.tags.includes('dragon'))  return { kind: 'seal',  color: '#e6e1d2' };
  if (combo.tags.includes('high'))    return { kind: 'sting', color: '#56a8ff' };
  return { kind: 'shock', color: '#a9b1ad' };
}

// ── Reward & lane logic ───────────────────────────────────────────────────────

function createRewardChoices(): any[] {
  if (state.stageIndex === 1) {
    return shuffle(CORE_ARTIFACT_IDS.map(getArtifact).map(artifactReward)).slice(0, 4);
  }
  const choices = weightedRewardChoices(mixedRewards(), 3);
  if (state.lastStageLane && (state.laneMisses[state.lastStageLane] ?? 0) >= 1) {
    ensureLaneChoice(choices, state.lastStageLane);
  }
  return choices;
}

function mixedRewards(): any[] {
  const artifactRewards = ARTIFACTS
    .filter(a => a.id !== 'trialCharm' && !state.artifacts.some(owned => owned.id === a.id))
    .map(artifactReward);
  return [...artifactRewards, ...UPGRADES];
}

function weightedRewardChoices(pool: any[], count: number): any[] {
  const picked: any[] = [];
  const preferred = preferredLanes();
  const remaining = [...pool];
  const preferredPool = remaining.filter(item => preferred.includes(item.lane));
  if (preferredPool.length) {
    const first = sample(preferredPool);
    picked.push(first);
    remaining.splice(remaining.findIndex(item => item.id === first.id), 1);
  }
  while (picked.length < count && remaining.length) {
    const weighted: any[] = [];
    remaining.forEach(item => {
      const w = preferred.includes(item.lane) ? 4 : 1;
      for (let i = 0; i < w; i++) weighted.push(item);
    });
    const choice = sample(weighted);
    picked.push(choice);
    remaining.splice(remaining.findIndex(item => item.id === choice.id), 1);
  }
  return picked;
}

function preferredLanes(): string[] {
  const lanes = state.artifacts.map(a => a.lane).filter(l => l && l !== '通用');
  if (state.lastStageLane) lanes.push(state.lastStageLane);
  if (state.lastStageLane === '散牌' || state.lastStageLane === '高牌') lanes.push('五张', '通用');
  return [...new Set(lanes)];
}

function artifactReward(a: ArtifactDef): any {
  return { ...a, type: '法器', artifact: a };
}

function ensureLaneChoice(choices: any[], lane: string): any[] {
  if (!lane || choices.some(item => item.lane === lane)) return choices;
  const pool = mixedRewards().filter(item => item.lane === lane && !choices.some(c => c.id === item.id));
  if (pool.length) choices[choices.length - 1] = sample(pool);
  return choices;
}

function updateLaneGuarantee(choices: any[]): void {
  const lane = state.lastStageLane;
  if (!lane || lane === '通用') return;
  if (choices.some(item => item.lane === lane)) { state.laneMisses[lane] = 0; return; }
  state.laneMisses[lane] = (state.laneMisses[lane] ?? 0) + 1;
  if (state.laneMisses[lane] >= 2) { ensureLaneChoice(choices, lane); state.laneMisses[lane] = 0; }
}

// ── Deck prep ─────────────────────────────────────────────────────────────────

function prepareDeckForStage(): void {
  const lane = activeLanePreference();
  if (lane === '顺子') {
    addRandomNumericTiles(state.deck, 2, 3, 7);
    addAdjacentRunSeeds(state.deck, 1);
    removeTilesWhere(state.deck, t => t.suit === 'wind' || t.suit === 'dragon', 1);
  } else if (lane === '刻子') {
    seedDeckPairs(state.deck, 2);
    purgeSingles(state.deck, 1);
  } else if (lane === '对子') {
    seedDeckPairs(state.deck, 3);
  } else if (lane === '散牌' || lane === '字牌' || lane === '高牌') {
    addHonorTiles(state.deck, 2);
  }
}

function activeLanePreference(): string {
  const recentLane = state.lastStageLane;
  if (recentLane && recentLane !== '通用' && recentLane !== '未成型') return recentLane;
  const laneCounts = new Map<string, number>();
  state.artifacts.forEach(a => {
    if (!a.lane || a.lane === '通用') return;
    laneCounts.set(a.lane, (laneCounts.get(a.lane) ?? 0) + 1);
  });
  const ranked = [...laneCounts.entries()].sort((a, b) => b[1] - a[1]);
  if (ranked.length) return ranked[0][0];
  return state.startLane || '通用';
}

// ── Opening seed ──────────────────────────────────────────────────────────────

function ensureOpeningSeed(): void {
  const lane = activeLanePreference();
  if (lane === '顺子') ensureStraightSeed();
  else if (lane === '刻子' || lane === '对子') ensurePairSeed(lane === '刻子' ? 2 : 1);
  else if (lane === '散牌' || lane === '字牌') ensureHonorSeed();
}

function ensureStraightSeed(): void {
  if (hasStraightSeed(state.hand)) return;
  const candidate = pullAdjacentTileFromDeck(state.hand);
  if (candidate) replaceWeakestHandTile(candidate);
}

function ensurePairSeed(minPairs: number): void {
  if (countExactPairs(state.hand) >= minPairs) return;
  const candidate = pullMatchingTileFromDeck(state.hand);
  if (candidate) replaceWeakestHandTile(candidate);
}

function ensureHonorSeed(): void {
  const honorCount = state.hand.filter(t => t.suit === 'wind' || t.suit === 'dragon').length;
  if (honorCount >= 2) return;
  const idx = state.deck.findIndex(t => t.suit === 'wind' || t.suit === 'dragon');
  if (idx < 0) return;
  const [candidate] = state.deck.splice(idx, 1);
  replaceWeakestHandTile(candidate);
}

function hasStraightSeed(tiles: Tile[]): boolean {
  for (const suit of NUMERIC_SUITS) {
    const ranks = [...new Set(tiles.filter(t => t.suit === suit).map(t => t.rank))].sort((a: number, b: number) => a - b);
    for (let i = 1; i < ranks.length; i++) {
      if ((ranks as number[])[i] === (ranks as number[])[i - 1] + 1) return true;
    }
  }
  return false;
}

function countExactPairs(tiles: Tile[]): number {
  return [...getCounts(tiles).values()].filter((v: number) => v >= 2).length;
}

function pullMatchingTileFromDeck(hand: Tile[]): Tile | null {
  const wanted = new Set(hand.map(t => `${t.suit}-${t.rank}`));
  const idx = state.deck.findIndex(t => wanted.has(`${t.suit}-${t.rank}`));
  return idx < 0 ? null : state.deck.splice(idx, 1)[0];
}

function pullAdjacentTileFromDeck(hand: Tile[]): Tile | null {
  const numeric = hand.filter(t => NUMERIC_SUITS.includes(t.suit));
  for (const tile of numeric) {
    const idx = state.deck.findIndex(d => d.suit === tile.suit && Math.abs(d.rank - tile.rank) === 1);
    if (idx >= 0) return state.deck.splice(idx, 1)[0];
  }
  const fallback = state.deck.findIndex((t, i, arr) => {
    if (!NUMERIC_SUITS.includes(t.suit)) return false;
    return arr.some((o, j) => j !== i && o.suit === t.suit && Math.abs(o.rank - t.rank) === 1);
  });
  return fallback < 0 ? null : state.deck.splice(fallback, 1)[0];
}

function replaceWeakestHandTile(tile: Tile): void {
  if (!state.hand.length) { state.hand.push(tile); return; }
  let replaceIndex = 0, worstScore = Infinity;
  state.hand.forEach((ht, i) => {
    const s = weaknessScore(ht);
    if (s < worstScore) { worstScore = s; replaceIndex = i; }
  });
  state.discard.push(state.hand[replaceIndex]);
  state.hand[replaceIndex] = tile;
}

function weaknessScore(tile: Tile): number {
  const sameCount = state.hand.filter(ht => ht.suit === tile.suit && ht.rank === tile.rank).length;
  const adjCount = state.hand.filter(ht => ht.id !== tile.id && ht.suit === tile.suit && Math.abs(ht.rank - tile.rank) === 1).length;
  let score = 0;
  if (tile.suit === 'wind' || tile.suit === 'dragon') score -= 1;
  if (sameCount >= 2) score += 4;
  if (adjCount > 0) score += 3;
  if (NUMERIC_SUITS.includes(tile.suit) && tile.rank >= 3 && tile.rank <= 7) score += 1;
  return score;
}

// ── Stage analytics ───────────────────────────────────────────────────────────

function recordComboLane(combo: HandCombo): void {
  const lane = laneForCombo(combo);
  state.stageComboCounts[lane] = (state.stageComboCounts[lane] ?? 0) + 1;
}

function dominantStageLane(): string {
  const entries = Object.entries(state.stageComboCounts);
  if (!entries.length) return '';
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0];
}

function summarizeStage() {
  const mainLane = dominantStageLane() || state.lastStageLane || '未成型';
  const avgHandScore = state.stagePlays ? Math.round(state.stageTotalScore / state.stagePlays) : 0;
  const laneCount = state.stageComboCounts[mainLane] ?? 0;
  return {
    mainLane, bestHandScore: state.stageBestScore, avgHandScore, laneCount,
    plays: state.stagePlays,
    power: Math.round(state.stageBestScore * 0.6 + avgHandScore * 2.5),
  };
}

function planCatchUpForNextStage(): void {
  const nextStage = STAGES[state.stageIndex + 1];
  if (!nextStage || !state.stageSummary) return;
  const expectedHands = nextStage.hands + state.nextHandBonus;
  const neededPerHand = nextStage.target / Math.max(1, expectedHands);
  const behind = state.stageSummary.bestHandScore < neededPerHand * 0.55 ||
    state.stageSummary.avgHandScore < neededPerHand * 0.32;
  state.catchUpAvailable = behind;
  const finalPressure = state.stageIndex >= 9 &&
    state.stageSummary.bestHandScore < STAGES[STAGES.length - 1].target / 8;
  state.finalPrepAvailable = finalPressure;
}

function applyLaneDeckAssist(lane: string, strong: boolean): void {
  if (lane === '顺子') {
    addRandomNumericTiles(state.deck, strong ? 8 : 5, 3, 7);
    removeTilesWhere(state.deck, t => t.suit === 'wind' || t.suit === 'dragon', strong ? 6 : 3);
    state.upgrades.straightBase += strong ? 120 : 70;
  } else if (lane === '刻子') {
    const src = findPairSource([...state.hand, ...state.deck, ...state.discard]) ?? sample(state.hand);
    if (src) {
      const copies = strong ? 6 : 4;
      for (let i = 0; i < copies; i++) state.deck.push(cloneTile(src));
    }
    purgeSingles(state.deck, strong ? 7 : 4);
    state.upgrades.tripletBase += strong ? 180 : 100;
  } else if (lane === '清一色') {
    repaintNumericTiles(state, strong ? 9 : 6);
    state.upgrades.flushMult += strong ? 4 : 2;
  } else if (lane === '对子') {
    const src = findPairSource([...state.hand, ...state.deck]) ?? sample(state.hand);
    if (src) {
      const copies = strong ? 5 : 4;
      for (let i = 0; i < copies; i++) state.deck.push(cloneTile(src));
    }
    mergeSameNumberTiles(state, strong ? 6 : 4);
    state.upgrades.tripletBase += strong ? 80 : 40;
  } else if (lane === '金币') {
    state.coins += strong ? 16 : 10;
    state.nextHandBonus += 1;
  } else {
    addHonorTiles(state.deck, strong ? 6 : 4);
    state.nextHandBonus += 1;
  }
}

function maybeGrantArtifactSlot(): void {
  if (state.stageIndex === 5 && state.artifactSlots < 6) {
    state.artifactSlots = 6;
    recordDeckChange('灵台扩容：法器槽位 +1（现为 6）');
  }
  if (state.stageIndex === 9 && state.artifactSlots < 7) {
    state.artifactSlots = 7;
    recordDeckChange('灵台扩容：法器槽位 +1（现为 7）');
  }
}

function applyUpgradeAfterPlay(combo: HandCombo, tiles: Tile[]): void {
  if (!state.upgradeFlags.tripletEcho || !combo.tags.includes('triplet')) return;
  const src = sample(tiles);
  if (src) {
    state.deck.push(cloneTile(src));
    recordDeckChange(`重门叠影：复制 ${tileText(src)} 入牌山`);
  }
}

// ── Preview helpers (called by UI) ────────────────────────────────────────────

export function previewCombo(tiles: Tile[]): HandCombo | null {
  if (!tiles.length) return null;
  return evaluateTiles(tiles);
}

export function previewScore(tiles: Tile[]): ReturnType<typeof calculateScore> | null {
  if (!tiles.length) return null;
  const combo = evaluateTiles(tiles);
  return calculateScore(tiles, combo, state);
}
