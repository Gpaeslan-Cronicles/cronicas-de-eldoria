document.addEventListener('DOMContentLoaded', () => {
    document.addEventListener('iniciarMinigameDesfrag', (e) => {
        const { destino_sucesso, destino_falha } = e.detail;
        const game = new MinigameDesfragmentacao(destino_sucesso, destino_falha);
        game.iniciar();
    });
});

class MinigameDesfragmentacao {
    constructor(urlSucesso, urlFalha) {
        this.urlSucesso = urlSucesso;
        this.urlFalha = urlFalha;

        this.GRID_SIZE = 8;
        this.movimentosMaximos = 12;

        this.overlay = document.getElementById('overlay-minigame-desfragmentacao');
        this.gridContainer = document.getElementById('grid-vale');
        this.movimentosEl = document.getElementById('movimentos-restantes');
        this.statusEl = document.getElementById('desfrag-status');

        this.gridState = [];
        this.movimentosRestantes = this.movimentosMaximos;
        this.blocoSelecionado = null;

        // **CORREÇÃO:** Prende o 'this' ao método para que ele possa ser adicionado e removido corretamente.
        this.handleGridClick = this.handleGridClick.bind(this);
    }

    iniciar() {
        this.movimentosRestantes = this.movimentosMaximos;
        this.blocoSelecionado = null;
        this.gerarEstadoInicial();
        
        // **CORREÇÃO:** Adiciona o listener uma única vez, no contêiner principal.
        this.gridContainer.addEventListener('click', this.handleGridClick);
        
        this.desenharGrid();
        this.overlay.classList.remove('hidden');
        this.atualizarStatus(`Movimentos restantes: ${this.movimentosRestantes}`);
    }

    gerarEstadoInicial() {
    // 0 = livre, 1 = ocupado
    // Este novo mapa possui várias "ilhas" de terra fértil
    // que precisam ser conectadas, tornando o desafio real.
    this.gridState = [
        [1, 0, 1, 1, 0, 1, 0, 1],
        [0, 1, 0, 0, 1, 0, 1, 0],
        [1, 0, 1, 0, 0, 1, 0, 1],
        [1, 1, 0, 1, 1, 0, 1, 0],
        [0, 1, 0, 1, 0, 0, 1, 1],
        [1, 0, 1, 0, 1, 0, 0, 0],
        [0, 1, 0, 1, 0, 1, 1, 0],
        [1, 0, 1, 0, 1, 0, 0, 1]
    ];
}

    desenharGrid() {
        this.gridContainer.innerHTML = '';
        for (let y = 0; y < this.GRID_SIZE; y++) {
            for (let x = 0; x < this.GRID_SIZE; x++) {
                const cell = document.createElement('div');
                cell.className = 'cell-desfrag';
                cell.classList.add(this.gridState[y][x] === 0 ? 'free' : 'occupied');
                cell.dataset.x = x;
                cell.dataset.y = y;
                this.gridContainer.appendChild(cell);
            }
        }
    }

    // **CORREÇÃO:** Lógica de clique centralizada que não adiciona múltiplos listeners.
    handleGridClick(e) {
        const cell = e.target;
        if (!cell.classList.contains('cell-desfrag')) return;

        const x = parseInt(cell.dataset.x);
        const y = parseInt(cell.dataset.y);

        if (!this.blocoSelecionado) {
            if (this.gridState[y][x] === 1) { // Selecionou um bloco ocupado
                this.blocoSelecionado = { x, y };
                cell.classList.add('selected');
                this.atualizarStatus('Agora clique em um espaço livre para mover.');
            }
        } else {
            if (this.gridState[y][x] === 0) { // Clicou num espaço livre para mover
                this.movimentosRestantes--;
                
                this.gridState[y][x] = 1;
                this.gridState[this.blocoSelecionado.y][this.blocoSelecionado.x] = 0;
                
                this.blocoSelecionado = null;
                this.desenharGrid();
                
                if (this.verificarVitoria()) {
                    this.finalizar(true);
                } else if (this.movimentosRestantes <= 0) {
                    this.finalizar(false);
                } else {
                    this.atualizarStatus(`Movimento realizado! Restam ${this.movimentosRestantes}`);
                }
            } else { // Clicou em outro lugar
                this.gridContainer.querySelector('.selected')?.classList.remove('selected');
                this.blocoSelecionado = null;
                this.atualizarStatus('Seleção cancelada. Escolha um bloco de corrupção.');
            }
        }
    }

    verificarVitoria() {
        const espacosLivres = [];
        for (let y = 0; y < this.GRID_SIZE; y++) {
            for (let x = 0; x < this.GRID_SIZE; x++) {
                if (this.gridState[y][x] === 0) {
                    espacosLivres.push({x, y});
                }
            }
        }
        if (espacosLivres.length === 0) return false;

        const visitados = new Set();
        const fila = [espacosLivres[0]];
        visitados.add(`${espacosLivres[0].x},${espacosLivres[0].y}`);

        while (fila.length > 0) {
            const { x, y } = fila.shift();
            const vizinhos = [[x+1, y], [x-1, y], [x, y+1], [x, y-1]];
            for (const [nx, ny] of vizinhos) {
                if (nx >= 0 && nx < this.GRID_SIZE && ny >= 0 && ny < this.GRID_SIZE &&
                    this.gridState[ny][nx] === 0 && !visitados.has(`${nx},${ny}`)) {
                    visitados.add(`${nx},${ny}`);
                    fila.push({x: nx, y: ny});
                }
            }
        }
        return visitados.size === espacosLivres.length;
    }

    atualizarStatus(mensagem) {
        this.statusEl.textContent = mensagem;
        this.movimentosEl.textContent = this.movimentosRestantes;
    }

    finalizar(venceu) {
        // **CORREÇÃO:** Remove o listener para evitar cliques após o fim do jogo.
        this.gridContainer.removeEventListener('click', this.handleGridClick);
        
        if (venceu) {
            this.atualizarStatus("SUCESSO! O vale está desfragmentado!");
            setTimeout(() => { window.location.href = this.urlSucesso; }, 2000);
        } else {
            this.atualizarStatus("FALHA! Movimentos esgotados! A corrupção venceu.");
            setTimeout(() => { window.location.href = this.urlFalha; }, 2000);
        }
    }
}