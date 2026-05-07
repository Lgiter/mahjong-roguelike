const canvas = wx.createCanvas();
const ctx = canvas.getContext("2d");
const dpr = wx.getSystemInfoSync().pixelRatio || 1;
const system = wx.getSystemInfoSync();

canvas.width = system.windowWidth * dpr;
canvas.height = system.windowHeight * dpr;
ctx.scale(dpr, dpr);

const W = system.windowWidth;
const H = system.windowHeight;
const COLORS = {
  bg: "#111315",
  panel: "#1b2024",
  panel2: "#222a2d",
  line: "#334047",
  text: "#f3efe3",
  muted: "#a9b1ad",
  gold: "#f2bd55",
  green: "#60d394",
  red: "#f26d6d",
  tile: "#fff8e9",
  ink: "#16120c",
};

const WIND_NAMES = ["东", "南", "西", "北"];
const DRAGON_NAMES = ["中", "发", "白"];
const SUIT_LABELS = { wan: "万", tong: "筒", tiao: "条", wind: "风", dragon: "元" };
const NUMERIC_SUITS = ["wan", "tong", "tiao"];
const LANE_META = {
  顺子: { icon: "顺", color: "#60d394" },
  刻子: { icon: "刻", color: "#f26d6d" },
  清一色: { icon: "清", color: "#56a8ff" },
  金币: { icon: "财", color: "#f2bd55" },
  对子: { icon: "对", color: "#d38cff" },
  字牌: { icon: "字", color: "#e6e1d2" },
  散牌: { icon: "散", color: "#a9b1ad" },
  高牌: { icon: "高", color: "#a9b1ad" },
  通用: { icon: "全", color: "#a9b1ad" },
};

const STAGES = [
  { target: 500, hands: 4, discards: 3, enemy: "赤鳞妖" },
  { target: 1050, hands: 4, discards: 3, enemy: "铜钱怪" },
  { target: 1900, hands: 4, discards: 3, enemy: "烟火狐" },
  { target: 3600, hands: 4, discards: 3, enemy: "断门鬼", boss: true, rule: { id: "noWan", text: "Boss：万字牌不提供基础点" } },
  { target: 6800, hands: 4, discards: 3, enemy: "石面将" },
  { target: 12500, hands: 4, discards: 3, enemy: "白风客" },
  { target: 23000, hands: 4, discards: 2, enemy: "封顺魇", boss: true, rule: { id: "straightHalf", text: "Boss：顺子和两顺番数减半" } },
  { target: 42000, hands: 4, discards: 3, enemy: "金铃童子" },
  { target: 68000, hands: 4, discards: 2, enemy: "三元使", boss: true, rule: { id: "noDragon", text: "Boss：三元牌基础点被压制" } },
  { target: 115000, hands: 4, discards: 3, enemy: "黑风客" },
  { target: 190000, hands: 4, discards: 2, enemy: "铁算盘", boss: true, rule: { id: "coinBleed", text: "Boss：每次出牌后金币 -2" } },
  { target: 320000, hands: 4, discards: 2, enemy: "三元龙王", boss: true, rule: { id: "repeatTax", text: "Boss：重复上次牌型番数 -3" } },
];

const CORE_ARTIFACT_IDS = ["greenDragon", "whiteTiger", "cashToFan", "looseManual", "clearMirror", "pairNeedle"];
const START_BUILDS = [
  { id: "balanced", name: "均衡试炼", lane: "通用", deckMode: "balanced", coins: 6, desc: "标准牌山和金币。适合第一次体验完整节奏。", apply: () => {} },
  { id: "bamboo", name: "青竹顺道", lane: "顺子", deckMode: "bamboo", coins: 5, desc: "条子与中张更多，开局顺子更容易成型。", apply: (s) => { s.upgrades.straightBase += 20; } },
  { id: "pair", name: "重楼对子", lane: "对子", deckMode: "pairs", coins: 5, desc: "牌山会预埋重复牌，方便对子、刻子起步。", apply: (s) => { seedStarterPairs(s.deck); } },
  { id: "honor", name: "散修字门", lane: "散牌", deckMode: "honor", coins: 7, desc: "字牌和金币更多，适合散牌与高价值单牌过渡。", apply: (s) => { addHonorTiles(s.deck, 2); } },
];
const HAND_RANKS = [
  ["高牌", 18, 1],
  ["散牌", 24, 1],
  ["同门散牌", 42, 1.5],
  ["同数对子", 28, 1.5],
  ["对子", 34, 2],
  ["三门同数", 48, 2],
  ["两对", 66, 3],
  ["顺子", 58, 3],
  ["刻子", 72, 3],
  ["杠子", 110, 4],
  ["小三元", 130, 6],
  ["清一色", 150, 5],
  ["清一色杠子", 220, 8],
  ["满堂刻", 170, 6],
  ["清一色满堂刻", 230, 8],
  ["三元归位", 210, 8],
  ["清一色两顺", 190, 7],
];

const HAND_HELP = [
  ["高牌", "选 1 张牌。最低牌型，靠法器可过渡。"],
  ["散牌", "选 2-5 张但没有组成特殊牌型。"],
  ["同门散牌", "选 3-5 张同一数字花色但未成型，例如 2万5万8万。"],
  ["同数对子", "2 张数字相同但花色不同，例如 5万 + 5条。"],
  ["对子", "2 张完全相同，例如 7筒 + 7筒。"],
  ["三门同数", "万、筒、条同一个数字各 1 张，例如 6万6筒6条。"],
  ["两对", "4 张牌，包含两组对子。"],
  ["顺子", "3 张同花色连续数字，例如 3条4条5条。"],
  ["刻子", "3 张完全相同。"],
  ["杠子", "4 张完全相同。"],
  ["小三元", "中、发、白各 1 张。"],
  ["清一色", "5 张全是同一数字花色：万、筒或条。"],
  ["清一色杠子", "5 张同一数字花色，其中 4 张完全相同。"],
  ["满堂刻", "5 张牌，三张相同 + 一对。"],
  ["清一色满堂刻", "5 张同一数字花色，同时是三张相同 + 一对。"],
  ["三元归位", "5 张牌里含中、发、白，再加一组相同字牌。"],
  ["清一色两顺", "5 张同花色连续数字，例如 2万3万4万5万6万。"],
];

const ARTIFACTS = [
  artifact("trialCharm", "试炼符", "初", "高牌和散牌番数 +1。", (c) => {
    if (hasTag(c, "high") || hasTag(c, "loose")) c.mult += 1;
  }, { lane: "通用" }),
  artifact("greenDragon", "青龙印", "青", "顺子番数 +2；五张顺子终局额外 ×1.5；过关时加入中张并清理字牌。", (c) => {
    if (hasTag(c, "straight")) {
      c.mult += 2 + c.state.growth.straightFan;
      if (isBigStraightCombo(c.combo)) c.factor *= 1.5;
    }
  }, {
    lane: "顺子",
    afterPlay(s, combo) {
      if (combo.tags.includes("straight")) s.growth.straightFan += 1;
    },
    stageClear(s) {
      addRandomNumericTiles(s.deck, 2, 3, 7);
      removeTilesWhere(s.deck, (tile) => tile.suit === "wind" || tile.suit === "dragon", 1);
      recordDeckChange("青龙印：牌山加入 2 张中张，清理 1 张字牌");
    },
  }),
  artifact("whiteTiger", "白虎符", "虎", "刻子系点数 +80；五张刻子终局额外 ×1.5；过关时复制对子牌。", (c) => {
    if (hasTag(c, "triplet")) {
      c.base += 80 + c.state.growth.tripletBase;
      if (isBigTripletCombo(c.combo)) c.factor *= 1.5;
    }
  }, {
    lane: "刻子",
    afterPlay(s, combo) {
      if (combo.tags.includes("triplet")) s.growth.tripletBase += isBigTripletCombo(combo) ? 80 : 50;
    },
    stageClear(s) {
      const source = findPairSource([...s.hand, ...s.deck, ...s.discard]) || sample([...s.hand, ...s.deck]);
      if (source) {
        s.deck.push(cloneTile(source), cloneTile(source), cloneTile(source));
        recordDeckChange(`白虎符：复制 ${tileText(source)}${SUIT_LABELS[source.suit]} 3 张`);
      }
    },
  }),
  artifact("cashToFan", "财神像", "财", "每 5 金币番数 +1；过关时存钱强化经济。", (c, s) => {
    c.mult += cashFanBonus(s.coins);
  }, {
    lane: "金币",
    stageClear(s) {
      s.coins += 3;
      if (s.coins >= 12) s.nextHandBonus += 1;
      recordDeckChange("财神像：获得 3 金币；金币充足时下关出牌 +1");
    },
  }),
  artifact("loopScript", "连环诀", "环", "连续打出顺子时最终得分 ×2.2。", (c, s) => {
    if (hasTag(c, "straight") && s.lastComboTags.includes("straight")) c.factor *= 2.2;
  }, { lane: "顺子" }),
  artifact("twinHammer", "双锤令", "锤", "刻子系终局重击：普通刻子 ×2，五张刻子终局 ×2.4。", (c) => {
    if (hasTag(c, "triplet")) c.factor *= isBigTripletCombo(c.combo) ? 2.4 : 2;
  }, { lane: "刻子" }),
  artifact("goldVault", "聚宝匣", "宝", "过关时金币越多，金币流成长越高。", (c, s) => {
    c.mult += s.growth.wealthFan;
  }, {
    lane: "金币",
    stageClear(s) {
      s.growth.wealthFan += Math.max(1, Math.floor(s.coins / 12));
    },
  }),
  artifact("redCrane", "朱雀灯", "朱", "每张万字牌点数 +24。", (c) => {
    c.base += countSuit(c.tiles, "wan") * 24;
  }, { lane: "万字" }),
  artifact("rainBell", "听雨铃", "雨", "每张筒子牌番数 +0.5。", (c) => {
    c.mult += countSuit(c.tiles, "tong") * 0.5;
  }, { lane: "筒子" }),
  artifact("bambooSlip", "青竹简", "竹", "每张条子牌点数 +20，顺子再 +40。", (c) => {
    c.base += countSuit(c.tiles, "tiao") * 20;
    if (hasTag(c, "straight")) c.base += 40;
  }, { lane: "条子" }),
  artifact("clearMirror", "清门镜", "清", "清一色最终得分 ×2.5。", (c) => {
    if (hasTag(c, "flush")) c.factor *= 2.5;
  }, { lane: "清一色" }),
  artifact("pairNeedle", "鸳鸯针", "双", "对子系番数 +4；牌山对子越多额外越高；两对额外 ×1.6。", (c) => {
    if (hasTag(c, "pair")) {
      c.mult += 4 + Math.floor(deckPairPotential() / 6);
      if (c.combo.name === "两对") c.factor *= 1.6;
    }
  }, { lane: "对子" }),
  artifact("stonePot", "镇山炉", "山", "选择 5 张牌时点数 +110。", (c) => {
    if (c.tiles.length === 5) c.base += 110;
  }, { lane: "五张" }),
  artifact("windBanner", "风神幡", "风", "每张风牌番数 +1。", (c) => {
    c.mult += countSuit(c.tiles, "wind");
  }, { lane: "字牌" }),
  artifact("trinityLamp", "三元灯", "元", "小三元番数 +5，三元牌点数 +30；三元归位额外 ×2.4。", (c) => {
    c.base += countSuit(c.tiles, "dragon") * 30;
    if (hasTag(c, "dragon")) c.mult += 5;
    if (c.combo.name === "三元归位") c.factor *= 2.4;
  }, { lane: "字牌" }),
  artifact("looseManual", "散修录", "散", "散牌番数 +3，每次散牌出牌成长 +1番；过关时散牌底盘 +28点、补字牌和换牌。", (c) => {
    if (hasTag(c, "loose")) {
      c.mult += 3 + c.state.growth.looseFan;
      c.base += c.state.growth.looseBase;
    }
  }, {
    lane: "散牌",
    afterPlay(s, combo) {
      if (combo.tags.includes("loose")) s.growth.looseFan += 1;
    },
    stageClear(s) {
      addHonorTiles(s.deck, 2);
      s.discardsLeft += 1;
      s.growth.looseBase += 28;
      recordDeckChange(`散修录：字牌 +2、换牌 +1、散牌底盘 +28（共 +${s.growth.looseBase}点）`);
    },
  }),
  artifact("singleBlade", "孤锋刃", "孤", "只出 1 张牌时最终得分 ×3，每次高牌出牌成长 +0.2。", (c) => {
    if (c.tiles.length === 1) c.factor *= 3 + c.state.growth.highFactor;
  }, {
    lane: "高牌",
    afterPlay(s, combo) {
      if (combo.tags.includes("high")) s.growth.highFactor += 0.2;
    },
  }),
  artifact("fiveForge", "五行炉", "五", "选择 5 张牌时最终得分 ×1.6。", (c) => {
    if (c.tiles.length === 5) c.factor *= 1.6;
  }, { lane: "五张" }),
  artifact("middleGate", "中门令", "中", "每张 4-6 数牌点数 +28。", (c) => {
    c.base += c.tiles.filter((t) => NUMERIC_SUITS.includes(t.suit) && t.rank >= 4 && t.rank <= 6).length * 28;
  }, { lane: "数牌" }),
  artifact("edgeLamp", "幺九灯", "幺", "每张 1/9 数牌番数 +1。", (c) => {
    c.mult += c.tiles.filter((t) => NUMERIC_SUITS.includes(t.suit) && (t.rank === 1 || t.rank === 9)).length;
  }, { lane: "幺九" }),
  artifact("windCompass", "风盘", "盘", "打出至少 2 张风牌时最终得分 ×2。", (c) => {
    if (countSuit(c.tiles, "wind") >= 2) c.factor *= 2;
  }, { lane: "字牌" }),
  artifact("sameGate", "同门契", "门", "同门散牌和清一色点数 +70。", (c) => {
    if (hasTag(c, "sameSuit") || hasTag(c, "flush")) c.base += 70;
  }, { lane: "清一色" }),
  artifact("pairEcho", "对子回声", "回", "对子、两对、满堂刻最终得分 ×2；两对额外 ×1.5；连续对子系再 ×1.4。", (c, s) => {
    if (hasTag(c, "pair")) {
      c.factor *= 2;
      if (c.combo.name === "两对") c.factor *= 1.5;
      if (s.lastComboTags.includes("pair")) c.factor *= 1.4;
    }
  }, { lane: "对子" }),
  artifact("interestScroll", "利息卷", "利", "每 10 金币最终得分 +15%，最高 ×2.5。", (c, s) => {
    c.factor *= Math.min(2.5, 1 + Math.floor(s.coins / 10) * 0.15);
  }, { lane: "金币" }),
  artifact("wanSeal", "万字印", "万", "每张万字牌番数 +0.7。", (c) => {
    c.mult += countSuit(c.tiles, "wan") * 0.7;
  }, { lane: "万字" }),
  artifact("tongDrum", "筒鼓", "筒", "每张筒子牌点数 +30。", (c) => {
    c.base += countSuit(c.tiles, "tong") * 30;
  }, { lane: "筒子" }),
  artifact("tiaoThread", "条绳", "条", "条子牌达到 3 张时最终得分 ×1.8。", (c) => {
    if (countSuit(c.tiles, "tiao") >= 3) c.factor *= 1.8;
  }, { lane: "条子" }),
  artifact("repeatSeal", "复诵印", "复", "连续打出同牌型时番数 +5。", (c, s) => {
    if (s.lastCombo === c.combo.name) c.mult += 5;
  }, { lane: "连打" }),
  artifact("lastHandBell", "残响铃", "残", "本关最后一次出牌最终得分 ×2.4。", (c, s) => {
    if (s.handsLeft === 1) c.factor *= 2.4;
  }, { lane: "爆发" }),
  artifact("cleanPurse", "净财袋", "袋", "每次打出清一色获得 3 金币。", () => {}, {
    lane: "清一色",
    afterPlay(s, combo) {
      if (combo.tags.includes("flush")) s.coins += 3;
    },
  }),
];

