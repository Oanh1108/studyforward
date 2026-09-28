Add-Type -AssemblyName System.Speech
$engine = New-Object System.Speech.Recognition.SpeechRecognitionEngine
$engine.LoadGrammar((New-Object System.Speech.Recognition.DictationGrammar))

function Transcribe($wavPath) {
    $engine.SetInputToWaveFile($wavPath)
    $text = ""
    while ($true) {
        $result = $engine.Recognize([System.TimeSpan]::FromSeconds(3))
        if ($null -eq $result) { break }
        $text += " " + $result.Text
    }
    return $text.Trim()
}

Write-Host "Seg 2:" (Transcribe "c:\studyforward\check_seg2.wav")
Write-Host "Seg 3:" (Transcribe "c:\studyforward\check_seg3.wav")
