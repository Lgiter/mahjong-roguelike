const TILE_SUITS = {
  wan: { label: "万", className: "wan" },
  tong: { label: "筒", className: "tong" },
  tiao: { label: "条", className: "tiao" },
  wind: { label: "风", className: "wind" },
  dragon: { label: "元", className: "dragon" },
};

const WIND_NAMES = ["东", "南", "西", "北"];
const DRAGON_NAMES = ["中", "发", "白"];

const STAGES = [
  { target: 520, hands: 4, enemy: "赤鳞妖" },
  { target: 1250, hands: 4, enemy: "铜钱怪" },
  {
    target: 2800,
    hands: 4,
    enemy: "断门鬼",
    boss: true,
    rule: { id: "noWan", text: "Boss：万字牌不提供基础点" },
  },
  { target: 5600, hands: 4, enemy: "烟火狐" },
  { target: 11800, hands: 4, enemy: "石面将" },
  {
    target: 24000,
    hands: 4,
    enemy: "封顺魇",
    boss: true,
    rule: { id: "straightHalf", text: "Boss：顺子和两顺番数减半" },
  },
  { target: 52000, hands: 4, enemy: "金铃童子" },
  { target: 110000, hands: 4, enemy: "黑风客" },
  {
    target: 230000,
    hands: 4,
    enemy: "三元龙王",
    boss: true,
    rule: { id: "repeatTax", text: "Boss：重复上次牌型时番数 -3" },
  },
];

const CORE_ARTIFACT_IDS = ["greenDragon", "whiteTiger", "cashToFan"];

const HAND_RANKS = [
  { name: "高牌", base: 18, mult: 1 },
  { name: "散牌", base: 24, mult: 1 },
  { name: "对子", base: 34, mult: 2 },
  { name: "两对", base: 66, mult: 3 },
  { name: "顺子", base: 58, mult: 3 },
  { name: "刻子", base: 72, mult: 3 },
  { name: "杠子", base: 110, mult: 4 },
  { name: "小三元", base: 130, mult: 6 },
  { name: "清一色", base: 150, mult: 5 },
  { name: "满堂刻", base: 170, mult: 6 },
  { name: "清一色两顺", base: 190, mult: 7 },
];

const HAND_HELP = [
  { name: "高牌", desc: "选 1 张牌。最低牌型，靠法器可以过渡。" },
  { name: "散牌", desc: "选 2-5 张但没有组成特殊牌型。" },
  { name: "对子", desc: "2 张完全相同，例如 7筒 + 7筒。" },
  { name: "两对", desc: "4 张牌，包含两组对子。" },
  { name: "顺子", desc: "3 张同花色连续数字，例如 3条 + 4条 + 5条。" },
  { name: "刻子", desc: "3 张完全相同。" },
  { name: "杠子", desc: "4 张完全相同。" },
  { name: "小三元", desc: "中、发、白各 1 张。" },
  { name: "清一色", desc: "5 张全是同一种数字花色：万、筒或条。" },
  { name: "满堂刻", desc: "5 张牌，三张相同 + 一对。" },
  { name: "清一色两顺", desc: "5 张同花色连续数字，例如 2万3万4万5万6万。" },
];

