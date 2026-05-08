import type { StageDef, StageTheme } from './types';

export const STAGES: StageDef[] = [
  { target: 500,    hands: 4, discards: 3, enemy: '赤鳞妖' },
  { target: 1050,   hands: 4, discards: 3, enemy: '铜钱怪' },
  { target: 1900,   hands: 4, discards: 3, enemy: '烟火狐' },
  { target: 3600,   hands: 4, discards: 3, enemy: '断门鬼', boss: true, rule: { id: 'noWan', text: 'Boss：万字牌不提供基础点' } },
  { target: 6800,   hands: 4, discards: 3, enemy: '石面将' },
  { target: 12500,  hands: 4, discards: 3, enemy: '白风客' },
  { target: 23000,  hands: 4, discards: 2, enemy: '封顺魇', boss: true, rule: { id: 'straightHalf', text: 'Boss：顺子和两顺番数减半' } },
  { target: 42000,  hands: 4, discards: 3, enemy: '金铃童子' },
  { target: 68000,  hands: 4, discards: 2, enemy: '三元使', boss: true, rule: { id: 'noDragon', text: 'Boss：三元牌基础点被压制' } },
  { target: 115000, hands: 4, discards: 3, enemy: '黑风客' },
  { target: 190000, hands: 4, discards: 2, enemy: '铁算盘', boss: true, rule: { id: 'coinBleed', text: 'Boss：每次出牌后金币 -2' } },
  { target: 320000, hands: 4, discards: 2, enemy: '三元龙王', boss: true },
];

export const STAGE_THEMES: StageTheme[] = [
  { top: '#1a0800', mid: '#2d1000', accent: '#8B2A0A', pattern: 'flame' },   // 赤鳞妖
  { top: '#141000', mid: '#2a1e00', accent: '#7a5800', pattern: 'coin' },    // 铜钱怪
  { top: '#0e0016', mid: '#1c0030', accent: '#7a1a8B', pattern: 'smoke' },   // 烟火狐
  { top: '#030000', mid: '#0d0000', accent: '#8B0000', pattern: 'chain' },   // 断门鬼 Boss
  { top: '#0a0806', mid: '#181410', accent: '#5B4C3A', pattern: 'rock' },    // 石面将
  { top: '#00080e', mid: '#001525', accent: '#0A3A5B', pattern: 'wind' },    // 白风客
  { top: '#060010', mid: '#0e0028', accent: '#400a8B', pattern: 'seal' },    // 封顺魇 Boss
  { top: '#141000', mid: '#282000', accent: '#7B6400', pattern: 'bell' },    // 金铃童子
  { top: '#001408', mid: '#002514', accent: '#0A5B2A', pattern: 'jade' },    // 三元使 Boss
  { top: '#000000', mid: '#040408', accent: '#0d0d1a', pattern: 'void' },    // 黑风客
  { top: '#070707', mid: '#0f0f0f', accent: '#282828', pattern: 'grid' },    // 铁算盘 Boss
  { top: '#1a0900', mid: '#2d1400', accent: '#8B3200', pattern: 'dragon' },  // 三元龙王 Boss
];

export const BOSS_IMG_SRCS: (string | null)[] = [
  'assets/bosses/stage0.jpg',
  null, null, null, null, null,
  null, null, null, null, null, null,
];

export const HAND_RANKS: [string, number, number][] = [
  ['高牌',           18,  1],
  ['散牌',           24,  1],
  ['同门散牌',        42,  1.5],
  ['同数对子',        28,  1.5],
  ['对子',           34,  2],
  ['三门同数',        48,  2],
  ['两对',           66,  3],
  ['顺子',           58,  3],
  ['连四',           96,  4],
  ['刻子',           72,  3],
  ['杠子',          110,  4],
  ['小三元',         130,  6],
  ['清一色',         150,  5],
  ['清一色杠子',      220,  8],
  ['满堂刻',         170,  6],
  ['清一色满堂刻',    230,  8],
  ['三元归位',        210,  8],
  ['清一色两顺',      190,  7],
];

export const HAND_HELP: [string, string][] = [
  ['高牌',        '选 1 张牌。最低牌型，靠法器可过渡。'],
  ['散牌',        '选 2-5 张但没有组成特殊牌型。'],
  ['同门散牌',     '选 3-5 张同一数字花色但未成型，例如 2万5万8万。'],
  ['同数对子',     '2 张数字相同但花色不同，例如 5万 + 5条。'],
  ['对子',        '2 张完全相同，例如 7筒 + 7筒。'],
  ['三门同数',     '万、筒、条同一个数字各 1 张，例如 6万6筒6条。'],
  ['两对',        '4 张牌，包含两组对子。'],
  ['顺子',        '3 张同花色连续数字，例如 3条4条5条。'],
  ['连四',        '4 张同花色连续数字，例如 2万3万4万5万。'],
  ['刻子',        '3 张完全相同。'],
  ['杠子',        '4 张完全相同。'],
  ['小三元',      '中、发、白各 1 张。'],
  ['清一色',      '5 张全是同一数字花色：万、筒或条。'],
  ['清一色杠子',   '5 张同一数字花色，其中 4 张完全相同。'],
  ['满堂刻',      '5 张牌，三张相同 + 一对。'],
  ['清一色满堂刻', '5 张同一数字花色，同时是三张相同 + 一对。'],
  ['三元归位',     '5 张牌里含中、发、白，再加一组相同字牌。'],
  ['清一色两顺',   '5 张同花色连续数字，例如 2万3万4万5万6万。'],
];

export const STAGE_EVENTS = [
  { id: 'windfall', text: '顺风局：每次出牌额外 +1 金币' },
  { id: 'elite',    text: '精英局：目标 +15%，过关额外 +3 金币' },
  { id: 'brief',    text: '速战局：出牌 -1，换牌 +2' },
  { id: 'lucky',    text: '幸运局：首次出牌得分 ×1.5' },
];
