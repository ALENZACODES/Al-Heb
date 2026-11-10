param([int]$Limit=0,[int]$Shard=0,[int]$Shards=1)
$ErrorActionPreference='Stop'
if($Shards -lt 1 -or $Shard -lt 0 -or $Shard -ge $Shards -or $Limit -lt 0){throw 'Invalid shard or limit arguments.'}
$key=[Environment]::GetEnvironmentVariable('GOOGLE_TTS_API_KEY','User')
if (!$key) {$key=$env:GOOGLE_TTS_API_KEY}
if (!$key) {throw 'Google speech API key unavailable'}
$rows=Get-Content -Raw -LiteralPath "$PSScriptRoot/plan.json" | ConvertFrom-Json
New-Item -ItemType Directory -Force "$PSScriptRoot/clips" | Out-Null
if ($Limit -gt 0) {$rows=$rows | Select-Object -First $Limit}
$i=0; $rows=@($rows | Where-Object {($script:i++ % $Shards) -eq $Shard})
$count=0
foreach($r in $rows){
 if(Test-Path (Join-Path $PSScriptRoot 'PAUSE_AFTER_CURRENT')) {Write-Output 'Paused before next request.';break}
 $started=[DateTime]::UtcNow
 $out=Join-Path $PSScriptRoot $r.path
 $sidecar="$out.json"
 if ((Test-Path $out) -and (Test-Path $sidecar)) { $old=Get-Content -Raw $sidecar | ConvertFrom-Json; if ($old.fingerprint -eq $r.fingerprint -and (Get-Item $out).Length -gt 0 -and $old.audioSha256 -eq (Get-FileHash $out -Algorithm SHA256).Hash.ToLower()) {continue} }
 $ttsText=$r.text
 $response=$null
 for($attempt=0;$attempt -lt 4;$attempt++){
  $body=@{input=@{text=$ttsText};voice=@{languageCode=$(if($r.lang -eq 'he'){'he-IL'}else{'en-US'});name=$r.voice};audioConfig=@{audioEncoding='MP3';sampleRateHertz=24000}} | ConvertTo-Json -Depth 5 -Compress
  try {$response=Invoke-RestMethod -Method Post -Uri 'https://texttospeech.googleapis.com/v1/text:synthesize' -Headers @{'X-Goog-Api-Key'=$key} -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes($body)) -TimeoutSec 90; break}
  catch {
   if($_.ErrorDetails.Message -match 'sentences that are too long') {$ttsText=$r.text.Replace(';','.').Replace(':','.');Write-Output "Retrying $($r.id) with sentence breaks; words unchanged."}
   if($attempt -eq 3){@{id=$r.id;message=$_.ErrorDetails.Message} | ConvertTo-Json | Set-Content "$out.failure.json";Write-Output "Failed $($r.id); retained for retry.";break}
   Start-Sleep -Milliseconds ([int](1000*[Math]::Pow(2,$attempt+1))+(Get-Random -Minimum 0 -Maximum 1000))
  }
 }
 if(!$response){continue}
 $bytes=[Convert]::FromBase64String($response.audioContent)
 if($bytes.Length -lt 100){throw "Empty audio for $($r.id)"}
 [IO.File]::WriteAllBytes("$out.tmp",$bytes); Move-Item -LiteralPath "$out.tmp" -Destination $out -Force
 @{id=$r.id;fingerprint=$r.fingerprint;voice=$r.voice;spokenText=$ttsText;sourceText=$r.text;punctuationAdjusted=($ttsText -ne $r.text);requestTextSha256=[Convert]::ToHexString([Security.Cryptography.SHA256]::HashData([Text.Encoding]::UTF8.GetBytes($ttsText))).ToLower();audioSha256=(Get-FileHash $out -Algorithm SHA256).Hash.ToLower();status='pending-asr-and-listening';generatedUtc=[DateTime]::UtcNow.ToString('o')} | ConvertTo-Json | Set-Content -Encoding utf8 $sidecar
 $count++; if($count % 10 -eq 0){Write-Output "Generated $count new clips; latest $($r.id)"}
 $delay=4-([DateTime]::UtcNow-$started).TotalSeconds
 if($delay -gt 0){Start-Sleep -Milliseconds ([int]($delay*1000))}
}
Write-Output "Generated $count new clips. All are pending verification."
