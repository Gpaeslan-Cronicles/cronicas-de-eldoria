// static/js/eventos_pagina.js (VERSÃO UNIFICADA E CORRIGIDA)

document.addEventListener('DOMContentLoaded', () => {

    document.querySelectorAll('.botao-minigame').forEach(button => {
        button.addEventListener('click', (e) => {
            const nomeMinigame = e.target.dataset.nomeMinigame;
            const detail = {
                destino_sucesso: e.target.dataset.urlSucesso,
                destino_falha: e.target.dataset.urlFalha
            };

            let evento;

            switch(nomeMinigame) {
                case 'sincronia':
                    evento = new CustomEvent('iniciarMinigameSincronia', { detail });
                    break;
                case 'memoria':
                    evento = new CustomEvent('iniciarMinigameMemoria', { detail });
                    break;
                case 'desfragmentacao':
                    evento = new CustomEvent('iniciarMinigameDesfrag', { detail });
                    break;
                case 'grafo_deadlock':
                    evento = new CustomEvent('iniciarMinigameGrafo', { detail });
                    break;
                default:
                    console.error(`Tipo de minigame desconhecido: ${nomeMinigame}`);
                    return;
            }

            if (evento) {
                document.dispatchEvent(evento);
            }
        });
    });

    // Adicione a lógica para os botões de teste aqui também
    document.querySelectorAll('.botao-teste').forEach(button => {
        // Se você tiver um rolagem.js que lida com isso, pode manter.
        // Se não, a lógica iria aqui.
    });
});