# Quick Start Testing Script
# Run this in PowerShell to test the system

Write-Host "=== Synthetic Data Generation System - Quick Test ===" -ForegroundColor Green

# Step 1: Check if services are running
Write-Host "`n1. Checking services..." -ForegroundColor Yellow

# Check Redis
try {
    docker exec synthetic_data_redis redis-cli ping | Out-Null
    Write-Host "✓ Redis is running" -ForegroundColor Green
} catch {
    Write-Host "✗ Redis is NOT running. Run: docker-compose up -d" -ForegroundColor Red
    exit 1
}

# Check Qdrant
try {
    $response = Invoke-RestMethod -Uri "http://localhost:6333/health" -Method GET
    if ($response.status -eq "ok") {
        Write-Host "✓ Qdrant is running" -ForegroundColor Green
    }
} catch {
    Write-Host "✗ Qdrant is NOT running. Run: docker-compose up -d" -ForegroundColor Red
    exit 1
}

# Check Web API
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8000/docs" -Method GET -ErrorAction SilentlyContinue
    Write-Host "✓ Web API is running" -ForegroundColor Green
} catch {
    Write-Host "✗ Web API is NOT running. Start it with: uvicorn web_api.main:app --reload" -ForegroundColor Red
    exit 1
}

Write-Host "`n2. Environment variables..." -ForegroundColor Yellow
if ($env:OPENAI_API_KEY) {
    Write-Host "✓ OPENAI_API_KEY is set" -ForegroundColor Green
} else {
    Write-Host "✗ OPENAI_API_KEY is NOT set" -ForegroundColor Red
    Write-Host "  Set it with: `$env:OPENAI_API_KEY='your-key'" -ForegroundColor Yellow
    exit 1
}

# Step 2: Create a test project
Write-Host "`n3. Creating test project..." -ForegroundColor Yellow

$projectBody = @{
    project_title = "Test Fiction Project $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
    project_description = "Automated test project"
    main_data_type = "fiction"
} | ConvertTo-Json

try {
    $project = Invoke-RestMethod -Uri "http://localhost:8000/projects/" `
        -Method POST `
        -Body $projectBody `
        -ContentType "application/json"
    
    $projectId = $project.id
    Write-Host "✓ Created project: $projectId" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed to create project: $_" -ForegroundColor Red
    exit 1
}

# Step 3: Instructions for file upload
Write-Host "`n4. Next steps:" -ForegroundColor Yellow
Write-Host "   a. Upload a PDF file to the project using your file upload endpoint" -ForegroundColor Cyan
Write-Host "   b. Get the document ID" -ForegroundColor Cyan
Write-Host ""
Write-Host "   Then run this to start processing:" -ForegroundColor Cyan
Write-Host ""
Write-Host "   `$body = @{" -ForegroundColor White
Write-Host "       project_id = '$projectId'" -ForegroundColor White
Write-Host "       document_ids = @('your-document-id-here')" -ForegroundColor White
Write-Host "   } | ConvertTo-Json" -ForegroundColor White
Write-Host ""
Write-Host "   `$response = Invoke-RestMethod -Uri 'http://localhost:8000/processing/start' ``" -ForegroundColor White
Write-Host "       -Method POST ``" -ForegroundColor White
Write-Host "       -Body `$body ``" -ForegroundColor White
Write-Host "       -ContentType 'application/json'" -ForegroundColor White
Write-Host ""
Write-Host "   Monitor at: http://localhost:5555" -ForegroundColor Cyan
Write-Host ""
Write-Host "Project ID: $projectId" -ForegroundColor Green
Write-Host ""
Write-Host "=== System is ready! ===" -ForegroundColor Green
