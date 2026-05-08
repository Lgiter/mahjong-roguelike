# 雀灵试炼 · Cocos Creator 迁移项目

## 1. 准备工作

1. 下载并安装 **Cocos Creator 3.8.x**（免费）: https://www.cocos.com/creator
2. 打开 Cocos Creator Dashboard → 「新建项目」→ 选择 **空项目（TypeScript）**
3. 命名为 `mahjong-roguelike`，创建后退出编辑器

## 2. 导入本项目代码

将本目录（`cocos-project/`）的以下内容复制到 Cocos 项目根目录：

```
assets/scripts/     → 覆盖项目 assets/scripts/
assets/resources/   → 覆盖/合并项目 assets/resources/
tsconfig.json       → 覆盖（仅 compilerOptions 部分，保留 Cocos 原有配置）
```

## 3. 导入美术资源

将 `wechat-minigame/assets/` 下的图片资源放入 Cocos 的 `assets/resources/` 目录：

```
assets/resources/
├── bosses/
│   ├── stage0/spriteFrame    ← stage0.jpg
│   ├── stage1/spriteFrame    ← stage1.jpg（生成后放入）
│   └── ...
└── fx/
    ├── fx_tier1/spriteFrame
    └── ...
```

> Cocos 的 `resources.load()` 会自动处理 SpriteFrame，图片放入后在编辑器里选中，
> 右键 → 「创建 SpriteFrame」即可。

## 4. 场景搭建（编辑器操作）

在 Cocos 编辑器中搭建 `GameScene.scene`：

### 节点树结构

```
Scene
└── Canvas (Canvas + UITransform, 750×1334)
    ├── BgLayer
    │   └── BgGradient (Sprite)               ← 背景渐变
    ├── GameRoot
    │   ├── VFXManager (VFXManager 组件)
    │   │   ├── ScorePopPool
    │   │   └── ScreenFlash (Sprite)
    │   ├── BossPanel (BossPanel 组件)
    │   │   ├── BossPortrait (Sprite, 右侧 82×82)
    │   │   ├── BossNameLabel (Label)
    │   │   ├── BossTagNode (Node — "Boss"标签)
    │   │   ├── HpBarBg (Sprite)
    │   │   ├── HpBarFill (Sprite)
    │   │   ├── HpFlashFill (Sprite)
    │   │   ├── StatusLabel (Label)
    │   │   ├── ScoreLabel (Label)
    │   │   └── NeededLabel (Label)
    │   ├── ScorePanel (ScorePanel 组件)
    │   │   ├── ScoreLabel (Label — 大字，右对齐)
    │   │   ├── TargetLabel (Label)
    │   │   ├── ProgressFill (Sprite)
    │   │   ├── HandsLabel (Label)
    │   │   ├── DiscardsLabel (Label)
    │   │   ├── CoinsLabel (Label)
    │   │   └── RuleHintLabel (Label)
    │   ├── HandPanel (HandPanel 组件)
    │   │   ├── PreviewLabel (Label — 牌型预览)
    │   │   └── TileContainer (Layout: Horizontal, Spacing: 8)
    │   └── ButtonRow
    │       ├── BtnDiscard (Button)
    │       ├── BtnAdDiscard (Button)
    │       ├── BtnAdHand (Button)
    │       └── BtnPlay (Button)
    ├── RewardPanel (RewardPanel 组件, active=false)
    │   ├── TitleLabel
    │   ├── ChoiceContainer (Layout: Vertical)
    │   ├── CatchUpBtn
    │   ├── RefreshBtn
    │   └── BuyUpgradeBtn
    ├── OverlayPanel (OverlayPanel 组件, active=false)
    │   ├── ResultLabel
    │   ├── SubLabel
    │   ├── RestartBtn
    │   └── ReviveBtn
    ├── StartScreen (active=true)
    │   └── StartBtn
    ├── BuildScreen (active=false)
    │   └── ChoiceContainer
    └── ToastNode (Label, active=false)
```

### 绑定 GameManager

1. 在 Canvas 节点上挂载 **GameManager** 组件
2. 在 Inspector 里把上述各节点拖入对应的 property 槽（handPanelNode、bossPanelNode 等）
3. 各按钮的 Click Event 绑定到 GameManager 对应方法：
   - 出牌按钮 → `GameManager.onBtnPlay()`
   - 弃牌按钮 → `GameManager.onBtnDiscard()`
   - 开始游戏 → `GameManager.onBtnStartGame()`
   - 等等

## 5. TileCard Prefab

1. 新建 Prefab → 命名 `TileCard`
2. 节点结构：
   ```
   TileCard (TileCard 组件 + Button)
   ├─ BgSprite (Sprite, 76×108, 圆角)
   ├─ ValueLabel (Label, 30pt, bold, 居中)
   ├─ SuitLabel (Label, 16pt, 居中, 在 Value 下方)
   ├─ CornerLabel (Label, 11pt, 左上角)
   └─ SelectedMark (Label "✓", 右上角, 初始 hidden)
   ```
3. 将 TileCard 组件的 property 与上述子节点绑定

## 6. 运行测试

- 在编辑器中点击 **Play** 按钮即可在预览窗口中测试
- 如需发布到微信小游戏：**项目** → **构建发布** → 选择「微信小游戏」平台

## 7. 文件结构说明

```
assets/scripts/
├── data/
│   ├── types.ts        — 所有 TypeScript 接口/类型
│   ├── constants.ts    — 颜色、花色常量
│   ├── stages.ts       — 12个关卡、牌型表、事件
│   ├── artifacts.ts    — 30+个法器定义
│   └── upgrades.ts     — 15个升级 + 4个开局
├── core/
│   ├── utils.ts        — 工具函数（shuffle, uid, getCounts 等）
│   ├── deckOps.ts      — 牌山操作（createDeck, drawTiles 等）
│   ├── evaluator.ts    — 牌型识别（evaluateTiles）
│   ├── scoring.ts      — 得分计算（calculateScore）
│   ├── gameState.ts    — 初始 state 工厂
│   └── gameLogic.ts    — 游戏主逻辑（startRun, playSelected 等）
└── components/
    ├── GameManager.ts  — 入口组件，连接逻辑与 UI
    ├── TileCard.ts     — 单张麻将牌 Prefab 组件
    ├── HandPanel.ts    — 手牌区域
    ├── BossPanel.ts    — 敌人血条 + Boss 立绘
    ├── ScorePanel.ts   — 顶部得分信息栏
    ├── RewardPanel.ts  — 过关奖励选择界面
    ├── OverlayPanel.ts — 游戏结束覆盖层
    └── VFXManager.ts   — 视觉特效管理器
```

## 8. 待接入资源（等 AI 生图后）

| 文件 | 放入路径 | 说明 |
|------|----------|------|
| stage1.jpg ~ stage11.jpg | assets/resources/bosses/ | Boss 立绘 |
| fx_tier1.png ~ fx_tier4.png | assets/resources/fx/ | 攻击特效 |
| 国风字体.ttf | assets/resources/fonts/ | 替换默认字体 |

一旦图片放入，VFXManager 和 BossPanel 会自动加载，无需修改代码。
