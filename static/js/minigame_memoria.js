// static/js/minigame_memoria.js

document.addEventListener('DOMContentLoaded', () => {
    // Escuta por um evento personalizado que inicia o minigame
    document.addEventListener('iniciarMinigameMemoria', (e) => {
        const { destino_sucesso, destino_falha } = e.detail;
        const game = new MinigameMemoria(destino_sucesso, destino_falha);
        game.iniciar();
    });
});

class MinigameMemoria {
    constructor(urlSucesso, urlFalha) {
        this.urlSucesso = urlSucesso;
        this.urlFalha = urlFalha;

        // Configurações do Grid
        this.GRID_WIDTH = 10;
        this.GRID_HEIGHT = 15;
        this.TOTAL_CELULAS_META = 80; // Quantidade de células a preencher para vencer

        // Elementos DOM
        this.overlay = document.getElementById('overlay-minigame-memoria');
        this.gridContainer = document.getElementById('grid-memoria');
        this.proximoFragmentoContainer = document.getElementById('proximo-fragmento');
        this.barraProgresso = document.getElementById('barra-progresso');
        this.barraFragmentacao = document.getElementById('barra-fragmentacao');
        this.statusEl = document.getElementById('minigame-memoria-status');

        this.grid = Array.from({ length: this.GRID_HEIGHT }, () => Array(this.GRID_WIDTH).fill(0));
        this.celulasPreenchidas = 0;
        this.nivelFragmentacao = 0;

        // Formato dos fragmentos (peças tipo Tetris)
        this.fragmentos = [
            [[1, 1, 1, 1]], // I
            [[1, 1], [1, 1]], // O
            [[0, 1, 0], [1, 1, 1]], // T
            [[1, 0, 0], [1, 1, 1]], // J
            [[0, 0, 1], [1, 1, 1]], // L
            [[0, 1, 1], [1, 1, 0]], // S
            [[1, 1, 0], [0, 1, 1]]  // Z
        ];
        this.fragmentoAtual = null;
    }

    iniciar() {
        this.overlay.classList.remove('hidden');
        this.desenharGrid();
        this.gerarProximoFragmento();
        this.statusEl.textContent = "Posicione o primeiro fragmento.";
    }

    desenharGrid() {
        this.gridContainer.innerHTML = '';
        for (let y = 0; y < this.GRID_HEIGHT; y++) {
            for (let x = 0; x < this.GRID_WIDTH; x++) {
                const cell = document.createElement('div');
                cell.className = 'grid-cell';
                if (this.grid[y][x]) {
                    cell.classList.add('occupied', `fragmento-${this.grid[y][x] - 1}`);
                }
                cell.dataset.x = x;
                cell.dataset.y = y;
                this.gridContainer.appendChild(cell);
            }
        }
        this.adicionarListenersGrid();
    }

    gerarProximoFragmento() {
        const index = Math.floor(Math.random() * this.fragmentos.length);
        this.fragmentoAtual = {
            shape: this.fragmentos[index],
            id: index + 1
        };
        this.desenharProximoFragmento();
    }

    desenharProximoFragmento() {
    this.proximoFragmentoContainer.innerHTML = ''; // Limpa o container
    const shape = this.fragmentoAtual.shape;
    const shapeHeight = shape.length;
    const shapeWidth = shape[0].length;

    // Loop para criar a grade 4x4 completa da área de preview
    for (let y = 0; y < 4; y++) {
        for (let x = 0; x < 4; x++) {
            const cell = document.createElement('div');
            cell.className = 'grid-cell';

            // Verifica se a célula atual está dentro dos limites da forma da peça
            if (y < shapeHeight && x < shapeWidth && shape[y][x]) {
                // Se a célula faz parte da peça, colore ela
                cell.classList.add(`fragmento-${this.fragmentoAtual.id - 1}`);
            }

            this.proximoFragmentoContainer.appendChild(cell);
        }
    }
}

