$loginBody = @{ email = "admin@example.com"; password = "Admin123!ChangeMe" } | ConvertTo-Json
$loginResponse = Invoke-WebRequest -Uri "http://localhost:3001/api/auth/login" -Method Post -Body $loginBody -ContentType "application/json" -UseBasicParsing
Write-Host "Raw Login Response: $($loginResponse.Content)"
$json = $loginResponse.Content | ConvertFrom-Json
$token = $json.token
if (-not $token) { $token = $json.accessToken }
Write-Host "Extracted Token: $token"

$headers = @{ "Authorization" = "Bearer $token" }
try {
    $groupsResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/groups?limit=20&offset=0" -Method Get -Headers $headers
    $groupId = $groupsResponse.items[0].id
    Write-Host "Group Selected ID: $groupId"

    $childData = @{
      firstName = "Тест"
      lastName = "Дете"
      gender = "male"
      birthDate = "2017-05-12"
      groupId = $groupId
      startsOn = "2026-01-06"
      parentName = "Родител Тест"
      parentEmail = "parent.test@example.com"
      parentPhone = "0888123001"
    }
    $childBody = $childData | ConvertTo-Json
    $resp = Invoke-WebRequest -Uri "http://localhost:3001/api/children" -Method Post -Headers $headers -Body ([System.Text.Encoding]::UTF8.GetBytes($childBody)) -ContentType "application/json; charset=utf-8" -UseBasicParsing
    Write-Host "POST /api/children Status: $($resp.StatusCode)"
    Write-Host "POST /api/children Response: $($resp.Content)"
} catch {
    if ($_.Exception.Response) {
        Write-Host "Error Status: $($_.Exception.Response.StatusCode.value__)"
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Host "Error Body: $($reader.ReadToEnd())"
    } else {
        Write-Host "Exception: $($_.Exception.Message)"
    }
}
