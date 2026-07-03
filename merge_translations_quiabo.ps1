# merge_translations_quiabo.ps1
# Mescla as traduções de quiz_pt_quiabo.json de volta no quiz.json original,
# escapa caracteres não-ASCII como \uXXXX para evitar problemas de encoding,
# e gera quiz_translated_quiabo.json e quiz_data_quiabo.js.

function Set-JsonValue($obj, $path, $value) {
    $parts = $path.Split('.')
    $curr = $obj
    
    for ($i = 0; $i -lt $parts.Count - 1; $i++) {
        $part = $parts[$i]
        if ($part -match '^([^\[]+)\[(\d+)\]$') {
            $prop = $Matches[1]
            $idx = [int]$Matches[2]
            $curr = $curr.$prop[$idx]
        } else {
            $curr = $curr.$part
        }
    }
    
    $lastPart = $parts[-1]
    if ($lastPart -match '^([^\[]+)\[(\d+)\]$') {
        $prop = $Matches[1]
        $idx = [int]$Matches[2]
        $curr.$prop[$idx] = $value
    } else {
        $curr.$lastPart = $value
    }
}

function ConvertTo-AsciiEscapedJson($string) {
    $sb = New-Object System.Text.StringBuilder
    foreach ($char in $string.ToCharArray()) {
        $val = [int]$char
        if ($val -gt 127) {
            $hex = $val.ToString("x4")
            [void]$sb.Append("\u$hex")
        } else {
            [void]$sb.Append($char)
        }
    }
    return $sb.ToString()
}

# Usar [System.IO.File]::ReadAllText para leitura segura de arquivos UTF-8
$quizOriginalPath = "quiz.json"
if (-not (Test-Path $quizOriginalPath)) {
    Write-Error "Arquivo original quiz.json não encontrado!"
    exit 1
}
$quiz = [System.IO.File]::ReadAllText((Resolve-Path $quizOriginalPath), [System.Text.Encoding]::UTF8) | ConvertFrom-Json

$quizPtPath = "quiz_pt_quiabo.json"
if (-not (Test-Path $quizPtPath)) {
    Write-Error "Arquivo de traduções quiz_pt_quiabo.json não encontrado!"
    exit 1
}
$translations = [System.IO.File]::ReadAllText((Resolve-Path $quizPtPath), [System.Text.Encoding]::UTF8) | ConvertFrom-Json

$count = 0
foreach ($prop in $translations.psobject.properties) {
    $path = $prop.Name
    $value = $prop.Value
    
    try {
        Set-JsonValue $quiz $path $value
        $count++
    } catch {
        Write-Warning "Falha ao aplicar tradução no caminho: $path. Erro: $_"
    }
}

# Converter para JSON
$jsonString = ConvertTo-Json -InputObject $quiz -Depth 100

# Escapar todos os caracteres não-ASCII
Write-Output "Escapando caracteres acentuados/especiais..."
$escapedJson = ConvertTo-AsciiEscapedJson $jsonString

# Salvar como ASCII puro (seguro contra qualquer erro de encoding de servidor/browser)
[System.IO.File]::WriteAllText("quiz_translated_quiabo.json", $escapedJson, [System.Text.Encoding]::ASCII)

# Envelopar e salvar quiz_data_quiabo.js
$jsString = "window.QUIZ_DATA = " + $escapedJson + ";"
[System.IO.File]::WriteAllText("quiz_data_quiabo.js", $jsString, [System.Text.Encoding]::ASCII)

Write-Output "Sucesso: $count traduções aplicadas."
Write-Output "Arquivos quiz_translated_quiabo.json e quiz_data_quiabo.js gerados com sucesso em formato 100% ASCII-escaped."
