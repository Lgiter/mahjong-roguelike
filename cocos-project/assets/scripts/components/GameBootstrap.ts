/**
 * GameBootstrap — programmatically builds the complete scene tree at runtime.
 *
 * HOW TO USE:
 *   1. In Cocos Creator, create a new Scene containing only a Canvas node.
 *   2. Attach this component to the Canvas node.
 *   3. Press Play (or build for WeChat).
 *
 * Everything else — panels, labels, sprites, buttons, tile cards — is created
 * here in code, so no manual scene editing is required.
 */
import {
  _decorator, Camera, Canvas, Component, Layers, Node, UITransform, Label, Sprite, Layout,
  color, HorizontalTextAlignment, VerticalTextAlignment,
  instantiate, Texture2D, SpriteFrame, builtinResMgr,
} from 'cc';
import { GameManager }   from './GameManager';
import { HandPanel }     from './HandPanel';
import { BossPanel }     from './BossPanel';
import { ScorePanel }    from './ScorePanel';
import { RewardPanel }   from './RewardPanel';
import { OverlayPanel }  from './OverlayPanel';
import { VFXManager }    from './VFXManager';
import { BuildPanel }    from './BuildPanel';
import { TileCard }      from './TileCard';

const { ccclass } = _decorator;

// ─────────────────────────────────────────────────────────────────────────────
// Scene layout constants (portrait 750 × 1334, center = 0,0)
// ─────────────────────────────────────────────────────────────────────────────
const W = 750, H = 1334;

@ccclass('GameBootstrap')
export class GameBootstrap extends Component {

