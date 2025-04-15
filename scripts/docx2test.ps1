
if ($args.Count -lt 1) {
    Write-Host "Usage: docx2pdf.ps1 <InputDocxPath> [OutputPdfPath]"
    Write-Host "Usage from external program: powershell -ExecutionPolicy Bypass -File docx2pdf.ps1 <InputDocxPath> [OutputPdfPath]"
    exit 1
}

$inputPath = $args[0]
$outputPath = if ($args.Count -ge 2) { $args[1] } else { $null }

$inputPath = [System.IO.Path]::GetFullPath($inputPath)

if (-not $outputPath) {
    $outputPath = [System.IO.Path]::ChangeExtension($inputPath, ".pdf")
} else {
    $outputPath = [System.IO.Path]::GetFullPath($outputPath)
}

$outputHtmlPath = [System.IO.Path]::ChangeExtension($outputPath, ".html")

$word = New-Object -ComObject Word.Application

try {
    $doc = $word.Documents.Open($inputPath)
    $doc.SaveAs($outputPath, 17)
    $doc.SaveAs($outputHtmlPath, 10)
    $doc.Close()
    Write-Host "Successfully converted to: $outputPath"
}
finally {
    $word.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null
}
