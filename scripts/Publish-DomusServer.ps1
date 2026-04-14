param(
  [string]$OutputPath = "",
  [string]$Configuration = "Release"
)

# -----------------------------------------------------------------------------
# BLOQUE 1. Rutas de trabajo
# Este script prepara la version que interesa publicar en IIS cuando queremos
# que todos los equipos usen el mismo proyecto guardado en el servidor.
# -----------------------------------------------------------------------------

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptRoot
$serverProject = Join-Path $projectRoot "server\Domus.Server\Domus.Server.csproj"

if (-not $OutputPath) {
  $OutputPath = Join-Path $projectRoot "publish\Domus.Server"
}

if (-not (Test-Path -LiteralPath $serverProject)) {
  Write-Error "No encuentro el proyecto del servidor en $serverProject"
  exit 1
}

# -----------------------------------------------------------------------------
# BLOQUE 2. Comprobacion de .NET
# IIS puede servir la app estatica, pero la persistencia compartida necesita la
# API local. Para eso compilo el servidor ASP.NET Core que incluye la web.
# -----------------------------------------------------------------------------

if (-not (Get-Command dotnet -ErrorAction SilentlyContinue)) {
  Write-Error "No encuentro dotnet. Instala el SDK de .NET 8 o publica la parte estatica sin persistencia compartida."
  exit 1
}

# -----------------------------------------------------------------------------
# BLOQUE 3. Publicacion
# El resultado queda en la carpeta de salida. Esa carpeta es la que debes copiar
# o apuntar desde IIS como aplicacion ASP.NET Core.
# -----------------------------------------------------------------------------

Write-Host ""
Write-Host "Publicando Domus para IIS..." -ForegroundColor Cyan
Write-Host "Salida: $OutputPath" -ForegroundColor DarkGray
Write-Host ""

dotnet publish $serverProject -c $Configuration -o $OutputPath

if ($LASTEXITCODE -ne 0) {
  Write-Error "La publicacion ha fallado."
  exit $LASTEXITCODE
}

$appDataPath = Join-Path $OutputPath "App_Data"
New-Item -ItemType Directory -Path $appDataPath -Force | Out-Null

Write-Host ""
Write-Host "Publicacion lista." -ForegroundColor Green
Write-Host "Carpeta de datos: $appDataPath" -ForegroundColor DarkGray
Write-Host "Da permiso de escritura al usuario del App Pool sobre App_Data." -ForegroundColor Yellow
