/**
 * HandPanel — manages the row of tile cards in the player's hand.
 *
 * Expected scene structure:
 *   HandPanel (this component)
 *   └─ TileContainer (Node, Layout: Horizontal)
 *      └─ TileCard (prefab × N, instantiated at runtime)
 */
import { _decorator, Component, Node, Prefab, instantiate, Layout, Label } from 'cc';
import type { GameState } from '../data/types';
import { evaluateTiles } from '../core/evaluator';
import { selectedTiles } from '../core/deckOps';
import { toggleSelect } from '../core/gameLogic';

const { ccclass, property } = _decorator;

@ccclass('HandPanel')
export class HandPanel extends Component {

  @property(Node)    tileContainer: Node | null = null;
  @property(Prefab)  tileCardPrefab: Prefab | null = null;

  /** Preview label node above the hand */
  @property(Node) previewLabelNode: Node | null = null;

  private _tileNodes: Node[] = [];

  refresh(state: GameState): void {
    if (!this.tileContainer || !this.tileCardPrefab) return;
    this._syncTileCount(state.hand.length);

    const sel = selectedTiles(state);
    const combo = sel.length ? evaluateTiles(sel) : null;

    // Update preview label
    const previewLabel = this.previewLabelNode?.getComponent(Label);
    if (previewLabel) {
      previewLabel.string = combo ? combo.name : '';
    }

    // Update each tile card
    state.hand.forEach((tile, i) => {
      const node = this._tileNodes[i];
      if (!node) return;
      const card = node.getComponent('TileCard') as any;
      card?.setTile(tile, state.selected.has(tile.id), () => toggleSelect(tile.id));
    });
  }

  private _syncTileCount(count: number): void {
    // Add missing nodes
    while (this._tileNodes.length < count) {
      const node = instantiate(this.tileCardPrefab!);
      this.tileContainer!.addChild(node);
      this._tileNodes.push(node);
    }
    // Hide extras
    this._tileNodes.forEach((n, i) => { n.active = i < count; });
  }
}
