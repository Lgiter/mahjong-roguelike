/**
 * VFXManager — manages all visual effects:
 *   - Score pop-up labels (floating "+1234" numbers)
 *   - Screen flash overlay (tier-based color burst)
 *   - Particle effects (Cocos particle system nodes)
 *   - Background theme update
 *
 * Scene structure:
 *   VFXManager (this component)
 *   ├─ ScorePopPool  (Node — container, Label prefabs recycled here)
 *   ├─ ScreenFlash   (Sprite — full-screen color overlay, alpha animated)
 *   ├─ BgGradient    (Sprite — stage-theme background gradient)
 *   └─ ParticleRoot  (Node — particle system instances live here)
 */
import {
  _decorator, Component, Node, Label, Sprite, Prefab, instantiate,
  color, Color, tween, Vec3, UITransform, ParticleSystem2D,
} from 'cc';
import type { GameState, HandCombo } from '../data/types';
import { STAGE_THEMES } from '../data/stages';
import { COLORS } from '../data/constants';

const { ccclass, property } = _decorator;

interface ScorePop {
  node: Node;
  label: Label;
  free: boolean;
}

@ccclass('VFXManager')
export class VFXManager extends Component {

  @property(Node)   scorePopPool: Node | null = null;
  @property(Sprite) screenFlash: Sprite | null = null;
  @property(Sprite) bgGradient: Sprite | null = null;
  @property(Prefab) scorePopPrefab: Prefab | null = null;

  // Tier-based flash colors
  private readonly FLASH_COLORS = [
    '',               // tier 0 (unused)
    '#60d394',        // tier 1 — 重击 (green)
    '#f2bd55',        // tier 2 — 暴击 (gold)
    '#f26d6d',        // tier 3 — 神威 (red)
    '#ffffff',        // tier 4 — 神威 MAX (white)
  ];

  private _pops: ScorePop[] = [];
  private _lastStageIdx = -1;

  /** Called by GameManager._onScoreAnim */
  spawnScorePop(total: number, combo: HandCombo): void {
    const pop = this._getFreePop();
    if (!pop) return;
    pop.label.string = `+${total.toLocaleString()}`;
    pop.label.color = color(this._comboColor(combo));
    pop.node.active = true;
    pop.free = false;

    // Start at center-ish, float up and fade
    const startY = -200;
    pop.node.setPosition(new Vec3((Math.random() - 0.5) * 100, startY, 0));
    const labelNode = pop.node;
    tween(labelNode)
      .to(0.12, { scale: new Vec3(1.3, 1.3, 1) })
      .to(0.08, { scale: new Vec3(1, 1, 1) })
      .start();
    tween(labelNode)
      .by(0.9, { position: new Vec3(0, 160, 0) })
      .start();
    const sp = pop.node.getComponent(Label);
    if (sp) {
      tween(sp as any)
        .delay(0.5)
        .call(() => {
          tween(labelNode)
            .to(0.35, { scale: new Vec3(0.01, 0.01, 1) })
            .call(() => { labelNode.active = false; pop.free = true; })
            .start();
        })
        .start();
    }
  }

  /** Play tier-based screen flash */
  spawnScreenFlash(tier: number): void {
    if (!this.screenFlash || tier < 2) return;
    const flashColor = this.FLASH_COLORS[Math.min(tier, 4)];
    this.screenFlash.color = color(flashColor);
    const node = this.screenFlash.node;
    node.active = true;
    // Fade out
    tween(this.screenFlash as any)
      .to(0.08, { color: color(flashColor + 'cc') })
      .to(0.35, { color: color(flashColor + '00') })
      .call(() => { node.active = false; })
      .start();
  }

  /** Update background theme when stage changes */
  refreshBackground(state: GameState): void {
    const idx = state.stageIndex;
    if (idx === this._lastStageIdx) return;
    this._lastStageIdx = idx;
    const theme = STAGE_THEMES[idx];
    if (!theme || !this.bgGradient) return;
    // Fade to new theme colour
    tween(this.bgGradient as any)
      .to(0.8, { color: color(theme.mid) })
      .start();
  }

  // ── Score pop pool ─────────────────────────────────────────────────────────

  private _getFreePop(): ScorePop | null {
    const existing = this._pops.find(p => p.free);
    if (existing) return existing;
    if (!this.scorePopPrefab || !this.scorePopPool) return null;
    const node = instantiate(this.scorePopPrefab);
    this.scorePopPool!.addChild(node);
    const label = node.getComponent(Label);
    if (!label) return null;
    const pop: ScorePop = { node, label, free: true };
    this._pops.push(pop);
    return pop;
  }

  private _comboColor(combo: HandCombo): string {
    if (combo.tags.includes('flush'))    return COLORS.red;
    if (combo.tags.includes('triplet'))  return COLORS.gold;
    if (combo.tags.includes('straight')) return COLORS.green;
    if (combo.tags.includes('pair'))     return '#d38cff';
    if (combo.tags.includes('dragon'))   return COLORS.text;
    return COLORS.gold;
  }
}
