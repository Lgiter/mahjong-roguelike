/**
 * ScorePanel — top info bar: blind name, target, score, progress bar,
 * hands/discards remaining, ante dots, artifact zone, rule hint.
 */
import { _decorator, Component, Node, Label, Sprite, UITransform, color } from 'cc';
import type { GameState } from '../data/types';
import { STAGES } from '../data/stages';
import { stageTarget } from '../core/gameState';
import { formatInt } from '../core/utils';
import { COLORS } from '../data/constants';

const { ccclass, property } = _decorator;

@ccclass('ScorePanel')
export class ScorePanel extends Component {

  @property(Label)  scoreLabel: Label | null = null;
  @property(Label)  targetLabel: Label | null = null;
  @property(Label)  handsLabel: Label | null = null;
  @property(Label)  discardsLabel: Label | null = null;
  @property(Label)  coinsLabel: Label | null = null;
  @property(Node)   progressFill: Node | null = null;
  @property(Label)  ruleHintLabel: Label | null = null;
  @property(Label)  comboPreviewLabel: Label | null = null;
  @property(Label)  scoreFormulaLabel: Label | null = null;

  private _progressMaxWidth = 400;

  onLoad(): void {
    const t = this.progressFill?.parent?.getComponent(UITransform);
    if (t) this._progressMaxWidth = t.contentSize.width;
  }

  refresh(state: GameState): void {
    const stage = STAGES[state.stageIndex];
    const target = stageTarget(state);
    const progress = Math.min(state.score / target, 1);

    if (this.scoreLabel)   this.scoreLabel.string    = formatInt(state.score);
    if (this.targetLabel)  this.targetLabel.string   = `目标 ${formatInt(target)}`;
    if (this.handsLabel)   this.handsLabel.string    = `出牌 ${state.handsLeft}`;
    if (this.discardsLabel) this.discardsLabel.string = `弃牌 ${state.discardsLeft}`;
    if (this.coinsLabel)   this.coinsLabel.string    = `💰 ${state.coins}`;

    // Progress bar width
    if (this.progressFill) {
      const t = this.progressFill.getComponent(UITransform);
      if (t) t.contentSize = { width: this._progressMaxWidth * progress, height: t.contentSize.height };
      const sp = this.progressFill.getComponent(Sprite);
      if (sp) sp.color = color(progress >= 1 ? COLORS.green : '#f39c12');
    }

    // Rule hint
    if (this.ruleHintLabel) {
      if (stage?.rule) {
        this.ruleHintLabel.string = stage.rule.text;
        this.ruleHintLabel.node.active = true;
      } else if (state.stageEvent) {
        this.ruleHintLabel.string = state.stageEvent.text;
        this.ruleHintLabel.node.active = true;
      } else {
        this.ruleHintLabel.node.active = false;
      }
    }

    // Score formula (last result)
    if (this.scoreFormulaLabel && state.lastResult) {
      const { base, mult, total } = (state as any).lastResult;
      this.scoreFormulaLabel.string = `${base} 点 × ${mult} 番 = ${formatInt(total)}`;
    }
  }
}
