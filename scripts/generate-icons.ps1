Add-Type -AssemblyName System.Drawing
$iconDirectory = Join-Path $PSScriptRoot '../icons'
foreach ($entry in @(@('icon-192.png', 192), @('icon-512.png', 512), @('icon-maskable-512.png', 512), @('apple-touch-icon.png', 180))) {
    $size = [int]$entry[1]
    $bitmap = New-Object System.Drawing.Bitmap($size, $size)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.ScaleTransform(($size / 512.0), ($size / 512.0))
    $green = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#4c7565'))
    $white = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#f7f8f5'))
    $gold = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#d6ad59'))
    $graphics.Clear($green.Color)
    $shape = New-Object System.Drawing.Drawing2D.GraphicsPath
    $shape.AddArc(116, 132, 64, 64, 180, 90)
    $shape.AddArc(332, 132, 64, 64, 270, 90)
    $shape.AddArc(332, 328, 64, 64, 0, 90)
    $shape.AddArc(116, 328, 64, 64, 90, 90)
    $shape.CloseFigure()
    $graphics.FillPath($white, $shape)
    $line = New-Object System.Drawing.Pen($green, 16)
    $graphics.DrawLine($line, 116, 206, 396, 206)
    $binding = New-Object System.Drawing.Pen($white, 20)
    $binding.StartCap = $binding.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $graphics.DrawLine($binding, 184, 114, 184, 156)
    $graphics.DrawLine($binding, 328, 114, 328, 156)
    $graphics.FillEllipse($gold, 176, 252, 60, 60)
    $rays = New-Object System.Drawing.Pen($gold, 8)
    $rays.StartCap = $rays.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $graphics.DrawLine($rays, 206, 237, 206, 227)
    $graphics.DrawLine($rays, 206, 327, 206, 337)
    $graphics.DrawLine($rays, 161, 282, 151, 282)
    $graphics.DrawLine($rays, 251, 282, 261, 282)
    $graphics.FillEllipse($green, 273, 259, 80, 80)
    $graphics.FillEllipse($white, 297, 247, 68, 68)
    $bitmap.Save((Join-Path $iconDirectory $entry[0]), [System.Drawing.Imaging.ImageFormat]::Png)
    foreach ($resource in @($rays, $binding, $line, $shape, $green, $white, $gold, $graphics, $bitmap)) { $resource.Dispose() }
}