const UPGRADES = [
  { id: "upgradeStraight", type: "牌型升级", lane: "顺子", name: "顺势而为", desc: "顺子点数 +40；本关首次顺子最终 ×1.8。", choose: (s) => {
    s.upgrades.straightBase += 40;
    s.upgradeFlags.straightFirstBurst = true;
  } },
  { id: "upgradeTriplet", type: "牌型升级", lane: "刻子", name: "重门叠影", desc: "刻子系点数 +80；刻子系出牌后复制其中 1 张入牌山。", choose: (s) => {
    s.upgrades.tripletBase += 80;
    s.upgradeFlags.tripletEcho = true;
  } },
  { id: "upgradeFlush", type: "牌型升级", lane: "清一色", name: "一色入魂", desc: "清一色番数 +2；本关首次清一色额外 +3 番。", choose: (s) => {
    s.upgrades.flushMult += 2;
    s.upgradeFlags.flushFirstFan = true;
  } },
  { id: "moreHands", type: "局内资源", lane: "通用", name: "添香续局", desc: "下一关出牌次数 +1。", choose: (s) => { s.nextHandBonus += 1; } },
  { id: "coinPouch", type: "金币", lane: "金币", name: "小钱袋", desc: "立刻获得 7 金币。", choose: (s) => { s.coins += 7; } },
  { id: "copyCore", type: "牌山改造", lane: "牌山", name: "拓印术", desc: "复制手牌中随机 2 张加入牌山。", choose: (s) => {
    shuffle([...s.hand]).slice(0, 2).forEach((tile) => s.deck.push(cloneTile(tile)));
  } },
  { id: "purgeHonors", type: "牌山改造", lane: "顺子", name: "清风扫叶", desc: "从牌山移除最多 5 张字牌，更容易摸到数牌。", choose: (s) => {
    removeTilesWhere(s.deck, (tile) => tile.suit === "wind" || tile.suit === "dragon", 5);
  } },
  { id: "seedMiddle", type: "牌山改造", lane: "顺子", name: "聚中张", desc: "向牌山加入 4 张 3-7 的数牌。", choose: (s) => {
    addRandomNumericTiles(s.deck, 4, 3, 7);
  } },
  { id: "copyPair", type: "牌山改造", lane: "刻子", name: "摹对子", desc: "复制一张已有对子 2 次，没有对子则复制随机手牌。", choose: (s) => {
    const source = findPairSource([...s.hand, ...s.deck]) || sample(s.hand);
    if (source) s.deck.push(cloneTile(source), cloneTile(source));
  } },
  { id: "mergeNumber", type: "牌山改造", lane: "对子", name: "并牌术", desc: "把 3 张同数字不同门的数牌改成同一牌面。", choose: (s) => {
    mergeSameNumberTiles(s, 3);
  } },
  { id: "seedTriplet", type: "牌山改造", lane: "刻子", name: "聚刻令", desc: "选择一张手牌，向牌山加入 3 张相同牌。", choose: (s) => {
    const source = sample(s.hand);
    if (source) s.deck.push(cloneTile(source), cloneTile(source), cloneTile(source));
  } },
  { id: "purgeSingles", type: "牌山改造", lane: "刻子", name: "删孤张", desc: "移除最多 4 张当前没有重复的牌。", choose: (s) => {
    purgeSingles(s.deck, 4);
  } },
  { id: "sameSuitPaint", type: "牌山改造", lane: "清一色", name: "染一门", desc: "把 4 张随机数牌改成同一门。", choose: (s) => {
    repaintNumericTiles(s, 4);
  } },
  { id: "feedLoose", type: "牌山改造", lane: "散牌", name: "散牌补给", desc: "加入 3 张高价值字牌，并获得 1 次换牌。", choose: (s) => {
    addHonorTiles(s.deck, 3);
    s.discardsLeft += 1;
  } },
  { id: "cashReserve", type: "牌山改造", lane: "金币", name: "留财不动", desc: "获得 5 金币；下关出牌次数 +1。", choose: (s) => {
    s.coins += 5;
    s.nextHandBonus += 1;
  } },
];

const STAGE_EVENTS = [
  { id: "windfall", text: "顺风局：每次出牌额外 +1 金币" },
  { id: "elite", text: "精英局：目标 +15%，过关额外 +3 金币" },
  { id: "brief", text: "速战局：出牌 -1，换牌 +2" },
  { id: "lucky", text: "幸运局：首次出牌得分 ×1.5" },
];

const DEBUG_DEAL_PRESETS = [
  { id: "pair", name: "对子" },
  { id: "twoPair", name: "两对" },
  { id: "straight", name: "顺子" },
  { id: "triplet", name: "刻子" },
  { id: "kong", name: "杠子" },
  { id: "fullHouse", name: "满堂刻" },
  { id: "flush", name: "清一色" },
  { id: "flushRun", name: "清一色两顺" },
  { id: "flushFullHouse", name: "清一色满堂刻" },
  { id: "flushKong", name: "清一色杠子" },
  { id: "dragon", name: "小三元" },
  { id: "dragonFull", name: "三元归位" },
];

const state = {
  screen: "start",
  stageIndex: 0,
  score: 0,
  coins: 6,
  handsLeft: 0,
  discardsLeft: 0,
  hand: [],
  selected: new Set(),
  deck: [],
  discard: [],
  artifacts: [],
  upgrades: { straightBase: 0, tripletBase: 0, flushMult: 0 },
  upgradeFlags: { straightFirstBurst: false, tripletEcho: false, flushFirstFan: false },
  upgradeUses: { straightFirstBurstUsed: false, flushFirstFanUsed: false },
  growth: { straightFan: 0, tripletBase: 0, wealthFan: 0, looseFan: 0, looseBase: 0, highFactor: 0 },
  nextHandBonus: 0,
  targetMultiplier: 1,
  nextTargetPenalty: 0,
  luckUsed: false,
  lastCombo: "",
  lastComboTags: [],
  stageComboCounts: {},
  stageBestScore: 0,
  stageTotalScore: 0,
  stagePlays: 0,
  stageSummary: null,
  lastStageLane: "",
  laneMisses: {},
  stageEvent: null,
  stageEventFirstHandUsed: false,
  catchUpAvailable: false,
  finalPrepAvailable: false,
  targetAssistNext: 0,
  deckChanges: [],
  log: [],
  lastTriggeredArtifacts: [],
  rewardChoices: [],
  paidUpgradeChoices: [],
  startBuildChoices: [],
  startLane: "",
  artifactSlots: 5,
  runCount: 0,
  debugMode: false,
  showDealDebug: false,
  enemyFx: null,
  boughtUpgradeThisReward: false,
  pendingArtifact: null,
  inspectedArtifact: null,
  showStageSelect: false,
  showHandHelp: false,
  showGuide: false,
  resolve: null,
  adPrompt: null,
  adsUsed: { hand: 0, discard: 0, refresh: 0, revive: 0 },
  toast: "",
  toastUntil: 0,
};

let hits = [];
let lastFrame = 0;

wx.onTouchStart((event) => {
  const touch = event.touches[0];
  if (!touch) return;
  const hit = [...hits].reverse().find((item) => inside(touch.clientX, touch.clientY, item));
  if (hit) hit.onTap();
});

function startRun(startIndex = 0, debugMode = false, startBuild = START_BUILDS[0]) {
  state.screen = "game";
  state.stageIndex = startIndex;
  state.debugMode = debugMode;
  if (!debugMode) state.runCount += 1;
  state.score = 0;
  state.coins = debugMode ? 12 : startBuild.coins;
  state.hand = [];
  state.selected = new Set();
  state.deck = createDeck(debugMode ? "balanced" : startBuild.deckMode);
  state.discard = [];
  state.artifacts = debugMode && startIndex > 0
    ? ["trialCharm", "greenDragon", "whiteTiger", "cashToFan", "looseManual"].map(getArtifact)
    : [getArtifact("trialCharm")];
  state.startLane = startBuild.lane || "通用";
  state.artifactSlots = 5;
  state.upgrades = { straightBase: 0, tripletBase: 0, flushMult: 0 };
  state.upgradeFlags = { straightFirstBurst: false, tripletEcho: false, flushFirstFan: false };
  state.upgradeUses = { straightFirstBurstUsed: false, flushFirstFanUsed: false };
  state.growth = { straightFan: 0, tripletBase: 0, wealthFan: 0, looseFan: 0, looseBase: 0, highFactor: 0 };
  if (!debugMode && startBuild.apply) startBuild.apply(state);
  state.nextHandBonus = 0;
  state.targetMultiplier = 1;
  state.nextTargetPenalty = 0;
  state.luckUsed = false;
  state.lastCombo = "";
  state.lastComboTags = [];
  state.stageComboCounts = {};
  state.stageBestScore = 0;
  state.stageTotalScore = 0;
  state.stagePlays = 0;
  state.stageSummary = null;
  state.lastStageLane = "";
  state.laneMisses = {};
  state.stageEvent = null;
  state.stageEventFirstHandUsed = false;
  state.catchUpAvailable = false;
  state.finalPrepAvailable = false;
  state.targetAssistNext = 0;
  state.deckChanges = [];
  state.log = [];
  state.lastTriggeredArtifacts = [];
  state.rewardChoices = [];
  state.paidUpgradeChoices = [];
  state.enemyFx = null;
  state.boughtUpgradeThisReward = false;
  state.inspectedArtifact = null;
  state.resolve = null;
  state.adPrompt = null;
  state.adsUsed = { hand: 0, discard: 0, refresh: 0, revive: 0 };
  state.showStageSelect = false;
  state.showDealDebug = false;
  state.startBuildChoices = [];
  state.showGuide = !debugMode;
  beginStage();
}

function beginStage() {
  const stage = currentStage();
  state.screen = "game";
  state.score = 0;
  state.targetMultiplier = 1 + state.nextTargetPenalty;
  if (state.targetAssistNext > 0) {
    state.targetMultiplier = Math.max(0.75, state.targetMultiplier - state.targetAssistNext);
    state.targetAssistNext = 0;
  }
  state.nextTargetPenalty = 0;
  state.upgradeUses.straightFirstBurstUsed = false;
  state.upgradeUses.flushFirstFanUsed = false;
  state.handsLeft = stage.hands + state.nextHandBonus;
  state.discardsLeft = stage.discards;
  state.nextHandBonus = 0;
  state.stageEvent = stage.boss ? null : (Math.random() < 0.6 ? sample(STAGE_EVENTS) : null);
  state.stageEventFirstHandUsed = false;
  if (state.stageEvent) {
    if (state.stageEvent.id === "elite") state.targetMultiplier *= 1.15;
    else if (state.stageEvent.id === "brief") { state.handsLeft = Math.max(1, state.handsLeft - 1); state.discardsLeft += 2; }
  }
  state.stageComboCounts = {};
  state.stageBestScore = 0;
  state.stageTotalScore = 0;
  state.stagePlays = 0;
  state.selected.clear();
  prepareDeckForStage();
  reshuffleIfNeeded(10);
  state.hand = drawTiles(handLimit());
  ensureOpeningSeed();
  topUpHand();
  trimHandToLimit();
  const stageToast = stage.boss ? stage.rule.text : `${stage.enemy} 出现`;
  toast(state.stageEvent ? `${stageToast}  ·  ${state.stageEvent.text}` : stageToast);
}

