Add-Type -AssemblyName System.Drawing

$width = 1200
$height = 630

$bmp = New-Object System.Drawing.Bitmap($width, $height)
$gfx = [System.Drawing.Graphics]::FromImage($bmp)
$gfx.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$gfx.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$gfx.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$gfx.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit

# 1. Load background library photo
$heroPath = Resolve-Path "src/assets/landing-hero.jpg"
$heroImg = [System.Drawing.Image]::FromFile($heroPath)

# Draw hero image covering the entire 1200x630 canvas
$gfx.DrawImage($heroImg, 0, 0, $width, $height)
$heroImg.Dispose()

# 2. Add subtle dark gradient overlay: lighter at top, dark gradient at bottom for text
$rect = [System.Drawing.Rectangle]::FromLTRB(0, 0, $width, $height)
$colorTop = [System.Drawing.Color]::FromArgb(125, 15, 23, 42)    # 50% opacity slate
$colorBottom = [System.Drawing.Color]::FromArgb(235, 10, 15, 30) # 92% opacity slate
$brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, $colorTop, $colorBottom, 90.0)
$gfx.FillRectangle($brush, $rect)
$brush.Dispose()

# 3. Typography
$fontSchool = New-Object System.Drawing.Font("Segoe UI", 21, [System.Drawing.FontStyle]::Bold)
$fontTitleMain = New-Object System.Drawing.Font("Segoe UI", 48, [System.Drawing.FontStyle]::Bold)
$fontTitleSub = New-Object System.Drawing.Font("Segoe UI", 27, [System.Drawing.FontStyle]::Bold)
$fontSub = New-Object System.Drawing.Font("Segoe UI", 18, [System.Drawing.FontStyle]::Regular)
$fontTag = New-Object System.Drawing.Font("Segoe UI", 20, [System.Drawing.FontStyle]::Regular)

# Draw KVS Logo (left)
$kvLogoPath = Resolve-Path "public/logos/kv-square.png"
if (Test-Path $kvLogoPath) {
    $kvLogo = [System.Drawing.Image]::FromFile($kvLogoPath)
    $logoBgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(245, 255, 255, 255))
    $gfx.FillEllipse($logoBgBrush, 60, 36, 102, 102)
    $logoBgBrush.Dispose()
    $gfx.DrawImage($kvLogo, 71, 47, 80, 80)
    $kvLogo.Dispose()
}

# Draw PM SHRI Logo (right)
$pmShriPath = Resolve-Path "public/logos/pm-shri.png"
if (Test-Path $pmShriPath) {
    $pmLogo = [System.Drawing.Image]::FromFile($pmShriPath)
    $pmBgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(245, 255, 255, 255))
    $gfx.FillEllipse($pmBgBrush, 1038, 36, 102, 102)
    $pmBgBrush.Dispose()
    $gfx.DrawImage($pmLogo, 1049, 47, 80, 80)
    $pmLogo.Dispose()
}

# School Name & Subhead
$goldBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 251, 191, 36)) # Amber-400
$gfx.DrawString("PM SHRI KENDRIYA VIDYALAYA AFS SULUR", $fontSchool, $goldBrush, 185, 48)
$goldBrush.Dispose()

$dimBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(235, 226, 232, 240)) # Slate-200
$gfx.DrawString("Air Force Station Sulur, Coimbatore | Kendriya Vidyalaya Sangathan", $fontSub, $dimBrush, 185, 88)
$dimBrush.Dispose()

# Decorative Accent line
$linePen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(100, 255, 255, 255), 1.5)
$gfx.DrawLine($linePen, 60, 162, 1140, 162)
$linePen.Dispose()

# Main Title: Digital Library Management System
$whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
$gfx.DrawString("Digital Library Management System", $fontTitleMain, $whiteBrush, 60, 212)

$accentBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 129, 140, 248)) # Indigo-400
$gfx.DrawString("Official DLMS Web Portal & App", $fontTitleSub, $accentBrush, 60, 292)
$accentBrush.Dispose()

# Subtitle / Feature summary
$tagBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(240, 226, 232, 240)) # Slate-200
$gfx.DrawString("Explore 10,000+ Books | Reading Marathons | Instant Catalog Search | Student Pass", $fontTag, $tagBrush, 60, 365)
$fontTag.Dispose()
$tagBrush.Dispose()

# Feature pills at bottom
$pills = @(
    "10,000+ Library Books",
    "Digital Catalog & Search",
    "Student & Teacher Portal",
    "Reading League & Badges"
)

