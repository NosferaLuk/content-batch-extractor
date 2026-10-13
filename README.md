# Fortics IA Content Extractor & Organizer

Uma suíte de automação em duas etapas (JavaScript + PowerShell) para **extrair em massa, organizar e validar** conteúdos (textos e imagens) da plataforma **Fortics IA / Genier**.

---

## 🚀 O problema

Na plataforma **Fortics IA / Genier**, todo o conteúdo que já está **em produção** fica na tela de **Fontes** — `https://app.genier.ai/{tenant}/sources/`, acessível pelo menu **Meus conteúdos**.

A plataforma **não oferece exportação em lote**. Para tirar um backup (ou migrar) desse conteúdo, é preciso abrir cada pasta, clicar em cada texto ou imagem e salvar arquivo por arquivo manualmente — dezenas (às vezes centenas) de cliques, sem nenhum controle de integridade sobre o que foi ou não baixado.

Foi exatamente essa limitação que motivou este projeto.

## 💡 A solução

Uma automação em duas etapas que transforma esse trabalho manual em um único comando:

1. **Extrator JS** (`src/fortics_extractor.js`): um script de console que simula a navegação humana, mapeia a estrutura de pastas, baixa todos os arquivos sequencialmente e gera um "mapa" (`relatorio_fortics.json`).
2. **Organizador PowerShell** (`src/organize_and_validate.ps1`): lê o mapa JSON, recria a exata estrutura de pastas localmente, move os arquivos baixados e valida a integridade para garantir que nada foi perdido.

### O que o extrator faz, por baixo dos panos

1. Ajusta a paginação nativa da tela para exibir **50 itens** por página.
2. Percorre **cada pasta** de conteúdo.
3. Para **imagens**: abre o preview da imagem e baixa o arquivo exibido (`img[src*="file_content"]`).
4. Para **textos**: abre o editor e captura o título (`input[name="name"]`) e o corpo (`textarea[name="content"]`).
5. Fecha o modal e retorna à raiz de conteúdos para processar a próxima pasta.
6. Ao final, gera o `relatorio_fortics.json` — usado pela etapa 2 para reorganizar e conferir tudo localmente.

---

## ⚙️ Requisitos

- Navegador Chromium/Firefox com Developer Tools.
- PowerShell 5.1 ou superior (Windows).
- Permissão concedida pelo navegador para **download de múltiplos arquivos**.

---

## 🛠️ Como usar

### Passo 1 — Extração (Navegador)

1. Acesse sua conta na plataforma Fortics IA / Genier e navegue até a tela de **Fontes / Meus conteúdos** (`https://app.genier.ai/{seu-tenant}/sources/`).
2. Pressione `F12` para abrir o Developer Tools e acesse a aba **Console**.
3. Copie o conteúdo de `src/fortics_extractor.js` e cole no console.
4. Pressione `Enter`. O script começará a iterar sobre as pastas e baixar os arquivos.
5. Ao final, ele baixará automaticamente o arquivo `relatorio_fortics.json`.

> **Nota:** permita o download de múltiplos arquivos quando o navegador solicitar.

### Passo 2 — Organização (Computador)

1. Copie o script `src/organize_and_validate.ps1` e o `relatorio_fortics.json` para a mesma pasta onde os arquivos foram baixados (geralmente a pasta *Downloads*).
2. No PowerShell, execute:

   ```powershell
   .\organize_and_validate.ps1
   ```

   Ou informe outra pasta de downloads:

   ```powershell
   .\organize_and_validate.ps1 -PastaDownloads "C:\Users\voce\Downloads"
   ```

3. O script criará as pastas e moverá os arquivos para seus devidos lugares, exibindo um relatório de sucesso/falha no terminal.

> Caso a execução de scripts esteja bloqueada, rode uma vez:
> `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`

---

## 📄 Formato do relatório

O `relatorio_fortics.json` gerado pelo extrator tem esta estrutura:

```json
[
  {
    "pasta": "NomeDaPasta",
    "arquivosEsperados": ["arquivo1.txt", "imagem.png"]
  }
]
```

---

## ⚙️ Configurações avançadas (retomada)

Se a internet cair ou a extração for interrompida no navegador, altere as variáveis no topo do `src/fortics_extractor.js` para retomar de onde parou:

```javascript
const CONFIG = {
    startPasta: 0,    // Índice da pasta para iniciar (0 = primeira)
    startArquivo: 0,  // Índice do arquivo para iniciar (0 = primeiro)
    timeoutDOM: 15000 // Tempo máximo de espera por renderização do DOM (ms)
};
```

- `startPasta`: mude para o índice da última pasta acessada.
- `startArquivo`: mude para o índice do último arquivo processado.

---

## 📁 Estrutura do repositório

```
.
├── src/
│   ├── fortics_extractor.js       # Etapa 1: extração no navegador
│   └── organize_and_validate.ps1  # Etapa 2: organização/validação local
├── LICENSE
├── README.md
└── .gitignore
```

---

## ⚠️ Limitações conhecidas

- Depende de seletores CSS e tempos de espera fixos da interface atual; mudanças no layout da plataforma podem exigir ajustes.
- Os tempos de espera (`sleep`) são conservadores para evitar perda de conteúdo em conexões lentas.

---

## 📜 Licença

Distribuído sob a licença MIT. Veja [LICENSE](LICENSE).

Autor: [@NosferaLuk](https://github.com/NosferaLuk)
