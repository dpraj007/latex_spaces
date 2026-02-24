$ErrorActionPreference = "Stop"

function Test-CommandExists {
    param([string]$Name)
    return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

Write-Host ""
Write-Host "LaTeX Resume Editor - Environment Validation"
Write-Host "--------------------------------------------"

$failed = $false

if (Test-CommandExists "python") {
    $pythonVersion = python --version
    Write-Host "[OK] $pythonVersion"
} else {
    Write-Host "[X] Python not found"
    $failed = $true
}

if (Test-CommandExists "node") {
    $nodeVersion = node --version
    Write-Host "[OK] Node.js $nodeVersion"
} else {
    Write-Host "[X] Node.js not found"
    $failed = $true
}

if (Test-CommandExists "npm") {
    $npmVersion = npm --version
    Write-Host "[OK] npm $npmVersion"
} else {
    Write-Host "[X] npm not found"
    $failed = $true
}

$latexCompilers = @("pdflatex", "xelatex", "lualatex")
$availableCompilers = @()
foreach ($compiler in $latexCompilers) {
    if (Test-CommandExists $compiler) {
        $availableCompilers += $compiler
    }
}

if ($availableCompilers.Count -gt 0) {
    Write-Host "[OK] LaTeX compiler(s): $($availableCompilers -join ', ')"
} else {
    Write-Host "[X] No LaTeX compiler found (install MiKTeX or TeX Live)"
    $failed = $true
}

if ($failed) {
    Write-Host ""
    Write-Host "Environment check failed."
    exit 1
}

Write-Host ""
Write-Host "Environment check passed."