  onLoad(): void {
    // NOTE: Do NOT call sz(canvas, W, H) — Canvas component manages its own
    // UITransform.contentSize and will override or reject changes.
    const canvas = this.node;
    this._ensureUICamera(canvas);

    // ── Build scene tree ────────────────────────────────────────────────────
    const bgLayer        = this._makeBgLayer(canvas);
    const vfxNode        = this._makeVFXManager(canvas);
    const bossPanelNode  = this._makeBossPanel(canvas);
    const scorePanelNode = this._makeScorePanel(canvas);
    const handPanelNode  = this._makeHandPanel(canvas);
    const btnRowNode     = this._makeButtonRow(canvas);
    const rewardNode     = this._makeRewardPanel(canvas);
    const overlayNode    = this._makeOverlayPanel(canvas);
    const startNode      = this._makeStartScreen(canvas);
    const buildNode      = this._makeBuildScreen(canvas);
    const toastNode      = this._makeToast(canvas);

    // ── Node factories (used as runtime "prefabs") ──────────────────────────
    const tileTemplate   = this._makeTileCardTemplate();
    const choiceTemplate = this._makeChoiceCardTemplate();

    // ── Wire HandPanel ──────────────────────────────────────────────────────
    const hp = handPanelNode.getComponent(HandPanel)!;
    hp.tileContainer    = handPanelNode.getChildByName('TileContainer');
    hp.previewLabelNode = handPanelNode.getChildByName('PreviewLabel');
    hp.nodeFactory      = () => instantiate(tileTemplate) as Node;

    // ── Wire BossPanel ──────────────────────────────────────────────────────
    const bp = bossPanelNode.getComponent(BossPanel)!;
    const hpCont = bossPanelNode.getChildByName('HpBarContainer')!;
    bp.bossNameLabel = bossPanelNode.getChildByName('BossNameLabel')?.getComponent(Label) ?? null;
    bp.bossTagNode   = bossPanelNode.getChildByName('BossTagNode');
    bp.statusLabel   = bossPanelNode.getChildByName('StatusLabel')?.getComponent(Label) ?? null;
    bp.hpBarFill     = hpCont.getChildByName('HpBarFill');
    bp.hpFlashFill   = hpCont.getChildByName('HpFlashFill');
    bp.scoreLabel    = bossPanelNode.getChildByName('ScoreLabel')?.getComponent(Label) ?? null;
    bp.neededLabel   = bossPanelNode.getChildByName('NeededLabel')?.getComponent(Label) ?? null;
    bp.bossPortrait  = bossPanelNode.getChildByName('BossPortrait')?.getComponent(Sprite) ?? null;

    // ── Wire ScorePanel ─────────────────────────────────────────────────────
    const sp = scorePanelNode.getComponent(ScorePanel)!;
    const pbCont = scorePanelNode.getChildByName('ProgressBarContainer')!;
    sp.scoreLabel        = scorePanelNode.getChildByName('ScoreLabel')?.getComponent(Label) ?? null;
    sp.targetLabel       = scorePanelNode.getChildByName('TargetLabel')?.getComponent(Label) ?? null;
    sp.handsLabel        = scorePanelNode.getChildByName('HandsLabel')?.getComponent(Label) ?? null;
    sp.discardsLabel     = scorePanelNode.getChildByName('DiscardsLabel')?.getComponent(Label) ?? null;
    sp.coinsLabel        = scorePanelNode.getChildByName('CoinsLabel')?.getComponent(Label) ?? null;
    sp.progressFill      = pbCont?.getChildByName('ProgressFill') ?? null;
    sp.ruleHintLabel     = scorePanelNode.getChildByName('RuleHintLabel')?.getComponent(Label) ?? null;
    sp.scoreFormulaLabel = scorePanelNode.getChildByName('ScoreFormulaLabel')?.getComponent(Label) ?? null;
    sp.comboPreviewLabel = null;

    // ── Wire RewardPanel ────────────────────────────────────────────────────
    const rp = rewardNode.getComponent(RewardPanel)!;
    rp.titleLabel            = rewardNode.getChildByName('TitleLabel')?.getComponent(Label) ?? null;
    rp.bonusLabel            = rewardNode.getChildByName('BonusLabel')?.getComponent(Label) ?? null;
    rp.choiceContainer       = rewardNode.getChildByName('ChoiceContainer');
    rp.catchUpBtn            = rewardNode.getChildByName('CatchUpBtn');
    rp.paidUpgradeContainer  = rewardNode.getChildByName('PaidUpgradeContainer');
    rp.nodeFactory           = () => instantiate(choiceTemplate) as Node;

    // ── Wire OverlayPanel ───────────────────────────────────────────────────
    const op = overlayNode.getComponent(OverlayPanel)!;
    op.resultLabel = overlayNode.getChildByName('ResultLabel')?.getComponent(Label) ?? null;
    op.subLabel    = overlayNode.getChildByName('SubLabel')?.getComponent(Label) ?? null;
    op.reviveBtn   = overlayNode.getChildByName('ReviveBtn');

    // ── Wire BuildPanel ─────────────────────────────────────────────────────
    const bdp = buildNode.getComponent(BuildPanel)!;
    bdp.choiceContainer = buildNode.getChildByName('ChoiceContainer');
    bdp.nodeFactory     = () => instantiate(choiceTemplate) as Node;

    // ── Wire VFXManager ─────────────────────────────────────────────────────
    const vfx = vfxNode.getComponent(VFXManager)!;
    vfx.scorePopPool = vfxNode.getChildByName('ScorePopPool');
    vfx.screenFlash  = vfxNode.getChildByName('ScreenFlash')?.getComponent(Sprite) ?? null;
    vfx.bgGradient   = bgLayer.getChildByName('BgGradient')?.getComponent(Sprite) ?? null;

    // ── Attach GameManager (all node refs must be set before addComponent
    //    because addComponent triggers onLoad() synchronously in Cocos 3.x) ──
    const gm = canvas.addComponent(GameManager);
    gm.handPanelNode    = handPanelNode;
    gm.bossPanelNode    = bossPanelNode;
    gm.scorePanelNode   = scorePanelNode;
    gm.rewardPanelNode  = rewardNode;
    gm.overlayPanelNode = overlayNode;
    gm.startScreenNode  = startNode;
    gm.buildScreenNode  = buildNode;
    gm.toastNode        = toastNode;
    gm.vfxManagerNode   = vfxNode;

    // ── Button callbacks ────────────────────────────────────────────────────
    this._wireButtons(btnRowNode, startNode, overlayNode, rewardNode, gm, op, rp);
  }

