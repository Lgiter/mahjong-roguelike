import type { Suit } from './types';

export const NUMERIC_SUITS: Suit[] = ['wan', 'tong', 'tiao'];
export const WIND_NAMES = ['东', '南', '西', '北'];
export const DRAGON_NAMES = ['中', '发', '白'];
export const SUIT_LABELS: Record<string, string> = {
  wan: '万', tong: '筒', tiao: '条', wind: '风', dragon: '元',
};
export const SUIT_COLORS: Record<string, string> = {
  wan: '#f26d6d', tong: '#56a8ff', tiao: '#60d394', wind: '#e6e1d2', dragon: '#f2bd55',
};

export const LANE_META: Record<string, { icon: string; color: string }> = {
  顺子: { icon: '顺', color: '#60d394' },
  刻子: { icon: '刻', color: '#f26d6d' },
  清一色: { icon: '清', color: '#56a8ff' },
  金币: { icon: '财', color: '#f2bd55' },
  对子: { icon: '对', color: '#d38cff' },
  字牌: { icon: '字', color: '#e6e1d2' },
  散牌: { icon: '散', color: '#a9b1ad' },
  高牌: { icon: '高', color: '#a9b1ad' },
  通用: { icon: '全', color: '#a9b1ad' },
};

export const COLORS = {
  bg: '#111315',
  panel: '#1b2024',
  panel2: '#222a2d',
  line: '#334047',
  text: '#f3efe3',
  muted: '#a9b1ad',
  gold: '#f2bd55',
  green: '#60d394',
  red: '#f26d6d',
  tile: '#fff8e9',
  ink: '#16120c',
};
