// static/js/minigame_grafo_deadlock.js

document.addEventListener('DOMContentLoaded', () => {
    // Escuta por um evento que o jogo principal irá disparar
    document.addEventListener('iniciarMinigameGrafo', (e) => {
        const { destino_sucesso, destino_falha } = e.detail;
        const game = new MinigameGrafoDeadlock(destino_sucesso, destino_falha);
        game.iniciar();
    });
});

class MinigameGrafoDeadlock {
    constructor(urlSucesso, urlFalha) {
        this.urlSucesso = urlSucesso;
        this.urlFalha = urlFalha; // Embora neste minigame não haja falha

        // Elementos do DOM
        this.overlay = document.getElementById('overlay-minigame-grafo');
        this.canvas = document.getElementById('grafo-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.instrucoesEl = document.getElementById('grafo-instrucoes');
        this.feedbackEl = document.getElementById('grafo-feedback');
        this.confirmarBtn = document.getElementById('grafo-confirmar-btn');

        // Estado do jogo
        this.fase = 'posse'; // 'posse' ou 'espera'
        this.nos = {};
        this.conexoes = [];
        this.noSelecionado = null;

        // Respostas corretas
        this.respostas = {
            posse: [
                { de: 'poder_fogo', para: 'pyros' },
                { de: 'poder_agua', para: 'hydor' },
                { de: 'poder_terra', para: 'lithos' },
                { de: 'poder_ar', para: 'aella' }
            ],
            espera: [
                { de: 'pyros', para: 'poder_terra' },
                { de: 'lithos', para: 'poder_ar' },
                { de: 'aella', para: 'poder_agua' },
                { de: 'hydor', para: 'poder_fogo' }
            ]
        };

        // Prende o 'this' aos métodos de evento
        this.handleClick = this.handleClick.bind(this);
        this.handleConfirmar = this.handleConfirmar.bind(this);
    }

    iniciar() {
        this.canvas.width = 600;
        this.canvas.height = 400;

        // Define a posição dos nós (Titãs e Poderes)
        this.nos = {
            pyros:  { id: 'pyros', nome: 'Pyros', tipo: 'processo', x: 100, y: 100, cor: '#E74C3C' },
            hydor:  { id: 'hydor', nome: 'Hydor', tipo: 'processo', x: 500, y: 300, cor: '#3498DB' },
            lithos: { id: 'lithos', nome: 'Lithos', tipo: 'processo', x: 100, y: 300, cor: '#964B00' },
            aella:  { id: 'aella', nome: 'Aella', tipo: 'processo', x: 500, y: 100, cor: '#BDC3C7' },

            poder_fogo:  { id: 'poder_fogo', nome: 'Fogo Primordial', tipo: 'recurso', x: 300, y: 50, cor: '#E74C3C' },
            poder_agua:  { id: 'poder_agua', nome: 'Correnteza Purif.', tipo: 'recurso', x: 300, y: 350, cor: '#3498DB' },
            poder_terra: { id: 'poder_terra', nome: 'Coração da Mont.', tipo: 'recurso', x: 50, y: 200, cor: '#964B00' },
            poder_ar:    { id: 'poder_ar', nome: 'Orbe Tempestade', tipo: 'recurso', x: 550, y: 200, cor: '#BDC3C7' },
        };

        this.fase = 'posse';
        this.conexoes = [];
        this.noSelecionado = null;

        this.canvas.addEventListener('click', this.handleClick);
        this.confirmarBtn.addEventListener('click', this.handleConfirmar);

        this.atualizarInstrucoes();
        this.desenhar();
        this.overlay.classList.remove('hidden');
    }

    atualizarInstrucoes() {
        if (this.fase === 'posse') {
            this.instrucoesEl.innerHTML = "<strong>Fase 1: Posse.</strong> Ligue cada Poder (quadrado) ao Titã (círculo) que o POSSUI.";
        } else {
            this.instrucoesEl.innerHTML = "<strong>Fase 2: Espera.</strong> Agora, ligue cada Titã ao Poder que ele está ESPERANDO para poder agir.";
        }
        this.feedbackEl.textContent = 'Selecione um nó para iniciar uma conexão.';
    }

    desenhar() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height); // Limpa o canvas

        // Desenha conexões
        this.conexoes.forEach(con => {
            const deNo = this.nos[con.de];
            const paraNo = this.nos[con.para];
            this.desenharSeta(deNo.x, deNo.y, paraNo.x, paraNo.y, con.cor || '#F1C40F', 3);
        });

