/**
 * BossPanel — enemy HP bar, boss name, status text, and boss portrait.
 *
 * Scene structure:
 *   BossPanel
 *   ├─ BossNameLabel  (Label)
 *   ├─ BossTagNode    (Node — "Boss" pill, hidden for non-boss stages)
 *   ├─ StatusLabel    (Label)
 *   ├─ HpBarBg        (Sprite — dark background bar)
 *   ├─ HpBarFill      (Sprite — coloured progress fill, width driven by progress widget)
 *   ├─ HpFlashFill    (Sprite — white flash chunk)
 *   ├─ ScoreLabel     (Label — "1234 / 5000")
 *   ├─ NeededLabel    (Label — "还需 3766 · 每手约 1255")
 *   └─ BossPortrait   (Sprite — boss image, loaded from assets/bosses/)
 */
import {
  _decorator, Component, Node, Label, Sprite, SpriteFrame, ImageAsset,
  Texture2D, resources, UITransform, color, Color, tween, Vec3,
} from 'cc';
import type { GameState } from '../data/types';
import { STAGES, BOSS_IMG_SRCS, STAGE_THEMES } from '../data/stages';
import { stageTarget } from '../core/gameState';
import { formatInt } from '../core/utils';
import { COLORS } from '../data/constants';

const { ccclass, property } = _decorator;

@ccclass('BossPanel')
export class BossPanel extends Component {

  @property(Label)  bossNameLabel: Label | null = null;
  @property(Node)   bossTagNode: Node | null = null;
  @property(Label)  statusLabel: Label | null = null;
  @property(Node)   hpBarFill: Node | null = null;
  @property(Node)   hpFlashFill: Node | null = null;
  @property(Label)  scoreLabel: Label | null = null;
  @property(Label)  neededLabel: Label | null = null;
  @property(Sprite) bossPortrait: Sprite | null = null;

  private _loadedBossIdx = -1;
  private _hpBarMaxWidth = 600; // set from UITransform at start

  onLoad(): void {
    const bg = this.hpBarFill?.parent?.getComponent(UITransform);
    if (bg) this._hpBarMaxWidth = bg.contentSize.width;
  }

  refresh(state: GameState): void {
    const stage = STAGES[state.stageIndex];
    if (!stage) return;

    // Boss name & tag
    if (this.bossNameLabel) this.bossNameLabel.string = stage.enemy;
    if (this.bossTagNode) this.bossTagNode.active = !!stage.boss;

    // HP ratio
    const target = stageTarget(state);
    const remainingRatio = Math.max(0, 1 - state.score / target);
    const hpColor = remainingRatio > 0.6 ? COLORS.green
      : remainingRatio > 0.3 ? '#f2bd55'
      : remainingRatio > 0.1 ? '#f29455'
      : COLORS.red;

    this._setBarWidth(this.hpBarFill, remainingRatio);
    const fillSprite = this.hpBarFill?.getComponent(Sprite);
    if (fillSprite) fillSprite.color = color(hpColor);

    // HP flash chunk
    const now = Date.now();
    if (state.hpFlash && state.hpFlash.until > now && this.hpFlashFill) {
      const t = (state.hpFlash.until - now) / 550;
      const flashSprite = this.hpFlashFill.getComponent(Sprite);
      if (flashSprite) flashSprite.color = color(255, 255, 255, Math.round(t * 0.85 * 255));
      const chunkRatio = state.hpFlash.prevRatio - state.hpFlash.newRatio;
      this._setBarWidth(this.hpFlashFill, chunkRatio, state.hpFlash.newRatio);
      this.hpFlashFill.active = chunkRatio > 0;
    } else if (this.hpFlashFill) {
      this.hpFlashFill.active = false;
    }

    // Status text
    if (this.statusLabel) {
      const fx = state.enemyFx && state.enemyFx.until > now ? state.enemyFx : null;
      this.statusLabel.string = fx
        ? `${fx.attack} · -${formatInt(fx.damage)}`
        : bossStatusText(stage, remainingRatio);
      this.statusLabel.color = color(fx ? fx.color : (remainingRatio < 0.3 ? COLORS.red : COLORS.muted));
    }

    // Score labels
    const remaining = Math.max(0, target - state.score);
    const needed = state.handsLeft ? Math.ceil(remaining / state.handsLeft) : remaining;
    if (this.scoreLabel) this.scoreLabel.string = `${formatInt(state.score)} / ${formatInt(target)}`;
    if (this.neededLabel) this.neededLabel.string = `还需 ${formatInt(remaining)} · 每手约 ${formatInt(needed)}`;

    // Boss portrait (lazy-load per stage)
    this._loadBossPortrait(state.stageIndex);

    // Shake effect on hit
    if (state.enemyFx && state.enemyFx.until > now && state.enemyFx.tier >= 2) {
      this._shakePanel(state.enemyFx.tier);
    }
  }

  private _setBarWidth(node: Node | null, ratio: number, offsetRatio = 0): void {
    if (!node) return;
    const t = node.getComponent(UITransform);
    if (t) t.contentSize = { width: this._hpBarMaxWidth * Math.max(0, Math.min(1, ratio)), height: t.contentSize.height };
    node.setPosition(this._hpBarMaxWidth * offsetRatio, node.position.y, 0);
  }

  private _loadBossPortrait(stageIdx: number): void {
    if (this._loadedBossIdx === stageIdx) return;
    this._loadedBossIdx = stageIdx;
    const src = BOSS_IMG_SRCS[stageIdx];
    if (!src || !this.bossPortrait) return;
    const basePath = src.replace(/^assets\/resources\//, '').replace(/\.(jpg|png|jpeg)$/, '');
    const spriteFramePath = `${basePath}/spriteFrame`;
    resources.load(spriteFramePath, SpriteFrame, (sfErr, sf) => {
      if (sf) {
        this._applyBossSprite(stageIdx, sf);
        return;
      }
      resources.load(`${basePath}/texture`, Texture2D, (texErr, texture) => {
        if (!texture) {
          console.warn(`Boss portrait not found: ${spriteFramePath}`, sfErr || texErr);
          return;
        }
        const generated = new SpriteFrame();
        generated.texture = texture;
        this._applyBossSprite(stageIdx, generated);
      });
    });
  }

  private _applyBossSprite(stageIdx: number, sf: SpriteFrame): void {
    if (this.bossPortrait && this._loadedBossIdx === stageIdx) {
      this.bossPortrait.spriteFrame = sf;
    }
  }

  private _shakePanel(tier: number): void {
    const amplitude = tier >= 4 ? 8 : tier >= 3 ? 5 : 3;
    const base = this.node.position.clone();
    tween(this.node)
      .to(0.04, { position: new Vec3(base.x + amplitude, base.y, 0) })
      .to(0.04, { position: new Vec3(base.x - amplitude, base.y, 0) })
      .to(0.04, { position: base.clone() })
      .start();
  }
}

function bossStatusText(stage: any, remainingRatio: number): string {
  if (!stage.boss) return '以牌为术，压制妖灵';
  if (remainingRatio <= 0.08) return '不可能……！';
  if (remainingRatio <= 0.25) return '你……比我想象的强';
  if (remainingRatio <= 0.55) return '哼，有点意思';
  return '不要高兴得太早！';
}
