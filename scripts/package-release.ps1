param([Parameter(Mandatory)][string]$Tag)
$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')
node scripts/validate-build.mjs $Tag
if ($LASTEXITCODE -ne 0) { throw 'Build validation failed.' }

$output = New-Item -ItemType Directory -Path release -Force
$archive = Join-Path $output.FullName "RoVex-$Tag.zip"
$dist = (Resolve-Path -LiteralPath dist).Path
$files = Get-ChildItem -LiteralPath $dist -File -Recurse -Force |
    Where-Object { $_.Extension -ne '.map' } |
    Sort-Object FullName
$entries = foreach ($file in $files) {
    $name = [IO.Path]::GetRelativePath($dist, $file.FullName).Replace('\', '/')
    if ($name -notmatch '^(?:[\w-]+/)*[\w.-]+\.(?:html|js|css|json|png|svg|ico|woff2?|webp|jpg)$' -or
        $file.Attributes.HasFlag([IO.FileAttributes]::ReparsePoint)) {
        throw "Unexpected release file: $name"
    }
    [pscustomobject]@{ Name = $name; Path = $file.FullName }
}
$stream = [IO.File]::Open($archive, [IO.FileMode]::Create)
try {
    $zip = [IO.Compression.ZipArchive]::new($stream, [IO.Compression.ZipArchiveMode]::Create)
    try {
        foreach ($file in $entries) {
            $entry = $zip.CreateEntry($file.Name, [IO.Compression.CompressionLevel]::Optimal)
            $entry.LastWriteTime = [DateTimeOffset]::new(2000, 1, 1, 0, 0, 0, [TimeSpan]::Zero)
            $inputFile = [IO.File]::OpenRead($file.Path)
            try {
                $entryStream = $entry.Open()
                try { $inputFile.CopyTo($entryStream) } finally { $entryStream.Dispose() }
            } finally { $inputFile.Dispose() }
        }
    } finally { $zip.Dispose() }
} finally { $stream.Dispose() }

$check = [IO.Compression.ZipFile]::OpenRead($archive)
try {
    if (!$check.GetEntry('manifest.json') -or !$check.GetEntry('popup.html') -or
        (Compare-Object @($entries.Name) @($check.Entries.FullName))) {
        throw 'Release ZIP contents do not match the validated build.'
    }
} finally { $check.Dispose() }
$hash = (Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash.ToLowerInvariant()
"$hash  $([IO.Path]::GetFileName($archive))" | Set-Content -LiteralPath "$archive.sha256" -Encoding ascii
Get-Item -LiteralPath $archive, "$archive.sha256"