  // ── Panel builders ────────────────────────────────────────────────────────

  private _ensureUICamera(canvas: Node): void {
    setLayerRecursive(canvas, Layers.Enum.UI_2D);
    canvas.setPosition(0, 0, 0);

    const scene = canvas.scene;
    scene?.getComponentsInChildren(Camera).forEach((camera) => {
      if (camera.node.name !== 'RuntimeUICamera') {
        camera.visibility &= ~Layers.Enum.UI_2D;
      }
    });

    const canvasComp = canvas.getComponent(Canvas);
    if (!canvasComp) return;
    (canvasComp as any).alignCanvasWithScreen = false;
    (canvasComp as any)._alignCanvasWithScreen = false;
    sz(canvas, W, H);

    if (canvasComp.cameraComponent) return;

    const cameraNode = nd('RuntimeUICamera', canvas.parent ?? canvas);
    cameraNode.layer = Layers.Enum.UI_2D;
    cameraNode.setPosition(0, 0, 1000);
    const camera = cameraNode.addComponent(Camera);
    camera.projection = Camera.ProjectionType.ORTHO;
    camera.orthoHeight = H / 2;
    camera.visibility = Layers.Enum.UI_2D;
    camera.priority = 100;
    (camera as any).clearFlags = 0;
    canvasComp.cameraComponent = camera;
  }

  private _makeBgLayer(canvas: Node): Node {
    const layer = nd('BgLayer', canvas);
    const bg = nd('BgGradient', layer);
    sz(bg, W, H);
    solidSprite(bg, '#0d0604');
    return layer;
  }

  private _makeVFXManager(canvas: Node): Node {
    const n = nd('VFXManager', canvas);
    n.addComponent(VFXManager);
    nd('ScorePopPool', n);
    const flash = nd('ScreenFlash', n);
    sz(flash, W, H);
    solidSprite(flash, '#ffffff00');
    flash.active = false;
    return n;
  }

  private _makeBossPanel(canvas: Node): Node {
    const panel = nd('BossPanel', canvas);
    sz(panel, W, 190);
    panel.setPosition(0, 390);
    panel.addComponent(BossPanel);

    // Boss portrait (right side) — transparent placeholder; BossPanel loads the image
    const portrait = nd('BossPortrait', panel);
    sz(portrait, 130, 170);
    portrait.setPosition(290, 0);
    solidSprite(portrait, '#00000000');

    // Name + boss tag row
    lbl(panel, 'BossNameLabel', '...', 26, { w: 460, h: 34, x: -60, y: 72, color: '#f4d27e', bold: true });
    const tag = nd('BossTagNode', panel);
    sz(tag, 60, 26);
    tag.setPosition(-296, 72);
    const tagLbl = tag.addComponent(Label);
    tagLbl.string = 'Boss';  tagLbl.fontSize = 17;
    tagLbl.color = color('#ff4444');
    tagLbl.horizontalAlign = HorizontalTextAlignment.CENTER;

    lbl(panel, 'StatusLabel', '', 18, { w: 460, h: 26, x: -60, y: 40, color: '#999999' });

    // HP bar area — anchor(0,0.5) so x=0 aligns fills to left edge of container
    const hpCont = nd('HpBarContainer', panel);
    sz(hpCont, 600, 18);
    anchor(hpCont, 0, 0.5);
    hpCont.setPosition(-300, 10);

    const hpBg = nd('HpBarBg', hpCont);
    sz(hpBg, 600, 18);
    anchor(hpBg, 0, 0.5);
    solidSprite(hpBg, '#2a2a2a');

    const hpFill = nd('HpBarFill', hpCont);
    sz(hpFill, 600, 18);
    anchor(hpFill, 0, 0.5);
    solidSprite(hpFill, '#4caf50');

    const hpFlash = nd('HpFlashFill', hpCont);
    sz(hpFlash, 0, 18);
    anchor(hpFlash, 0, 0.5);
    solidSprite(hpFlash, '#ffffff88');
    hpFlash.active = false;

    // Score labels
    lbl(panel, 'ScoreLabel',  '0 / 500', 21, { w: 460, h: 28, x: -60, y: -20, color: '#ffffff' });
    lbl(panel, 'NeededLabel', '',         17, { w: 460, h: 24, x: -60, y: -50, color: '#777777' });

    return panel;
  }