$pillFont = New-Object System.Drawing.Font("Segoe UI", 14, [System.Drawing.FontStyle]::Bold)
$pillBg = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(170, 30, 41, 59))
$pillText = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 248, 250, 252))
$pillBorder = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(120, 148, 163, 184), 1.0)

$curX = 60
foreach ($p in $pills) {
    $size = $gfx.MeasureString($p, $pillFont)
    $pw = [int]($size.Width + 28)
    $ph = 42
    $py = 458
    
    $pRect = [System.Drawing.Rectangle]::FromLTRB($curX, $py, ($curX + $pw), ($py + $ph))
    $gfx.FillRectangle($pillBg, $pRect)
    $gfx.DrawRectangle($pillBorder, $pRect)
    
    $sf = New-Object System.Drawing.StringFormat
    $sf.Alignment = [System.Drawing.StringAlignment]::Center
    $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
    $gfx.DrawString($p, $pillFont, $pillText, [System.Drawing.RectangleF]::FromLTRB($curX, $py, ($curX + $pw), ($py + $ph)), $sf)
    $sf.Dispose()
    
    $curX += ($pw + 16)
}

$pillBg.Dispose()
$pillText.Dispose()
$pillBorder.Dispose()
$pillFont.Dispose()

# Bottom highlight bar: URL
$urlRect = [System.Drawing.Rectangle]::FromLTRB(60, 532, 1140, 592)
$urlBgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(235, 30, 58, 138)) # Deep blue
$gfx.FillRectangle($urlBgBrush, $urlRect)
$urlBgBrush.Dispose()

$urlBorderPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(160, 96, 165, 250), 1.5)
$gfx.DrawRectangle($urlBorderPen, $urlRect)
$urlBorderPen.Dispose()

$urlSfLeft = New-Object System.Drawing.StringFormat
$urlSfLeft.Alignment = [System.Drawing.StringAlignment]::Near
$urlSfLeft.LineAlignment = [System.Drawing.StringAlignment]::Center
$subtextBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(240, 191, 219, 254))
$fontBar = New-Object System.Drawing.Font("Segoe UI", 16, [System.Drawing.FontStyle]::Bold)
$gfx.DrawString("PM SHRI Kendriya Vidyalaya AFS Sulur", $fontBar, $subtextBrush, [System.Drawing.RectangleF]::FromLTRB(80, 532, 600, 592), $urlSfLeft)
$subtextBrush.Dispose()

$urlSfRight = New-Object System.Drawing.StringFormat
$urlSfRight.Alignment = [System.Drawing.StringAlignment]::Far
$urlSfRight.LineAlignment = [System.Drawing.StringAlignment]::Center
$goldUrlBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 254, 240, 138))
$fontUrlBig = New-Object System.Drawing.Font("Segoe UI", 17, [System.Drawing.FontStyle]::Bold)
$gfx.DrawString("https://dlms.kvsulur.in", $fontUrlBig, $goldUrlBrush, [System.Drawing.RectangleF]::FromLTRB(600, 532, 1120, 592), $urlSfRight)
$goldUrlBrush.Dispose()
$fontUrlBig.Dispose()
$fontBar.Dispose()
$urlSfLeft.Dispose()
$urlSfRight.Dispose()

# Save JPEG at 88 quality
$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" }
$encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
$encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]88)

$outBanner = "public/logos/kv-library-banner.jpg"
$bmp.Save($outBanner, $codec, $encoderParams)

# Also save as root og-image.jpg
$outOgImage = "public/og-image.jpg"
$bmp.Save($outOgImage, $codec, $encoderParams)

# Also overwrite kv-banner.jpg
$outMainBanner = "public/logos/kv-banner.jpg"
$bmp.Save($outMainBanner, $codec, $encoderParams)

# Pure library photo (1200x630 crop)
$photoBmp = New-Object System.Drawing.Bitmap(1200, 630)
$photoGfx = [System.Drawing.Graphics]::FromImage($photoBmp)
$photoGfx.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$photoHero = [System.Drawing.Image]::FromFile($heroPath)
$photoGfx.DrawImage($photoHero, 0, 0, 1200, 630)
$photoHero.Dispose()
$photoGfx.Dispose()

$photoOut = "public/logos/kv-library-photo.jpg"
$photoBmp.Save($photoOut, $codec, $encoderParams)
$photoBmp.Dispose()

$gfx.Dispose()
$bmp.Dispose()

Write-Host "Success!"
Write-Host "Generated banner: $((Get-Item $outBanner).Length) bytes"
Write-Host "Generated photo: $((Get-Item $photoOut).Length) bytes"
