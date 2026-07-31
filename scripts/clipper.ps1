$Base = "http://localhost:3001/api"

function New-ClipJob($url) {
  Invoke-RestMethod -Uri "$Base/jobs" -Method Post -ContentType "application/json" `
    -Body (@{ sourceUrl = $url } | ConvertTo-Json)
}
function Get-ClipJob($id)   { Invoke-RestMethod "$Base/jobs/$id" }
function Get-ClipJobs       { Invoke-RestMethod "$Base/jobs" | Format-Table id, name, state, failed_stage }
function Retry-ClipJob($id) { Invoke-RestMethod "$Base/jobs/$id/retry" -Method Post }
function Watch-ClipJob($id) {
  while ($true) {
    $j = Get-ClipJob $id
    $line = $j.state
    if ($j.error) { $line = $line + ' - ' + $j.error }
    Write-Host $line
    if ($j.state -eq 'awaiting_review' -or $j.state -eq 'failed') { break }
    Start-Sleep 3
  }
}
function Rename-ClipJob($id, $name) {
  Invoke-RestMethod -Uri "$Base/jobs/$id" -Method Patch -ContentType "application/json" `
    -Body (@{ name = $name } | ConvertTo-Json)
}