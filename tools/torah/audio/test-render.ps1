$ErrorActionPreference='Stop'
$temp=Join-Path ([IO.Path]::GetTempPath()) ('torah-render-test-'+[Guid]::NewGuid())
New-Item -ItemType Directory $temp | Out-Null
Copy-Item "$PSScriptRoot/render.ps1" "$temp/render.ps1"
@(@{id='sample';lang='he';voice='he-IL-Chirp3-HD-Charon';text='שלום';fingerprint='test';path='clips/sample.mp3'}) | ConvertTo-Json -AsArray | Set-Content "$temp/plan.json"
$global:torahRenderTestRequests=0
function global:Invoke-RestMethod {param($Method,$Uri,$Headers,$ContentType,$Body,$TimeoutSec);$global:torahRenderTestRequests++;@{audioContent=[Convert]::ToBase64String([byte[]](1..128))}}
$old=$env:GOOGLE_TTS_API_KEY;$env:GOOGLE_TTS_API_KEY='test-key'
try{
 & "$temp/render.ps1" -Limit 1
 & "$temp/render.ps1" -Limit 1
 if($global:torahRenderTestRequests -ne 1){throw 'Valid cache did not skip synthesis'}
 [IO.File]::WriteAllBytes("$temp/clips/sample.mp3",[byte[]](2..129))
 & "$temp/render.ps1" -Limit 1
 if($global:torahRenderTestRequests -ne 2){throw 'Corrupt audio was wrongly reused'}
 Write-Output 'PASS: valid audio resumes; corrupted audio regenerates without network.'
}finally{
 $env:GOOGLE_TTS_API_KEY=$old
 Remove-Item Function:\Invoke-RestMethod
 # Only remove this exact newly created test directory.
 if([IO.Path]::GetFullPath($temp).StartsWith([IO.Path]::GetFullPath([IO.Path]::GetTempPath()))){Remove-Item -LiteralPath $temp -Recurse -Force}
}

