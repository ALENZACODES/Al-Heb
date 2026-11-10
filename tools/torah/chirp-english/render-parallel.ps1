param([int]$Workers=8,[int]$Limit=0)
$ErrorActionPreference='Stop'
if($Workers -lt 1 -or $Workers -gt 8){throw 'Use 1 to 8 workers to respect speech quotas.'}
$jobs=@()
for($i=0;$i -lt $Workers;$i++){
 $jobs+=Start-ThreadJob -ArgumentList $PSScriptRoot,$Limit,$i,$Workers -ScriptBlock {
  param($root,$limit,$shard,$shards)
  & "$root/render.ps1" -Limit $limit -Shard $shard -Shards $shards
 }
}
while(@($jobs | Where-Object { $_.State -in @('NotStarted','Running') }).Count){
 $jobs | Receive-Job
 Start-Sleep -Seconds 5
}
$jobs | Receive-Job
if(@($jobs | Where-Object State -eq 'Failed').Count){throw 'One or more render workers failed; rerun to resume.'}
