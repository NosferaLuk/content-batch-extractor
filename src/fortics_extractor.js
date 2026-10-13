/**
 * Fortics IA (Genier) - Content Extractor
 * Autor: @NosferaLuk
 * Descrição: Script para console do navegador que automatiza o download dos materiais
 * (textos online e arquivos/imagens) já em produção nas Fontes de Dados da plataforma
 * Fortics IA / Genier (menu "Meus Conteúdos" -> https://app.genier.ai/{tenant}/sources/).
 * Esses materiais são a matéria-prima do conhecimento consumido pelos agentes de IA.
 * A plataforma não oferece export em lote, então o script gera um relatório JSON de integridade.
 *
 * Uso: acesse a tela "Meus Conteúdos" (Fontes de Dados), abra o console (F12) e cole este script.
 */

async function baixarConteudosAvancado() {
    // ==========================================
    // CONFIGURAÇÕES
    // ==========================================
    const CONFIG = {
        startPasta: 0,    // Índice da pasta para iniciar (0 = primeira)
        startArquivo: 0,  // Índice do arquivo para iniciar (0 = primeiro)
        timeoutDOM: 15000 // Tempo máximo de espera por renderização do DOM (ms)
    };
    // ==========================================

    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const relatorioExecucao = [];

    // Função de Polling para aguardar elementos renderizarem na tela
    const aguardarElementos = async (seletor, quantidadeMinima, timeout = CONFIG.timeoutDOM) => {
        let tempo = 0;
        while (tempo < timeout) {
            if (document.querySelectorAll(seletor).length >= quantidadeMinima) {
                await sleep(1000);
                return true;
            }
            await sleep(500);
            tempo += 500;
        }
        console.warn(`[AVISO] Timeout aguardando elementos: ${seletor}`);
        return false;
    };

    // Utilitário para forçar o download via navegador
    const dispararDownload = (filename, blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const downloadTxt = (filename, text) => {
        const blob = new Blob([text], { type: 'text/plain' });
        dispararDownload(filename, blob);
    };

    const downloadImage = async (url, filename) => {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status} ao buscar ${url}`);
        const blob = await response.blob();
        dispararDownload(filename, blob);
    };

    const fecharModal = () => {
        const btnX = document.querySelector('.bi-x-lg');
        if (btnX) {
            const containerBotao = btnX.closest('label, button, a');
            (containerBotao ? containerBotao : btnX).click();
        } else {
            const breadcrumbEdicao = Array.from(document.querySelectorAll('a')).find(a => a.textContent && a.textContent.includes('Editando'));
            if (breadcrumbEdicao) breadcrumbEdicao.click();
            else window.history.back();
        }
    };

    // Ajusta a paginação nativa para exibir 50 itens, localizando o <select> correto
    const ajustarPaginacao = async () => {
        const selectPag = Array.from(document.querySelectorAll('select'))
            .find(s => Array.from(s.options).some(o => o.value === "50"));
        if (selectPag && selectPag.value !== "50") {
            selectPag.value = "50";
            selectPag.dispatchEvent(new Event('change', { bubbles: true }));
            await sleep(1000);
        }
    };

    // Linhas da tabela que representam arquivos (imagem ou texto)
    const obterLinhasArquivos = () =>
        Array.from(document.querySelectorAll('tbody tr'))
            .filter(tr => tr.querySelector('.bi-pencil') || tr.querySelector('label[hx-get*="image_view"]'));

    console.log(`🚀 Iniciando extração (Pasta Início: ${CONFIG.startPasta + 1})...`);

    try {
        await ajustarPaginacao();

        // Aguarda ao menos uma pasta renderizar (sem exigir um número fixo)
        await aguardarElementos('.bi-folder', 1);

        const totalPastas = document.querySelectorAll('.bi-folder').length;
        console.log(`📁 ${totalPastas} conteúdos totais carregados na tela.`);

        // Loop principal: percorre todas as pastas
        for (let i = CONFIG.startPasta; i < totalPastas; i++) {
            await aguardarElementos('.bi-folder', totalPastas);
            const pastasNoDom = document.querySelectorAll('.bi-folder');

            if (!pastasNoDom[i]) continue;

            pastasNoDom[i].click();
            await sleep(3500);

            // Extrai o nome limpo da pasta
            let nomePasta = `Conteudo_${i + 1}`;
            const spans = document.querySelectorAll('span.font-bold');
            const spanTitulo = Array.from(spans).find(s => s.textContent.includes('[') && s.textContent.includes(']'));

            if (spanTitulo) {
                const match = spanTitulo.textContent.match(/\[(.*?)\]/);
                if (match && match[1]) {
                    nomePasta = match[1].replace(/[\\/*?:"<>|]/g, "").trim();
                }
            }

            console.log(`-> Acessando: ${nomePasta} (${i + 1}/${totalPastas})`);

            const dadosPasta = {
                pasta: nomePasta,
                arquivosEsperados: []
            };

            const totalArquivos = obterLinhasArquivos().length;
            const jInicial = (i === CONFIG.startPasta) ? CONFIG.startArquivo : 0;

            // Loop secundário: percorre arquivos dentro da pasta
            for (let j = jInicial; j < totalArquivos; j++) {
                try {
                    const linhasArquivos = obterLinhasArquivos();
                    const trAtual = linhasArquivos[j];

                    if (!trAtual) continue;

                    const btnOlhoImagem = trAtual.querySelector('label[hx-get*="image_view"]');
                    const btnLapisTexto = trAtual.querySelector('.bi-pencil');

                    // Tratamento para imagens
                    if (btnOlhoImagem) {
                        const hxGet = btnOlhoImagem.getAttribute('hx-get');
                        const nomeImagemBruto = decodeURIComponent(hxGet.split('/').pop())
                            .replace(/[\\/*?:"<>|]/g, "").trim();
                        const nomeFinalImagem = `${nomePasta} -${nomeImagemBruto}`;

                        btnOlhoImagem.click();
                        await sleep(3500);

                        const imgTag = document.querySelector('img[src*="file_content"]');
                        if (imgTag) {
                            await downloadImage(imgTag.src, nomeFinalImagem);
                            console.log(`     [OK] Imagem baixada: ${nomeFinalImagem}`);
                            dadosPasta.arquivosEsperados.push(nomeImagemBruto);
                        } else {
                            console.warn(`     [AVISO] Imagem não encontrada na tela: ${nomeImagemBruto}`);
                        }

                        fecharModal();
                        await sleep(3000);

                    // Tratamento para textos
                    } else if (btnLapisTexto) {
                        btnLapisTexto.click();
                        await sleep(3000);

                        const inputName = document.querySelector('input[name="name"]');
                        const textAreaContent = document.querySelector('textarea[name="content"]');

                        if (inputName && textAreaContent) {
                            const nomeTextoBruto = inputName.value.replace(/[\\/*?:"<>|]/g, "").trim() || `Arquivo_${j}`;
                            const nomeFinalTexto = `${nomePasta} -${nomeTextoBruto}.txt`;

                            downloadTxt(nomeFinalTexto, textAreaContent.value);
                            console.log(`     [OK] Texto baixado: ${nomeFinalTexto}`);
                            dadosPasta.arquivosEsperados.push(`${nomeTextoBruto}.txt`);
                        } else {
                            console.warn(`     [AVISO] Conteúdo de texto não encontrado (índice ${j}).`);
                        }

                        fecharModal();
                        await sleep(3000);
                    }
                } catch (erroArquivo) {
                    console.error(`     [ERRO] Falha ao processar o arquivo ${j} da pasta "${nomePasta}":`, erroArquivo);
                    fecharModal();
                    await sleep(2000);
                }
            }

            relatorioExecucao.push(dadosPasta);

            // Retorna à raiz de conteúdos
            const linkRaiz = Array.from(document.querySelectorAll('a')).find(a => a.textContent && a.textContent.includes('Meus conteúdos'));
            if (linkRaiz) {
                linkRaiz.click();
                await sleep(2000);
                await ajustarPaginacao();
                await aguardarElementos('.bi-folder', totalPastas);
            }
        }

        // Geração do mapa de integridade
        console.log("📊 Gerando relatório JSON final...");
        const blobRelatorio = new Blob([JSON.stringify(relatorioExecucao, null, 4)], { type: 'application/json' });
        dispararDownload("relatorio_fortics.json", blobRelatorio);

        console.log("✅ Extração totalmente concluída!");
    } catch (erroFatal) {
        console.error("❌ Extração interrompida por erro fatal:", erroFatal);
        console.error("Dica: ajuste 'startPasta'/'startArquivo' em CONFIG e rode novamente para retomar.");
    }
}

baixarConteudosAvancado();
