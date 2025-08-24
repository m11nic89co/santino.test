param(
  [string]$ImageName = 'santino-probe',
  [switch]$Build,
  [string]$WorkspacePath = "G:\\My Drive\\dev\\santino"
)

# Normalize path for Docker on Windows
$mount = "$WorkspacePath:C:\workspace"

if ($Build) {
  Write-Host "Building Docker image '$ImageName'..."
  docker build -t $ImageName "$WorkspacePath"
  if ($LASTEXITCODE -ne 0) { throw "Docker build failed" }
}

Write-Host "Running Docker container (mount: $mount)..."
docker run --rm -v "$mount" -w C:\workspace $ImageName