  private _makeScorePanel(canvas: Node): Node {
    const panel = nd('ScorePanel', canvas);
    sz(panel, W, 130);
    panel.setPosition(0, 215);
    panel.addComponent(ScorePanel);

    lbl(panel, 'ScoreLabel',    '0',        38, { w: 260, h: 48, x: -160, y: 38, color: '#f4d27e', bold: true, align: HorizontalTextAlignment.RIGHT });
    lbl(panel, 'TargetLabel',   '目标 500', 19, { w: 200, h: 26, x:  120, y: 38, color: '#888888' });
    lbl(panel, 'HandsLabel',    '出牌 4',   19, { w: 130, h: 26, x: -270, y:  6, color: '#88ddff' });
    lbl(panel, 'DiscardsLabel', '弃牌 3',   19, { w: 130, h: 26, x: -120, y:  6, color: '#ffaa44' });
    lbl(panel, 'CoinsLabel',    '💰 0',     19, { w: 120, h: 26, x:   50, y:  6, color: '#f4d27e' });

    // Progress bar
    const pbCont = nd('ProgressBarContainer', panel);
    sz(pbCont, 600, 14);
    anchor(pbCont, 0, 0.5);
    pbCont.setPosition(-300, -20);

    const pbBg = nd('ProgressBarBg', pbCont);
    sz(pbBg, 600, 14);
    anchor(pbBg, 0, 0.5);
    solidSprite(pbBg, '#333333');

    const pbFill = nd('ProgressFill', pbCont);
    sz(pbFill, 0, 14);
    anchor(pbFill, 0, 0.5);
    solidSprite(pbFill, '#f39c12');

    lbl(panel, 'RuleHintLabel',     '', 16, { w: 600, h: 22, x: 0, y: -44, color: '#ff6655', align: HorizontalTextAlignment.CENTER });
    lbl(panel, 'ScoreFormulaLabel', '', 17, { w: 600, h: 22, x: 0, y: -64, color: '#cccccc', align: HorizontalTextAlignment.CENTER });

    return panel;
  }

  private _makeHandPanel(canvas: Node): Node {
    const panel = nd('HandPanel', canvas);
    sz(panel, W, 200);
    panel.setPosition(0, 30);
    panel.addComponent(HandPanel);

    lbl(panel, 'PreviewLabel', '', 22, { w: 680, h: 30, x: 0, y: 90, color: '#f4d27e', align: HorizontalTextAlignment.CENTER });

    const container = nd('TileContainer', panel);
    sz(container, 710, 120);
    container.setPosition(0, -10);
    const layout = container.addComponent(Layout);
    layout.type           = Layout.Type.HORIZONTAL;
    layout.spacingX       = 6;
    layout.childAlignment = 4; // CENTER

    return panel;
  }

  private _makeButtonRow(canvas: Node): Node {
    const row = nd('ButtonRow', canvas);
    sz(row, W, 72);
    row.setPosition(0, -380);

    btn(row, 'BtnDiscard',   '弃牌',   148, 64, -270);
    btn(row, 'BtnAdDiscard', '+弃牌',  148, 64, -110);
    btn(row, 'BtnAdHand',    '+出牌',  148, 64,   50);
    btn(row, 'BtnPlay',      '出牌',   190, 64,  230, '#7a3f00');

    return row;
  }

