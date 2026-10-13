<#
.SYNOPSIS
    Organizador e Validador de Arquivos do Fortics IA.

.DESCRIPTION
    Lê o relatório 'relatorio_fortics.json' gerado pelo extrator (fortics_extractor.js),
    cria a estrutura de diretórios correspondente e move os arquivos baixados que estão
    soltos na raiz para suas respectivas pastas. Ao final, exibe um teste de integridade.

.PARAMETER PastaDownloads
    Pasta onde os arquivos foram baixados e onde está o relatorio_fortics.json.
    Padrão: diretório atual ('.').

.EXAMPLE
    .\organize_and_validate.ps1

.EXAMPLE
    .\organize_and_validate.ps1 -PastaDownloads "C:\Users\voce\Downloads"

.NOTES
    Autor: @NosferaLuk
#>

param(
    [string]$PastaDownloads = "."
)

$ErrorActionPreference = "Stop"

# Garante saída em UTF-8 (nomes e mensagens com acentos) no PowerShell 5.1
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch {}

$caminhoRelatorio = Join-Path -Path $PastaDownloads -ChildPath "relatorio_fortics.json"

# Validação de dependência
if (-not (Test-Path -LiteralPath $caminhoRelatorio)) {
    Write-Host "[ERRO] Arquivo $caminhoRelatorio não encontrado." -ForegroundColor Red
    Write-Host "Rode este script na mesma pasta dos downloads ou use -PastaDownloads." -ForegroundColor Yellow
    exit 1
}

Write-Host "--- INICIANDO ORGANIZAÇÃO E CONFERÊNCIA ---" -ForegroundColor Cyan

# Lê o JSON garantindo a codificação UTF-8 para preservação de acentos
try {
    $relatorio = Get-Content -Raw -Path $caminhoRelatorio -Encoding UTF8 | ConvertFrom-Json
}
catch {
    Write-Host "[ERRO] O relatório não é um JSON válido: $_" -ForegroundColor Red
    exit 1
}

$sucessos = 0
$falhas = 0

foreach ($item in $relatorio) {
    $pasta = $item.pasta
    $pastaDestino = Join-Path -Path $PastaDownloads -ChildPath $pasta

    # Cria a estrutura de pastas
    if (-not (Test-Path -LiteralPath $pastaDestino)) {
        New-Item -ItemType Directory -Path $pastaDestino | Out-Null
    }

    foreach ($arquivo in $item.arquivosEsperados) {
        $destinoFinal = Join-Path -Path $pastaDestino -ChildPath $arquivo

        # Mapeamento das variações de espaçamento geradas no download original
        $variacoes = @(
            (Join-Path -Path $PastaDownloads -ChildPath "$pasta - $arquivo"),
            (Join-Path -Path $PastaDownloads -ChildPath "$pasta -$arquivo"),
            (Join-Path -Path $PastaDownloads -ChildPath "$pasta- $arquivo")
        )

        $caminhoRaizEncontrado = $variacoes |
            Where-Object { Test-Path -LiteralPath $_ } |
            Select-Object -First 1

        # Fluxo 1: encontrou na raiz
        if ($caminhoRaizEncontrado) {
            if (Test-Path -LiteralPath $destinoFinal) {
                Write-Host "[AVISO] Já existe no destino, ignorando: $arquivo" -ForegroundColor DarkYellow
            }
            else {
                Move-Item -LiteralPath $caminhoRaizEncontrado -Destination $destinoFinal
                Write-Host "[MOVIDO E OK] $arquivo -> Pasta: $pasta\" -ForegroundColor Green
            }
            $sucessos++
        }
        # Fluxo 2: já foi organizado anteriormente
        elseif (Test-Path -LiteralPath $destinoFinal) {
            Write-Host "[OK] $arquivo já está organizado na pasta: $pasta\" -ForegroundColor DarkGreen
            $sucessos++
        }
        # Fluxo 3: arquivo ausente
        else {
            Write-Host "[FALHA] Ausente: $arquivo (esperado na pasta $pasta\)" -ForegroundColor Red
            $falhas++
        }
    }
}

# Sumário de execução
Write-Host "`n--- RESULTADO FINAL DE INTEGRIDADE ---" -ForegroundColor Cyan
Write-Host "Arquivos confirmados/organizados: $sucessos" -ForegroundColor Green

if ($falhas -gt 0) {
    Write-Host "Arquivos ausentes/perdidos: $falhas" -ForegroundColor Red
}
else {
    Write-Host "Integridade 100%! Missão cumprida." -ForegroundColor Yellow
}