const ARTIFACTS = [
  {
    id: "trialCharm",
    name: "试炼符",
    icon: "初",
    desc: "高牌和散牌番数 +1，帮助前期过渡。",
    apply(ctx) {
      if (ctx.combo.tags.includes("high") || ctx.combo.tags.includes("loose")) ctx.mult += 1;
    },
  },
  {
    id: "greenDragon",
    name: "青龙印",
    icon: "青",
    desc: "顺子番数 +2；每打一次顺子，本局顺子额外番数永久 +1。",
    apply(ctx) {
      if (ctx.combo.tags.includes("straight")) ctx.mult += 2 + ctx.state.growth.straightFan;
    },
    onAfterPlay(state, combo) {
      if (combo.tags.includes("straight")) state.growth.straightFan += 1;
    },
  },
  {
    id: "whiteTiger",
    name: "白虎符",
    icon: "虎",
    desc: "刻子和杠子基础点 +60；每打一次刻子系，本局刻子基础永久 +25。",
    apply(ctx) {
      if (ctx.combo.tags.includes("triplet")) ctx.base += 60 + ctx.state.growth.tripletBase;
    },
    onAfterPlay(state, combo) {
      if (combo.tags.includes("triplet")) state.growth.tripletBase += 25;
    },
  },
  {
    id: "redCrane",
    name: "朱雀灯",
    icon: "朱",
    desc: "每张万字牌基础点 +18。",
    apply(ctx) {
      ctx.base += countSuit(ctx.tiles, "wan") * 18;
    },
  },
  {
    id: "rainBell",
    name: "听雨铃",
    icon: "雨",
    desc: "每张筒子牌番数 +0.5。",
    apply(ctx) {
      ctx.mult += countSuit(ctx.tiles, "tong") * 0.5;
    },
  },
  {
    id: "bambooSlip",
    name: "青竹简",
    icon: "竹",
    desc: "每张条子牌基础点 +14，若含顺子再 +30。",
    apply(ctx) {
      ctx.base += countSuit(ctx.tiles, "tiao") * 14;
      if (ctx.combo.tags.includes("straight")) ctx.base += 30;
    },
  },
  {
    id: "windBanner",
    name: "风神幡",
    icon: "风",
    desc: "每张风牌番数 +1。",
    apply(ctx) {
      ctx.mult += countSuit(ctx.tiles, "wind");
    },
  },
  {
    id: "trinityLamp",
    name: "三元灯",
    icon: "元",
    desc: "打出中发白时番数 +5。",
    apply(ctx) {
      const dragons = new Set(ctx.tiles.filter((tile) => tile.suit === "dragon").map((tile) => tile.rank));
      if (dragons.has(1) && dragons.has(2) && dragons.has(3)) ctx.mult += 5;
    },
  },
  {
    id: "cashToFan",
    name: "财神像",
    icon: "财",
    desc: "每 5 金币番数 +1。",
    apply(ctx, state) {
      ctx.mult += Math.floor(state.coins / 5);
    },
  },
  {
    id: "loopScript",
    name: "连环诀",
    icon: "环",
    desc: "连续打出顺子时，最终得分 ×2.2。",
    apply(ctx, state) {
      if (ctx.combo.tags.includes("straight") && state.lastComboTags.includes("straight")) ctx.factor *= 2.2;
    },
  },
  {
    id: "twinHammer",
    name: "双锤令",
    icon: "锤",
    desc: "刻子、杠子、满堂刻最终得分 ×2。",
    apply(ctx) {
      if (ctx.combo.tags.includes("triplet")) ctx.factor *= 2;
    },
  },
  {
    id: "goldVault",
    name: "聚宝匣",
    icon: "宝",
    desc: "过关时金币越多，下局财神成长越高；金币番数额外 +成长值。",
    apply(ctx, state) {
      ctx.mult += state.growth.wealthFan;
    },
    onStageClear(state) {
      state.growth.wealthFan += Math.max(1, Math.floor(state.coins / 12));
    },
  },
  {
    id: "comboDrum",
    name: "连庄鼓",
    icon: "连",
    desc: "连续打出同牌型时番数 +4。",
    apply(ctx, state) {
      if (state.lastCombo === ctx.combo.name) ctx.mult += 4;
    },
  },
  {
    id: "clearMirror",
    name: "清门镜",
    icon: "清",
    desc: "清一色最终得分 ×2.5。",
    apply(ctx) {
      if (ctx.combo.tags.includes("flush")) ctx.factor *= 2.5;
    },
  },
  {
    id: "pairNeedle",
    name: "鸳鸯针",
    icon: "双",
    desc: "对子和两对番数 +3。",
    apply(ctx) {
      if (ctx.combo.tags.includes("pair")) ctx.mult += 3;
    },
  },
  {
    id: "stonePot",
    name: "镇山炉",
    icon: "山",
    desc: "选择 5 张牌时基础点 +80。",
    apply(ctx) {
      if (ctx.tiles.length === 5) ctx.base += 80;
    },
  },
  {
    id: "knife",
    name: "削牌刀",
    icon: "削",
    desc: "每次出牌后额外获得 1 金币。",
    onAfterPlay(state) {
      state.coins += 1;
    },
  },
  {
    id: "echoSeal",
    name: "回响玺",
    icon: "响",
    desc: "法器少于 4 件时，最终得分 ×1.8。",
    apply(ctx, state) {
      if (state.artifacts.length < 4) ctx.factor *= 1.8;
    },
  },
];

