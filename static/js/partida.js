document.addEventListener('DOMContentLoaded', () => {
    // Pega os dados que o Flask inseriu no HTML
    const gameDataEl = document.getElementById('game-data');
    if (!gameDataEl) return;

    const gameData = JSON.parse(gameDataEl.textContent);
    const party = gameData.party;
    const pagina = gameData.pagina;
    const opcoes = pagina.opcoes;

    const overlayVotacao = document.getElementById('overlay-votacao');
    const tituloVotacao = document.getElementById('votacao-titulo');
    const nomeJogadorVotacao = document.getElementById('votacao-nome-jogador');
    const opcoesContainer = document.getElementById('votacao-opcoes-container');

    const votos = []; // Array para armazenar o voto de cada jogador

    const iniciarVotacao = () => {
        // --- LINHA CORRIGIDA AQUI ---
        // Só inicia a votação se houver MAIS DE UMA opção.
        if (!opcoes || opcoes.length <= 1) return;
        
        // Impede que os botões originais sejam clicados
        document.querySelector('.opcoes-escolha').classList.add('hidden');

        overlayVotacao.classList.remove('hidden');
        proximoVoto(0); // Começa a votação com o primeiro jogador (índice 0)
    };

    const proximoVoto = (playerIndex) => {
        if (playerIndex >= party.length) {
            finalizarVotacao();
            return;
        }

        const jogadorAtual = party[playerIndex];
        nomeJogadorVotacao.textContent = jogadorAtual.nome;
        opcoesContainer.innerHTML = ''; // Limpa as opções anteriores

        opcoes.forEach((opcao, index) => {
            const botaoVoto = document.createElement('button');
            botaoVoto.className = 'botao-escolha';
            botaoVoto.textContent = opcao.texto;
            botaoVoto.onclick = () => {
                votos.push(index); // Salva o índice da opção escolhida
                proximoVoto(playerIndex + 1); // Passa para o próximo jogador
            };
            opcoesContainer.appendChild(botaoVoto);
        });
    };

    const finalizarVotacao = () => {
        const contagemVotos = {};
        votos.forEach(voto => {
            contagemVotos[voto] = (contagemVotos[voto] || 0) + 1;
        });

        let maiorContagem = 0;
        let vencedores = [];
        for (const opcaoIndex in contagemVotos) {
            if (contagemVotos[opcaoIndex] > maiorContagem) {
                maiorContagem = contagemVotos[opcaoIndex];
                vencedores = [parseInt(opcaoIndex)];
            } else if (contagemVotos[opcaoIndex] === maiorContagem) {
                vencedores.push(parseInt(opcaoIndex));
            }
        }

        // Escolha final (com desempate aleatório se necessário)
        const escolhaFinalIndex = vencedores[Math.floor(Math.random() * vencedores.length)];
        const opcaoVencedora = opcoes[escolhaFinalIndex];

        // Atualiza a UI para mostrar o resultado
        tituloVotacao.textContent = 'Decisão do Grupo!';
        nomeJogadorVotacao.textContent = `A opção vencedora foi: "${opcaoVencedora.texto}"`;
        opcoesContainer.innerHTML = '';

        setTimeout(async () => { // Adicionamos 'async' para poder usar 'await'
    // Clica no botão original correspondente para disparar a ação
    const botoesOriginais = document.querySelectorAll('.opcoes-escolha .botao-escolha');
    botoesOriginais.forEach(botao => {
        if (botao.textContent.trim() === opcaoVencedora.texto.trim()) {
            botao.click();
        }
    });
}, 3000);
    };
// ADICIONAR ESTE BLOCO EM partida.js (antes da chamada iniciarVotacao())

const todosOsBotoesDeMinigame = document.querySelectorAll('.botao-minigame');

todosOsBotoesDeMinigame.forEach(botao => {
    botao.addEventListener('click', async () => {
        const nomeMinigame = botao.dataset.nomeMinigame;
        const urlSucesso = botao.dataset.urlSucesso;
        const urlFalha = botao.dataset.urlFalha;

        if (nomeMinigame === 'sincronia') {
            const resultado = await iniciarMinigameSincronia();
            if (resultado === 'success') {
                window.location.href = urlSucesso;
            } else {
                window.location.href = urlFalha;
            }
        }
    });
});
    // Inicia a lógica da página
    //iniciarVotacao();
});