        // Desenha nós
        Object.values(this.nos).forEach(no => {
            this.ctx.fillStyle = no.cor;
            this.ctx.strokeStyle = '#FDFEFE';
            this.ctx.lineWidth = 3;

            if (this.noSelecionado === no.id) {
                this.ctx.strokeStyle = '#F1C40F'; // Dourado para seleção
            }

            if (no.tipo === 'processo') { // Círculo para Titã
                this.ctx.beginPath();
                this.ctx.arc(no.x, no.y, 30, 0, 2 * Math.PI);
                this.ctx.fill();
                this.ctx.stroke();
            } else { // Quadrado para Poder
                this.ctx.fillRect(no.x - 20, no.y - 20, 40, 40);
                this.ctx.strokeRect(no.x - 20, no.y - 20, 40, 40);
            }

            // Desenha texto
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.font = '12px Cinzel';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(no.nome, no.x, no.y + (no.tipo === 'processo' ? 45 : 35));
        });
    }
    
    // Função para desenhar setas
    desenharSeta(deX, deY, paraX, paraY, cor, largura) {
        const headlen = 10;
        const dx = paraX - deX;
        const dy = paraY - deY;
        const angulo = Math.atan2(dy, dx);

        this.ctx.strokeStyle = cor;
        this.ctx.lineWidth = largura;
        this.ctx.beginPath();
        this.ctx.moveTo(deX, deY);
        this.ctx.lineTo(paraX, paraY);
        this.ctx.lineTo(paraX - headlen * Math.cos(angulo - Math.PI / 6), paraY - headlen * Math.sin(angulo - Math.PI / 6));
        this.ctx.moveTo(paraX, paraY);
        this.ctx.lineTo(paraX - headlen * Math.cos(angulo + Math.PI / 6), paraY - headlen * Math.sin(angulo + Math.PI / 6));
        this.ctx.stroke();
    }

    handleClick(event) {
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        let clicadoEmNo = null;
        for (const no of Object.values(this.nos)) {
            const distancia = Math.sqrt((x - no.x)**2 + (y - no.y)**2);
            if (distancia < (no.tipo === 'processo' ? 30 : 25)) {
                clicadoEmNo = no;
                break;
            }
        }

        if (clicadoEmNo) {
            if (!this.noSelecionado) {
                this.noSelecionado = clicadoEmNo.id;
                this.feedbackEl.textContent = `Nó '${clicadoEmNo.nome}' selecionado. Agora selecione o destino.`;
            } else {
                // Previne auto-conexão
                if (this.noSelecionado === clicadoEmNo.id) {
                    this.noSelecionado = null;
                    this.feedbackEl.textContent = 'Seleção cancelada.';
                } else {
                    const deNo = this.nos[this.noSelecionado];
                    const paraNo = clicadoEmNo;

                    // Valida a direção da conexão baseada na fase
                    if ( (this.fase === 'posse' && (deNo.tipo !== 'recurso' || paraNo.tipo !== 'processo')) ||
                         (this.fase === 'espera' && (deNo.tipo !== 'processo' || paraNo.tipo !== 'recurso')) ) {
                        this.feedbackEl.textContent = 'Conexão inválida! Observe a direção correta para esta fase.';
                        this.noSelecionado = null;
                    } else {
                        // Adiciona a conexão
                        this.conexoes.push({ de: this.noSelecionado, para: clicadoEmNo.id, cor: deNo.cor });
                        this.noSelecionado = null;
                        this.feedbackEl.textContent = 'Conexão criada! Selecione o próximo nó.';
                    }
                }
            }
        } else {
            this.noSelecionado = null;
            this.feedbackEl.textContent = 'Nenhum nó selecionado. Clique em um círculo ou quadrado.';
        }
        this.desenhar();
    }

    handleConfirmar() {
        const respostasFase = this.respostas[this.fase];
        let acertos = 0;

        if (this.conexoes.length === respostasFase.length) {
            for (const resp of respostasFase) {
                if (this.conexoes.some(con => con.de === resp.de && con.para === resp.para)) {
                    acertos++;
                }
            }
        }

        if (acertos === respostasFase.length) {
            if (this.fase === 'posse') {
                this.feedbackEl.textContent = 'Correto! Agora vamos para a próxima fase.';
                this.fase = 'espera';
                // Mantém as conexões da fase 1 para visualização
                setTimeout(() => {
                    this.conexoes = [];
                    this.atualizarInstrucoes();
                    this.desenhar();
                }, 2000);
            } else {
                this.finalizar(true);
            }
        } else {
            this.feedbackEl.textContent = 'Incorreto. As conexões não estão certas. Tente novamente.';
            this.conexoes = [];
            setTimeout(() => {
                this.feedbackEl.textContent = 'Selecione um nó para iniciar uma conexão.';
                this.desenhar();
            }, 2000);
        }
    }

    finalizar(venceu) {
        this.canvas.removeEventListener('click', this.handleClick);
        this.confirmarBtn.removeEventListener('click', this.handleConfirmar);

        if (venceu) {
            this.instrucoesEl.textContent = "O CICLO ESTÁ COMPLETO! VOCÊ ENTENDEU O DEADLOCK!";
            this.feedbackEl.textContent = 'Sucesso!';
            // Desenha todas as conexões para mostrar o ciclo completo
            this.conexoes = [
                ...this.respostas.posse.map(c => ({...c, cor: this.nos[c.para].cor})),
                ...this.respostas.espera.map(c => ({...c, cor: this.nos[c.de].cor}))
            ];
            this.desenhar();
            setTimeout(() => { window.location.href = this.urlSucesso; }, 3000);
        }
    }
}