const UPGRADES = [
  {
    id: "upgradeStraight",
    name: "顺势而为",
    type: "牌型升级",
    desc: "顺子和两顺基础点 +60，并复制一张中间数牌。",
    choose(state) {
      state.upgrades.straightBase += 60;
      copyRankRange(state, ["wan", "tong", "tiao"], 3, 7, 1);
    },
  },
  {
    id: "upgradeTriplet",
    name: "重门叠影",
    type: "牌型升级",
    desc: "刻子、杠子、满堂刻基础点 +80，并复制一张已有对子牌。",
    choose(state) {
      state.upgrades.tripletBase += 80;
      copyPairTile(state);
    },
  },
  {
    id: "upgradeFlush",
    name: "一色入魂",
    type: "牌型升级",
    desc: "清一色番数 +3，并把 3 张牌改成同一门。",
    choose(state) {
      state.upgrades.flushMult += 3;
      repaintRandomTiles(state);
    },
  },
  {
    id: "moreHands",
    name: "添香续局",
    type: "局内资源",
    desc: "下一关出牌次数 +1。",
    choose(state) {
      state.nextHandBonus += 1;
    },
  },
  {
    id: "coinPouch",
    name: "小钱袋",
    type: "金币",
    desc: "立刻获得 7 金币。",
    choose(state) {
      state.coins += 7;
    },
  },
  {
    id: "thinDeck",
    name: "净牌术",
    type: "牌山改造",
    desc: "从牌山中移除 4 张随机低价值牌。",
    choose(state) {
      const removable = state.deck.filter((tile) => ["wind", "dragon"].includes(tile.suit) || tile.rank === 1 || tile.rank === 9);
      for (let i = 0; i < 4 && removable.length; i += 1) {
        const target = sample(removable);
        removeTileById(state.deck, target.id);
        removable.splice(removable.findIndex((tile) => tile.id === target.id), 1);
      }
    },
  },
  {
    id: "copyCore",
    name: "拓印术",
    type: "牌山改造",
    desc: "复制手牌中随机 2 张牌加入牌山。",
    choose(state) {
      const choices = shuffle([...state.hand]).slice(0, 2);
      choices.forEach((tile) => state.deck.push(cloneTile(tile)));
    },
  },
];

const state = {
  selectedDeck: "balanced",
  stageIndex: 0,
  score: 0,
  coins: 6,
  handsLeft: 0,
  hand: [],
  selectedIds: new Set(),
  deck: [],
  discard: [],
  artifacts: [],
  upgrades: {
    straightBase: 0,
    tripletBase: 0,
    flushMult: 0,
  },
  nextHandBonus: 0,
  lastCombo: "",
  lastComboTags: [],
  growth: {
    straightFan: 0,
    tripletBase: 0,
    wealthFan: 0,
  },
  pendingLog: [],
  pendingArtifact: null,
  rewardChoices: [],
};

const els = {
  startScreen: document.querySelector("#startScreen"),
  gameScreen: document.querySelector("#gameScreen"),
  rewardScreen: document.querySelector("#rewardScreen"),
  endScreen: document.querySelector("#endScreen"),
  startBtn: document.querySelector("#startBtn"),
  restartBtn: document.querySelector("#restartBtn"),
  deckCards: document.querySelectorAll(".deck-card"),
  stageLabel: document.querySelector("#stageLabel"),
  targetLabel: document.querySelector("#targetLabel"),
  coinLabel: document.querySelector("#coinLabel"),
  enemyName: document.querySelector("#enemyName"),
  bossBadge: document.querySelector("#bossBadge"),
  hpFill: document.querySelector("#hpFill"),
  scoreLabel: document.querySelector("#scoreLabel"),
  handsLabel: document.querySelector("#handsLabel"),
  drawLabel: document.querySelector("#drawLabel"),
  ruleLabel: document.querySelector("#ruleLabel"),
  comboName: document.querySelector("#comboName"),
  baseLabel: document.querySelector("#baseLabel"),
  multLabel: document.querySelector("#multLabel"),
  previewLabel: document.querySelector("#previewLabel"),
  triggerLog: document.querySelector("#triggerLog"),
  artifacts: document.querySelector("#artifacts"),
  artifactCount: document.querySelector("#artifactCount"),
  rulebook: document.querySelector("#rulebook"),
  hand: document.querySelector("#hand"),
  discardBtn: document.querySelector("#discardBtn"),
  playBtn: document.querySelector("#playBtn"),
  toast: document.querySelector("#toast"),
  handHelpBtn: document.querySelector("#handHelpBtn"),
  handHelpModal: document.querySelector("#handHelpModal"),
  closeHandHelpBtn: document.querySelector("#closeHandHelpBtn"),
  handHelpList: document.querySelector("#handHelpList"),
  rewardKicker: document.querySelector("#rewardKicker"),
  rewardTitle: document.querySelector("#rewardTitle"),
  rewardSummary: document.querySelector("#rewardSummary"),
  rewardOptions: document.querySelector("#rewardOptions"),
  endSeal: document.querySelector("#endSeal"),
  endTitle: document.querySelector("#endTitle"),
  endText: document.querySelector("#endText"),
};

els.startBtn.addEventListener("click", startRun);
els.restartBtn.addEventListener("click", () => showScreen("start"));
els.playBtn.addEventListener("click", playSelectedTiles);
els.discardBtn.addEventListener("click", discardSelectedTiles);
els.handHelpBtn.addEventListener("click", openHandHelp);
els.closeHandHelpBtn.addEventListener("click", closeHandHelp);
els.handHelpModal.addEventListener("click", (event) => {
  if (event.target === els.handHelpModal) closeHandHelp();
});

