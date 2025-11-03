<#
Script: download-assets.ps1
Purpose: Scarica in locale i font FontAwesome 4.7, la loading.gif e crea un favicon.png di base.
#>

$ErrorActionPreference = 'Stop'

Write-Host '==> Creazione cartelle se mancanti...'
$base = Split-Path -Parent $MyInvocation.MyCommand.Path
$fontsDir = Join-Path $base 'fonts'
$imagesDir = Join-Path $base 'images'

New-Item -ItemType Directory -Force -Path $fontsDir | Out-Null
New-Item -ItemType Directory -Force -Path $imagesDir | Out-Null

Write-Host '==> Download FontAwesome fonts...'
$fontBase = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/fonts'
$fonts = @('fontawesome-webfont.woff2','fontawesome-webfont.woff','fontawesome-webfont.ttf')
foreach ($f in $fonts) {
  $url = "$fontBase/$f"
  $dest = Join-Path $fontsDir $f
  Write-Host "Scarico $f ..."
  Invoke-WebRequest -Uri $url -OutFile $dest
}

Write-Host '==> Download loading.gif...'
$loadingUrl = 'https://raw.githubusercontent.com/lepture/editor.md/master/examples/images/loading.gif'
Invoke-WebRequest -Uri $loadingUrl -OutFile (Join-Path $imagesDir 'loading.gif')

Write-Host '==> Creazione favicon.png base (32x32 blu)...'
$iconPath = Join-Path $base 'favicon.png'
Add-Type -AssemblyName System.Drawing
$bmp = New-Object System.Drawing.Bitmap 32,32
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.Clear([System.Drawing.Color]::FromArgb(40,85,170))
$font = New-Object System.Drawing.Font 'Arial', 14, [System.Drawing.FontStyle]::Bold
$brush = [System.Drawing.Brush]::new([System.Drawing.Color]::White)
$g.DrawString('DOC', $font, $brush, -2, 6)
$g.Dispose(); $bmp.Save($iconPath, [System.Drawing.Imaging.ImageFormat]::Png); $bmp.Dispose()

Write-Host '==> Fatto. Verifica assenza 404 in console.' -ForegroundColor Green