function playSelected() {
  const tiles = selectedTiles();
  if (tiles.length < 1 || tiles.length > 5) return toast("请选择 1-5 张牌");
  const combo = evaluateTiles(tiles);
  const result = calculateScore(tiles, combo);
  const beforeScore = state.score;
  let playTotal = result.total;
  if (state.stageEvent?.id === "lucky" && !state.stageEventFirstHandUsed) {
    playTotal = Math.floor(playTotal * 1.5);
    state.stageEventFirstHandUsed = true;
  }
  state.score += playTotal;
  state.stageBestScore = Math.max(state.stageBestScore, playTotal);
  state.stageTotalScore += playTotal;
  state.stagePlays += 1;
  triggerEnemyFx(combo, playTotal);
  state.handsLeft -= 1;
  state.coins += combo.tags.includes("flush") ? 2 : 1;
  if (state.stageEvent?.id === "windfall") state.coins += 1;
  state.artifacts.forEach((a) => a.afterPlay && a.afterPlay(state, combo, tiles));
  applyUpgradeAfterPlay(combo, tiles);
  state.lastTriggeredArtifacts = result.triggers.map((item) => item.id);
  applyAfterPlayBossRule();
  recordComboLane(combo);
  state.lastCombo = combo.name;
  state.lastComboTags = [...combo.tags];
  state.log = result.log;
  state.resolve = { combo: combo.name, total: playTotal, from: beforeScore, to: state.score, log: result.log, until: Date.now() + 1400 };
  moveSelectedToDiscard();
  refillHand();
  toast(`${combo.name} +${formatInt(playTotal)}`);
  const stage = currentStage();
  if (state.score >= stageTarget()) setTimeout(completeStage, 250);
  else if (state.handsLeft <= 0) setTimeout(() => endRun(false), 250);
}

function discardSelected() {
  if (!state.selected.size) return toast("先选择要换掉的牌");
  if (state.discardsLeft <= 0) return toast("换牌次数不足");
  state.discardsLeft -= 1;
  moveSelectedToDiscard();
  refillHand();
}

function triggerEnemyFx(combo, total) {
  const style = attackStyle(combo);
  state.enemyFx = {
    until: Date.now() + 520,
    attack: attackLabel(combo),
    damage: total,
    tier: attackTier(total),
    comboName: combo.name,
    kind: style.kind,
    color: style.color,
  };
}

function attackLabel(combo) {
  if (combo.tags.includes("flush")) return "绝式";
  if (combo.tags.includes("triplet")) return combo.tiles && combo.tiles.length >= 4 ? "碎甲" : "重击";
  if (combo.tags.includes("straight")) return "连斩";
  if (combo.tags.includes("pair")) return "双击";
  if (combo.tags.includes("dragon")) return "法印";
  if (combo.tags.includes("high")) return "点刺";
  return "压制";
}

function attackTier(total) {
  if (total >= 50000) return 4;
  if (total >= 12000) return 3;
  if (total >= 3000) return 2;
  return 1;
}

function attackStyle(combo) {
  if (combo.tags.includes("flush")) return { kind: "burst", color: "#f26d6d" };
  if (combo.tags.includes("triplet")) return { kind: "crush", color: "#f2bd55" };
  if (combo.tags.includes("straight")) return { kind: "slash", color: "#60d394" };
  if (combo.tags.includes("pair")) return { kind: "echo", color: "#d38cff" };
  if (combo.tags.includes("dragon")) return { kind: "seal", color: "#e6e1d2" };
  if (combo.tags.includes("high")) return { kind: "sting", color: "#56a8ff" };
  return { kind: "shock", color: "#a9b1ad" };
}

function applyUpgradeAfterPlay(combo, tiles) {
  if (state.upgradeFlags.straightFirstBurst && combo.tags.includes("straight")) state.upgradeUses.straightFirstBurstUsed = true;
  if (state.upgradeFlags.flushFirstFan && combo.tags.includes("flush")) state.upgradeUses.flushFirstFanUsed = true;
  if (!state.upgradeFlags.tripletEcho || !combo.tags.includes("triplet")) return;
  const source = sample(tiles);
  if (source) {
    state.deck.push(cloneTile(source));
    recordDeckChange(`重门叠影：复制 ${tileText(source)}${SUIT_LABELS[source.suit]} 入牌山`);
  }
}

function buyDiscardWithCoins() {
  if (state.discardsLeft > 0) return toast("还有换牌次数，先直接换牌");
  if (state.coins < 3) return toast("金币不足：补换牌需要 3 金币");
  state.coins -= 3;
  state.discardsLeft += 1;
  toast("花费 3 金币补 1 次换牌");
}

function completeStage() {
  const bonus = Math.max(2, state.handsLeft + 2);
  const interest = Math.min(5, Math.floor(state.coins / 5));
  state.coins += bonus + interest;
  if (interest > 0) recordDeckChange(`利息：存款额外获得 ${interest} 金币`);
  if (state.stageEvent?.id === "elite") {
    state.coins += 3;
    recordDeckChange("精英局过关：额外奖励 3 金币");
  }
  state.artifacts.forEach((a) => a.stageClear && a.stageClear(state));
  maybeGrantArtifactSlot();
  state.stageSummary = summarizeStage();
  state.lastStageLane = state.stageSummary.mainLane;
  if (state.stageIndex >= STAGES.length - 1) return endRun(true);
  planCatchUpForNextStage();
  state.stageIndex += 1;
  openReward(bonus);
}

function openReward(bonus) {
  state.rewardChoices = createRewardChoices();
  updateLaneGuarantee(state.rewardChoices);
  state.rewardBonus = bonus;
  state.boughtUpgradeThisReward = false;
  state.paidUpgradeChoices = [];
  state.screen = "reward";
}

function createRewardChoices() {
  if (state.stageIndex === 1) return shuffle(CORE_ARTIFACT_IDS.map(getArtifact).map(artifactReward)).slice(0, 4);
  const choices = weightedRewardChoices(mixedRewards(), 3);
  if (state.lastStageLane && state.laneMisses[state.lastStageLane] >= 1) ensureLaneChoice(choices, state.lastStageLane);
  return choices;
}

function chooseReward(choice) {
  state.paidUpgradeChoices = [];
  if (choice.type === "法器") return chooseArtifact(choice.artifact);
  choice.choose(state);
  beginStage();
}

function refreshRewardsWithCoins() {
  if (state.stageIndex === 1) return toast("核心法器不能刷新");
  if (state.coins < 3) return toast("金币不足：刷新需要 3 金币");
  state.coins -= 3;
  state.rewardChoices = createRewardChoices();
  toast("花费 3 金币刷新奖励");
}

function buyDeckUpgradeWithCoins() {
  if (state.stageIndex === 1) return toast("核心法器阶段不能购买改造");
  if (state.boughtUpgradeThisReward) return toast("本次奖励已购买过改造");
  if (state.coins < 5) return toast("金币不足：改造需要 5 金币");
  state.paidUpgradeChoices = weightedRewardChoices(UPGRADES.filter((item) => item.type === "牌山改造"), 2);
  toast("选择 1 项牌山改造");
}

function choosePaidDeckUpgrade(upgrade) {
  if (state.boughtUpgradeThisReward) return toast("本次奖励已购买过改造");
  if (state.coins < 5) return toast("金币不足：改造需要 5 金币");
  state.coins -= 5;
  state.boughtUpgradeThisReward = true;
  state.paidUpgradeChoices = [];
  upgrade.choose(state);
  recordDeckChange(`花费 5 金币购买：${upgrade.name}`);
  toast(`获得牌山改造：${upgrade.name}`);
}

function takeCatchUpReward() {
  const lane = state.stageSummary?.mainLane || state.lastStageLane || "通用";
  const finalPrep = state.finalPrepAvailable;
  if (!state.catchUpAvailable && !finalPrep) return toast("暂无天命改造");
  state.catchUpAvailable = false;
  state.finalPrepAvailable = false;
  state.targetAssistNext = Math.max(state.targetAssistNext, finalPrep ? 0.2 : 0.15);
  state.nextHandBonus += finalPrep ? 1 : 0;
  applyLaneDeckAssist(lane, finalPrep);
  recordDeckChange(`${finalPrep ? "终局强化" : "天命改造"}：补强${lane}流，下一关目标降低`);
  toast(finalPrep ? "终局强化完成" : "天命改造完成");
}

function chooseArtifact(artifactItem) {
  if (state.artifacts.length < state.artifactSlots) {
    state.artifacts.push(artifactItem);
    return beginStage();
  }
  state.pendingArtifact = artifactItem;
  state.screen = "replace";
}

function replaceArtifact(index) {
  state.artifacts[index] = state.pendingArtifact;
  state.pendingArtifact = null;
  beginStage();
}

function maybeGrantArtifactSlot() {
  if (state.stageIndex === 5 && state.artifactSlots < 6) {
    state.artifactSlots = 6;
    recordDeckChange("灵台扩容：法器槽位 +1（现为 6）");
  }
  if (state.stageIndex === 9 && state.artifactSlots < 7) {
    state.artifactSlots = 7;
    recordDeckChange("灵台扩容：法器槽位 +1（现为 7）");
  }
}

function endRun(win) {
  state.screen = "end";
  state.win = win;
}

function showAdPrompt(kind, title, desc, onDone) {
  state.adPrompt = { kind, title, desc, onDone };
}

function closeAdPrompt() {
  state.adPrompt = null;
}

function finishAdPrompt() {
  const prompt = state.adPrompt;
  state.adPrompt = null;
  prompt.onDone();
  toast("模拟广告完成");
}

function watchAdForHand() {
  if (state.adsUsed.hand >= 1) return toast("本关已使用过加次广告");
  showAdPrompt("hand", "模拟激励视频", "看完后本关出牌次数 +1。", () => {
    state.adsUsed.hand += 1;
    state.handsLeft += 1;
  });
}

function watchAdForDiscard() {
  if (state.adsUsed.discard >= 1) return toast("本关已使用过换牌广告");
  showAdPrompt("discard", "模拟激励视频", "看完后本关换牌次数 +1。", () => {
    state.adsUsed.discard += 1;
    state.discardsLeft += 1;
  });
}

function watchAdForRewardRefresh() {
  if (state.adsUsed.refresh >= 1) return toast("本次奖励已刷新过");
  showAdPrompt("refresh", "模拟激励视频", "看完后刷新本次三选一奖励。", () => {
    state.adsUsed.refresh += 1;
    state.rewardChoices = createRewardChoices();
  });
}

function watchAdForRevive() {
  if (state.win || state.adsUsed.revive >= 1) return;
  showAdPrompt("revive", "模拟激励视频", "看完后回到本关，并获得 2 次出牌机会。", () => {
    state.adsUsed.revive += 1;
    state.screen = "game";
    state.score = Math.floor(stageTarget() * 0.35);
    state.handsLeft = 2;
    state.discardsLeft = Math.max(state.discardsLeft, 1);
    state.selected.clear();
    refillHand();
  });
}

function borrowLuck() {
  if (state.luckUsed) return toast("本局已经借运过");
  state.luckUsed = true;
  state.handsLeft += 1;
  state.discardsLeft += 1;
  state.nextTargetPenalty += 0.1;
  toast("借运：本关出牌和换牌 +1，下关目标 +10%");
}

function mixedRewards() {
  const artifactRewards = ARTIFACTS
    .filter((a) => a.id !== "trialCharm" && !state.artifacts.some((owned) => owned.id === a.id))
    .map(artifactReward);
  return [...artifactRewards, ...UPGRADES];
}

function weightedRewardChoices(pool, count) {
  const picked = [];
  const preferred = preferredLanes();
  const remaining = [...pool];
  const preferredPool = remaining.filter((item) => preferred.includes(item.lane));
  if (preferredPool.length) {
    const first = sample(preferredPool);
    picked.push(first);
    remaining.splice(remaining.findIndex((item) => item.id === first.id), 1);
  }
  while (picked.length < count && remaining.length) {
    const weighted = [];
    remaining.forEach((item) => {
      const weight = preferred.includes(item.lane) ? 4 : 1;
      for (let i = 0; i < weight; i += 1) weighted.push(item);
    });
    const choice = sample(weighted);
    picked.push(choice);
    remaining.splice(remaining.findIndex((item) => item.id === choice.id), 1);
  }
  return picked;
}

function preferredLanes() {
  const lanes = state.artifacts.map((artifactItem) => artifactItem.lane).filter((lane) => lane && lane !== "通用");
  if (state.lastStageLane) lanes.push(state.lastStageLane);
  if (state.lastStageLane === "散牌" || state.lastStageLane === "高牌") lanes.push("五张", "通用");
  return [...new Set(lanes)];
}

function artifactReward(artifactItem) {
  return { ...artifactItem, type: "法器", artifact: artifactItem };
}

