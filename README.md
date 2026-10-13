# Fortics IA Content Extractor & Organizer

Uma suíte de automação em duas etapas (JavaScript + PowerShell) para **extrair em massa, organizar e validar** conteúdos (textos e imagens) da plataforma **Fortics IA / Genier**.

---

## 🧩 Contexto — o modelo de conteúdo do Fortics IA

Este projeto é **específico da plataforma Fortics IA / Genier**. Entender o modelo de dados da plataforma é o que dá sentido à ferramenta.

O Fortics IA se apoia em quatro pilares: **Conteúdos**, **Base de Conhecimento**, **Agentes** e **Workflow**.

- **Conteúdos** são a **matéria-prima**. Ficam organizados em **Fontes de Dados**, criadas no menu **Meus Conteúdos**. Cada Fonte agrupa os materiais de um tema/processo — textos online, arquivos (PDF, imagens, Office), conteúdo estruturado (CSV/SQL), páginas Web, vídeos do YouTube e mídias por URL.
- **Base de Conhecimento** reúne conteúdos selecionados em um contexto (ex.: Suporte, Comercial).
- **Agentes** respondem consultando apenas as Bases de Conhecimento associadas a eles.

Em resumo: os **materiais** cadastrados nas fontes viram **conhecimento** que os **agentes** consomem.

> Referências oficiais: [Entendendo o Fortics IA](https://docs.fortics.com.br/gestao-and-operacao/gestao-do-ecossistema/entendendo-o-fortics-ia.md) · [Como adicionar conteúdos](https://docs.fortics.com.br/gestao-and-operacao/tutoriais/fortics-ia/gerenciando-conteudo/como-adicionar-conteudos-na-fortics-ia.md).

## 🚀 O problema

A tela **Meus Conteúdos** (`https://app.genier.ai/{tenant}/sources/`) lista as **Fontes de Dados** com os materiais já **em produção**. A plataforma **não oferece exportação em lote**: para tirar um backup (ou migrar) desses materiais é preciso abrir cada fonte, clicar em cada texto/imagem e salvar um por um — dezenas (às vezes centenas) de cliques, sem nenhum controle de integridade sobre o que foi ou não baixado.

Foi exatamente essa limitação que motivou este projeto.

## 💡 A solução

Uma automação em duas etapas que transforma esse trabalho manual em um único comando:

1. **Extrator JS** (`src/fortics_extractor.js`): um script de console que simula a navegação humana, percorre as Fontes de Dados, baixa todos os materiais sequencialmente e gera um "mapa" (`relatorio_fortics.json`).
2. **Organizador PowerShell** (`src/organize_and_validate.ps1`): lê o mapa JSON, recria a exata estrutura de Fontes localmente, move os arquivos baixados e valida a integridade para garantir que nada foi perdido.

### O que o extrator faz, por baixo dos panos

1. Ajusta a paginação nativa da tela para exibir **50 itens** por página.
2. Percorre **cada Fonte de Dados** (o script a chama de "pasta" no relatório).
3. Para **imagens/materiais**: abre o preview e baixa o arquivo exibido (`img[src*="file_content"]`).
4. Para **textos online**: abre o editor e captura o título (`input[name="name"]`) e o corpo (`textarea[name="content"]`).
5. Fecha o modal e retorna à raiz de conteúdos para processar a próxima Fonte.
6. Ao final, gera o `relatorio_fortics.json` — usado pela etapa 2 para reorganizar e conferir tudo localmente.

> Escopo — **limitado a 2 tipos**: o utilitário extrai **textos online** e **imagens**. Documentos (PDF/Office), áudio/vídeo por upload, conteúdo estruturado (CSV/SQL), Web, YouTube e mídias por URL **não são extraídos**. Veja [Limitações conhecidas](#-limitações-conhecidas).

---

## ⚙️ Requisitos

- Navegador Chromium/Firefox com Developer Tools.
- PowerShell 5.1 ou superior (Windows).
- Permissão concedida pelo navegador para **download de múltiplos arquivos**.

---

## 🛠️ Como usar

### Passo 1 — Extração (Navegador)

1. Acesse sua conta na plataforma Fortics IA / Genier e navegue até **Meus Conteúdos** (as Fontes de Dados) em `https://app.genier.ai/{seu-tenant}/sources/`.
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

### O que é extraído (e o que fica de fora)

O script foi feito para os **dois únicos tipos de material legíveis/renderizáveis na tela**: textos online e imagens. Todos os demais tipos de conteúdo da Fonte de Dados **não são exportados**.

| Tipo de material | Aba | Extraído? | Motivo |
| --- | --- | :---: | --- |
| Texto online (digitado/editado) | Arquivos | ✅ `.txt` | Lido do editor (`input[name="name"]` + `textarea[name="content"]`). |
| Imagem (com preview) | Arquivos | ✅ imagem | Baixada do preview (`img[src*="file_content"]`). |
| Documentos (PDF, DOC/DOCX, XLS/XLSX, PPT/PPTX) | Arquivos | ❌ | Não têm preview de imagem nem `textarea`; a linha não é capturada. |
| Áudio/vídeo por upload | Arquivos | ❌ | Sem preview/`textarea` acessível ao script. |
| Estruturado (CSV/SQL) | Estruturado | ❌ | É referência/consulta, não um arquivo baixável na tela. |
| Páginas Web | Web | ❌ | Referência (URL), não conteúdo armazenado. |
| Vídeos do YouTube | YouTube | ❌ | Referência (URL). |
| Áudio e vídeo por URL | Áudio e Vídeo | ❌ | Referência (URL externa). |

> Conclusão: **não é um backup completo da Fonte de Dados** — apenas dos **textos online** e **imagens**.

### Limitações técnicas

- Depende de seletores CSS e do atributo `hx-get` da interface atual; mudanças no layout da plataforma podem exigir ajustes.
- O nome/extensão do arquivo de imagem vem da URL do preview (`hx-get`); eventualmente a extensão pode faltar ou vir incorreta.
- Textos são salvos como `.txt` simples, sem preservar formatação, anexos ou links originais.
- Os tempos de espera (`sleep`) são fixos e conservadores: em conexões lentas pode haver timeout; em conexões rápidas a extração fica mais lenta que o necessário.
- Extração **sequencial**: uma falha pontual é registrada e o script continua, mas itens podem ser pulados — o `relatorio_fortics.json` indica o que era esperado em cada Fonte.
- Exige **sessão autenticada** no navegador com a aba aberta; **não usa a API** da plataforma.
- A retomada é **manual**, ajustando `startPasta`/`startArquivo` no topo do script.

---

## 📜 Licença

Distribuído sob a licença MIT. Veja [LICENSE](LICENSE).

Autor: [@NosferaLuk](https://github.com/NosferaLuk)