  private _makeRewardPanel(canvas: Node): Node {
    const panel = nd('RewardPanel', canvas);
    sz(panel, W, H);
    panel.addComponent(RewardPanel);
    panel.active = false;

    const bg = nd('Bg', panel);
    sz(bg, W, H);
    solidSprite(bg, '#000000cc');

    lbl(panel, 'TitleLabel', '选择奖励', 32, { w: 600, h: 44, x: 0, y: 300, color: '#f4d27e', bold: true, align: HorizontalTextAlignment.CENTER });
    lbl(panel, 'BonusLabel', '',          20, { w: 600, h: 28, x: 0, y: 258, color: '#ffaa44', align: HorizontalTextAlignment.CENTER });

    const choiceCont = nd('ChoiceContainer', panel);
    sz(choiceCont, 690, 420);
    choiceCont.setPosition(0, 40);
    const cl = choiceCont.addComponent(Layout);
    cl.type     = Layout.Type.VERTICAL;
    cl.spacingY = 10;

    const paidCont = nd('PaidUpgradeContainer', panel);
    sz(paidCont, 690, 200);
    paidCont.setPosition(0, -210);
    const pl = paidCont.addComponent(Layout);
    pl.type     = Layout.Type.VERTICAL;
    pl.spacingY = 8;
    paidCont.active = false;

    btn(panel, 'CatchUpBtn',    '追加奖励',  200, 56, -220, -310);
    btn(panel, 'RefreshBtn',    '刷新(5💰)', 200, 56,    0, -310);
    btn(panel, 'BuyUpgradeBtn', '购买升级',  200, 56,  220, -310);

    return panel;
  }

  private _makeOverlayPanel(canvas: Node): Node {
    const panel = nd('OverlayPanel', canvas);
    sz(panel, W, H);
    panel.addComponent(OverlayPanel);
    panel.active = false;

    const bg = nd('Bg', panel);
    sz(bg, W, H);
    solidSprite(bg, '#000000aa');

    lbl(panel, 'ResultLabel', '',   52, { w: 400, h: 68, x: 0, y: 120, color: '#ffffff', bold: true, align: HorizontalTextAlignment.CENTER });
    lbl(panel, 'SubLabel',    '',   26, { w: 520, h: 36, x: 0, y:  40, color: '#cccccc', align: HorizontalTextAlignment.CENTER });

    btn(panel, 'RestartBtn', '重新开始', 220, 66, -125, -80);
    btn(panel, 'ReviveBtn',  '广告复活', 220, 66,  125, -80);

    return panel;
  }

  private _makeStartScreen(canvas: Node): Node {
    const scr = nd('StartScreen', canvas);
    sz(scr, W, H);

    const bg = nd('Bg', scr);
    sz(bg, W, H);
    solidSprite(bg, '#0d0604');

    lbl(scr, 'Title',    '雀灵试炼',         64, { w: 520, h: 80, x: 0, y: 160, color: '#f4d27e', bold: true, align: HorizontalTextAlignment.CENTER });
    lbl(scr, 'SubTitle', '以牌入道，斩妖伏魔', 26, { w: 420, h: 36, x: 0, y:  80, color: '#888888', align: HorizontalTextAlignment.CENTER });
    btn(scr, 'StartBtn', '开始游戏', 260, 76, 0, -60, '#7a3f00');

    return scr;
  }

  private _makeBuildScreen(canvas: Node): Node {
    const scr = nd('BuildScreen', canvas);
    sz(scr, W, H);
    scr.active = false;
    scr.addComponent(BuildPanel);

    const bg = nd('Bg', scr);
    sz(bg, W, H);
    solidSprite(bg, '#0d0604e0');

    lbl(scr, 'Title', '选择开局', 38, { w: 520, h: 52, x: 0, y: 290, color: '#f4d27e', bold: true, align: HorizontalTextAlignment.CENTER });

    const cont = nd('ChoiceContainer', scr);
    sz(cont, 690, 460);
    cont.setPosition(0, -30);
    const layout = cont.addComponent(Layout);
    layout.type     = Layout.Type.VERTICAL;
    layout.spacingY = 16;

    return scr;
  }

  private _makeToast(canvas: Node): Node {
    const toast = nd('ToastNode', canvas);
    sz(toast, 480, 62);
    toast.setPosition(0, -180);

    const bg = nd('Bg', toast);
    sz(bg, 480, 62);
    solidSprite(bg, '#000000bb');

    const l = toast.addComponent(Label);
    l.string = '';
    l.fontSize = 24;
    l.color = color('#ffffff');
    l.horizontalAlign = HorizontalTextAlignment.CENTER;
    l.verticalAlign   = VerticalTextAlignment.CENTER;
    toast.active = false;
    return toast;
  }

