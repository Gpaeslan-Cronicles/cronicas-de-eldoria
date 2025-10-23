// static/js/eventos_pagina.js (VERSÃO COMPLETA E MELHORADA)

document.addEventListener('DOMContentLoaded', () => {

    // Seletor unificado para TODOS os botões de minigame.
    // Ele busca por qualquer botão com a classe 'botao-minigame'.
    document.querySelectorAll('.botao-minigame').forEach(button => {
        button.addEventListener('click', (e) => {
            // Pega as informações diretamente dos atributos 'data-' do botão clicado.
            const nomeMinigame = e.target.dataset.nomeMinigame;
            const detail = {
                destino_sucesso: e.target.dataset.urlSucesso,
                destino_falha: e.target.dataset.urlFalha
            };

            let evento; // Variável para armazenar o evento customizado

            // O 'switch' direciona para o evento correto com base no nome do minigame.
            switch(nomeMinigame) {
                case 'sincronia':
                    evento = new CustomEvent('iniciarMinigameSincronia', { detail });
                    break;
                
                case 'memoria': // Supondo que você tenha um para a historia2
                    evento = new CustomEvent('iniciarMinigameMemoria', { detail });
                    break;

                case 'desfragmentacao':
                    evento = new CustomEvent('iniciarMinigameDesfrag', { detail });
                    break;

                case 'grafo_deadlock': // <- NOVO MINIGAME ADICIONADO AQUI
                    evento = new CustomEvent('iniciarMinigameGrafo', { detail });
                    break;
                
                default:
                    console.error(`Tipo de minigame desconhecido: ${nomeMinigame}`);
                    return; // Interrompe a execução se o minigame não for reconhecido
            }

            // Dispara o evento correspondente, que será "ouvido" pelo script do minigame correto.
            if (evento) {
                document.dispatchEvent(evento);
            }
        });
    });

});