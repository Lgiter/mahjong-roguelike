// Core type definitions for the mahjong roguelike game

export type Suit = 'wan' | 'tong' | 'tiao' | 'wind' | 'dragon';

export interface Tile {
  id: string;
  suit: Suit;
  rank: number;
}

export interface HandCombo {
  valid: boolean;
  name: string;
  base: number;
  mult: number;
  tags: string[];
  tiles?: Tile[];
}

export interface ScoreContext {
  tiles: Tile[];
  combo: HandCombo;
  state: GameState;
  base: number;
  mult: number;
  factor: number;
  log: string[];
  triggers: { id: string; name: string }[];
}

export interface ArtifactDef {
  id: string;
  name: string;
  icon: string;
  desc: string;
  lane: string;
  color?: string;
  apply: (c: ScoreContext, s: GameState) => void;
  afterPlay?: (s: GameState, combo: HandCombo, tiles: Tile[]) => void;
  stageClear?: (s: GameState) => void;
}

export interface UpgradeDef {
  id: string;
  type: string;
  lane: string;
  name: string;
  desc: string;
  choose: (s: GameState) => void;
}

export interface StageEventDef {
  id: string;
  text: string;
}

export interface StageDef {
  target: number;
  hands: number;
  discards: number;
  enemy: string;
  boss?: boolean;
  rule?: { id: string; text: string };
}

export interface StageTheme {
  top: string;
  mid: string;
  accent: string;
  pattern: string;
}

export interface StartBuildDef {
  id: string;
  name: string;
  lane: string;
  deckMode: string;
  coins: number;
  desc: string;
  apply: (s: GameState) => void;
}

export interface DmgPop {
  value: number;
  x: number;
  y: number;
  until: number;
  tier: number;
  color: string;
}

export interface EnemyFx {
  until: number;
  attack: string;
  damage: number;
  tier: number;
  comboName: string;
  kind: string;
  color: string;
}

export interface HpFlash {
  prevRatio: number;
  newRatio: number;
  until: number;
}

export interface ResolveInfo {
  combo: string;
  total: number;
  from: number;
  to: number;
  log: string[];
  until: number;
}

export interface AdPrompt {
  kind: string;
  title: string;
  desc: string;
  onDone: () => void;
}

export interface GameGrowth {
  straightFan: number;
  tripletBase: number;
  wealthFan: number;
  looseFan: number;
  looseBase: number;
  highFactor: number;
}

export interface GameUpgrades {
  straightBase: number;
  tripletBase: number;
  flushMult: number;
}

export interface UpgradeFlags {
  straightFirstBurst: boolean;
  tripletEcho: boolean;
  flushFirstFan: boolean;
}

export interface UpgradeUses {
  straightFirstBurstUsed: boolean;
  flushFirstFanUsed: boolean;
}

export interface StageSummary {
  mainLane: string;
  bestHandScore: number;
  avgHandScore: number;
  laneCount: number;
  plays: number;
  power: number;
}

export type Screen = 'start' | 'build' | 'game' | 'reward' | 'replace' | 'end';

export interface GameState {
  screen: Screen;
  stageIndex: number;
  score: number;
  coins: number;
  handsLeft: number;
  discardsLeft: number;
  hand: Tile[];
  selected: Set<string>;
  deck: Tile[];
  discard: Tile[];
  artifacts: ArtifactDef[];
  upgrades: GameUpgrades;
  upgradeFlags: UpgradeFlags;
  upgradeUses: UpgradeUses;
  growth: GameGrowth;
  nextHandBonus: number;
  targetMultiplier: number;
  nextTargetPenalty: number;
  luckUsed: boolean;
  lastCombo: string;
  lastComboTags: string[];
  stageComboCounts: Record<string, number>;
  stageBestScore: number;
  stageTotalScore: number;
  stagePlays: number;
  stageSummary: StageSummary | null;
  lastStageLane: string;
  laneMisses: Record<string, number>;
  stageEvent: StageEventDef | null;
  stageEventFirstHandUsed: boolean;
  catchUpAvailable: boolean;
  finalPrepAvailable: boolean;
  targetAssistNext: number;
  deckChanges: string[];
  log: string[];
  lastTriggeredArtifacts: string[];
  rewardChoices: any[];
  paidUpgradeChoices: any[];
  startBuildChoices: StartBuildDef[];
  startLane: string;
  artifactSlots: number;
  runCount: number;
  debugMode: boolean;
  showDealDebug: boolean;
  dmgPops: DmgPop[];
  hpFlash: HpFlash | null;
  enemyFx: EnemyFx | null;
  boughtUpgradeThisReward: boolean;
  pendingArtifact: ArtifactDef | null;
  inspectedArtifact: ArtifactDef | null;
  showStageSelect: boolean;
  showHandHelp: boolean;
  showGuide: boolean;
  resolve: ResolveInfo | null;
  adPrompt: AdPrompt | null;
  adsUsed: { hand: number; discard: number; refresh: number; revive: number };
  toast: string;
  toastUntil: number;
  win?: boolean;
}
