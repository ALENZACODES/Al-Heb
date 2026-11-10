param([int]$Limit=0,[int]$Shard=0,[int]$Shards=1)
# Sends plan.json to Google Chirp, one verse and voice per request, and saves clips/<id>.mp3 with a .json sidecar.
# Reruns skip a clip whose fingerprint and audio hash still match. Key: GOOGLE_TTS_API_KEY (user or process environment).
#   powershell -ExecutionPolicy Bypass -File render.ps1              every request in plan.json
#   powershell -ExecutionPolicy Bypass -File render.ps1 -Limit 6     the first six only
$ErrorActionPreference='Stop'
if($Shards -lt 1 -or $Shard -lt 0 -or $Shard -ge $Shards -or $Limit -lt 0){throw 'Invalid shard or limit'}
$key=[Environment]::GetEnvironmentVariable('GOOGLE_TTS_API_KEY','User')
if (!$key) {$key=$env:GOOGLE_TTS_API_KEY}
if (!$key) {throw 'Set GOOGLE_TTS_API_KEY first'}
$rows=Get-Content -Raw -Encoding UTF8 -LiteralPath "$PSScriptRoot/plan.json" | ConvertFrom-Json
if ($Limit -gt 0) {$rows=$rows | Select-Object -First $Limit}
$i=0; $rows=@($rows | Where-Object {($script:i++ % $Shards) -eq $Shard})
New-Item -ItemType Directory -Force "$PSScriptRoot/clips" | Out-Null
$count=0; $skipped=0; $failed=0
foreach($r in $rows){
 $started=[DateTime]::UtcNow
 $out=Join-Path $PSScriptRoot $r.path
 $sidecar="$out.json"
 if ((Test-Path $out) -and (Test-Path $sidecar)) { $old=Get-Content -Raw -Encoding UTF8 $sidecar | ConvertFrom-Json; if ($old.fingerprint -eq $r.fingerprint -and (Get-FileHash $out -Algorithm SHA256).Hash.ToLower() -eq $old.audioSha256) {$skipped++; continue} }
 $body=@{input=$r.input;voice=@{languageCode=$r.languageCode;name=$r.voice};audioConfig=@{audioEncoding='MP3';sampleRateHertz=24000}} | ConvertTo-Json -Depth 8 -Compress
 $response=$null
 for($attempt=0;$attempt -lt 4;$attempt++){
  try {$response=Invoke-RestMethod -Method Post -Uri 'https://texttospeech.googleapis.com/v1/text:synthesize' -Headers @{'X-Goog-Api-Key'=$key} -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes($body)) -TimeoutSec 90; break}
  catch {
   $why="$($_.ErrorDetails.Message) $($_.Exception.Message)" -replace '\s+',' '
   if($attempt -eq 3){Write-Output "FAILED $($r.id): $why"; $failed++; break}
   Start-Sleep -Seconds ([Math]::Pow(2,$attempt+2))
  }
 }
 if(!$response){continue}
 $bytes=[Convert]::FromBase64String($response.audioContent)
 if($bytes.Length -lt 100){throw "Empty audio for $($r.id)"}
 [IO.File]::WriteAllBytes("$out.tmp",$bytes); Move-Item -LiteralPath "$out.tmp" -Destination $out -Force
 @{id=$r.id;fingerprint=$r.fingerprint;voice=$r.voice;audioSha256=(Get-FileHash $out -Algorithm SHA256).Hash.ToLower();generatedUtc=[DateTime]::UtcNow.ToString('o')} | ConvertTo-Json | Set-Content -Encoding utf8 $sidecar
 $count++; if($count % 25 -eq 0){Write-Output "$count new clips; latest $($r.id)"}
 $delay=1-([DateTime]::UtcNow-$started).TotalSeconds
 if($delay -gt 0){Start-Sleep -Milliseconds ([int]($delay*1000))}
}
Write-Output "Done: $count new clips, $skipped already there, $failed failed."
if($failed -gt 0){exit 1}