    adicionarListenersGrid() {
        this.gridContainer.querySelectorAll('.grid-cell').forEach(cell => {
            cell.addEventListener('click', (e) => {
                const x = parseInt(e.target.dataset.x);
                const y = parseInt(e.target.dataset.y);
                this.tentarPosicionarFragmento(x, y);
            });
        });
    }

    podePosicionar(shape, startX, startY) {
        for (let y = 0; y < shape.length; y++) {
            for (let x = 0; x < shape[y].length; x++) {
                if (shape[y][x]) {
                    const gridY = startY + y;
                    const gridX = startX + x;
                    if (gridY >= this.GRID_HEIGHT || gridX >= this.GRID_WIDTH || this.grid[gridY][gridX]) {
                        return false; // Fora do grid ou célula já ocupada
                    }
                }
            }
        }
        return true;
    }

    tentarPosicionarFragmento(startX, startY) {
        if (!this.fragmentoAtual) return;
        const { shape, id } = this.fragmentoAtual;

        if (this.podePosicionar(shape, startX, startY)) {
            // Posiciona no grid
            for (let y = 0; y < shape.length; y++) {
                for (let x = 0; x < shape[y].length; x++) {
                    if (shape[y][x]) {
                        this.grid[startY + y][startX + x] = id;
                        this.celulasPreenchidas++;
                    }
                }
            }
            this.desenharGrid();
            this.atualizarStatus();
            this.verificarCondicaoVitoria();
        } else {
            this.statusEl.textContent = "Posição inválida! Tente outro lugar.";
        }
    }
    
    atualizarStatus() {
        // Atualiza progresso
        const progresso = Math.min(100, (this.celulasPreenchidas / this.TOTAL_CELULAS_META) * 100);
        this.barraProgresso.style.width = `${progresso}%`;

        // Calcula fragmentação (simplificado: conta buracos de 1x1)
        let buracos = 0;
        for (let y = 0; y < this.GRID_HEIGHT; y++) {
            for (let x = 0; x < this.GRID_WIDTH; x++) {
                if (this.grid[y][x] === 0) { // Se a célula está vazia
                    const vizinhosOcupados = [
                        (this.grid[y-1] && this.grid[y-1][x]), // Acima
                        (this.grid[y+1] && this.grid[y+1][x]), // Abaixo
                        this.grid[y][x-1],                     // Esquerda
                        this.grid[y][x+1]                      // Direita
                    ].filter(Boolean).length;
                    if (vizinhosOcupados >= 3) buracos++; // Buraco cercado
                }
            }
        }
        this.nivelFragmentacao = buracos * 5; // Cada buraco aumenta 5% de fragmentação
        this.barraFragmentacao.style.width = `${Math.min(100, this.nivelFragmentacao)}%`;
    }

    verificarCondicaoVitoria() {
        if (this.nivelFragmentacao >= 100) {
            this.finalizar(false);
        } else if (this.celulasPreenchidas >= this.TOTAL_CELULAS_META) {
            this.finalizar(true);
        } else {
            this.gerarProximoFragmento();
            this.statusEl.textContent = "Fragmento alocado! Posicione o próximo.";
        }
    }

    finalizar(venceu) {
        if (venceu) {
            this.statusEl.textContent = "SUCESSO! A alma foi alocada com perfeição!";
            setTimeout(() => { window.location.href = this.urlSucesso; }, 2000);
        } else {
            this.statusEl.textContent = "FALHA! Memória fragmentada! A alma se corrompeu.";
            setTimeout(() => { window.location.href = this.urlFalha; }, 2000);
        }
    }
}

// Adiciona um gatilho no `livro.html` para iniciar o minigame
document.querySelectorAll('button[data-minigame-type="memoria"]').forEach(button => {
    button.addEventListener('click', () => {
        const evento = new CustomEvent('iniciarMinigameMemoria', { 
            detail: {
                destino_sucesso: button.dataset.urlSucesso,
                destino_falha: button.dataset.urlFalha
            }
        });
        document.dispatchEvent(evento);
    });
});