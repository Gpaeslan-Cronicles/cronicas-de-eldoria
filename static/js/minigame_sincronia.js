// static/js/minigame_sincronia.js (VERSÃO COM CONFIRMAÇÃO MANUAL)

function iniciarMinigameSincronia() {
    return new Promise((resolve) => {
        // --- 1. CAPTURA DOS ELEMENTOS ---
        const overlay = document.getElementById('overlay-minigame-sincronia');
        const focoQ = document.getElementById('foco-q');
        const focoP = document.getElementById('foco-p');
        const feedback = document.getElementById('minigame-feedback');
        const circuloQ = document.getElementById('circulo-q');
        const circuloP = document.getElementById('circulo-p');
        const confirmarBtn = document.getElementById('minigame-confirmar-btn');

        overlay.classList.remove('hidden');

        let gameState = {
            focoQ: { angulo: 0, velocidade: 0.4 + Math.random() * 0.2 },
            focoP: { angulo: 90, velocidade: 0.4 + Math.random() * 0.2 },
            tentativas: 3,
            raio: circuloQ.offsetWidth / 2 - 10,
            jogoAtivo: true,
            animationFrameId: null
        };

        feedback.textContent = `Tentativas Restantes: ${gameState.tentativas}`;

        // --- 2. LOOP DE ANIMAÇÃO ---
        // Agora, o loop apenas move os focos, sem verificar a vitória.
        function gameLoop() {
            if (!gameState.jogoAtivo) return;

            gameState.focoQ.angulo = (gameState.focoQ.angulo + gameState.focoQ.velocidade) % 360;
            gameState.focoP.angulo = (gameState.focoP.angulo + gameState.focoP.velocidade) % 360;

            const radQ = (gameState.focoQ.angulo - 90) * (Math.PI / 180);
            const radP = (gameState.focoP.angulo - 90) * (Math.PI / 180);

            focoQ.style.transform = `translateX(-50%) translateY(-50%) translate(${gameState.raio * Math.cos(radQ)}px, ${gameState.raio * Math.sin(radQ)}px)`;
            focoP.style.transform = `translateX(-50%) translateY(-50%) translate(${gameState.raio * Math.cos(radP)}px, ${gameState.raio * Math.sin(radP)}px)`;
            
            gameState.animationFrameId = requestAnimationFrame(gameLoop);
        }

        // --- 3. NOVA LÓGICA DE SINCRONIZAÇÃO MANUAL ---
        function tentarSincronia() {
            if (!gameState.jogoAtivo) return;

            // Zona de acerto: Topo do círculo (entre 350 e 10 graus para dar uma margem)
            const naZonaQ = gameState.focoQ.angulo >= 350 || gameState.focoQ.angulo <= 10;
            const naZonaP = gameState.focoP.angulo >= 350 || gameState.focoP.angulo <= 10;
            
            // Se ambos estiverem na zona no momento do clique, é SUCESSO!
            if (naZonaQ && naZonaP) {
                finalizarJogo('success');
            } else {
                // Senão, perde uma tentativa
                perderTentativa();
            }
        }

        function perderTentativa() {
            gameState.tentativas--;
            feedback.textContent = `Tentativas Restantes: ${gameState.tentativas}`;
            
            // Feedback visual de erro
            overlay.style.animation = 'shake 0.5s';
            setTimeout(() => { overlay.style.animation = ''; }, 500);

            if (gameState.tentativas <= 0) {
                finalizarJogo('failure');
            }
        }

        function finalizarJogo(resultado) {
            gameState.jogoAtivo = false;
            cancelAnimationFrame(gameState.animationFrameId);
            
            // Remove os listeners para não poder mais clicar
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('keyup', handleKeyUp);
            confirmarBtn.removeEventListener('click', tentarSincronia);

            feedback.textContent = resultado === 'success' ? 'SINCRONIA ALCANÇADA!' : 'RITUAL FALHOU!';
            setTimeout(() => {
                overlay.classList.add('hidden');
                resolve(resultado);
            }, 2000);
        }

        // --- 4. CONTROLES (com a adição da Barra de Espaço) ---
        function handleKeyDown(e) {
            if (!gameState.jogoAtivo) return;
            if (e.key.toLowerCase() === 'q') gameState.focoQ.velocidade += 0.2;
            if (e.key.toLowerCase() === 'p') gameState.focoP.velocidade += 0.2;
            if (e.key === ' ') {
                e.preventDefault(); // Impede a página de rolar
                tentarSincronia();
            }
        }
        
        function handleKeyUp(e) {
            if (e.key.toLowerCase() === 'q') gameState.focoQ.velocidade = Math.max(0.8, gameState.focoQ.velocidade - 0.2);
            if (e.key.toLowerCase() === 'p') gameState.focoP.velocidade = Math.max(0.8, gameState.focoP.velocidade - 0.2);
        }

        // Listeners de toque/mouse para velocidade
        circuloQ.addEventListener('mousedown', () => { if(gameState.jogoAtivo) gameState.focoQ.velocidade += 0.2; });
        circuloQ.addEventListener('mouseup', () => { if(gameState.jogoAtivo) gameState.focoQ.velocidade = Math.max(0.8, gameState.focoQ.velocidade - 0.2); });
        circuloQ.addEventListener('touchstart', (e) => { if(gameState.jogoAtivo) { e.preventDefault(); gameState.focoQ.velocidade += 0.2; }});
        circuloQ.addEventListener('touchend', () => { if(gameState.jogoAtivo) gameState.focoQ.velocidade = Math.max(0.8, gameState.focoQ.velocidade - 0.2); });
        
        circuloP.addEventListener('mousedown', () => { if(gameState.jogoAtivo) gameState.focoP.velocidade += 0.2; });
        circuloP.addEventListener('mouseup', () => { if(gameState.jogoAtivo) gameState.focoP.velocidade = Math.max(0.8, gameState.focoP.velocidade - 0.2); });
        circuloP.addEventListener('touchstart', (e) => { if(gameState.jogoAtivo) { e.preventDefault(); gameState.focoP.velocidade += 0.2; }});
        circuloP.addEventListener('touchend', () => { if(gameState.jogoAtivo) gameState.focoP.velocidade = Math.max(0.8, gameState.focoP.velocidade - 0.2); });

        // Listeners para a tentativa de sincronia
        document.addEventListener('keydown', handleKeyDown);
        confirmarBtn.addEventListener('click', tentarSincronia);
        
        gameLoop();
    });
}