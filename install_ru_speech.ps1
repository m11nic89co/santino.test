<#
install_ru_speech.ps1

Автоматическая установка доступных компонентов русского языка (включая speech packs), добавление русского в список языков пользователя.
Запустите PowerShell от имени Администратора.
#>

# Проверка прав администратора
$principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Error "Этот скрипт нужно запускать от имени администратора. Откройте PowerShell как Administrator и повторите."
    exit 1
}

Write-Output "1) Сканируем доступные Windows capabilities для ru-RU..."
$ruCaps = Get-WindowsCapability -Online | Where-Object Name -like '*ru-RU*' | Sort-Object Name
if (-not $ruCaps) {
    Write-Output "Не найдены capabilities с 'ru-RU' — возможно, ваша версия Windows не поддерживает инсталляцию через Get-WindowsCapability."
} else {
    $ruCaps | Format-Table Name, State -AutoSize

    foreach ($cap in $ruCaps) {
        if ($cap.State -ne 'Installed') {
            Write-Output "Installing $($cap.Name) ..."
            try {
                Add-WindowsCapability -Online -Name $cap.Name -ErrorAction Stop
                Write-Output "Installed: $($cap.Name)"
            } catch {
                Write-Warning "Не удалось установить $($cap.Name): $($_.Exception.Message)"
            }
        } else {
            Write-Output "$($cap.Name) already installed"
        }
    }
}

Write-Output "\n2) Добавляем русский язык в настройки пользователя (ru-RU) и делаем его предпочтительным"
try {
    $list = New-WinUserLanguageList ru-RU
    Set-WinUserLanguageList $list -Force
    Write-Output "Russian language added to user language list."
} catch {
    Write-Warning "Не удалось добавить язык программно: $($_.Exception.Message)"
    Write-Output "Откройте Settings → Time & language → Language & region и добавьте Russian вручную."
}

Write-Output "\n3) Проверка состояния установленных ru-RU components:"
Get-WindowsCapability -Online | Where-Object Name -like '*ru-RU*' | Format-Table Name, State -AutoSize

Write-Output "\nГотово. Рекомендуется перезагрузить систему чтобы изменения вступили в силу."
Write-Output "После перезагрузки: проверьте Settings → Privacy & security → Speech → Online speech recognition = On и переключитесь на русский ввод (Win+Space) перед нажатием Win+H."
