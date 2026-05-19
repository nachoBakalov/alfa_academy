$loginManager = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/login" -Method Post -Body (@{email="smoke.manager@academy.local"; password="SmokePass123!"} | ConvertTo-Json) -ContentType "application/json"
$managerToken = $loginManager.token
$headersManager = @{Authorization="Bearer $managerToken"}

Write-Host "--- Manager ---"
# Assume academy 29 or 30 or similar based on typical sequences
foreach ($id in 25..35) {
    try {
        $resp = Invoke-WebRequest -Uri "http://localhost:3001/api/coach-academies/academies/$id/coaches" -Headers $headersManager -ErrorAction Stop
        Write-Host "Academy $id : Found!"
        $coaches = $resp.Content | ConvertFrom-Json
        if ($coaches.Count -gt 0) {
            $keys = $coaches[0].PSObject.Properties.Name -join ", "
            Write-Host "Status: $($resp.StatusCode)"
            Write-Host "Keys: $keys"
            Write-Host "password_hash: $($resp.Content.Contains('password_hash'))"
            break
        }
    } catch { }
}

$loginCoach = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/login" -Method Post -Body (@{email="smoke.coach@academy.local"; password="SmokePass123!"} | ConvertTo-Json) -ContentType "application/json"
$coachToken = $loginCoach.token
$headersCoach = @{Authorization="Bearer $coachToken"}

Write-Host "--- Coach ---"
$groups = Invoke-RestMethod -Uri "http://localhost:3001/api/coach-workspace/my-groups" -Headers $headersCoach
if ($groups.Count -gt 0) {
    $aid = $groups[0].academy_id
    Write-Host "Assigned Academy ID: $aid"
    try {
        $r2 = Invoke-WebRequest -Uri "http://localhost:3001/api/coach-academies/academies/$aid/coaches" -Headers $headersCoach
        Write-Host "Assigned Status: $($r2.StatusCode)"
    } catch { Write-Host "Assigned Error: $($_.Exception.Response.StatusCode.Value__)" }
}
try {
    $r3 = Invoke-WebRequest -Uri "http://localhost:3001/api/coach-academies/academies/25/coaches" -Headers $headersCoach
    Write-Host "Forbidden Status: $($r3.StatusCode)"
} catch { Write-Host "Forbidden Result: $(if ($_.Exception.Response) { $_.Exception.Response.StatusCode.Value__ } else { $_ })" }