function ensureLaneChoice(choices, lane) {
  if (!lane || choices.some((item) => item.lane === lane)) return choices;
  const pool = mixedRewards().filter((item) => item.lane === lane && !choices.some((choice) => choice.id === item.id));
  if (pool.length) choices[choices.length - 1] = sample(pool);
  return choices;
}

function updateLaneGuarantee(choices) {
  const lane = state.lastStageLane;
  if (!lane || lane === "通用") return;
  if (choices.some((item) => item.lane === lane)) {
    state.laneMisses[lane] = 0;
    return;
  }
  state.laneMisses[lane] = (state.laneMisses[lane] || 0) + 1;
  if (state.laneMisses[lane] >= 2) {
    ensureLaneChoice(choices, lane);
    state.laneMisses[lane] = 0;
  }
}

function summarizeStage() {
  const mainLane = dominantStageLane() || state.lastStageLane || "未成型";
  const avgHandScore = state.stagePlays ? Math.round(state.stageTotalScore / state.stagePlays) : 0;
  const laneCount = state.stageComboCounts[mainLane] || 0;
  return {
    mainLane,
    bestHandScore: state.stageBestScore,
    avgHandScore,
    laneCount,
    plays: state.stagePlays,
    power: Math.round(state.stageBestScore * 0.6 + avgHandScore * 2.5),
  };
}

function planCatchUpForNextStage() {
  const nextStage = STAGES[state.stageIndex + 1];
  if (!nextStage || !state.stageSummary) return;
  const expectedHands = nextStage.hands + state.nextHandBonus;
  const neededPerHand = nextStage.target / Math.max(1, expectedHands);
  const behind = state.stageSummary.bestHandScore < neededPerHand * 0.55 || state.stageSummary.avgHandScore < neededPerHand * 0.32;
  state.catchUpAvailable = behind;
  const finalPressure = state.stageIndex >= 9 && state.stageSummary.bestHandScore < STAGES[STAGES.length - 1].target / 8;
  state.finalPrepAvailable = finalPressure;
}

function applyLaneDeckAssist(lane, strong) {
  if (lane === "顺子") {
    addRandomNumericTiles(state.deck, strong ? 8 : 5, 3, 7);
    removeTilesWhere(state.deck, (tile) => tile.suit === "wind" || tile.suit === "dragon", strong ? 6 : 3);
    state.upgrades.straightBase += strong ? 120 : 70;
    return;
  }
  if (lane === "刻子") {
    const source = findPairSource([...state.hand, ...state.deck, ...state.discard]) || sample(state.hand);
    if (source) state.deck.push(cloneTile(source), cloneTile(source), cloneTile(source), cloneTile(source), ...(strong ? [cloneTile(source), cloneTile(source)] : []));
    purgeSingles(state.deck, strong ? 7 : 4);
    state.upgrades.tripletBase += strong ? 180 : 100;
    return;
  }
  if (lane === "清一色") {
    repaintNumericTiles(state, strong ? 9 : 6);
    state.upgrades.flushMult += strong ? 4 : 2;
    return;
  }
  if (lane === "对子") {
    const source = findPairSource([...state.hand, ...state.deck]) || sample(state.hand);
    if (source) state.deck.push(cloneTile(source), cloneTile(source), cloneTile(source), cloneTile(source), ...(strong ? [cloneTile(source)] : []));
    mergeSameNumberTiles(state, strong ? 6 : 4);
    state.upgrades.tripletBase += strong ? 80 : 40;
    return;
  }
  if (lane === "金币") {
    state.coins += strong ? 16 : 10;
    state.nextHandBonus += 1;
    return;
  }
  addHonorTiles(state.deck, strong ? 6 : 4);
  state.nextHandBonus += 1;
}

function prepareDeckForStage() {
  const lane = activeLanePreference();
  if (lane === "顺子") {
    addRandomNumericTiles(state.deck, 2, 3, 7);
    addAdjacentRunSeeds(state.deck, 1);
    removeTilesWhere(state.deck, (tile) => tile.suit === "wind" || tile.suit === "dragon", 1);
    return;
  }
  if (lane === "刻子") {
    seedDeckPairs(state.deck, 2);
    purgeSingles(state.deck, 1);
    return;
  }
  if (lane === "对子") {
    seedDeckPairs(state.deck, 3);
    return;
  }
  if (lane === "散牌" || lane === "字牌" || lane === "高牌") {
    addHonorTiles(state.deck, 2);
  }
}

function createDeck(mode) {
  const tiles = [];
  const add = (suit, rank, copies) => {
    for (let i = 0; i < copies; i += 1) tiles.push({ id: uid(), suit, rank });
  };
  NUMERIC_SUITS.forEach((suit) => {
    for (let rank = 1; rank <= 9; rank += 1) {
      let copies = 4;
      if (mode === "bamboo" && suit === "tiao" && rank >= 2 && rank <= 8) copies = 5;
      if (mode === "pairs" && rank >= 3 && rank <= 7) copies = 5;
      add(suit, rank, copies);
    }
  });
  WIND_NAMES.forEach((_, i) => add("wind", i + 1, mode === "honor" ? 5 : 3));
  DRAGON_NAMES.forEach((_, i) => add("dragon", i + 1, mode === "honor" ? 5 : 3));
  return shuffle(tiles);
}

function recordDeckChange(message) {
  state.deckChanges.push(message);
  if (state.deckChanges.length > 4) state.deckChanges.shift();
}

function removeTilesWhere(tiles, predicate, limit) {
  let removed = 0;
  for (let i = tiles.length - 1; i >= 0 && removed < limit; i -= 1) {
    if (predicate(tiles[i])) {
      tiles.splice(i, 1);
      removed += 1;
    }
  }
}

function addRandomNumericTiles(target, count, minRank = 1, maxRank = 9) {
  for (let i = 0; i < count; i += 1) {
    target.push({ id: uid(), suit: sample(NUMERIC_SUITS), rank: minRank + Math.floor(Math.random() * (maxRank - minRank + 1)) });
  }
}

function findPairSource(tiles) {
  const counts = getCounts(tiles);
  const key = [...counts.entries()].find((entry) => entry[1] >= 2)?.[0];
  return key ? tiles.find((tile) => `${tile.suit}-${tile.rank}` === key) : null;
}

function repaintNumericTiles(s, count) {
  const numeric = shuffle([...s.deck, ...s.hand].filter((tile) => NUMERIC_SUITS.includes(tile.suit)));
  if (!numeric.length) return;
  const suit = sample(NUMERIC_SUITS);
  numeric.slice(0, count).forEach((tile) => {
    tile.suit = suit;
  });
}

function addHonorTiles(target, count) {
  for (let i = 0; i < count; i += 1) {
    const dragon = Math.random() > 0.45;
    target.push({ id: uid(), suit: dragon ? "dragon" : "wind", rank: dragon ? 1 + Math.floor(Math.random() * 3) : 1 + Math.floor(Math.random() * 4) });
  }
}

function seedStarterPairs(target) {
  const seeds = shuffle(target.filter((tile) => NUMERIC_SUITS.includes(tile.suit) && tile.rank >= 2 && tile.rank <= 8)).slice(0, 4);
  seeds.forEach((tile) => target.push(cloneTile(tile)));
}

function seedDeckPairs(target, pairCount) {
  const seeds = shuffle(target.filter((tile) => NUMERIC_SUITS.includes(tile.suit) && tile.rank >= 2 && tile.rank <= 8)).slice(0, pairCount);
  seeds.forEach((tile) => target.push(cloneTile(tile)));
}

function addAdjacentRunSeeds(target, pairCount) {
  for (let i = 0; i < pairCount; i += 1) {
    const suit = sample(NUMERIC_SUITS);
    const rank = 2 + Math.floor(Math.random() * 6);
    target.push({ id: uid(), suit, rank }, { id: uid(), suit, rank: rank + 1 });
  }
}

function mergeSameNumberTiles(s, limit) {
  const tiles = shuffle([...s.deck, ...s.hand].filter((tile) => NUMERIC_SUITS.includes(tile.suit)));
  const byRank = new Map();
  tiles.forEach((tile) => {
    if (!byRank.has(tile.rank)) byRank.set(tile.rank, []);
    byRank.get(tile.rank).push(tile);
  });
  const group = [...byRank.values()].find((items) => new Set(items.map((tile) => tile.suit)).size >= 2);
  if (!group) return;
  const target = group[0];
  group.slice(0, limit).forEach((tile) => {
    tile.suit = target.suit;
    tile.rank = target.rank;
  });
}

function purgeSingles(tiles, limit) {
  const counts = getCounts(tiles);
  removeTilesWhere(tiles, (tile) => counts.get(`${tile.suit}-${tile.rank}`) === 1, limit);
}

function drawTiles(count) {
  reshuffleIfNeeded(count);
  return state.deck.splice(0, count);
}

function reshuffleIfNeeded(count) {
  if (state.deck.length >= count) return;
  state.deck = shuffle([...state.deck, ...state.discard]);
  state.discard = [];
}

function refillHand() {
  const need = handLimit() - state.hand.length;
  if (need > 0) state.hand.push(...drawTiles(need));
  topUpHand();
  trimHandToLimit();
}

function topUpHand() {
  while (state.hand.length < handLimit()) {
    state.hand.push(state.hand.length ? cloneTile(sample(state.hand)) : { id: uid(), suit: "wan", rank: 5 });
  }
}

function trimHandToLimit() {
  while (state.hand.length > handLimit()) {
    state.discard.push(state.hand.pop());
  }
}

function selectedTiles() {
  return state.hand.filter((tile) => state.selected.has(tile.id));
}

function moveSelectedToDiscard() {
  const selected = selectedTiles();
  state.discard.push(...selected);
  state.hand = state.hand.filter((tile) => !state.selected.has(tile.id));
  state.selected.clear();
}

function evaluateTiles(tiles) {
  if (tiles.length === 1) return { valid: true, name: "高牌", base: 18 + tileValue(tiles[0]), mult: 1, tags: ["high"] };
  const counts = getCounts(tiles);
  const sameSuit = tiles.every((tile) => tile.suit === tiles[0].suit);
  const numeric = tiles.every((tile) => NUMERIC_SUITS.includes(tile.suit));
  const values = [...counts.values()].sort((a, b) => b - a);
  const ranks = tiles.map((tile) => tile.rank).sort((a, b) => a - b);
  const straight = tiles.length === 3 && sameSuit && numeric && ranks[0] + 1 === ranks[1] && ranks[1] + 1 === ranks[2];
  const run5 = tiles.length === 5 && sameSuit && numeric && new Set(ranks).size === 5 && ranks.every((r, i) => i === 0 || r === ranks[i - 1] + 1);
  if (tiles.length === 5 && sameSuit && numeric && values[0] === 4) return { valid: true, name: "清一色杠子", base: 220, mult: 8, tags: ["flush", "triplet"] };
  if (tiles.length === 5 && sameSuit && numeric && values.join(",") === "3,2") return { valid: true, name: "清一色满堂刻", base: 230, mult: 8, tags: ["flush", "triplet", "pair"] };
  if (tiles.length === 5 && values[0] === 4) return { valid: true, name: "杠子", base: 110, mult: 4, tags: ["triplet"] };
  if (tiles.length === 5 && values.join(",") === "3,2") return { valid: true, name: "满堂刻", base: 170, mult: 6, tags: ["triplet", "pair"] };
  if (tiles.length === 5 && sameSuit && numeric) return { valid: true, name: run5 ? "清一色两顺" : "清一色", base: run5 ? 190 : 150, mult: run5 ? 7 : 5, tags: run5 ? ["flush", "straight"] : ["flush"] };
  if (tiles.length === 4 && values[0] === 4) return { valid: true, name: "杠子", base: 110, mult: 4, tags: ["triplet"] };
  if (tiles.length === 3 && values[0] === 3) return { valid: true, name: "刻子", base: 72, mult: 3, tags: ["triplet"] };
  if (straight) return { valid: true, name: "顺子", base: 58, mult: 3, tags: ["straight"] };
  if (tiles.length === 4 && values.join(",") === "2,2") return { valid: true, name: "两对", base: 66, mult: 3, tags: ["pair"] };
  if (tiles.length === 2 && values[0] === 2) return { valid: true, name: "对子", base: 34, mult: 2, tags: ["pair"] };
  if (isDragonFullSet(tiles) && tiles.length === 5 && values[0] >= 2) return { valid: true, name: "三元归位", base: 210, mult: 8, tags: ["dragon", "pair"] };
  if (tiles.length === 3 && sameSuit && tiles[0].suit === "dragon" && new Set(tiles.map((t) => t.rank)).size === 3) return { valid: true, name: "小三元", base: 130, mult: 6, tags: ["dragon"] };
  const sameNumberCombo = evaluateSameNumberTiles(tiles);
  if (sameNumberCombo) return sameNumberCombo;
  const looseBase = 24 + tiles.reduce((sum, tile) => sum + tileValue(tile), 0);
  const sameNumeric = tiles.length >= 3 && sameSuit && numeric;
  return { valid: true, name: sameNumeric ? "同门散牌" : "散牌", base: sameNumeric ? looseBase + 18 : looseBase, mult: sameNumeric ? 1.5 : 1, tags: sameNumeric ? ["loose", "sameSuit"] : ["loose"] };
}

