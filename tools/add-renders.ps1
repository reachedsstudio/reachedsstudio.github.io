<#
.SYNOPSIS
  Turns renders in renders/ into web images and swaps them into the site.

.DESCRIPTION
  Drop full-size renders (JPG or PNG) into the renders/ folder, named after
  the placeholder they replace, e.g. "courtyard-house.png" or "Tower.jpg".
  For each one this script:
    - resizes it (longest side 2560px) and saves a compressed JPG to images/work/
    - points every matching <img> in the site's HTML pages at the new JPG,
      removes the dark-mode "is-drawing" class and updates width/height
  Originals in renders/ are never modified, and that folder is not committed.

.PARAMETER Push
  Also commit the changed images and pages and push to GitHub.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File tools/add-renders.ps1
  powershell -ExecutionPolicy Bypass -File tools/add-renders.ps1 -Push
#>
param(
  [switch]$Push,
  [int]$MaxSize = 2560,
  [int]$Quality = 80
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$inbox = Join-Path $root "renders"
$outDir = Join-Path $root "images\work"
$pages = Get-ChildItem -Path $root -Filter *.html | ForEach-Object { $_.FullName }
$utf8 = New-Object System.Text.UTF8Encoding($false)

if (-not (Test-Path $inbox)) { New-Item -ItemType Directory -Path $inbox | Out-Null }

# Every image slot in the site: <img ... src="images/work/<name>.svg|jpg" ...>
$imgPattern = '<img\b[^>]*\bsrc="images/work/(?<name>[a-z0-9-]+)\.(?:svg|jpg)"[^>]*>'
$slots = @{}
foreach ($page in $pages) {
  $html = [IO.File]::ReadAllText($page, $utf8)
  foreach ($m in [regex]::Matches($html, $imgPattern)) { $slots[$m.Groups["name"].Value] = $true }
}

function Get-Slug([string]$name) {
  # Windows hides extensions, so "hero.jpg" typed onto a PNG becomes "hero.jpg.png"
  $name = $name -replace '(\.(jpe?g|png))+$', ''
  $s = $name.ToLowerInvariant() -replace '[\s_]+', '-' -replace '[^a-z0-9-]', '' -replace '-+', '-'
  return $s.Trim('-')
}

function Get-JpegCodec {
  [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" }
}

function Save-WebJpeg([string]$src, [string]$dest) {
  $img = [System.Drawing.Image]::FromFile($src)
  try {
    $scale = [Math]::Min(1.0, $MaxSize / [Math]::Max($img.Width, $img.Height))
    $w = [int][Math]::Round($img.Width * $scale)
    $h = [int][Math]::Round($img.Height * $scale)

    $bmp = New-Object System.Drawing.Bitmap($w, $h)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    try {
      $g.Clear([System.Drawing.Color]::White)  # flattens PNG transparency
      $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
      $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
      $attrs = New-Object System.Drawing.Imaging.ImageAttributes
      $attrs.SetWrapMode([System.Drawing.Drawing2D.WrapMode]::TileFlipXY)  # no dark edge fringe
      $g.DrawImage($img, (New-Object System.Drawing.Rectangle(0, 0, $w, $h)), 0, 0, $img.Width, $img.Height, [System.Drawing.GraphicsUnit]::Pixel, $attrs)
    } finally { $g.Dispose() }

    $params = New-Object System.Drawing.Imaging.EncoderParameters(1)
    $params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]$Quality)
    try { $bmp.Save($dest, (Get-JpegCodec), $params) } finally { $bmp.Dispose() }
    return @{ Width = $w; Height = $h }
  } finally { $img.Dispose() }
}

$files = Get-ChildItem -Path $inbox -File | Where-Object { $_.Extension -match '^\.(jpe?g|png)$' }
if (-not $files) {
  Write-Host "No renders found. Put JPG or PNG files in: $inbox"
  exit 0
}

$done = @()
$skipped = @()

foreach ($file in $files) {
  $slug = Get-Slug $file.BaseName
  if (-not $slots.ContainsKey($slug)) {
    $skipped += "$($file.Name)  (no image slot named '$slug')"
    continue
  }

  $dest = Join-Path $outDir "$slug.jpg"
  $size = Save-WebJpeg $file.FullName $dest
  $kb = [Math]::Round((Get-Item $dest).Length / 1KB)

  $tagCount = 0
  foreach ($page in $pages) {
    $html = [IO.File]::ReadAllText($page, $utf8)
    $pattern = '<img\b[^>]*\bsrc="images/work/' + [regex]::Escape($slug) + '\.(?:svg|jpg)"[^>]*>'
    $updated = [regex]::Replace($html, $pattern, {
      param($m)
      $tag = $m.Value
      $tag = $tag -replace '(src="images/work/[a-z0-9-]+)\.svg"', '$1.jpg"'
      $tag = $tag -replace '\s*\bis-drawing\b', '' -replace 'class="\s+', 'class="' -replace '\s+class=""', ''
      $tag = $tag -replace '\bwidth="\d+"', "width=`"$($size.Width)`""
      $tag = $tag -replace '\bheight="\d+"', "height=`"$($size.Height)`""
      $script:tagCount++
      return $tag
    })
    if ($updated -ne $html) { [IO.File]::WriteAllText($page, $updated, $utf8) }
  }

  $done += "{0,-28} -> images/work/{1}.jpg  {2}x{3}, {4} KB, {5} tag(s)" -f $file.Name, $slug, $size.Width, $size.Height, $kb, $tagCount
}

Write-Host ""
if ($done) {
  Write-Host "Added:" -ForegroundColor Green
  $done | ForEach-Object { Write-Host "  $_" }
}
if ($skipped) {
  Write-Host "Skipped:" -ForegroundColor Yellow
  $skipped | ForEach-Object { Write-Host "  $_" }
  Write-Host ("  Valid names: " + (($slots.Keys | Sort-Object) -join ", "))
}

if ($done) {
  Write-Host ""
  Write-Host "Tip: update the alt text in the HTML so it describes each render, not the old drawing."
}

if ($Push -and $done) {
  Push-Location $root
  try {
    git add -- images/work *.html
    git commit -m "Add renders" -q
    git push -q
    Write-Host "Committed and pushed. The live site updates in a minute or two." -ForegroundColor Green
  } finally { Pop-Location }
}
