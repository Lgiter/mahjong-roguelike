/**
 * OverlayPanel — end-of-run screen (win / lose).
 */
import { _decorator, Component, Node, Label, color } from 'cc';
import type { GameState } from '../data/types';
import { startRun, watchAdForRevive } from '../core/gameLogic';
import { STAGES } from '../data/stages';
import { stageTarget } from '../core/gameState';
import { formatInt } from '../core/utils';
import { COLORS } from '../data/constants';
import { START_BUILDS } from '../data/upgrades';

const { ccclass, property } = _decorator;

@ccclass('OverlayPanel')
export class OverlayPanel extends Component {

  @property(Label) resultLabel: Label | null = null;
  @property(Label) subLabel: Label | null = null;
  @property(Node)  reviveBtn: Node | null = null;

  refresh(state: GameState): void {
    if (state.screen !== 'end') return;

    if (state.win) {
      if (this.resultLabel) {
        this.resultLabel.string = '胜利！';
        this.resultLabel.color = color(COLORS.gold);
      }
      if (this.subLabel) this.subLabel.string = '你赢得了这场牌局！';
      if (this.reviveBtn) this.reviveBtn.active = false;
    } else {
      if (this.resultLabel) {
        this.resultLabel.string = '失败';
        this.resultLabel.color = color(COLORS.red);
      }
      const target = stageTarget(state);
      const gap = Math.max(0, target - state.score);
      if (this.subLabel) this.subLabel.string = `差 ${formatInt(gap)} 分未达目标`;
      if (this.reviveBtn) this.reviveBtn.active = !state.win && state.adsUsed.revive < 1;
    }
  }

  onBtnRestart(): void {
    startRun(0, false, START_BUILDS[0]);
  }

  onBtnRevive(): void {
    watchAdForRevive();
  }
}