function evaluateSameNumberTiles(tiles) {
  const numeric = tiles.every((tile) => NUMERIC_SUITS.includes(tile.suit));
  if (!numeric) return null;
  const sameRank = tiles.every((tile) => tile.rank === tiles[0].rank);
  if (!sameRank) return null;
  const suitCount = new Set(tiles.map((tile) => tile.suit)).size;
  if (tiles.length === 2 && suitCount === 2) return { valid: true, name: "同数对子", base: 28, mult: 1.5, tags: ["sameNumber", "loose"] };
  if (tiles.length === 3 && suitCount === 3) return { valid: true, name: "三门同数", base: 48, mult: 2, tags: ["sameNumber", "loose"] };
  return null;
}

function isDragonFullSet(tiles) {
  if (!tiles.every((tile) => tile.suit === "dragon")) return false;
  return new Set(tiles.map((tile) => tile.rank)).size === 3;
}

function isBigTripletCombo(combo) {
  return combo.tags.includes("triplet") && (combo.name === "满堂刻" || combo.name === "清一色满堂刻" || combo.name === "清一色杠子" || combo.name === "三元归位");
}

function isBigStraightCombo(combo) {
  return combo.name === "清一色两顺";
}

function recordComboLane(combo) {
  const lane = laneForCombo(combo);
  state.stageComboCounts[lane] = (state.stageComboCounts[lane] || 0) + 1;
}

function laneForCombo(combo) {
  if (combo.tags.includes("straight")) return "顺子";
  if (combo.tags.includes("triplet")) return "刻子";
  if (combo.tags.includes("flush")) return "清一色";
  if (combo.tags.includes("dragon")) return "字牌";
  if (combo.tags.includes("pair")) return "对子";
  if (combo.tags.includes("high")) return "高牌";
  if (combo.tags.includes("loose")) return "散牌";
  return "通用";
}

function dominantStageLane() {
  const entries = Object.entries(state.stageComboCounts);
  if (!entries.length) return "";
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0];
}

function activeLanePreference() {
  const recentLane = state.lastStageLane;
  if (recentLane && recentLane !== "通用" && recentLane !== "未成型") return recentLane;
  const laneCounts = new Map();
  state.artifacts.forEach((artifactItem) => {
    if (!artifactItem.lane || artifactItem.lane === "通用") return;
    laneCounts.set(artifactItem.lane, (laneCounts.get(artifactItem.lane) || 0) + 1);
  });
  const ranked = [...laneCounts.entries()].sort((a, b) => b[1] - a[1]);
  if (ranked.length) return ranked[0][0];
  return state.startLane || "通用";
}

function ensureOpeningSeed() {
  const lane = activeLanePreference();
  if (lane === "顺子") ensureStraightSeed();
  else if (lane === "刻子" || lane === "对子") ensurePairSeed(lane === "刻子" ? 2 : 1);
  else if (lane === "散牌" || lane === "字牌") ensureHonorSeed();
}

function ensureStraightSeed() {
  if (hasStraightSeed(state.hand)) return;
  const candidate = pullAdjacentTileFromDeck(state.hand);
  if (!candidate) return;
  replaceWeakestHandTile(candidate);
}

function ensurePairSeed(minPairs) {
  if (countExactPairs(state.hand) >= minPairs) return;
  const candidate = pullMatchingTileFromDeck(state.hand);
  if (!candidate) return;
  replaceWeakestHandTile(candidate);
}

function ensureHonorSeed() {
  const honorCount = state.hand.filter((tile) => tile.suit === "wind" || tile.suit === "dragon").length;
  if (honorCount >= 2) return;
  const index = state.deck.findIndex((tile) => tile.suit === "wind" || tile.suit === "dragon");
  if (index < 0) return;
  const [candidate] = state.deck.splice(index, 1);
  replaceWeakestHandTile(candidate);
}

function hasStraightSeed(tiles) {
  for (const suit of NUMERIC_SUITS) {
    const ranks = [...new Set(tiles.filter((tile) => tile.suit === suit).map((tile) => tile.rank))].sort((a, b) => a - b);
    for (let i = 1; i < ranks.length; i += 1) {
      if (ranks[i] === ranks[i - 1] + 1) return true;
    }
  }
  return false;
}

function countExactPairs(tiles) {
  return [...getCounts(tiles).values()].filter((count) => count >= 2).length;
}

function pullMatchingTileFromDeck(hand) {
  const wanted = new Set(hand.map((tile) => `${tile.suit}-${tile.rank}`));
  const index = state.deck.findIndex((tile) => wanted.has(`${tile.suit}-${tile.rank}`));
  if (index < 0) return null;
  return state.deck.splice(index, 1)[0];
}

function pullAdjacentTileFromDeck(hand) {
  const numeric = hand.filter((tile) => NUMERIC_SUITS.includes(tile.suit));
  for (const tile of numeric) {
    const index = state.deck.findIndex((deckTile) => deckTile.suit === tile.suit && Math.abs(deckTile.rank - tile.rank) === 1);
    if (index >= 0) return state.deck.splice(index, 1)[0];
  }
  const fallbackIndex = state.deck.findIndex((tile, index, arr) => {
    if (!NUMERIC_SUITS.includes(tile.suit)) return false;
    return arr.some((other, otherIndex) => otherIndex !== index && other.suit === tile.suit && Math.abs(other.rank - tile.rank) === 1);
  });
  if (fallbackIndex < 0) return null;
  return state.deck.splice(fallbackIndex, 1)[0];
}

function replaceWeakestHandTile(tile) {
  if (!state.hand.length) {
    state.hand.push(tile);
    return;
  }
  let replaceIndex = 0;
  let worstScore = Infinity;
  state.hand.forEach((handTile, index) => {
    const score = weaknessScore(handTile);
    if (score < worstScore) {
      worstScore = score;
      replaceIndex = index;
    }
  });
  state.discard.push(state.hand[replaceIndex]);
  state.hand[replaceIndex] = tile;
}

function weaknessScore(tile) {
  const sameCount = state.hand.filter((handTile) => handTile.suit === tile.suit && handTile.rank === tile.rank).length;
  const adjacentCount = state.hand.filter((handTile) => handTile.id !== tile.id && handTile.suit === tile.suit && Math.abs(handTile.rank - tile.rank) === 1).length;
  let score = 0;
  if (tile.suit === "wind" || tile.suit === "dragon") score -= 1;
  if (sameCount >= 2) score += 4;
  if (adjacentCount > 0) score += 3;
  if (NUMERIC_SUITS.includes(tile.suit) && tile.rank >= 3 && tile.rank <= 7) score += 1;
  return score;
}

function calculateScore(tiles, combo) {
  const c = { tiles, combo, state, base: combo.base, mult: combo.mult, factor: 1, log: [`牌型：${combo.name} ${combo.base}点 × ${formatNum(combo.mult)}番`], triggers: [] };
  if (combo.tags.includes("straight")) addBase(c, state.upgrades.straightBase, "顺子升级");
  if (combo.tags.includes("triplet")) addBase(c, state.upgrades.tripletBase, "刻子升级");
  if (combo.tags.includes("flush")) addMult(c, state.upgrades.flushMult, "清一色升级");
  if (state.upgradeFlags.straightFirstBurst && combo.tags.includes("straight") && !state.upgradeUses.straightFirstBurstUsed) {
    c.factor *= 1.8;
    c.log.push("顺势而为：本关首次顺子最终 ×1.8");
  }
  if (state.upgradeFlags.flushFirstFan && combo.tags.includes("flush") && !state.upgradeUses.flushFirstFanUsed) {
    c.mult += 3;
    c.log.push("一色入魂：本关首次清一色番数 +3");
  }
  const rule = currentStage().rule;
  if (rule && rule.id === "noWan") addBase(c, -countSuit(tiles, "wan") * 18, "Boss 断门");
  if (rule && rule.id === "noDragon") addBase(c, -countSuit(tiles, "dragon") * 45, "Boss 压元");
  if (rule && rule.id === "straightHalf" && combo.tags.includes("straight")) {
    c.mult *= 0.5;
    c.log.push("Boss 封顺：番数 ×0.5");
  }
  if (rule && rule.id === "repeatTax" && state.lastCombo === combo.name) addMult(c, -3, "Boss 重复");
  state.artifacts.forEach((a) => {
    const b = [c.base, c.mult, c.factor];
    a.apply(c, state);
    if (b[0] !== c.base || b[1] !== c.mult || b[2] !== c.factor) {
      c.log.push(`${a.name}：${deltaText(b, c)}`);
      c.triggers.push({ id: a.id, name: a.name });
    }
  });
  c.base = Math.max(1, Math.round(c.base));
  c.mult = Math.max(1, c.mult);
  const total = Math.round(c.base * c.mult * c.factor);
  c.log.push(`最终：${c.base}点 × ${formatNum(c.mult)}番 × ${formatNum(c.factor)} = ${formatInt(total)}`);
  return { base: c.base, mult: c.mult, total, log: c.log, triggers: c.triggers };
}

function draw() {
  hits = [];
  fillRect(0, 0, W, H, COLORS.bg);
  if (state.screen === "start") drawStart();
  if (state.screen === "build") drawBuildSelect();
  if (state.screen === "game") drawGame();
  if (state.screen === "reward") drawReward();
  if (state.screen === "replace") drawReplace();
  if (state.screen === "end") drawEnd();
  if (state.resolve && Date.now() < state.resolve.until) drawResolve();
  if (state.showStageSelect) drawStageSelect();
  if (state.showDealDebug) drawDebugDeal();
  if (state.showGuide) drawGuide();
  if (state.showHandHelp) drawHandHelp();
  if (state.inspectedArtifact) drawArtifactDetail();
  if (state.adPrompt) drawAdPrompt();
  if (state.toast && Date.now() < state.toastUntil) drawToast();
  requestAnimationFrame(draw);
}

function drawStart() {
  text("雀", W / 2, H * 0.23, 58, COLORS.gold, "center", "bold");
  strokeRound(W / 2 - 42, H * 0.23 - 54, 84, 84, 8, COLORS.gold);
  text("雀灵试炼", W / 2, H * 0.39, 38, COLORS.text, "center", "bold");
  text("麻将牌型肉鸽 · 点数 × 番数 · 法器构筑", W / 2, H * 0.44, 14, COLORS.muted, "center");
  button(W * 0.12, H * 0.66, W * 0.76, 54, "开始试炼", openBuildSelect, true);
  button(W * 0.12, H * 0.76, W * 0.76, 48, "调试选关", () => { state.showStageSelect = true; }, false);
}

function openBuildSelect() {
  if (state.runCount === 0) {
    const balanced = START_BUILDS.find((build) => build.id === "balanced");
    const others = shuffle(START_BUILDS.filter((build) => build.id !== "balanced")).slice(0, 2);
    state.startBuildChoices = shuffle([balanced, ...others]);
  } else {
    state.startBuildChoices = shuffle(START_BUILDS).slice(0, 3);
  }
  state.screen = "build";
}

function drawBuildSelect() {
  text("选择开局", W / 2, 80, 16, COLORS.gold, "center", "bold");
  text("只决定起手倾向，核心法器仍在第一关后选择", W / 2, 112, 14, COLORS.muted, "center");
  state.startBuildChoices.forEach((build, i) => {
    const y = 160 + i * 128;
    const meta = laneMeta(build.lane);
    roundRect(18, y, W - 36, 104, 8, COLORS.panel);
    strokeRound(18, y, W - 36, 104, 8, meta.color, 1.2);
    pill(34, y + 18, 36, 24, meta.icon, meta.color);
    text(build.name, 82, y + 39, 21, COLORS.text, "left", "bold");
    text(build.lane, W - 34, y + 38, 13, meta.color, "right", "bold");
    wrapText(build.desc, 34, y + 70, W - 68, 13, COLORS.muted, 2);
    hit(18, y, W - 36, 104, () => startRun(0, false, build));
  });
  button(W * 0.12, H - 86, W * 0.76, 48, "返回", () => { state.screen = "start"; }, false);
}

function drawGame() {
  const compact = isCompact();
  const stage = currentStage();
  const selected = selectedTiles();
  const combo = selected.length ? evaluateTiles(selected) : null;
  const result = combo ? calculateScore(selected, combo) : null;
  drawTopBar(stage);
  drawEnemyPanel(stage);
  const remaining = Math.max(0, stageTarget() - state.score);
  const needed = state.handsLeft ? Math.ceil(remaining / state.handsLeft) : remaining;
  if (stage.rule) text(currentRuleHint(combo), 28, 188, 12, currentRuleRisk(combo) ? COLORS.red : COLORS.gold);
  else if (state.stageEvent) text(state.stageEvent.text, 28, 188, 12, COLORS.gold);

  const y = compact ? 184 : 202;
  panel(14, y, W - 28, compact ? 118 : 142);
  text("当前出牌", 28, y + 23, 12, COLORS.muted);
  text(combo ? combo.name : "请选择 1-5 张牌", 28, y + 50, 21, COLORS.text, "left", "bold");
  drawScorePreview(28, y + (compact ? 60 : 68), W - 166, result);
  drawPaceBadge(W - 120, y + 96, 92, 24, result, needed, combo);
  const triggerText = result && result.triggers.length ? `触发：${result.triggers.map((item) => item.name).join("、")}` : "触发：暂无法器";
  if (!compact) wrapText(triggerText, 28, y + 122, W - 166, 11, COLORS.muted, 1);
  smallButton(W - 120, y + 14, 92, 34, "牌型说明", () => { state.showHandHelp = true; });
  smallButton(W - 120, y + 54, 92, 34, state.luckUsed ? "已借运" : "借运", borrowLuck);
  if (state.debugMode) smallButton(W - 120, y + 94, 92, 24, "调试发牌", () => { state.showDealDebug = true; });

  drawBuildPanel(compact ? 314 : 356);
  drawArtifacts(compact ? 374 : 438);
  drawHand(compact ? H - 230 : H - 260);
  const smallW = (W - 66) / 4;
  button(18, H - 72, smallW, 52, state.discardsLeft > 0 ? "换牌" : "3金换", state.discardsLeft > 0 ? discardSelected : buyDiscardWithCoins, false);
  button(26 + smallW, H - 72, smallW, 52, "广告换", watchAdForDiscard, false);
  button(34 + smallW * 2, H - 72, smallW, 52, "广告出", watchAdForHand, false);
  button(42 + smallW * 3, H - 72, smallW, 52, "出牌", playSelected, true);
}

