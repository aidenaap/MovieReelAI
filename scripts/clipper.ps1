$Base = "http://localhost:3001/api"

function New-ClipJob($url) {
  Invoke-RestMethod -Uri "$Base/jobs" -Method Post -ContentType "application/json" `
    -Body (@{ sourceUrl = $url } | ConvertTo-Json)
}
function Get-ClipJob($id)   { Invoke-RestMethod "$Base/jobs/$id" }
function Get-ClipJobs       { Invoke-RestMethod "$Base/jobs" | Format-Table id, state, failed_stage }
function Retry-ClipJob($id) { Invoke-RestMethod "$Base/jobs/$id/retry" -Method Post }
function Watch-ClipJob($id) {
  while ($true) {
    $j = Get-ClipJob $id
    Write-Host "$($j.state)$(if ($j.error) { " — $($j.error)" })"
    if ($j.state -in @("awaiting_review", "failed")) { break }
    Start-Sleep 3
  }
}