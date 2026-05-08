/**
 * RewardPanel — handles both reward selection and artifact replacement screens.
 *
 * Scene structure:
 *   RewardPanel
 *   ├─ TitleLabel
 *   ├─ ChoiceContainer  (Layout: Vertical)
 *   │  └─ ChoiceCard × N (prefab, dynamically shown)
 *   ├─ CatchUpBtn
 *   ├─ RefreshBtn
 *   ├─ BuyUpgradeBtn
 *   └─ PaidUpgradeContainer (hidden until buyDeckUpgrade tapped)
 */
import { _decorator, Component, Node, Label, Prefab, instantiate, color } from 'cc';
import type { GameState } from '../data/types';
import { STAGES } from '../data/stages';
import {
  chooseReward, refreshRewardsWithCoins, buyDeckUpgradeWithCoins,
  choosePaidDeckUpgrade, takeCatchUpReward, replaceArtifact,
} from '../core/gameLogic';
import { LANE_META, COLORS } from '../data/constants';
import { formatInt } from '../core/utils';

const { ccclass, property } = _decorator;

@ccclass('RewardPanel')
export class RewardPanel extends Component {

  @property(Label)  titleLabel: Label | null = null;
  @property(Node)   choiceContainer: Node | null = null;
  @property(Prefab) choiceCardPrefab: Prefab | null = null;
  @property(Node)   paidUpgradeContainer: Node | null = null;
  @property(Node)   catchUpBtn: Node | null = null;
  @property(Label)  bonusLabel: Label | null = null;

  /** Alternative to choiceCardPrefab — set programmatically by GameBootstrap */
  nodeFactory: (() => Node) | null = null;

  private _choiceNodes: Node[] = [];

  refresh(state: GameState): void {
    if (state.screen === 'replace') {
      this._renderReplace(state);
    } else {
      this._renderReward(state);
    }
  }

  private _renderReward(state: GameState): void {
    if (this.titleLabel) this.titleLabel.string = '选择奖励';
    if (this.bonusLabel) this.bonusLabel.string = `过关奖励 +${(state as any).rewardBonus ?? 0} 金币`;
    if (this.catchUpBtn) this.catchUpBtn.active = state.catchUpAvailable || state.finalPrepAvailable;

    this._syncCards(state.rewardChoices, (choice, _idx) => {
      chooseReward(choice);
    });

    // Paid upgrade cards
    if (this.paidUpgradeContainer) {
      this.paidUpgradeContainer.active = state.paidUpgradeChoices.length > 0;
    }
  }

  private _renderReplace(state: GameState): void {
    if (this.titleLabel) this.titleLabel.string = '选择替换的法器';
    this._syncCards(state.artifacts as any[], (_, idx) => {
      replaceArtifact(idx);
    });
  }

  private _syncCards(items: any[], onChoose: (item: any, idx: number) => void): void {
    if (!this.choiceContainer || (!this.choiceCardPrefab && !this.nodeFactory)) return;

    // Add missing card nodes
    while (this._choiceNodes.length < items.length) {
      const n = this.choiceCardPrefab
        ? instantiate(this.choiceCardPrefab)
        : this.nodeFactory?.() ?? null;
      if (!n) return;
      this.choiceContainer.addChild(n);
      this._choiceNodes.push(n);
    }
    this._choiceNodes.forEach((n, i) => { n.active = i < items.length; });

    items.forEach((item, i) => {
      const node = this._choiceNodes[i];
      if (!node) return;
      const labels = node.getComponentsInChildren(Label);
      if (labels[0]) labels[0].string = item.name ?? item.id;
      if (labels[1]) labels[1].string = item.desc ?? '';
      if (labels[2]) labels[2].string = item.type ?? item.lane ?? '';
      node.off(Node.EventType.TOUCH_END);
      node.on(Node.EventType.TOUCH_END, () => onChoose(item, i), this);
    });
  }

  // ── Button handlers ────────────────────────────────────────────────────────

  onBtnRefresh(): void { refreshRewardsWithCoins(); }
  onBtnBuyUpgrade(): void { buyDeckUpgradeWithCoins(); }
  onBtnCatchUp(): void { takeCatchUpReward(); }
}