function drawEnemyPanel(stage) {
  const fx = state.enemyFx && Date.now() < state.enemyFx.until ? state.enemyFx : null;
  const shift = fx ? (fx.tier >= 3 ? 3 : 2) * (Date.now() % 2 === 0 ? 1 : -1) : 0;
  const x = 14 + shift;
  const y = 72;
  const w = W - 28;
  const hpW = W - 56;
  panel(x, y, w, 104);
  drawEnemyAttackFx(x, y, w, fx);
  text(stage.enemy, x + 14, y + 30, 21, COLORS.text, "left", "bold");
  if (stage.boss) pill(x + w - 72, y + 12, 58, 26, "Boss", COLORS.red);
  const attackText = fx ? `${fx.attack} · -${formatInt(fx.damage)}` : "以牌为术，压制妖灵";
  text(attackText, x + 14, y + 52, 12, fx ? fx.color : COLORS.muted, "left", "bold");
  roundRect(x + 14, y + 64, hpW, 16, 8, "#0d0f10");
  roundRect(x + 14, y + 64, hpW * Math.min(1, state.score / stageTarget()), 16, 8, fx ? fx.color : COLORS.green);
  text(`${formatInt(state.score)} / ${formatInt(stageTarget())}`, x + 14, y + 102, 13, COLORS.muted);
  const remaining = Math.max(0, stageTarget() - state.score);
  const needed = state.handsLeft ? Math.ceil(remaining / state.handsLeft) : remaining;
  text(`还需 ${formatInt(remaining)} · 每手约 ${formatInt(needed)}`, x + 14, y + 120, 11, COLORS.muted);
  text("出牌", x + w - 164, y + 74, 12, COLORS.muted);
  text(`${state.handsLeft}`, x + w - 130, y + 82, 26, state.handsLeft <= 1 ? COLORS.red : COLORS.gold, "center", "bold");
  text("换牌", x + w - 90, y + 74, 12, COLORS.muted);
  text(`${state.discardsLeft}`, x + w - 56, y + 82, 26, state.discardsLeft <= 0 ? COLORS.red : COLORS.gold, "center", "bold");
  drawBossSigil(x + w - 96, y + 18, fx);
}

function drawEnemyAttackFx(x, y, w, fx) {
  if (!fx) return;
  const alpha = Math.max(0, Math.min(1, (fx.until - Date.now()) / 520));
  const tint = fx.kind === "burst" ? "rgba(242,109,109,0.24)" : fx.kind === "slash" ? "rgba(96,211,148,0.18)" : fx.kind === "echo" ? "rgba(211,140,255,0.18)" : "rgba(242,189,85,0.16)";
  roundRect(x + w - 102, y + 14, 74, 74, 12, tint);
  if (fx.kind === "slash") {
    for (let i = 0; i < Math.min(4, fx.tier + 1); i += 1) {
      fillRect(x + 26 + i * 18, y + 18 + i * 8, 38, 4, fx.color);
    }
  } else if (fx.kind === "crush") {
    roundRect(x + 36, y + 18, 54, 34 + fx.tier * 4, 8, "rgba(242,189,85,0.22)");
    roundRect(x + 44, y + 24, 38, 22 + fx.tier * 4, 6, fx.color);
  } else if (fx.kind === "echo") {
    for (let i = 0; i < 2; i += 1) {
      strokeRound(x + 34 + i * 18, y + 18 + i * 10, 24 + fx.tier * 5, 24 + fx.tier * 5, 10, fx.color, 1 + i);
    }
  } else if (fx.kind === "burst") {
    roundRect(x + 36, y + 18, 54, 54, 14, "rgba(242,109,109,0.16)");
    for (let i = 0; i < fx.tier + 1; i += 1) {
      fillRect(x + 48 - i * 4, y + 42 + i * 4, 30 + i * 8, 4, fx.color);
      fillRect(x + 62, y + 28 - i * 2, 4, 28 + i * 8, fx.color);
    }
  } else if (fx.kind === "seal") {
    roundRect(x + 44, y + 22, 38, 38, 8, "rgba(230,225,210,0.16)");
    text("封", x + 63, y + 48, 20, fx.color, "center", "bold");
  } else if (fx.kind === "sting") {
    fillRect(x + 34, y + 42, 44, 4, fx.color);
    fillRect(x + 74, y + 36, 12, 16, fx.color);
  } else {
    for (let i = 0; i < fx.tier; i += 1) {
      roundRect(x + 40 + i * 10, y + 28 + i * 6, 10, 10, 4, fx.color);
    }
  }
  if (alpha > 0.35) {
    text(fx.comboName, x + w - 136, y + 32, 12, fx.color, "left", "bold");
  }
}

function drawBossSigil(x, y, fx) {
  const core = fx ? fx.color : COLORS.line;
  roundRect(x, y, 54, 54, 10, "#151a1d");
  strokeRound(x, y, 54, 54, 10, core, fx ? 2 : 1);
  roundRect(x + 10, y + 10, 34, 34, 8, fx ? "rgba(242,189,85,0.18)" : "#20282c");
  text(fx ? "破" : "妖", x + 27, y + 34, 20, core, "center", "bold");
  if (fx) {
    for (let i = 0; i < fx.tier; i += 1) {
      roundRect(x + 6 + i * 10, y + 60, 6, 6, 3, core);
    }
  }
}

function drawTopBar(stage) {
  const gap = 8;
  const cell = (W - 28 - gap * 2) / 3;
  [["第", state.stageIndex + 1], ["目标", formatInt(stageTarget())], ["金币", state.coins]].forEach((item, i) => {
    panel(14 + i * (cell + gap), 12, cell, 48);
    text(item[0], 14 + i * (cell + gap) + cell / 2, 28, 11, COLORS.muted, "center");
    text(String(item[1]), 14 + i * (cell + gap) + cell / 2, 50, 17, COLORS.text, "center", "bold");
  });
}

function drawArtifacts(y) {
  const compact = isCompact();
  text(`法器 ${state.artifacts.length}/${state.artifactSlots}`, 18, y, 14, COLORS.text, "left", "bold");
  const gap = 6;
  const cols = Math.max(5, state.artifacts.length);
  const size = (W - 36 - gap * (cols - 1)) / cols;
  state.artifacts.forEach((a, i) => {
    const x = 18 + i * (size + gap);
    const cardH = compact ? 54 : 88;
    const active = state.lastTriggeredArtifacts.includes(a.id);
    roundRect(x, y + 12, size, cardH, 8, active ? "#2d2512" : COLORS.panel);
    strokeRound(x, y + 12, size, cardH, 8, active ? COLORS.gold : COLORS.line, active ? 1.5 : 1);
    const meta = laneMeta(a.lane);
    pill(x + 5, y + 18, 24, 18, meta.icon, meta.color);
    text(a.icon, x + size / 2, y + 38, compact ? 16 : 18, COLORS.gold, "center", "bold");
    text(a.name, x + size / 2, y + (compact ? 59 : 59), 11, COLORS.text, "center", "bold");
    if (!compact) wrapText(artifactStatusText(a), x + 5, y + 76, size - 10, 10, active ? COLORS.gold : COLORS.muted, 2);
    hit(x, y + 12, size, cardH, () => { state.inspectedArtifact = a; });
  });
}

function drawScorePreview(x, y, w, result) {
  const col = w / 3;
  const items = result
    ? [["点数", result.base], ["番数", formatNum(result.mult)], ["预计", formatInt(result.total)]]
    : [["点数", 0], ["番数", 0], ["预计", 0]];
  items.forEach((item, i) => {
    const bx = x + i * col;
    text(item[0], bx, y + 14, 11, COLORS.muted);
    text(item[1], bx, y + 40, i === 2 ? 20 : 18, i === 2 ? COLORS.gold : COLORS.text, "left", "bold");
  });
}

function drawPaceBadge(x, y, w, h, result, needed, combo) {
  let label = "未选牌";
  let color = COLORS.panel2;
  if (result) {
    label = result.total >= needed ? "达标" : `差 ${formatInt(needed - result.total)}`;
    color = result.total >= needed ? COLORS.green : COLORS.red;
  }
  if (combo && currentRuleRisk(combo)) {
    label = "规则惩罚";
    color = COLORS.red;
  }
  pill(x, y, w, h, label, color);
}

function drawBuildPanel(y) {
  const compact = isCompact();
  const lane = state.lastStageLane || dominantStageLane() || "未定";
  const summary = state.stageSummary;
  const meta = laneMeta(lane);
  panel(14, y, W - 28, compact ? 52 : 64);
  pill(28, y + 14, 34, 22, meta.icon, meta.color);
  text("当前流派", 72, y + 23, 12, COLORS.muted);
  text(lane, 72, y + (compact ? 45 : 50), compact ? 19 : 22, meta.color, "left", "bold");
  const growth = buildGrowthText(lane);
  text(growth, W - 28, y + 22, 12, COLORS.text, "right", "bold");
  const scoreText = summary
    ? `上关最高 ${formatInt(summary.bestHandScore)} · 均分 ${formatInt(summary.avgHandScore)}`
    : "打出牌型后开始记录成长";
  if (!compact) text(scoreText, W - 28, y + 48, 11, COLORS.muted, "right");
  drawLaneMiniBar(28, y + (compact ? 46 : 56), W - 56, lane);
}

function buildGrowthText(lane) {
  if (lane === "顺子") return `顺子成长 +${state.growth.straightFan}番 / +${state.upgrades.straightBase}点`;
  if (lane === "刻子") return `刻子成长 +${state.growth.tripletBase + state.upgrades.tripletBase}点`;
  if (lane === "清一色") return `清一色成长 +${formatNum(state.upgrades.flushMult)}番`;
  if (lane === "金币") return `金币 ${state.coins} · 利息 ${Math.min(5, Math.floor(state.coins / 5))}`;
  if (lane === "对子") return `对子倾向 ${deckPairPotential()}组`;
  if (lane === "散牌") return `散牌成长 +${state.growth.looseFan}番 / +${state.growth.looseBase}点`;
  if (lane === "高牌") return `高牌成长 ×${formatNum(3 + state.growth.highFactor)}`;
  return `牌山 ${state.deck.length} / 弃牌 ${state.discard.length}`;
}

function drawLaneMiniBar(x, y, w, lane) {
  const plays = Math.max(1, state.stagePlays);
  const value = Math.min(1, (state.stageComboCounts[lane] || 0) / plays);
  roundRect(x, y, w, 4, 2, "#0d0f10");
  roundRect(x, y, w * value, 4, 2, laneMeta(lane).color);
}

function drawHand(y) {
  text(`手牌：选择 1-5 张    牌山 ${state.deck.length} / 弃牌 ${state.discard.length}`, 18, y - 12, 13, COLORS.muted);
  const gap = 7;
  const tw = (W - 36 - gap * 4) / 5;
  const th = Math.max(48, Math.min(72, tw * 1.28, (H - 84 - y - 10) / 2));
  state.hand.forEach((tile, i) => {
    const row = Math.floor(i / 5);
    const col = i % 5;
    const x = 18 + col * (tw + gap);
    const ty = y + row * (th + 10) - (state.selected.has(tile.id) ? 8 : 0);
    drawTile(tile, x, ty, tw, th);
    hit(x, ty, tw, th, () => {
      if (state.selected.has(tile.id)) state.selected.delete(tile.id);
      else if (state.selected.size < 5) state.selected.add(tile.id);
      else toast("最多选择 5 张");
    });
  });
}

