# Convert raster images to WebP and AVIF and produce optimized PNG copies
# Requires: ImageMagick (magick) or cwebp + avifenc installed
# Usage: powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\convert_images.ps1

# Ensure project root is repository root (script is in scripts/)
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$projectRoot = Resolve-Path (Join-Path $scriptDir "..") | Select-Object -ExpandProperty Path
Set-Location $projectRoot

$inputFiles = @(
    "santino_og.png",
    "favicon-32x32.png",
    "favicon-16x16.png",
    "apple-touch-icon.png",
    "android-chrome-192x192.png",
    "android-chrome-512x512.png"
)

 $outDir = Join-Path $projectRoot "img_opt"
if (!(Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }

foreach ($f in $inputFiles) {
    $src = Join-Path $projectRoot $f
    if (!(Test-Path $src)) { Write-Output "Skip $f — not found"; continue }

    $base = [IO.Path]::GetFileNameWithoutExtension($f)
    $webp = Join-Path $outDir "$base.webp"
    $avif = Join-Path $outDir "$base.avif"
    $optpng = Join-Path $outDir "$base.png"

    # Prefer ImageMagick if available
    if (Get-Command magick -ErrorAction SilentlyContinue) {
        Write-Output "Converting $f -> webp/avif/png using ImageMagick"
        & magick convert $src -quality 85 $webp
        & magick convert $src -quality 80 $avif
        & magick convert $src -strip -quality 90 $optpng
    } else {
        # Try cwebp and avifenc
        if (Get-Command cwebp -ErrorAction SilentlyContinue) {
            Write-Output "Converting $f -> webp using cwebp"
            & cwebp -q 85 $src -o $webp | Out-Null
        }
        if (Get-Command avifenc -ErrorAction SilentlyContinue) {
            Write-Output "Converting $f -> avif using avifenc"
            & avifenc --min 20 --max 50 $src $avif | Out-Null
        }
        # Fallback: copy optimized PNG using pngquant if available
        if (Get-Command pngquant -ErrorAction SilentlyContinue) {
            Write-Output "Optimizing PNG with pngquant"
            & pngquant --quality=65-90 --output $optpng --force $src | Out-Null
        } else {
            Copy-Item $src $optpng -Force
        }
    }
}

Write-Output "Done. Optimized files are in: $outDir"
