@echo off
chcp 65001 >nul
title 推送代码到 GitHub
cd /d "%~dp0"

echo ============================================
echo  一键推送代码到 GitHub
echo ============================================
echo.
echo 请在下面粘贴你的仓库地址（形如：）
echo   https://github.com/你的用户名/football-platform.git
echo.
set /p REPO=仓库地址: 

if "%REPO%"=="" (
    echo 未输入地址，操作取消。
    pause
    exit /b
)

git init >nul 2>&1
git branch -M main >nul 2>&1
git remote remove origin >nul 2>&1
git remote add origin "%REPO%"

echo.
echo 正在推送（若弹出 GitHub 登录窗口，选"Sign in with your browser"授权即可）...
git push -u origin main

if errorlevel 1 (
    echo.
    echo [失败] 推送未成功。常见原因：
    echo   1. 地址粘贴有误
    echo   2. 创建仓库时勾选了 "Add a README"（需在仓库网页删除，或重新创建时不勾选）
    echo   3. 浏览器登录未完成授权
    echo 修正后重新双击本脚本即可（已提交的内容不会丢失）。
) else (
    echo.
    echo [成功] 代码已推送到 GitHub！
    echo 现在打开仓库页面 -> 点 Actions 标签 -> 查看 "Build Docker Images (X64)" 自动构建。
)
pause