function drawReward() {
  const compact = H < 700;
  const hasPenalty = state.nextTargetPenalty > 0;
  const rewardY = rewardLayout(compact, !!currentStage().rule, !!(state.catchUpAvailable || state.finalPrepAvailable), !!state.paidUpgradeChoices.length, hasPenalty);
  text("过关奖励", W / 2, 82, 14, COLORS.gold, "center", "bold");
  text(state.stageIndex === 1 ? "选择核心法器" : "选择一项强化", W / 2, 118, 28, COLORS.text, "center", "bold");
  text(`下一关：${currentStage().enemy}`, W / 2, 148, 14, COLORS.muted, "center");
  text(`金币 ${state.coins}`, W - 28, 170, 12, COLORS.gold, "right", "bold");
  const nextRule = currentStage().rule;
  let warnY = 188;
  if (nextRule) { text(`预警：${nextRule.text}`, W / 2, warnY, 12, COLORS.red, "center", "bold"); warnY += 14; }
  if (hasPenalty) text(`借运惩罚：下关目标 +${Math.round(state.nextTargetPenalty * 100)}%`, W / 2, warnY, 12, COLORS.red, "center");
  if (state.stageSummary) {
    const lane = state.stageSummary.mainLane;
    const meta = laneMeta(lane);
    pill(18, 154, 34, 22, meta.icon, meta.color);
    text(`${lane}流 · 最高 ${formatInt(state.stageSummary.bestHandScore)} · 均分 ${formatInt(state.stageSummary.avgHandScore)}`, 60, 170, 12, COLORS.muted);
  }
  if (state.deckChanges.length) {
    text(state.deckChanges[state.deckChanges.length - 1], W / 2, rewardY.deckChangeY, 11, COLORS.gold, "center");
  }
  if (state.paidUpgradeChoices.length) {
    drawPaidUpgradeChoices(rewardY.sectionY, compact);
    return;
  }
  if (state.catchUpAvailable || state.finalPrepAvailable) {
    smallButton(18, rewardY.sectionY, W - 36, compact ? 28 : 32, state.finalPrepAvailable ? "终局强化：补足主流派" : "天命改造：补足主流派", takeCatchUpReward);
  }
  state.rewardChoices.forEach((choice, i) => {
    drawRewardChoice(choice, 18, rewardY.rewardStartY + i * rewardY.stepY, W - 36, rewardY.cardH);
  });
  if (state.stageIndex !== 1) {
    const buttonGap = 8;
    const buttonWidth = (W - 36 - buttonGap) / 2;
    const buttonY = H - (compact ? 58 : 72);
    const buttonH = compact ? 40 : 48;
    button(18, buttonY, buttonWidth, buttonH, "3金刷新", refreshRewardsWithCoins, false);
    button(18 + buttonWidth + buttonGap, buttonY, buttonWidth, buttonH, state.boughtUpgradeThisReward ? "已买改造" : "5金二选一", buyDeckUpgradeWithCoins, false);
  }
}

function drawPaidUpgradeChoices(y, compact) {
  text("5 金牌山改造：二选一", W / 2, y, 14, COLORS.gold, "center", "bold");
  state.paidUpgradeChoices.forEach((choice, i) => {
    drawRewardChoice(choice, 18, y + 20 + i * (compact ? 88 : 104), W - 36, compact ? 76 : 92, choosePaidDeckUpgrade);
  });
  button(18, H - (compact ? 58 : 72), W - 36, compact ? 40 : 48, "暂不购买", () => { state.paidUpgradeChoices = []; }, false);
}

function drawRewardChoice(choice, x, y, w, h, onChoose = chooseReward) {
  const meta = laneMeta(choice.lane);
  roundRect(x, y, w, h, 8, COLORS.panel);
  strokeRound(x, y, w, h, 8, choice.lane === state.lastStageLane ? meta.color : COLORS.line, choice.lane === state.lastStageLane ? 1.5 : 1);
  pill(x + 14, y + 13, 34, 22, meta.icon, meta.color);
  text(choice.type || "强化", x + 58, y + 29, 12, COLORS.gold, "left", "bold");
  text(choice.lane || "通用", x + w - 16, y + 29, 12, meta.color, "right", "bold");
  text(choice.name, x + 14, y + 56, 19, COLORS.text, "left", "bold");
  wrapText(rewardImpactText(choice), x + 14, y + (h < 84 ? 72 : 77), w - 28, h < 84 ? 11 : 12, COLORS.muted, 1);
  hit(x, y, w, h, () => onChoose(choice));
}

function drawReplace() {
  text(`新法器：${state.pendingArtifact.name}`, W / 2, 76, 16, COLORS.gold, "center", "bold");
  text("选择要替换的法器", W / 2, 112, 28, COLORS.text, "center", "bold");
  wrapText(state.pendingArtifact.desc, 30, 144, W - 60, 14, COLORS.muted, 2);
  const count = state.artifacts.length;
  const listTop = 192;
  const gap = 6;
  const cardH = Math.min(76, Math.floor((H - 24 - listTop - gap * (count - 1)) / count));
  state.artifacts.forEach((a, i) => {
    const y = listTop + i * (cardH + gap);
    panel(18, y, W - 36, cardH);
    text(`槽位 ${i + 1}`, 34, y + Math.round(cardH * 0.32), 12, COLORS.gold, "left", "bold");
    text(a.name, 34, y + Math.round(cardH * 0.61), 18, COLORS.text, "left", "bold");
    if (cardH >= 58) wrapText(artifactStatusText(a), 34, y + cardH - 14, W - 120, 11, COLORS.muted, 1);
    text("替换", W - 34, y + Math.round(cardH * 0.61), 13, COLORS.muted, "right");
    hit(18, y, W - 36, cardH, () => replaceArtifact(i));
  });
}

function drawEnd() {
  text(state.win ? "胜" : "败", W / 2, H * 0.25, 58, state.win ? COLORS.gold : COLORS.red, "center", "bold");
  text(state.win ? "试炼完成" : "试炼中断", W / 2, H * 0.42, 34, COLORS.text, "center", "bold");
  text(state.win ? "你打穿了三元龙王" : `止步第 ${state.stageIndex + 1} 关`, W / 2, H * 0.48, 15, COLORS.muted, "center");
  if (!state.win && state.adsUsed.revive < 1) {
    button(W * 0.12, H * 0.64, W * 0.76, 52, "模拟广告复活", watchAdForRevive, true);
    button(W * 0.12, H * 0.75, W * 0.76, 52, "再来一局", () => { state.screen = "start"; }, false);
  } else {
    button(W * 0.12, H * 0.72, W * 0.76, 56, "再来一局", () => { state.screen = "start"; }, true);
  }
}

function drawStageSelect() {
  fillRect(0, 0, W, H, "rgba(0,0,0,0.66)");
  hit(0, 0, W, H, () => {});
  const x = 18;
  const y = 58;
  const w = W - 36;
  const h = H - 116;
  roundRect(x, y, w, h, 10, COLORS.panel);
  strokeRound(x, y, w, h, 10, COLORS.gold, 1.5);
  text("调试选关", W / 2, y + 38, 24, COLORS.text, "center", "bold");
  text("直接进入指定关卡，会带基础调试法器套装。", W / 2, y + 64, 12, COLORS.muted, "center");

  const cols = 3;
  const gap = 8;
  const cellW = (w - 36 - gap * (cols - 1)) / cols;
  const cellH = 78;
  const startY = y + 88;
  STAGES.forEach((stage, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const bx = x + 18 + col * (cellW + gap);
    const by = startY + row * (cellH + gap);
    roundRect(bx, by, cellW, cellH, 8, COLORS.panel2);
    strokeRound(bx, by, cellW, cellH, 8, stage.boss ? COLORS.red : COLORS.line);
    text(`第 ${index + 1} 关`, bx + cellW / 2, by + 24, 14, COLORS.gold, "center", "bold");
    text(stage.enemy, bx + cellW / 2, by + 47, 12, COLORS.text, "center", "bold");
    text(formatInt(stage.target), bx + cellW / 2, by + 66, 11, COLORS.muted, "center");
    hit(bx, by, cellW, cellH, () => startRun(index, true));
  });

  button(x + 18, y + h - 52, w - 36, 38, "关闭", () => { state.showStageSelect = false; }, false);
}

function drawDebugDeal() {
  fillRect(0, 0, W, H, "rgba(0,0,0,0.68)");
  hit(0, 0, W, H, () => {});
  const x = 18;
  const y = 52;
  const w = W - 36;
  const h = H - 104;
  roundRect(x, y, w, h, 10, COLORS.panel);
  strokeRound(x, y, w, h, 10, COLORS.gold, 1.5);
  text("调试发牌", W / 2, y + 36, 24, COLORS.text, "center", "bold");
  text("点击后直接塞入目标牌型，方便验证判定、特效和法器联动。", W / 2, y + 60, 12, COLORS.muted, "center");
  const cols = 2;
  const gap = 8;
  const cardW = (w - 36 - gap) / cols;
  const cardH = 56;
  const startY = y + 88;
  DEBUG_DEAL_PRESETS.forEach((preset, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const bx = x + 18 + col * (cardW + gap);
    const by = startY + row * (cardH + gap);
    roundRect(bx, by, cardW, cardH, 8, COLORS.panel2);
    strokeRound(bx, by, cardW, cardH, 8, COLORS.line);
    text(preset.name, bx + cardW / 2, by + 33, 17, COLORS.text, "center", "bold");
    hit(bx, by, cardW, cardH, () => debugDealPreset(preset.id));
  });
  button(x + 18, y + h - 52, w - 36, 38, "关闭", () => { state.showDealDebug = false; }, false);
}

function drawAdPrompt() {
  fillRect(0, 0, W, H, "rgba(0,0,0,0.66)");
  hit(0, 0, W, H, () => {});
  const x = 28;
  const y = H * 0.28;
  const w = W - 56;
  const h = 238;
  roundRect(x, y, w, h, 10, COLORS.panel);
  strokeRound(x, y, w, h, 10, COLORS.gold, 1.5);
  text(state.adPrompt.title, W / 2, y + 42, 24, COLORS.text, "center", "bold");
  wrapText(state.adPrompt.desc, x + 22, y + 82, w - 44, 15, COLORS.muted, 3);
  text("这里是广告位模拟，不会请求真实广告。", W / 2, y + 134, 12, COLORS.gold, "center");
  button(x + 18, y + h - 92, w - 36, 38, "模拟看完", finishAdPrompt, true);
  button(x + 18, y + h - 46, w - 36, 34, "取消", closeAdPrompt, false);
}

function drawArtifactDetail() {
  const a = state.inspectedArtifact;
  if (!a) return;
  fillRect(0, 0, W, H, "rgba(0,0,0,0.64)");
  hit(0, 0, W, H, () => {});
  const x = 24;
  const y = H * 0.2;
  const w = W - 48;
  const h = 318;
  const meta = laneMeta(a.lane);
  roundRect(x, y, w, h, 10, COLORS.panel);
  strokeRound(x, y, w, h, 10, meta.color, 1.5);
  pill(x + 20, y + 22, 42, 24, meta.icon, meta.color);
  text(a.name, x + 74, y + 43, 24, COLORS.text, "left", "bold");
  text(`流派：${a.lane || "通用"}`, x + 20, y + 82, 13, meta.color, "left", "bold");
  wrapText(a.desc, x + 20, y + 112, w - 40, 15, COLORS.muted, 4);
  text("当前成长", x + 20, y + 202, 13, COLORS.gold, "left", "bold");
  wrapText(artifactDetailText(a), x + 20, y + 230, w - 40, 14, COLORS.text, 3);
  button(x + 18, y + h - 58, w - 36, 42, "关闭", () => { state.inspectedArtifact = null; }, true);
}

function currentRuleHint(combo) {
  const rule = currentStage().rule;
  if (!rule) return "";
  if (rule.id === "repeatTax" && combo && state.lastCombo === combo.name) return `警告：重复 ${combo.name} 会番数 -3`;
  return rule.text;
}

function currentRuleRisk(combo) {
  const rule = currentStage().rule;
  if (!rule || !combo) return false;
  if (rule.id === "straightHalf" && combo.tags.includes("straight")) return true;
  if (rule.id === "repeatTax" && state.lastCombo === combo.name) return true;
  if (rule.id === "noWan" && selectedTiles().some((tile) => tile.suit === "wan")) return true;
  if (rule.id === "noDragon" && selectedTiles().some((tile) => tile.suit === "dragon")) return true;
  return false;
}

function drawGuide() {
  fillRect(0, 0, W, H, "rgba(0,0,0,0.58)");
  hit(0, 0, W, H, () => {});
  const x = 24;
  const y = H * 0.21;
  const w = W - 48;
  const h = 292;
  roundRect(x, y, w, h, 10, COLORS.panel);
  strokeRound(x, y, w, h, 10, COLORS.gold, 1.5);
  text("首局提示", W / 2, y + 42, 25, COLORS.text, "center", "bold");
  wrapText("选 1-5 张牌都能出。打出和换掉的牌会进弃牌堆，牌山不够时会洗回，所以牌会再次出现。", x + 18, y + 82, w - 36, 15, COLORS.muted, 4);
  wrapText("第一关后选择核心法器。核心法器会在过关时改造牌山，让后续随机逐渐偏向你的构筑。", x + 18, y + 180, w - 36, 14, COLORS.gold, 3);
  button(x + 18, y + h - 62, w - 36, 44, "开始摸牌", () => { state.showGuide = false; }, true);
}

function debugDealPreset(presetId) {
  const tiles = buildDebugPresetTiles(presetId);
  if (!tiles.length) return toast("未生成调试手牌");
  state.selected.clear();
  state.discard.push(...state.hand);
  state.hand = tiles.map(cloneTile);
  topUpHand();
  trimHandToLimit();
  state.showDealDebug = false;
  const name = DEBUG_DEAL_PRESETS.find((item) => item.id === presetId)?.name || presetId;
  toast(`调试发牌：${name}`);
}

