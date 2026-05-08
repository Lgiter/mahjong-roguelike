/**
 * GameManager — Cocos Creator entry point component.
 *
 * Attach to the root node of the GameScene.
 * It initialises the game logic, subscribes to state changes, and
 * delegates rendering to child panel components.
 *
 * Cocos Creator 3.x TypeScript component.
 */
import {
  _decorator, Component, Node, director, Label, Sprite, Button,
  SpriteFrame, ImageAsset, Texture2D, resources, Vec3, tween, color,
} from 'cc';
import {
  state, startRun, openBuildSelect, on, off,
  playSelected, discardSelected, toggleSelect, buyDiscardWithCoins,
  borrowLuck, chooseReward, refreshRewardsWithCoins, buyDeckUpgradeWithCoins,
  choosePaidDeckUpgrade, chooseArtifact, replaceArtifact,
  takeCatchUpReward, watchAdForHand, watchAdForDiscard, watchAdForRevive,
  finishAdPrompt, closeAdPrompt,
} from '../core/gameLogic';
import { evaluateTiles } from '../core/evaluator';
import { selectedTiles } from '../core/deckOps';
import { START_BUILDS } from '../data/upgrades';
import { STAGES } from '../data/stages';
import type { Tile } from '../data/types';

const { ccclass, property } = _decorator;

// Child panel components are expected on named child nodes:
//   "HandPanel", "BossPanel", "ScorePanel", "RewardPanel", "OverlayPanel"
// Each exports an update(state) method.

@ccclass('GameManager')
export class GameManager extends Component {

  // ── Node references (set in Editor) ────────────────────────────────────────
  @property(Node) handPanelNode: Node | null = null;
  @property(Node) bossPanelNode: Node | null = null;
  @property(Node) scorePanelNode: Node | null = null;
  @property(Node) rewardPanelNode: Node | null = null;
  @property(Node) overlayPanelNode: Node | null = null;
  @property(Node) startScreenNode: Node | null = null;
  @property(Node) buildScreenNode: Node | null = null;
  @property(Node) toastNode: Node | null = null;
  @property(Node) vfxManagerNode: Node | null = null;

  private _boundOnStateChange = this._onStateChange.bind(this);
  private _boundOnToast = this._onToast.bind(this);
  private _boundOnScoreAnim = this._onScoreAnim.bind(this);

  // ── Lifecycle ───────────────────────────────────────────────────────────────

  onLoad(): void {
    on('stateChange', this._boundOnStateChange);
    on('toast',       this._boundOnToast);
    on('scoreAnim',   this._boundOnScoreAnim);
    this.scheduleOnce(() => this._renderAll(), 0);
  }

  onDestroy(): void {
    off('stateChange', this._boundOnStateChange);
    off('toast',       this._boundOnToast);
    off('scoreAnim',   this._boundOnScoreAnim);
  }

  // ── Event handlers ──────────────────────────────────────────────────────────

  private _onStateChange(): void { this._renderAll(); }

  private _onToast(msg: string): void {
    const label = this.toastNode?.getComponent(Label);
    if (!label) return;
    label.string = msg;
    this.toastNode!.active = true;
    this.toastNode!.setScale(new Vec3(1, 1, 1));
    tween(this.toastNode!)
      .delay(1.6)
      .to(0.4, { scale: new Vec3(1, 0.01, 1) })
      .call(() => { this.toastNode!.active = false; })
      .start();
  }

  private _onScoreAnim(total: number, combo: any): void {
    // Delegate to VFXManager if present
    const vfx = this.vfxManagerNode?.getComponent('VFXManager') as any;
    vfx?.spawnScorePop(total, combo);
  }

  // ── Main render dispatcher ──────────────────────────────────────────────────

  private _renderAll(): void {
    this._setScreenVisibility(state.screen);
    this._updatePanels();
  }

  private _setScreenVisibility(screen: string): void {
    if (this.startScreenNode)  this.startScreenNode.active  = screen === 'start';
    if (this.buildScreenNode)  this.buildScreenNode.active  = screen === 'build';
    if (this.bossPanelNode)    this.bossPanelNode.active    = screen === 'game';
    if (this.handPanelNode)    this.handPanelNode.active    = screen === 'game';
    if (this.scorePanelNode)   this.scorePanelNode.active   = screen === 'game';
    if (this.rewardPanelNode)  this.rewardPanelNode.active  = screen === 'reward' || screen === 'replace';
    if (this.overlayPanelNode) this.overlayPanelNode.active = screen === 'end';
  }

  private _updatePanels(): void {
    (this.handPanelNode?.getComponent('HandPanel') as any)?.refresh(state);
    (this.bossPanelNode?.getComponent('BossPanel') as any)?.refresh(state);
    (this.scorePanelNode?.getComponent('ScorePanel') as any)?.refresh(state);
    (this.rewardPanelNode?.getComponent('RewardPanel') as any)?.refresh(state);
    (this.overlayPanelNode?.getComponent('OverlayPanel') as any)?.refresh(state);
    (this.buildScreenNode?.getComponent('BuildPanel') as any)?.refresh(state);
  }

  // ── Button callbacks (bound via Editor) ─────────────────────────────────────

  onBtnStartGame(): void {
    openBuildSelect();
  }

  onBtnChooseBuild(idx: number): void {
    const build = state.startBuildChoices[idx];
    if (build) startRun(0, false, build);
  }

  onBtnPlay(): void {
    playSelected();
  }

  onBtnDiscard(): void {
    discardSelected();
  }

  onBtnBuyDiscard(): void {
    buyDiscardWithCoins();
  }

  onBtnBorrowLuck(): void {
    borrowLuck();
  }

  onBtnAdHand(): void {
    watchAdForHand();
  }

  onBtnAdDiscard(): void {
    watchAdForDiscard();
  }

  onBtnAdRevive(): void {
    watchAdForRevive();
  }

  onBtnFinishAd(): void {
    finishAdPrompt();
  }

  onBtnCloseAd(): void {
    closeAdPrompt();
  }

  onBtnRefreshReward(): void {
    refreshRewardsWithCoins();
  }

  onBtnBuyUpgrade(): void {
    buyDeckUpgradeWithCoins();
  }

  onBtnCatchUp(): void {
    takeCatchUpReward();
  }

  onBtnChooseReward(idx: number): void {
    const choice = state.rewardChoices[idx];
    if (choice) chooseReward(choice);
  }

  onBtnChoosePaidUpgrade(idx: number): void {
    const up = state.paidUpgradeChoices[idx];
    if (up) choosePaidDeckUpgrade(up);
  }

  onBtnReplaceArtifact(idx: number): void {
    replaceArtifact(idx);
  }

  onTileTap(tileId: string): void {
    toggleSelect(tileId);
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  /** Called each frame by Cocos — used to tick VFX expiry */
  update(dt: number): void {
    const now = Date.now();
    // Clean up expired dmg pops
    state.dmgPops = state.dmgPops.filter(p => p.until > now);
    if (state.enemyFx && state.enemyFx.until < now) state.enemyFx = null;
    if (state.hpFlash && state.hpFlash.until < now) state.hpFlash = null;
  }
}
