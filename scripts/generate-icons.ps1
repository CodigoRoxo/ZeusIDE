Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\Purple\.gemini\antigravity\brain\7da082f3-afa9-433f-99a1-3b37a6153d3c\zeus_ide_icon_1790020576892.jpg"
$buildDir = "e:\Codes\____________Projetos\ZeusIDE\build"
$publicDir = "e:\Codes\____________Projetos\ZeusIDE\public"

if (!(Test-Path $buildDir)) { New-Item -ItemType Directory -Path $buildDir -Force }
if (!(Test-Path $publicDir)) { New-Item -ItemType Directory -Path $publicDir -Force }

$srcImg = [System.Drawing.Image]::FromFile($srcPath)

# Function to resize image to square PNG bytes
function Get-ResizedPngBytes($img, $size) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.DrawImage($img, 0, 0, $size, $size)
    $g.Dispose()

    $ms = New-Object System.IO.MemoryStream
    $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    $bytes = $ms.ToArray()
    $ms.Dispose()
    return $bytes
}

# Generate 256x256 PNG for build/icon.png and public/icon.png
$png256Bytes = Get-ResizedPngBytes $srcImg 256
[System.IO.File]::WriteAllBytes("$buildDir\icon.png", $png256Bytes)
[System.IO.File]::WriteAllBytes("$publicDir\icon.png", $png256Bytes)

# Generate 512x512 PNG for high-res build
$png512Bytes = Get-ResizedPngBytes $srcImg 512
[System.IO.File]::WriteAllBytes("$buildDir\icon-512.png", $png512Bytes)

# Sizes to include in the ICO: 256, 128, 64, 48, 32, 16
$sizes = @(256, 128, 64, 48, 32, 16)
$imgDataList = @()

foreach ($sz in $sizes) {
    $bytes = Get-ResizedPngBytes $srcImg $sz
    $imgDataList += ,@($sz, $bytes)
}

# Construct ICO binary
$icoMs = New-Object System.IO.MemoryStream
$bw = New-Object System.IO.BinaryWriter($icoMs)

# Header: reserved(2) = 0, type(2) = 1 (icon), count(2) = length
$bw.Write([uint16]0)
$bw.Write([uint16]1)
$bw.Write([uint16]$imgDataList.Count)

$offset = 6 + ($imgDataList.Count * 16)

# Write Directory Entries
foreach ($entry in $imgDataList) {
    $sz = $entry[0]
    $bytes = $entry[1]

    $w = if ($sz -ge 256) { [byte]0 } else { [byte]$sz }
    $h = if ($sz -ge 256) { [byte]0 } else { [byte]$sz }

    $bw.Write([byte]$w)            # width
    $bw.Write([byte]$h)            # height
    $bw.Write([byte]0)             # color count
    $bw.Write([byte]0)             # reserved
    $bw.Write([uint16]1)           # color planes
    $bw.Write([uint16]32)          # bit count
    $bw.Write([uint32]$bytes.Length)# image size
    $bw.Write([uint32]$offset)     # file offset

    $offset += $bytes.Length
}

# Write Image Data
foreach ($entry in $imgDataList) {
    $bytes = $entry[1]
    $bw.Write($bytes)
}

$bw.Flush()
[System.IO.File]::WriteAllBytes("$buildDir\icon.ico", $icoMs.ToArray())
[System.IO.File]::WriteAllBytes("$publicDir\icon.ico", $icoMs.ToArray())

$bw.Dispose()
$icoMs.Dispose()
$srcImg.Dispose()

Write-Output "Successfully generated icon.png and icon.ico in build/ and public/!"
