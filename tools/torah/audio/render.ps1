param([int]$Limit=12,[int]$Shard=0,[int]$Shards=1,[switch]$AllowExperimental)
$ErrorActionPreference='Stop'
if($Shards -lt 1 -or $Shard -lt 0 -or $Shard -ge $Shards -or $Limit -lt 0){throw 'Invalid shard or limit'}
$key=[Environment]::GetEnvironmentVariable('GOOGLE_TTS_API_KEY','User')
if (!$key) {$key=$env:GOOGLE_TTS_API_KEY}
if (!$key) {throw 'Google speech API key unavailable'}
$rows=Get-Content -Raw -LiteralPath "$PSScriptRoot/plan.json" | ConvertFrom-Json
if($Limit -eq 0 -and @($rows | Where-Object experimental).Count -and !$AllowExperimental){throw 'Experimental Hebrew policy: use a limited pilot before full synthesis.'}
New-Item -ItemType Directory -Force "$PSScriptRoot/clips" | Out-Null
if ($Limit -gt 0) {$rows=$rows | Select-Object -First $Limit}
$i=0; $rows=@($rows | Where-Object {($script:i++ % $Shards) -eq $Shard})
$count=0
foreach($r in $rows){
 $started=[DateTime]::UtcNow
 $out=Join-Path $PSScriptRoot $r.path
 $sidecar="$out.json"
 New-Item -ItemType Directory -Force (Split-Path $out -Parent) | Out-Null
 if ((Test-Path $out) -and (Test-Path $sidecar)) { $old=Get-Content -Raw $sidecar | ConvertFrom-Json; if ($old.fingerprint -eq $r.fingerprint -and (Get-Item $out).Length -gt 0 -and (Get-FileHash $out -Algorithm SHA256).Hash.ToLower() -eq $old.audioSha256) {continue} }
 $body=@{input=@{text=$r.text};voice=@{languageCode=$(if($r.lang -eq 'he'){'he-IL'}else{'en-US'});name=$r.voice};audioConfig=@{audioEncoding='MP3';sampleRateHertz=24000}} | ConvertTo-Json -Depth 5 -Compress
 $response=$null
 for($attempt=0;$attempt -lt 4;$attempt++){
  try {$response=Invoke-RestMethod -Method Post -Uri 'https://texttospeech.googleapis.com/v1/text:synthesize' -Headers @{'X-Goog-Api-Key'=$key} -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes($body)) -TimeoutSec 90; break}
  catch {if($attempt -eq 3){throw "Synthesis failed for $($r.id): $($_.Exception.Message)"}; Start-Sleep -Seconds ([Math]::Pow(2,$attempt+1))}
 }
 $bytes=[Convert]::FromBase64String($response.audioContent)
 if($bytes.Length -lt 100){throw "Empty audio for $($r.id)"}
 [IO.File]::WriteAllBytes("$out.tmp",$bytes); Move-Item -LiteralPath "$out.tmp" -Destination $out -Force
 @{id=$r.id;fingerprint=$r.fingerprint;voice=$r.voice;spokenText=$r.text;audioSha256=(Get-FileHash $out -Algorithm SHA256).Hash.ToLower();status='pending-asr-and-listening';generatedUtc=[DateTime]::UtcNow.ToString('o')} | ConvertTo-Json | Set-Content -Encoding utf8 $sidecar
 $count++; if($count % 10 -eq 0){Write-Output "Generated $count new clips; latest $($r.id)"}
 $delay=4-([DateTime]::UtcNow-$started).TotalSeconds
 if($delay -gt 0){Start-Sleep -Milliseconds ([int]($delay*1000))}
}
Write-Output "Generated $count new clips. All are pending verification."