function startRun() {
  state.stageIndex = 0;
  state.score = 0;
  state.coins = 6;
  state.hand = [];
  state.selectedIds = new Set();
  state.deck = createDeck("balanced");
  state.discard = [];
  state.artifacts = [getArtifact("trialCharm")];
  state.upgrades = { straightBase: 0, tripletBase: 0, flushMult: 0 };
  state.nextHandBonus = 0;
  state.lastCombo = "";
  state.lastComboTags = [];
  state.growth = { straightFan: 0, tripletBase: 0, wealthFan: 0 };
  state.pendingLog = [];
  state.pendingArtifact = null;
  beginStage();
  showScreen("game");
}

function beginStage() {
  const stage = currentStage();
  state.score = 0;
  state.handsLeft = stage.hands + state.nextHandBonus;
  state.nextHandBonus = 0;
  state.selectedIds.clear();
  reshuffleIfNeeded(10);
  state.hand = drawTiles(8);
  topUpHand();
  ensurePlayableHand();
  render();
  showToast(stage.boss ? stage.rule.text : `${stage.enemy} 出现`);
}

function createDeck(mode) {
  const tiles = [];
  const add = (suit, rank, copies = 4) => {
    for (let i = 0; i < copies; i += 1) {
      tiles.push({ id: crypto.randomUUID(), suit, rank });
    }
  };

  for (const suit of ["wan", "tong", "tiao"]) {
    for (let rank = 1; rank <= 9; rank += 1) {
      let copies = 4;
      if (mode === "bamboo" && suit === "tiao" && rank >= 2 && rank <= 8) copies = 5;
      if (mode === "bamboo" && suit === "wan" && (rank === 1 || rank === 9)) copies = 3;
      add(suit, rank, copies);
    }
  }

  WIND_NAMES.forEach((_, index) => add("wind", index + 1, mode === "honor" ? 5 : 3));
  DRAGON_NAMES.forEach((_, index) => add("dragon", index + 1, mode === "honor" ? 5 : 3));

  return shuffle(tiles);
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

function playSelectedTiles() {
  const tiles = selectedTiles();
  if (tiles.length < 1 || tiles.length > 5) {
    showToast("请选择 1-5 张牌");
    return;
  }

  const combo = evaluateTiles(tiles);
  const result = calculateScore(tiles, combo);
  state.score += result.total;
  state.handsLeft -= 1;
  state.coins += combo.tags.includes("flush") ? 2 : 1;
  state.artifacts.forEach((artifact) => artifact.onAfterPlay?.(state, combo, tiles));
  state.lastCombo = combo.name;
  state.lastComboTags = [...combo.tags];
  state.pendingLog = result.log;
  moveSelectedFromHandToDiscard();
  refillHand();
  render();
  showToast(`${combo.name} 造成 ${result.total.toLocaleString("zh-CN")}`);

  const stage = currentStage();
  if (state.score >= stage.target) {
    setTimeout(() => completeStage(), 450);
  } else if (state.handsLeft <= 0) {
    setTimeout(() => endRun(false), 450);
  }
}

function discardSelectedTiles() {
  const tiles = selectedTiles();
  if (tiles.length === 0) {
    showToast("先选择要换掉的牌");
    return;
  }
  if (state.coins <= 0) {
    showToast("金币不足，无法换牌");
    return;
  }
  state.coins -= 1;
  moveSelectedFromHandToDiscard();
  refillHand();
  render();
  showToast(`换掉 ${tiles.length} 张牌`);
}

function completeStage() {
  const clearBonus = Math.max(2, state.handsLeft + 2);
  state.coins += clearBonus;
  state.artifacts.forEach((artifact) => artifact.onStageClear?.(state));
  if (state.stageIndex >= STAGES.length - 1) {
    endRun(true);
    return;
  }
  state.stageIndex += 1;
  openReward(clearBonus);
}

function openReward(clearBonus) {
  const pool = state.stageIndex === 1 ? coreArtifactRewards() : mixedRewards();
  state.rewardChoices = shuffle(pool).slice(0, 3);
  els.rewardKicker.textContent = `过关奖励 +${clearBonus} 金币`;
  els.rewardTitle.textContent = state.stageIndex === 1 ? "选择核心法器" : "选择一项强化";
  els.rewardSummary.textContent = `下一关：${currentStage().enemy}`;
  renderRewardChoices();
  showScreen("reward");
}

function mixedRewards() {
  return [
    ...ARTIFACTS.filter((artifact) => artifact.id !== "trialCharm" && !state.artifacts.some((owned) => owned.id === artifact.id)).map((artifact) =>
      artifactReward(artifact)
    ),
    ...UPGRADES,
  ];
}

function coreArtifactRewards() {
  return CORE_ARTIFACT_IDS.map((id) => getArtifact(id))
    .filter(Boolean)
    .map((artifact) => artifactReward(artifact));
}

function artifactReward(artifact) {
  return {
    ...artifact,
    type: "法器",
    choose() {
      chooseArtifact(artifact);
    },
  };
}

function chooseArtifact(artifact) {
  if (state.artifacts.length < 5) {
    state.artifacts.push(artifact);
    beginStage();
    showScreen("game");
    return;
  }

  state.pendingArtifact = artifact;
  els.rewardKicker.textContent = `新法器：${artifact.name}`;
  els.rewardTitle.textContent = "选择要替换的法器";
  els.rewardSummary.textContent = artifact.desc;
  renderReplacementChoices();
}

function renderRewardChoices() {
  els.rewardOptions.innerHTML = "";
  state.rewardChoices.forEach((choice, index) => {
    const button = document.createElement("button");
    button.className = "reward-card";
    button.innerHTML = `<span class="type">${choice.type}</span><strong>${choice.name}</strong><small>${choice.desc}</small>`;
    button.addEventListener("click", () => {
      choice.choose(state);
      beginStage();
      showScreen("game");
    });
    els.rewardOptions.append(button);
    if (index === 0) button.focus();
  });
}

function renderReplacementChoices() {
  els.rewardOptions.innerHTML = "";
  state.artifacts.forEach((artifact, index) => {
    const button = document.createElement("button");
    button.className = "reward-card replace-card";
    button.innerHTML = `<span class="type">替换槽位 ${index + 1}</span><strong>${artifact.name}</strong><small>${artifact.desc}</small>`;
    button.addEventListener("click", () => {
      state.artifacts[index] = state.pendingArtifact;
      state.pendingArtifact = null;
      beginStage();
      showScreen("game");
    });
    els.rewardOptions.append(button);
    if (index === 0) button.focus();
  });
}

function endRun(win) {
  showScreen("end");
  els.endSeal.textContent = win ? "胜" : "败";
  els.endTitle.textContent = win ? "试炼完成" : "试炼中断";
  els.endText.textContent = win
    ? `你带着 ${state.artifacts.length} 件法器打穿了三元龙王。`
    : `止步第 ${state.stageIndex + 1} 关，最高得分 ${state.score}。`;
}

function evaluateTiles(tiles) {
  if (tiles.length === 1) {
    const base = 18 + tileFaceValue(tiles[0]);
    return { valid: true, name: "高牌", base, mult: 1, tags: ["high"] };
  }

  const counts = getCounts(tiles);
  const sameSuit = tiles.every((tile) => tile.suit === tiles[0].suit);
  const numeric = tiles.every((tile) => ["wan", "tong", "tiao"].includes(tile.suit));
  const countValues = [...counts.values()].sort((a, b) => b - a);
  const tags = [];
  const sortedRanks = tiles.map((tile) => tile.rank).sort((a, b) => a - b);
  const isStraight = tiles.length === 3 && sameSuit && numeric && sortedRanks[0] + 1 === sortedRanks[1] && sortedRanks[1] + 1 === sortedRanks[2];
  const isTwoStraights = tiles.length === 5 && sameSuit && numeric && hasFiveTileRun(sortedRanks);
  const hasPair = countValues[0] === 2;
  const hasTriplet = countValues[0] === 3;
  const hasQuad = countValues[0] === 4;

  if (tiles.length === 5 && sameSuit && numeric) {
    tags.push("flush");
    if (isTwoStraights) tags.push("straight");
    return { valid: true, name: isTwoStraights ? "清一色两顺" : "清一色", base: isTwoStraights ? 190 : 150, mult: isTwoStraights ? 7 : 5, tags };
  }
  if (tiles.length === 5 && countValues.join(",") === "3,2") {
    tags.push("triplet", "pair");
    return { valid: true, name: "满堂刻", base: 170, mult: 6, tags };
  }
  if (tiles.length === 4 && hasQuad) {
    tags.push("triplet");
    return { valid: true, name: "杠子", base: 110, mult: 4, tags };
  }
  if (tiles.length === 3 && hasTriplet) {
    tags.push("triplet");
    return { valid: true, name: "刻子", base: 72, mult: 3, tags };
  }
  if (isStraight) {
    tags.push("straight");
    return { valid: true, name: "顺子", base: 58, mult: 3, tags };
  }
  if (tiles.length === 4 && countValues.join(",") === "2,2") {
    tags.push("pair");
    return { valid: true, name: "两对", base: 66, mult: 3, tags };
  }
  if (tiles.length === 2 && hasPair) {
    tags.push("pair");
    return { valid: true, name: "对子", base: 34, mult: 2, tags };
  }
  if (tiles.length === 3 && sameSuit && tiles[0].suit === "dragon") {
    const ranks = new Set(tiles.map((tile) => tile.rank));
    if (ranks.size === 3) return { valid: true, name: "小三元", base: 130, mult: 6, tags: ["dragon"] };
  }

  return evaluateLooseTiles(tiles);
}

function evaluateLooseTiles(tiles) {
  const base = 24 + tiles.reduce((sum, tile) => sum + tileFaceValue(tile), 0);
  const sameNumericSuit = tiles.length >= 3 && tiles.every((tile) => tile.suit === tiles[0].suit && ["wan", "tong", "tiao"].includes(tile.suit));
  return {
    valid: true,
    name: sameNumericSuit ? "同门散牌" : "散牌",
    base: sameNumericSuit ? base + 18 : base,
    mult: sameNumericSuit ? 1.5 : 1,
    tags: sameNumericSuit ? ["loose", "sameSuit"] : ["loose"],
  };
}

function calculateScore(tiles, combo) {
  const ctx = {
    tiles,
    combo,
    state,
    base: combo.base,
    mult: combo.mult,
    factor: 1,
    log: [`牌型：${combo.name} ${combo.base} 点 × ${formatNumber(combo.mult)} 番`],
  };

  addBase(ctx, state.upgrades.straightBase, "顺子升级", combo.tags.includes("straight"));
  addBase(ctx, state.upgrades.tripletBase, "刻子升级", combo.tags.includes("triplet"));
  addMult(ctx, state.upgrades.flushMult, "清一色升级", combo.tags.includes("flush"));

  const rule = currentStage().rule;
  addBase(ctx, -countSuit(tiles, "wan") * 18, "Boss 断门", rule?.id === "noWan");
  multiplyMult(ctx, 0.5, "Boss 封顺", rule?.id === "straightHalf" && combo.tags.includes("straight"));
  addMult(ctx, -3, "Boss 重复惩罚", rule?.id === "repeatTax" && state.lastCombo === combo.name);

  state.artifacts.forEach((artifact) => {
    const beforeBase = ctx.base;
    const beforeMult = ctx.mult;
    const beforeFactor = ctx.factor;
    artifact.apply?.(ctx, state);
    if (ctx.base !== beforeBase || ctx.mult !== beforeMult || ctx.factor !== beforeFactor) {
      ctx.log.push(`${artifact.name}：${describeDelta(beforeBase, beforeMult, beforeFactor, ctx)}`);
    }
  });
  ctx.base = Math.max(1, Math.round(ctx.base));
  ctx.mult = Math.max(1, ctx.mult);
  const total = Math.round(ctx.base * ctx.mult * ctx.factor);
  ctx.log.push(`最终：${ctx.base} 点 × ${formatNumber(ctx.mult)} 番 × ${formatNumber(ctx.factor)} = ${total.toLocaleString("zh-CN")}`);
  return { base: ctx.base, mult: ctx.mult, total, log: ctx.log };
}

function render() {
  const stage = currentStage();
  els.stageLabel.textContent = `${state.stageIndex + 1}`;
  els.targetLabel.textContent = stage.target.toLocaleString("zh-CN");
  els.coinLabel.textContent = state.coins;
  els.enemyName.textContent = stage.enemy;
  els.bossBadge.classList.toggle("hidden", !stage.boss);
  els.hpFill.style.width = `${Math.min(100, (state.score / stage.target) * 100)}%`;
  els.scoreLabel.textContent = `${state.score.toLocaleString("zh-CN")} / ${stage.target.toLocaleString("zh-CN")}`;
  els.handsLabel.textContent = `出牌 ${state.handsLeft}`;
  els.drawLabel.textContent = `牌山 ${state.deck.length}`;
  els.ruleLabel.textContent = stage.rule?.text ?? "";
  els.artifactCount.textContent = `${state.artifacts.length}/5`;

  renderArtifacts();
  renderRulebook();
  renderHand();
  renderPreview();
  renderTriggerLog();
}

function renderArtifacts() {
  els.artifacts.innerHTML = "";
  state.artifacts.forEach((artifact) => {
    const item = document.createElement("div");
    item.className = "artifact";
    item.title = `${artifact.name}：${artifact.desc}`;
    item.innerHTML = `<span>${artifact.icon}</span><b>${artifact.name}</b><small>${artifact.desc}</small>`;
    els.artifacts.append(item);
  });
  for (let i = state.artifacts.length; i < 5; i += 1) {
    const item = document.createElement("div");
    item.className = "artifact";
    item.innerHTML = "<span>+</span><b>空位</b>";
    els.artifacts.append(item);
  }
}

function renderRulebook() {
  els.rulebook.innerHTML = "";
  HAND_RANKS.forEach((rank) => {
    const item = document.createElement("div");
    item.className = "rulebook-item";
    item.innerHTML = `<b>${rank.name}</b><span>${rank.base} 点 × ${rank.mult} 番</span>`;
    els.rulebook.append(item);
  });
}

function openHandHelp() {
  els.handHelpList.innerHTML = "";
  HAND_HELP.forEach((help) => {
    const rank = HAND_RANKS.find((item) => item.name === help.name);
    const item = document.createElement("div");
    item.className = "help-item";
    item.innerHTML = `
      <div class="help-item-head">
        <b>${help.name}</b>
        <span>${rank.base} 点 × ${rank.mult} 番</span>
      </div>
      <p>${help.desc}</p>
    `;
    els.handHelpList.append(item);
  });
  els.handHelpModal.classList.remove("hidden");
}

function closeHandHelp() {
  els.handHelpModal.classList.add("hidden");
}

function renderHand() {
  els.hand.innerHTML = "";
  state.hand.forEach((tile) => {
    const button = document.createElement("button");
    button.className = `tile ${TILE_SUITS[tile.suit].className}`;
    button.classList.toggle("selected", state.selectedIds.has(tile.id));
    button.innerHTML = `<span class="rank">${tileText(tile)}</span><span class="suit">${TILE_SUITS[tile.suit].label}</span>`;
    button.addEventListener("click", () => {
      if (state.selectedIds.has(tile.id)) {
        state.selectedIds.delete(tile.id);
      } else if (state.selectedIds.size < 5) {
        state.selectedIds.add(tile.id);
      } else {
        showToast("最多选择 5 张");
      }
      renderHand();
      renderPreview();
    });
    els.hand.append(button);
  });
}

function renderPreview() {
  const tiles = selectedTiles();
  if (tiles.length < 1) {
    els.comboName.textContent = "请选择 1-5 张牌";
    els.baseLabel.textContent = "0 点";
    els.multLabel.textContent = "0 番";
    els.previewLabel.textContent = "0";
    renderTriggerLog([]);
    return;
  }
  const combo = evaluateTiles(tiles);
  const result = calculateScore(tiles, combo);
  els.comboName.textContent = combo.name;
  els.baseLabel.textContent = `${result.base} 点`;
  els.multLabel.textContent = `${formatNumber(result.mult)} 番`;
  els.previewLabel.textContent = result.total.toLocaleString("zh-CN");
  renderTriggerLog(result.log);
}

function renderTriggerLog(lines = state.pendingLog) {
  els.triggerLog.innerHTML = "";
  const shown = lines.length ? lines : ["选择 1-5 张牌后，这里会显示牌力和法器触发链。"];
  shown.slice(-7).forEach((line) => {
    const item = document.createElement("div");
    item.className = "trigger-line";
    const [label, value] = line.includes("：") ? line.split(/：(.*)/s) : [line, ""];
    item.innerHTML = `<span>${label}</span><strong>${value}</strong>`;
    els.triggerLog.append(item);
  });
}

function addBase(ctx, value, label, active = true) {
  if (!active || !value) return;
  ctx.base += value;
  ctx.log.push(`${label}：点数 ${value > 0 ? "+" : ""}${value}`);
}

function addMult(ctx, value, label, active = true) {
  if (!active || !value) return;
  ctx.mult += value;
  ctx.log.push(`${label}：番数 ${value > 0 ? "+" : ""}${formatNumber(value)}`);
}

function multiplyMult(ctx, value, label, active = true) {
  if (!active || value === 1) return;
  ctx.mult *= value;
  ctx.log.push(`${label}：番数 ×${formatNumber(value)}`);
}

function describeDelta(beforeBase, beforeMult, beforeFactor, ctx) {
  const parts = [];
  if (ctx.base !== beforeBase) parts.push(`点数 ${signed(ctx.base - beforeBase)}`);
  if (ctx.mult !== beforeMult) parts.push(`番数 ${signed(ctx.mult - beforeMult)}`);
  if (ctx.factor !== beforeFactor) parts.push(`最终 ×${formatNumber(ctx.factor / beforeFactor)}`);
  return parts.join("，");
}

function signed(value) {
  return `${value > 0 ? "+" : ""}${formatNumber(value)}`;
}

function selectedTiles() {
  return state.hand.filter((tile) => state.selectedIds.has(tile.id));
}

function moveSelectedFromHandToDiscard() {
  const selected = selectedTiles();
  state.discard.push(...selected);
  state.hand = state.hand.filter((tile) => !state.selectedIds.has(tile.id));
  state.selectedIds.clear();
}

function refillHand() {
  const need = 8 - state.hand.length;
  if (need > 0) state.hand.push(...drawTiles(need));
  topUpHand();
  ensurePlayableHand();
}

function topUpHand() {
  while (state.hand.length < 8) {
    if (state.hand.length > 0) {
      state.hand.push(cloneTile(sample(state.hand)));
    } else {
      state.hand.push(createFallbackTile());
    }
  }
}

function currentStage() {
  return STAGES[state.stageIndex];
}

function ensurePlayableHand() {
  if (findPlayableCombo(state.hand)) return;

  reshuffleIfNeeded(5);
  const combo = findPlayableCombo(state.deck);
  if (!combo) {
    forcePairInHand();
    return;
  }

  const weakest = [...state.hand]
    .sort((a, b) => tilePower(a) - tilePower(b))
    .slice(0, combo.length);
  weakest.forEach((tile) => removeTileById(state.hand, tile.id));
  state.discard.push(...weakest);

  combo.forEach((tile) => {
    removeTileById(state.deck, tile.id);
    state.hand.push(tile);
  });
  state.hand = shuffle(state.hand);
}

function forcePairInHand() {
  if (state.hand.length < 2) return;
  const source = [...state.hand].sort((a, b) => tilePower(b) - tilePower(a))[0];
  const target = [...state.hand]
    .filter((tile) => tile.id !== source.id)
    .sort((a, b) => tilePower(a) - tilePower(b))[0];
  if (!source || !target) return;

  removeTileById(state.hand, target.id);
  state.discard.push(target);
  state.hand.push(cloneTile(source));
  state.hand = shuffle(state.hand);
}

function findPlayableCombo(tiles) {
  for (const size of [1, 2, 3, 4, 5]) {
    const combo = findCombination(tiles, size, []);
    if (combo) return combo;
  }
  return null;
}

function findCombination(tiles, size, picked, start = 0) {
  if (picked.length === size) {
    return evaluateTiles(picked).valid ? [...picked] : null;
  }

  for (let i = start; i <= tiles.length - (size - picked.length); i += 1) {
    picked.push(tiles[i]);
    const result = findCombination(tiles, size, picked, i + 1);
    if (result) return result;
    picked.pop();
  }
  return null;
}

function showScreen(name) {
  els.startScreen.classList.toggle("hidden", name !== "start");
  els.gameScreen.classList.toggle("hidden", name !== "game");
  els.rewardScreen.classList.toggle("hidden", name !== "reward");
  els.endScreen.classList.toggle("hidden", name !== "end");
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.remove("hidden");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => els.toast.classList.add("hidden"), 1600);
}