  // ── Runtime template nodes (cloned by nodeFactory) ────────────────────────

  private _makeTileCardTemplate(): Node {
    const root = nd('TileCard');
    sz(root, 76, 108);
    root.addComponent(TileCard);

    const bgSp = nd('BgSprite', root);
    sz(bgSp, 76, 108);
    const sp = solidSprite(bgSp, '#fdf6e3');

    const tc = root.getComponent(TileCard)!;
    tc.bgSprite = sp;

    const valNode = nd('ValueLabel', root);
    sz(valNode, 58, 42);
    valNode.setPosition(0, 16);
    const vl = valNode.addComponent(Label);
    vl.string = '1';  vl.fontSize = 30;  vl.isBold = true;
    vl.horizontalAlign = HorizontalTextAlignment.CENTER;
    vl.verticalAlign   = VerticalTextAlignment.CENTER;
    tc.valueLabel = vl;

    const suitNode = nd('SuitLabel', root);
    sz(suitNode, 58, 26);
    suitNode.setPosition(0, -12);
    const sl = suitNode.addComponent(Label);
    sl.string = '万';  sl.fontSize = 16;
    sl.horizontalAlign = HorizontalTextAlignment.CENTER;
    sl.verticalAlign   = VerticalTextAlignment.CENTER;
    tc.suitLabel = sl;

    const cornerNode = nd('CornerLabel', root);
    sz(cornerNode, 32, 18);
    cornerNode.setPosition(-20, 42);
    const cl = cornerNode.addComponent(Label);
    cl.string = '';  cl.fontSize = 11;
    tc.cornerLabel = cl;

    const selNode = nd('SelectedMark', root);
    sz(selNode, 26, 26);
    selNode.setPosition(26, 42);
    const sm = selNode.addComponent(Label);
    sm.string = '✓';  sm.fontSize = 16;
    sm.color = color('#f4d27e');
    sm.horizontalAlign = HorizontalTextAlignment.CENTER;
    tc.selectedMark = selNode;
    selNode.active = false;

    return root;
  }

  private _makeChoiceCardTemplate(): Node {
    const root = nd('ChoiceCard');
    sz(root, 670, 86);

    const bg = nd('Bg', root);
    sz(bg, 670, 86);
    solidSprite(bg, '#1e1208');

    const nameLbl = nd('NameLabel', root);
    sz(nameLbl, 380, 34);
    nameLbl.setPosition(-100, 18);
    const nl = nameLbl.addComponent(Label);
    nl.string = '';  nl.fontSize = 24;  nl.isBold = true;
    nl.color = color('#f4d27e');
    nl.verticalAlign = VerticalTextAlignment.CENTER;

    const descLbl = nd('DescLabel', root);
    sz(descLbl, 600, 26);
    descLbl.setPosition(-10, -16);
    const dl = descLbl.addComponent(Label);
    dl.string = '';  dl.fontSize = 17;
    dl.color = color('#aaaaaa');
    dl.verticalAlign = VerticalTextAlignment.CENTER;

    const typeLbl = nd('TypeLabel', root);
    sz(typeLbl, 140, 30);
    typeLbl.setPosition(256, 18);
    const tl = typeLbl.addComponent(Label);
    tl.string = '';  tl.fontSize = 18;
    tl.color = color('#88ccff');
    tl.horizontalAlign = HorizontalTextAlignment.RIGHT;
    tl.verticalAlign   = VerticalTextAlignment.CENTER;

    return root;
  }

  // ── Button wiring ─────────────────────────────────────────────────────────

