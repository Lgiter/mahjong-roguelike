/**
 * BuildPanel — displays the 3 starting-build choices at the beginning of a run.
 *
 * Scene structure (created programmatically by GameBootstrap):
 *   BuildScreen
 *   ├─ TitleLabel
 *   └─ BuildPanel (this component)
 *      └─ ChoiceContainer (Layout: Vertical)
 *         └─ ChoiceCard × N (created via nodeFactory)
 */
import { _decorator, Component, Node, Label } from 'cc';
import type { GameState, StartBuildDef } from '../data/types';
import { startRun } from '../core/gameLogic';

const { ccclass, property } = _decorator;

@ccclass('BuildPanel')
export class BuildPanel extends Component {

  @property(Node) choiceContainer: Node | null = null;

  /** Set by GameBootstrap — creates a ChoiceCard node on demand */
  nodeFactory: (() => Node) | null = null;

  private _cards: Node[] = [];
  private _renderedChoices: StartBuildDef[] = [];

  refresh(state: GameState): void {
    if (state.screen !== 'build') return;
    const choices = state.startBuildChoices ?? [];

    // Skip if choices haven't changed
    if (choices.length === this._renderedChoices.length &&
        choices.every((c, i) => c === this._renderedChoices[i])) return;
    this._renderedChoices = choices;

    if (!this.choiceContainer || !this.nodeFactory) return;

    // Grow card pool if needed
    while (this._cards.length < choices.length) {
      const card = this.nodeFactory();
      this.choiceContainer.addChild(card);
      this._cards.push(card);
    }
    this._cards.forEach((c, i) => { c.active = i < choices.length; });

    choices.forEach((build, i) => {
      const card = this._cards[i];
      if (!card) return;
      const labels = card.getComponentsInChildren(Label);
      if (labels[0]) labels[0].string = build.name ?? build.id;
      if (labels[1]) labels[1].string = build.desc ?? '';
      if (labels[2]) labels[2].string = `[${build.lane}]`;
      // Re-bind tap (remove previous listener first)
      card.off(Node.EventType.TOUCH_END);
      card.on(Node.EventType.TOUCH_END, () => {
        startRun(0, false, build);
      }, this);
    });
  }
}
