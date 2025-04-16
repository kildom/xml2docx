
if ($args.Count -lt 1) {
    Write-Host "Usage: docx2pdf.ps1 <InputDocxPath1> [<InputDocxPath2> ...]"
    Write-Host "Usage from external program: powershell -ExecutionPolicy Bypass -File docx2pdf.ps1 <InputDocxPath1> [<InputDocxPath2> ...]"
    exit 1
}

$word = New-Object -ComObject Word.Application
$word.Visible = $false

try {
    foreach ($inputPath in $args) {
        $fullInputPath = [System.IO.Path]::GetFullPath($inputPath)
        $outputPath = [System.IO.Path]::ChangeExtension($fullInputPath, ".pdf")
        $outputHtmlPath = [System.IO.Path]::ChangeExtension($fullInputPath, ".html")

        $doc = $word.Documents.Open($fullInputPath)
        $doc.SaveAs($outputPath, 17)       # 17 = wdFormatPDF
        $doc.SaveAs($outputHtmlPath, 10)   # 10 = wdFormatFilteredHTML
        $doc.Close()
    }
}
finally {
    $word.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null
}
