# Скрипт для переименования папки santino.ru.com в dev
param()

$ErrorActionPreference = 'Stop'
$oldPath = "G:\My Drive\santino.ru.com"
$newPath = "G:\My Drive\dev"

Write-Host "🔄 Начинаем переименование..." -ForegroundColor Yellow

# Проверяем, что VS Code закрыт
$vsCodeProcesses = Get-Process | Where-Object {$_.ProcessName -like "*Code*"}
if ($vsCodeProcesses) {
    Write-Host "❌ Обнаружены процессы VS Code. Закройте VS Code полностью!" -ForegroundColor Red
    $vsCodeProcesses | Select-Object ProcessName, Id | Format-Table
    exit 1
}

# Проверяем исходную папку
if (-not (Test-Path $oldPath)) {
    Write-Host "❌ Папка $oldPath не найдена!" -ForegroundColor Red
    exit 1
}

# Проверяем, что целевая папка не существует
if (Test-Path $newPath) {
    Write-Host "❌ Папка $newPath уже существует!" -ForegroundColor Red
    exit 1
}

try {
    # Переименовываем папку
    Write-Host "📁 Переименовываем папку..." -ForegroundColor Green
    Rename-Item -Path $oldPath -NewName "dev"
    
    Write-Host "✅ Папка успешно переименована в: $newPath" -ForegroundColor Green
    
    # Обновляем workspace файлы
    Write-Host "🔧 Обновляем workspace файлы..." -ForegroundColor Yellow
    
    # Santino workspace
    $santinoWs = "$newPath\santino.code-workspace"
    if (Test-Path $santinoWs) {
        Write-Host "  - Обновляем santino.code-workspace"
        # Файл уже корректный (использует относительные пути)
    }
    
    # Crypto-bot workspace
    $cryptoWs = "$newPath\crypto-bot\crypto-bot.code-workspace"  
    if (Test-Path $cryptoWs) {
        Write-Host "  - Обновляем crypto-bot.code-workspace"
        # Файл уже корректный (использует относительные пути)
    }
    
    # Обновляем скрипты с абсолютными путями
    Write-Host "🔧 Обновляем скрипты..." -ForegroundColor Yellow
    
    # Скрипт создания ярлыков
    $shortcutScript = "$newPath\scripts\windows\Create-VSCode-Workspace-Shortcut.ps1"
    if (Test-Path $shortcutScript) {
        $content = Get-Content $shortcutScript -Raw
        $content = $content -replace [regex]::Escape('G:\My Drive\santino.ru.com'), 'G:\My Drive\dev'
        Set-Content $shortcutScript $content -Encoding UTF8
        Write-Host "  - Обновлён Create-VSCode-Workspace-Shortcut.ps1"
    }
    
    # Скрипт crypto-bot remote setup
    $cryptoRemoteScript = "$newPath\crypto-bot\scripts\win-set-remote.ps1"
    if (Test-Path $cryptoRemoteScript) {
        # Уже использует относительные пути $PSScriptRoot
        Write-Host "  - crypto-bot win-set-remote.ps1 уже корректен"
    }
    
    Write-Host ""
    Write-Host "🎉 ГОТОВО! Папка переименована в: G:\My Drive\dev" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Что делать дальше:" -ForegroundColor Cyan
    Write-Host "1. Откройте новую папку в VS Code:"
    Write-Host "   code `"G:\My Drive\dev\santino.code-workspace`""
    Write-Host "2. Или используйте ярлык на рабочем столе (если есть)"
    Write-Host "3. Git репозитории остались рабочими"
    Write-Host ""
    
} catch {
    Write-Host "❌ Ошибка при переименовании: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