function buildDebugPresetTiles(presetId) {
  const suit = sample(NUMERIC_SUITS);
  const altSuit = suit === "wan" ? "tong" : "wan";
  if (presetId === "pair") return makeTiles([[suit, 6], [suit, 6]]);
  if (presetId === "twoPair") return makeTiles([[suit, 3], [suit, 3], [altSuit, 7], [altSuit, 7]]);
  if (presetId === "straight") return makeTiles([[suit, 3], [suit, 4], [suit, 5]]);
  if (presetId === "triplet") return makeTiles([[suit, 5], [suit, 5], [suit, 5]]);
  if (presetId === "kong") return makeTiles([[suit, 4], [suit, 4], [suit, 4], [suit, 4]]);
  if (presetId === "fullHouse") return makeTiles([[suit, 2], [suit, 2], [suit, 2], [altSuit, 8], [altSuit, 8]]);
  if (presetId === "flush") return makeTiles([[suit, 1], [suit, 3], [suit, 5], [suit, 7], [suit, 9]]);
  if (presetId === "flushRun") return makeTiles([[suit, 2], [suit, 3], [suit, 4], [suit, 5], [suit, 6]]);
  if (presetId === "flushFullHouse") return makeTiles([[suit, 2], [suit, 2], [suit, 2], [suit, 7], [suit, 7]]);
  if (presetId === "flushKong") return makeTiles([[suit, 4], [suit, 4], [suit, 4], [suit, 4], [suit, 8]]);
  if (presetId === "dragon") return makeTiles([["dragon", 1], ["dragon", 2], ["dragon", 3]]);
  if (presetId === "dragonFull") return makeTiles([["dragon", 1], ["dragon", 2], ["dragon", 3], ["dragon", 1], ["dragon", 1]]);
  return [];
}

function makeTiles(specs) {
  return specs.map(([tileSuit, rank]) => ({ id: uid(), suit: tileSuit, rank }));
}

function drawResolve() {
  const progress = Math.max(0, Math.min(1, (state.resolve.until - Date.now()) / 1400));
  const y = 172 - (1 - progress) * 16;
  const x = 24;
  const w = W - 48;
  roundRect(x, y, w, 112, 10, "rgba(15,20,22,0.94)");
  strokeRound(x, y, w, 112, 10, COLORS.gold, 1.2);
  text(state.resolve.combo, W / 2, y + 32, 22, COLORS.text, "center", "bold");
  text(`+${formatInt(state.resolve.total)}`, W / 2, y + 64, 28, COLORS.gold, "center", "bold");
  state.resolve.log.slice(-2).forEach((line, i) => text(line, W / 2, y + 88 + i * 15, 11, COLORS.muted, "center"));
}

function drawHandHelp() {
  fillRect(0, 0, W, H, "rgba(0,0,0,0.62)");
  hit(0, 0, W, H, () => {});
  const x = 18;
  const y = 64;
  const w = W - 36;
  const h = H - 128;
  roundRect(x, y, w, h, 10, COLORS.panel);
  strokeRound(x, y, w, h, 10, COLORS.gold, 1.5);
  text("牌型说明", W / 2, y + 38, 24, COLORS.text, "center", "bold");
  text("基础点番固定；弃牌会洗回牌山，后续还会出现。", W / 2, y + 64, 12, COLORS.muted, "center");

  const rowH = Math.min(H < 760 ? 28 : 36, Math.floor((h - 150) / HAND_HELP.length));
  const startY = y + (H < 760 ? 76 : 92);
  HAND_HELP.forEach((item, i) => {
    const rowY = startY + i * rowH;
    const rank = HAND_RANKS.find((rankItem) => rankItem[0] === item[0]);
    text(item[0], x + 16, rowY, H < 760 ? 12 : 14, COLORS.gold, "left", "bold");
    text(rank ? `${rank[1]}点 × ${rank[2]}番` : "", x + w - 16, rowY, 12, COLORS.text, "right", "bold");
    wrapText(item[1], x + 16, rowY + (H < 760 ? 14 : 17), w - 32, H < 760 ? 10 : 11, COLORS.muted, 1);
  });

  button(x + 18, y + h - 58, w - 36, 42, "知道了", () => { state.showHandHelp = false; }, true);
}

function drawToast() {
  const tw = W - 44;
  roundRect(22, H - 132, tw, 42, 8, "#0f1416");
  strokeRound(22, H - 132, tw, 42, 8, COLORS.line);
  text(state.toast, W / 2, H - 106, 14, COLORS.text, "center", "bold");
}

function drawTile(tile, x, y, w, h) {
  roundRect(x, y, w, h, 8, COLORS.tile);
  strokeRound(x, y, w, h, 8, state.selected.has(tile.id) ? COLORS.gold : "#d8d1bf", 2);
  const color = tile.suit === "wan" || tile.suit === "dragon" ? "#cf3f3f" : tile.suit === "tong" ? "#276bd1" : tile.suit === "tiao" ? "#228c5a" : "#333b40";
  text(tileText(tile), x + w / 2, y + h * 0.42, 30, color, "center", "bold");
  text(SUIT_LABELS[tile.suit], x + w / 2, y + h - 12, 12, COLORS.ink, "center", "bold");
}

function button(x, y, w, h, label, onTap, primary) {
  roundRect(x, y, w, h, 8, primary ? COLORS.gold : COLORS.panel2);
  if (!primary) strokeRound(x, y, w, h, 8, COLORS.line);
  text(label, x + w / 2, y + h / 2 + 5, 17, primary ? COLORS.ink : COLORS.text, "center", "bold");
  hit(x, y, w, h, onTap);
}

function smallButton(x, y, w, h, label, onTap) {
  roundRect(x, y, w, h, 8, COLORS.panel2);
  strokeRound(x, y, w, h, 8, COLORS.line);
  text(label, x + w / 2, y + h / 2 + 4, 13, COLORS.text, "center", "bold");
  hit(x, y, w, h, onTap);
}

function panel(x, y, w, h) {
  roundRect(x, y, w, h, 8, COLORS.panel);
  strokeRound(x, y, w, h, 8, COLORS.line);
}

function pill(x, y, w, h, label, color) {
  roundRect(x, y, w, h, h / 2, color);
  text(label, x + w / 2, y + h / 2 + 4, 12, "#fff", "center", "bold");
}

function text(value, x, y, size, color, align = "left", weight = "normal") {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = "alphabetic";
  ctx.fillText(String(value), x, y);
}

function wrapText(value, x, y, maxW, size, color, maxLines) {
  ctx.font = `${size}px sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = "left";
  const chars = String(value).split("");
  let line = "";
  let lines = 0;
  chars.forEach((ch) => {
    const test = line + ch;
    if (ctx.measureText(test).width > maxW && line) {
      if (lines < maxLines) ctx.fillText(line, x, y + lines * (size + 3));
      line = ch;
      lines += 1;
    } else {
      line = test;
    }
  });
  if (lines < maxLines && line) ctx.fillText(line, x, y + lines * (size + 3));
}

function roundRect(x, y, w, h, r, color) {
  ctx.fillStyle = color;
  pathRound(x, y, w, h, r);
  ctx.fill();
}

function strokeRound(x, y, w, h, r, color, lineWidth = 1) {
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  pathRound(x, y, w, h, r);
  ctx.stroke();
}

function pathRound(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function fillRect(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function hit(x, y, w, h, onTap) {
  hits.push({ x, y, w, h, onTap });
}

function inside(px, py, rect) {
  return px >= rect.x && px <= rect.x + rect.w && py >= rect.y && py <= rect.y + rect.h;
}

function currentStage() {
  return STAGES[state.stageIndex];
}

function stageTarget() {
  return Math.round(currentStage().target * state.targetMultiplier);
}

function handLimit() {
  return 9;
}

function applyAfterPlayBossRule() {
  const rule = currentStage().rule;
  if (rule && rule.id === "coinBleed") {
    state.coins = Math.max(0, state.coins - 2);
  }
}

function artifact(id, name, icon, desc, apply, hooks = {}) {
  return { id, name, icon, desc, apply, lane: hooks.lane || "通用", afterPlay: hooks.afterPlay, stageClear: hooks.stageClear };
}

function getArtifact(id) {
  return ARTIFACTS.find((a) => a.id === id);
}

function hasTag(c, tag) {
  return c.combo.tags.includes(tag);
}

function getCounts(tiles) {
  const counts = new Map();
  tiles.forEach((tile) => {
    const key = `${tile.suit}-${tile.rank}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return counts;
}

function countSuit(tiles, suit) {
  return tiles.filter((tile) => tile.suit === suit).length;
}

function deckPairPotential() {
  return [...getCounts([...state.deck, ...state.hand]).values()].filter((count) => count >= 2).length;
}

function rewardLayout(compact, hasRule, hasCatchUp, paidMode, hasPenalty) {
  const warnCount = (hasRule ? 1 : 0) + (hasPenalty ? 1 : 0);
  const deckChangeY = 190 + warnCount * 14;
  const sectionY = deckChangeY + 14;
  if (!compact) {
    return { deckChangeY, sectionY, rewardStartY: sectionY + (hasCatchUp ? 42 : 4), cardH: 92, stepY: 104 };
  }
  const sectionOffset = hasCatchUp ? 34 : 0;
  return {
    deckChangeY,
    sectionY,
    rewardStartY: sectionY + sectionOffset + 10,
    cardH: paidMode ? 76 : 72,
    stepY: paidMode ? 88 : 78,
  };
}

function cashFanBonus(coins) {
  return Math.min(10, Math.floor(coins / 5));
}

function isCompact() {
  return H < 760;
}

function laneMeta(lane) {
  return LANE_META[lane] || LANE_META["通用"];
}

function artifactStatusText(artifactItem) {
  if (artifactItem.id === "greenDragon") return `成长 +${state.growth.straightFan}番`;
  if (artifactItem.id === "whiteTiger") return `成长 +${state.growth.tripletBase}点`;
  if (artifactItem.id === "cashToFan") return `当前 +${cashFanBonus(state.coins)}番`;
  if (artifactItem.id === "goldVault") return `成长 +${state.growth.wealthFan}番`;
  if (artifactItem.id === "looseManual") return `成长 +${state.growth.looseFan}番 / +${state.growth.looseBase}点`;
  if (artifactItem.id === "singleBlade") return `成长 ×${formatNum(3 + state.growth.highFactor)}`;
  return artifactItem.lane || "通用";
}

function artifactDetailText(artifactItem) {
  if (artifactItem.id === "greenDragon") return `顺子已成长 +${state.growth.straightFan} 番；顺子升级额外 +${state.upgrades.straightBase} 点。`;
  if (artifactItem.id === "whiteTiger") return `刻子系成长 +${state.growth.tripletBase} 点；刻子升级额外 +${state.upgrades.tripletBase} 点。`;
  if (artifactItem.id === "cashToFan") return `当前金币 ${state.coins}，出牌时提供 +${cashFanBonus(state.coins)} 番，最高封顶 +10。`;
  if (artifactItem.id === "goldVault") return `金币成长番数 +${state.growth.wealthFan}；金币越多，后续成长越高。`;
  if (artifactItem.id === "pairNeedle") return `当前对子倾向 ${deckPairPotential()} 组；对子系番数会随牌山对子潜力增加。`;
  if (artifactItem.id === "pairEcho") return `对子系最终 ×2；如果上一手也是对子系，本手额外 ×1.4。`;
  if (artifactItem.id === "looseManual") return `散牌出牌成长：已 +${state.growth.looseFan}番 / +${state.growth.looseBase}点；过关加字牌、补换牌。`;
  if (artifactItem.id === "singleBlade") return `高牌出牌成长：当前系数 ×${formatNum(3 + state.growth.highFactor)}，每次高牌 +0.2。`;
  return artifactItem.desc;
}

function rewardImpactText(choice) {
  if (choice.type === "法器") return choice.desc;
  if (choice.type === "牌山改造") return `改变后续发牌：${choice.desc}`;
  if (choice.type === "牌型升级") return `永久强化牌型：${choice.desc}`;
  if (choice.type === "局内资源") return `增加下关容错：${choice.desc}`;
  if (choice.type === "金币") return `经济资源：${choice.desc}`;
  return choice.desc || "";
}

function tileText(tile) {
  if (tile.suit === "wind") return WIND_NAMES[tile.rank - 1];
  if (tile.suit === "dragon") return DRAGON_NAMES[tile.rank - 1];
  return String(tile.rank);
}

function tileValue(tile) {
  if (tile.suit === "dragon") return 14;
  if (tile.suit === "wind") return 11;
  return tile.rank;
}

function addBase(c, value, label) {
  if (!value) return;
  c.base += value;
  c.log.push(`${label}：点数 ${signed(value)}`);
}

function addMult(c, value, label) {
  if (!value) return;
  c.mult += value;
  c.log.push(`${label}：番数 ${signed(value)}`);
}

function deltaText(before, c) {
  const parts = [];
  if (before[0] !== c.base) parts.push(`点数 ${signed(c.base - before[0])}`);
  if (before[1] !== c.mult) parts.push(`番数 ${signed(c.mult - before[1])}`);
  if (before[2] !== c.factor) parts.push(`最终 ×${formatNum(c.factor / before[2])}`);
  return parts.join("，");
}

function signed(value) {
  return `${value > 0 ? "+" : ""}${formatNum(value)}`;
}

function cloneTile(tile) {
  return { ...tile, id: uid() };
}

function uid() {
  return `${Date.now()}-${Math.random()}`;
}

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function sample(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function formatInt(value) {
  return Math.round(value).toLocaleString();
}

function formatNum(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function toast(message) {
  state.toast = message;
  state.toastUntil = Date.now() + 1500;
}

requestAnimationFrame(function loop(time) {
  if (time - lastFrame > 16) lastFrame = time;
  draw();
});
