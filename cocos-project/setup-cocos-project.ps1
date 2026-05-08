# setup-cocos-project.ps1
# 将本仓库的脚本和资源复制到你的 Cocos Creator 项目目录
#
# 用法：
#   .\setup-cocos-project.ps1 -CocosProjectPath "D:\cocos-projects\mahjong-roguelike"
#
# 参数：
param(
  [Parameter(Mandatory=$true)]
  [string]$CocosProjectPath
)

$src = $PSScriptRoot   # cocos-project/ 目录

function Copy-Dir($from, $to) {
  if (-not (Test-Path $to)) { New-Item -ItemType Directory -Path $to -Force | Out-Null }
  Copy-Item -Path "$from\*" -Destination $to -Recurse -Force
  Write-Host "  复制: $from -> $to"
}

Write-Host ""
Write-Host "=== 雀灵试炼 Cocos 项目初始化 ===" -ForegroundColor Cyan
Write-Host "目标目录: $CocosProjectPath" -ForegroundColor Yellow
Write-Host ""

# 检查目标目录是否存在
if (-not (Test-Path $CocosProjectPath)) {
  Write-Error "目标目录不存在: $CocosProjectPath`n请先在 Cocos Dashboard 里创建项目。"
  exit 1
}

# 1. 复制脚本
Write-Host "[1/3] 复制 TypeScript 脚本..." -ForegroundColor Green
$scriptsTarget = Join-Path $CocosProjectPath "assets\scripts"
Copy-Dir "$src\assets\scripts" $scriptsTarget

# 2. 复制资源
Write-Host "[2/3] 复制美术资源..." -ForegroundColor Green
$resTarget = Join-Path $CocosProjectPath "assets\resources"
Copy-Dir "$src\assets\resources" $resTarget

# 3. 合并 tsconfig（只更新 compilerOptions，保留 Cocos 原有配置）
Write-Host "[3/3] 检查 tsconfig.json..." -ForegroundColor Green
$tsconfigSrc    = Join-Path $src "tsconfig.json"
$tsconfigTarget = Join-Path $CocosProjectPath "tsconfig.json"
if (Test-Path $tsconfigTarget) {
  Write-Host "  tsconfig.json 已存在，跳过（手动确认 experimentalDecorators: true）" -ForegroundColor Yellow
} else {
  Copy-Item $tsconfigSrc $tsconfigTarget -Force
  Write-Host "  复制 tsconfig.json"
}

Write-Host ""
Write-Host "=== 完成！接下来在 Cocos Creator 编辑器里做以下操作 ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. 打开项目，等待资源导入完成（编辑器右下角进度条）" -ForegroundColor White
Write-Host "2. 菜单 File -> New Scene，保存为 GameScene" -ForegroundColor White
Write-Host "3. 场景中已有 Canvas 节点，点选它" -ForegroundColor White
Write-Host "4. Inspector -> Add Component -> 搜索 GameBootstrap -> 挂载" -ForegroundColor White
Write-Host "5. 点击 Play 预览，游戏应可运行" -ForegroundColor White
Write-Host ""
Write-Host "=== 构建微信小游戏 ===" -ForegroundColor Cyan
Write-Host "菜单 Project -> Build -> 平台选 WeChat Mini Game" -ForegroundColor White
Write-Host "AppID 填: wx6ac3f5090a6b99c5" -ForegroundColor White
Write-Host "Build Path 设为项目内任意目录（如 build/wechat-game）" -ForegroundColor White
Write-Host "构建完成后用微信开发者工具打开该目录即可调试" -ForegroundColor White
Write-Host ""
