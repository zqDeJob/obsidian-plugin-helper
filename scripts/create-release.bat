@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo 正在构建插件...
call npm run build
if errorlevel 1 exit /b 1

echo.
echo 请确保已登录 GitHub CLI：gh auth login
echo 正在创建 Release 1.0.0 ...
gh release create 1.0.0 main.js manifest.json styles.css ^
  --title "1.0.0" ^
  --notes "插件说明书 v1.0.0：侧边栏官方说明+个人备注，弹窗只读查阅。"

if errorlevel 1 (
  echo.
  echo 若提示未登录，请先运行：gh auth login
  exit /b 1
)

echo.
echo 完成！Release 地址：
gh release view 1.0.0 --web
