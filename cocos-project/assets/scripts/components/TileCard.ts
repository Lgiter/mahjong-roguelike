/**
 * TileCard — prefab component for a single mahjong tile.
 *
 * Prefab nodes expected:
 *   TileCard (this component + Button)
 *   ├─ BgSprite   (Sprite — tile background)
 *   ├─ ValueLabel (Label — rank number / honor name)
 *   ├─ SuitLabel  (Label — suit symbol below value)
 *   ├─ CornerLabel (Label — small top-left corner label)
 *   └─ SelectedMark (Node — gold checkmark, hidden when not selected)
 */
import { _decorator, Component, Node, Label, Sprite, Color, color, tween, Vec3, Button } from 'cc';
import type { Tile } from '../data/types';
import { SUIT_LABELS, SUIT_COLORS, WIND_NAMES, DRAGON_NAMES } from '../data/constants';

const { ccclass, property } = _decorator;

@ccclass('TileCard')
export class TileCard extends Component {

  @property(Sprite) bgSprite: Sprite | null = null;
  @property(Label)  valueLabel: Label | null = null;
  @property(Label)  suitLabel: Label | null = null;
  @property(Label)  cornerLabel: Label | null = null;
  @property(Node)   selectedMark: Node | null = null;

  private _tile: Tile | null = null;
  private _onTap?: () => void;

  onLoad(): void {
    this.node.on(Node.EventType.TOUCH_END, () => this._onTap?.(), this);
  }

  setTile(tile: Tile, selected: boolean, onTap: () => void): void {
    this._tile = tile;
    this._onTap = onTap;
    this._render(selected);
  }

  private _render(selected: boolean): void {
    if (!this._tile) return;
    const tile = this._tile;

    const displayValue = this._tileValue(tile);
    const displaySuit = SUIT_LABELS[tile.suit] ?? '';
    const suitColor = SUIT_COLORS[tile.suit] ?? '#ffffff';

    if (this.valueLabel) {
      this.valueLabel.string = displayValue;
      this.valueLabel.color = color(suitColor);
    }
    if (this.suitLabel) {
      this.suitLabel.string = displaySuit;
      this.suitLabel.color = color(suitColor);
    }
    if (this.cornerLabel) {
      this.cornerLabel.string = `${displayValue}${displaySuit}`;
      this.cornerLabel.color = color(suitColor);
    }
    if (this.selectedMark) {
      this.selectedMark.active = selected;
    }
    if (this.bgSprite) {
      this.bgSprite.color = selected ? color('#fffde7') : color('#fdf6e3');
    }

    // Lift/drop animation when selected state changes
    const targetY = selected ? 22 : 0;
    tween(this.node)
      .to(0.08, { position: new Vec3(this.node.position.x, targetY, 0) })
      .start();
  }

  private _tileValue(tile: Tile): string {
    if (tile.suit === 'wind')   return WIND_NAMES[tile.rank - 1] ?? String(tile.rank);
    if (tile.suit === 'dragon') return DRAGON_NAMES[tile.rank - 1] ?? String(tile.rank);
    return String(tile.rank);
  }
}