function tileText(tile) {
  if (tile.suit === "wind") return WIND_NAMES[tile.rank - 1];
  if (tile.suit === "dragon") return DRAGON_NAMES[tile.rank - 1];
  return String(tile.rank);
}

function tileFaceValue(tile) {
  if (tile.suit === "dragon") return 14;
  if (tile.suit === "wind") return 11;
  return tile.rank;
}

function getCounts(tiles) {
  const counts = new Map();
  tiles.forEach((tile) => {
    const key = `${tile.suit}-${tile.rank}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });
  return counts;
}

function hasFiveTileRun(ranks) {
  const unique = [...new Set(ranks)];
  if (unique.length !== 5) return false;
  return unique[0] + 1 === unique[1] && unique[1] + 1 === unique[2] && unique[2] + 1 === unique[3] && unique[3] + 1 === unique[4];
}

function countSuit(tiles, suit) {
  return tiles.filter((tile) => tile.suit === suit).length;
}

function getArtifact(id) {
  return ARTIFACTS.find((artifact) => artifact.id === id);
}

function copyRankRange(state, suits, minRank, maxRank, count) {
  const candidates = [...state.hand, ...state.deck].filter((tile) => suits.includes(tile.suit) && tile.rank >= minRank && tile.rank <= maxRank);
  for (let i = 0; i < count && candidates.length; i += 1) {
    state.deck.push(cloneTile(sample(candidates)));
  }
}

function copyPairTile(state) {
  const counts = getCounts([...state.hand, ...state.deck]);
  const pairKey = [...counts.entries()].find(([, count]) => count >= 2)?.[0];
  const source = pairKey
    ? [...state.hand, ...state.deck].find((tile) => `${tile.suit}-${tile.rank}` === pairKey)
    : sample([...state.hand, ...state.deck]);
  if (source) {
    state.deck.push(cloneTile(source), cloneTile(source));
  }
}

function repaintRandomTiles(state) {
  const numeric = [...state.deck, ...state.hand].filter((tile) => ["wan", "tong", "tiao"].includes(tile.suit));
  if (!numeric.length) return;
  const targetSuit = sample(numeric).suit;
  shuffle(numeric)
    .slice(0, 3)
    .forEach((tile) => {
      tile.suit = targetSuit;
    });
}

function removeTileById(tiles, id) {
  const index = tiles.findIndex((tile) => tile.id === id);
  if (index >= 0) tiles.splice(index, 1);
}

function cloneTile(tile) {
  return { ...tile, id: crypto.randomUUID() };
}

function createFallbackTile() {
  return { id: crypto.randomUUID(), suit: "wan", rank: 5 };
}

function tilePower(tile) {
  if (tile.suit === "wind" || tile.suit === "dragon") return 1;
  return Math.abs(tile.rank - 5) + 2;
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

function formatNumber(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
