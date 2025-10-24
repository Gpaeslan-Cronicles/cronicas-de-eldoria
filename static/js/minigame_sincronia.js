// static/js/minigame_sincronia.js (VERSÃO FINAL E CORRIGIDA)

document.addEventListener('DOMContentLoaded', () => {
    // 1. Escuta pelo evento unificado que o eventos_pagina.js dispara
    document.addEventListener('iniciarMinigameSincronia', (e) => {
        const { destino_sucesso, destino_falha } = e.detail;
        const game = new MinigameSincronia(destino_sucesso, destino_falha);
        game.iniciar();
    });
});

class MinigameSincronia {
    constructor(urlSucesso, urlFalha) {
        this.urlSucesso = urlSucesso;
        this.urlFalha = urlFalha;

        // --- CAPTURA DOS ELEMENTOS ---
        this.overlay = document.getElementById('overlay-minigame-sincronia');
        this.focoQ = document.getElementById('foco-q');
        this.focoP = document.getElementById('foco-p');
        this.feedback = document.getElementById('minigame-feedback');
        this.circuloQ = document.getElementById('circulo-q');
        this.circuloP = document.getElementById('circulo-p');
        this.confirmarBtn = document.getElementById('minigame-confirmar-btn');

        // --- ESTADO DO JOGO ---
        this.gameState = {
            focoQ: { angulo: 0, velocidade: 0.4 + Math.random() * 0.2 },
            focoP: { angulo: 90, velocidade: 0.4 + Math.random() * 0.2 },
            tentativas: 3,
            raio: 0, // Será calculado no início
            jogoAtivo: true,
            animationFrameId: null
        };

        // --- BIND DOS MÉTODOS DE EVENTO ---
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleKeyUp = this.handleKeyUp.bind(this);
        this.tentarSincronia = this.tentarSincronia.bind(this);
    }

    iniciar() {
        this.overlay.classList.remove('hidden');
        this.gameState.raio = this.circuloQ.offsetWidth / 2 - 10;
        this.feedback.textContent = `Tentativas Restantes: ${this.gameState.tentativas}`;
        
        // Adiciona os listeners
        document.addEventListener('keydown', this.handleKeyDown);
        document.addEventListener('keyup', this.handleKeyUp);
        this.confirmarBtn.addEventListener('click', this.tentarSincronia);
        
        // Adiciona listeners de toque/mouse para velocidade
        this.adicionarListenersDeToque(this.circuloQ, 'focoQ');
        this.adicionarListenersDeToque(this.circuloP, 'focoP');

        this.gameLoop();
    }

    gameLoop() {
        if (!this.gameState.jogoAtivo) return;

        this.gameState.focoQ.angulo = (this.gameState.focoQ.angulo + this.gameState.focoQ.velocidade) % 360;
        this.gameState.focoP.angulo = (this.gameState.focoP.angulo + this.gameState.focoP.velocidade) % 360;

        const radQ = (this.gameState.focoQ.angulo - 90) * (Math.PI / 180);
        const radP = (this.gameState.focoP.angulo - 90) * (Math.PI / 180);

        this.focoQ.style.transform = `translateX(-50%) translateY(-50%) translate(${this.gameState.raio * Math.cos(radQ)}px, ${this.gameState.raio * Math.sin(radQ)}px)`;
        this.focoP.style.transform = `translateX(-50%) translateY(-50%) translate(${this.gameState.raio * Math.cos(radP)}px, ${this.gameState.raio * Math.sin(radP)}px)`;
        
        this.gameState.animationFrameId = requestAnimationFrame(() => this.gameLoop());
    }

    tentarSincronia() {
        if (!this.gameState.jogoAtivo) return;

        const naZonaQ = this.gameState.focoQ.angulo >= 350 || this.gameState.focoQ.angulo <= 10;
        const naZonaP = this.gameState.focoP.angulo >= 350 || this.gameState.focoP.angulo <= 10;
        
        if (naZonaQ && naZonaP) {
            this.finalizar('vitoria');
        } else {
            this.perderTentativa();
        }
    }

    perderTentativa() {
        this.gameState.tentativas--;
        this.feedback.textContent = `Tentativas Restantes: ${this.gameState.tentativas}`;
        
        this.overlay.style.animation = 'shake 0.5s';
        setTimeout(() => { this.overlay.style.animation = ''; }, 500);

        if (this.gameState.tentativas <= 0) {
            this.finalizar('derrota');
        }
    }

    finalizar(resultado) {
        this.gameState.jogoAtivo = false;
        cancelAnimationFrame(this.gameState.animationFrameId);
        
        document.removeEventListener('keydown', this.handleKeyDown);
        document.removeEventListener('keyup', this.handleKeyUp);
        this.confirmarBtn.removeEventListener('click', this.tentarSincronia);

        const urlDestino = (resultado === 'vitoria') ? this.urlSucesso : this.urlFalha;
        this.feedback.textContent = resultado === 'vitoria' ? 'SINCRONIA ALCANÇADA!' : 'RITUAL FALHOU!';
        
        setTimeout(() => {
            this.overlay.classList.add('hidden');
            window.location.href = urlDestino;
        }, 2000);
    }

    handleKeyDown(e) {
        if (!this.gameState.jogoAtivo) return;
        if (e.key.toLowerCase() === 'q') this.gameState.focoQ.velocidade += 0.2;
        if (e.key.toLowerCase() === 'p') this.gameState.focoP.velocidade += 0.2;
        if (e.key === ' ' && !e.repeat) { // Adicionado !e.repeat para evitar múltiplas chamadas
            e.preventDefault();
            this.tentarSincronia();
        }
    }
    
    handleKeyUp(e) {
        if (e.key.toLowerCase() === 'q') this.gameState.focoQ.velocidade = Math.max(0.8, this.gameState.focoQ.velocidade - 0.2);
        if (e.key.toLowerCase() === 'p') this.gameState.focoP.velocidade = Math.max(0.8, this.gameState.focoP.velocidade - 0.2);
    }

    adicionarListenersDeToque(elemento, foco) {
        elemento.addEventListener('mousedown', () => { if(this.gameState.jogoAtivo) this.gameState[foco].velocidade += 0.2; });
        elemento.addEventListener('mouseup', () => { if(this.gameState.jogoAtivo) this.gameState[foco].velocidade = Math.max(0.8, this.gameState[foco].velocidade - 0.2); });
        elemento.addEventListener('touchstart', (e) => { if(this.gameState.jogoAtivo) { e.preventDefault(); this.gameState[foco].velocidade += 0.2; }});
        elemento.addEventListener('touchend', () => { if(this.gameState.jogoAtivo) this.gameState[foco].velocidade = Math.max(0.8, this.gameState[foco].velocidade - 0.2); });
    }
}