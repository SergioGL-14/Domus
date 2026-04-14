param(
  [int]$Port = 8080,
  [switch]$OpenBrowser = $true
)

# -----------------------------------------------------------------------------
# BLOQUE 1. Preparacion
# La idea de este script es simple: entrar en la carpeta del proyecto y servir
# la web con un servidor estatico local. Para esta fase nos sobra y nos evita
# problemas tipicos al abrir el HTML directamente desde file://.
# -----------------------------------------------------------------------------

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptRoot
$siteUrl = "http://localhost:$Port"

# -----------------------------------------------------------------------------
# BLOQUE 2. Comprobacion del lanzador
# En Windows lo mas normal es tener el alias 'py'. Si no esta, pruebo con
# 'python'. Si no existe ninguno, corto aqui y lo digo claro.
# -----------------------------------------------------------------------------

$pythonLauncher = $null

if (Get-Command py -ErrorAction SilentlyContinue) {
  $pythonLauncher = "py"
} elseif (Get-Command python -ErrorAction SilentlyContinue) {
  $pythonLauncher = "python"
}

if (-not $pythonLauncher) {
  Write-Error "No encuentro Python. Instala Python o ejecuta la web con otro servidor estatico."
  exit 1
}

# -----------------------------------------------------------------------------
# BLOQUE 3. Arranque del servidor
# Si activas la opcion del navegador, te abre la URL buena para verlo ya con el
# menu, los modulos y el guardado local funcionando como toca.
# -----------------------------------------------------------------------------

Write-Host ""
Write-Host "Domus listo para arrancar en $siteUrl" -ForegroundColor Cyan
Write-Host "Pulsa Ctrl + C para cerrar el servidor." -ForegroundColor DarkGray
Write-Host ""

if ($OpenBrowser) {
  Start-Process $siteUrl | Out-Null
}

Push-Location $projectRoot
try {
  if ($pythonLauncher -eq "py") {
    & py -m http.server $Port
  } else {
    & python -m http.server $Port
  }
} finally {
  Pop-Location
}