  private _wireButtons(
    row: Node, start: Node, overlay: Node, reward: Node,
    gm: GameManager, op: OverlayPanel, rp: RewardPanel,
  ): void {
    tap(row.getChildByName('BtnDiscard'),   () => gm.onBtnDiscard());
    tap(row.getChildByName('BtnAdDiscard'), () => gm.onBtnAdDiscard());
    tap(row.getChildByName('BtnAdHand'),    () => gm.onBtnAdHand());
    tap(row.getChildByName('BtnPlay'),      () => gm.onBtnPlay());

    tap(start.getChildByName('StartBtn'), () => gm.onBtnStartGame());

    tap(overlay.getChildByName('RestartBtn'), () => op.onBtnRestart());
    tap(overlay.getChildByName('ReviveBtn'),  () => op.onBtnRevive());

    tap(reward.getChildByName('CatchUpBtn'),    () => rp.onBtnCatchUp());
    tap(reward.getChildByName('RefreshBtn'),    () => rp.onBtnRefresh());
    tap(reward.getChildByName('BuyUpgradeBtn'), () => rp.onBtnBuyUpgrade());
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Module-level helpers
// ─────────────────────────────────────────────────────────────────────────────

function nd(name: string, parent?: Node): Node {
  const n = new Node(name);
  if (parent) {
    n.layer = parent.layer;
    parent.addChild(n);
  }
  return n;
}

function setLayerRecursive(node: Node, layer: number): void {
  node.layer = layer;
  node.children.forEach((child) => setLayerRecursive(child, layer));
}

function sz(node: Node, w: number, h: number): UITransform {
  let t = node.getComponent(UITransform);
  if (!t) t = node.addComponent(UITransform);
  t.setContentSize(w, h);
  return t;
}

function anchor(node: Node, x: number, y: number): void {
  let t = node.getComponent(UITransform);
  if (!t) t = node.addComponent(UITransform);
  t.setAnchorPoint(x, y);
}

function lbl(
  parent: Node, name: string, text: string, fontSize: number,
  opts: { w?: number; h?: number; x?: number; y?: number; color?: string; bold?: boolean; align?: HorizontalTextAlignment } = {},
): Label {
  const n = nd(name, parent);
  sz(n, opts.w ?? 300, opts.h ?? fontSize + 8);
  n.setPosition(opts.x ?? 0, opts.y ?? 0);
  const l = n.addComponent(Label);
  l.string    = text;
  l.fontSize  = fontSize;
  l.lineHeight = fontSize + 4;
  if (opts.color) l.color = color(opts.color);
  if (opts.bold)  l.isBold = true;
  l.horizontalAlign = opts.align ?? HorizontalTextAlignment.LEFT;
  l.verticalAlign   = VerticalTextAlignment.CENTER;
  return l;
}

function btn(parent: Node, name: string, text: string, w: number, h: number, x: number, y = 0, bgColor = '#3a2a0a'): Node {
  const n = nd(name, parent);
  sz(n, w, h);
  n.setPosition(x, y);

  const bg = nd('Bg', n);
  sz(bg, w, h);
  solidSprite(bg, bgColor);

  const lblN = nd('Text', n);
  sz(lblN, w - 12, h);
  const l = lblN.addComponent(Label);
  l.string    = text;
  l.fontSize  = 22;
  l.color     = color('#f4d27e');
  l.horizontalAlign = HorizontalTextAlignment.CENTER;
  l.verticalAlign   = VerticalTextAlignment.CENTER;

  return n;
}

function tap(node: Node | null, fn: () => void): void {
  node?.on(Node.EventType.TOUCH_END, fn);
}

// ── Sprite helpers ────────────────────────────────────────────────────────────

// Lazy-initialized 1×1 white SpriteFrame shared by all solid-color sprites.
// In Cocos 3.x, Sprite.spriteFrame must be non-null for the sprite to render.
let _whiteSF: SpriteFrame | null = null;
function whiteSF(): SpriteFrame {
  if (!_whiteSF) {
    const builtin = builtinResMgr.get<SpriteFrame>('default-spriteframe');
    if (builtin) {
      _whiteSF = builtin;
      return _whiteSF;
    }

    const tex = new Texture2D();
    tex.reset({ width: 1, height: 1, format: Texture2D.PixelFormat.RGBA8888 });
    tex.uploadData(new Uint8Array([255, 255, 255, 255]));
    const sf = new SpriteFrame();
    sf.texture = tex;
    _whiteSF = sf;
  }
  return _whiteSF;
}

function solidSprite(node: Node, hexColor: string): Sprite {
  const sp = node.addComponent(Sprite);
  sp.spriteFrame = whiteSF();
  sp.color = color(hexColor);
  return sp;
}
