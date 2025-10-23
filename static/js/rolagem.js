// static/js/rolagem.js

document.addEventListener('DOMContentLoaded', () => {
    // Adiciona um listener de clique para todos os botões de teste de habilidade na página
    document.querySelectorAll('.botao-teste').forEach(botao => {
        botao.addEventListener('click', async () => {
            
            // --- 1. Captura dos elementos do HTML ---
            const overlay = document.getElementById('overlay-rolagem');
            const nomeTesteEl = document.getElementById('rolagem-nome-teste');
            const dificuldadeEl = document.getElementById('rolagem-dificuldade');
            const spinnerEl = document.getElementById('rolagem-spinner');
            const extraInfoEl = document.getElementById('rolagem-extra-info');
            const resultadoTituloEl = document.getElementById('rolagem-resultado-titulo');

            // --- 2. Leitura dos dados do botão que foi clicado ---
            const nomeTeste = botao.dataset.nomeTeste;
            const dificuldade = parseInt(botao.dataset.dificuldade);
            const urlSucesso = botao.dataset.urlSucesso;
            const urlFalha = botao.dataset.urlFalha;
            const modificador = botao.dataset.modificador || 'normal'; // 'normal', 'vantagem', ou 'desvantagem'

            // --- 3. Preparação e exibição do overlay de rolagem ---
            nomeTesteEl.textContent = nomeTeste;
            dificuldadeEl.textContent = dificuldade;
            spinnerEl.textContent = '...';
            extraInfoEl.textContent = '';
            resultadoTituloEl.classList.add('hidden'); // Esconde o resultado anterior
            overlay.classList.remove('hidden'); // Mostra o pop-up

            // --- 4. Animação da rolagem do dado ---
            await new Promise(resolve => setTimeout(resolve, 500)); // Pequena pausa inicial
            
            const animacaoInterval = setInterval(() => {
                spinnerEl.textContent = Math.floor(Math.random() * 20) + 1;
            }, 80);

            await new Promise(resolve => setTimeout(resolve, 2000)); // Duração da animação
            clearInterval(animacaoInterval); // Para a animação

            // --- 5. Lógica da rolagem do dado (d20) ---
            const d20_roll = () => Math.floor(Math.random() * 20) + 1;
            let rolagemFinal;
            let extraInfoText = '';
            let bonus = 5; // Bônus fixo de personagem para testes de habilidade

            // Verifica se a rolagem tem vantagem ou desvantagem
            if (modificador === 'vantagem' || modificador === 'desvantagem') {
                const r1 = d20_roll();
                const r2 = d20_roll();
                rolagemFinal = (modificador === 'vantagem') ? Math.max(r1, r2) : Math.min(r1, r2);
                extraInfoText = `(Rolagens: ${r1}, ${r2}. ${modificador === 'vantagem' ? 'Maior' : 'Menor'}: ${rolagemFinal} + Bônus: ${bonus})`;
            } else { // Rolagem normal
                rolagemFinal = d20_roll();
                extraInfoText = `(Rolagem: ${rolagemFinal} + Bônus: ${bonus})`;
            }

            const resultadoTotal = rolagemFinal + bonus;

            // --- 6. Exibição do resultado final ---
            spinnerEl.textContent = resultadoTotal;
            extraInfoEl.innerHTML = extraInfoText;
            resultadoTituloEl.classList.remove('hidden');

            // --- 7. Redirecionamento com base no sucesso ou falha ---
            if (resultadoTotal >= dificuldade) {
                resultadoTituloEl.textContent = 'SUCESSO!';
                resultadoTituloEl.className = 'sucesso'; // Aplica a cor verde
                setTimeout(() => { window.location.href = urlSucesso; }, 2000);
            } else {
                resultadoTituloEl.textContent = 'FALHA!';
                resultadoTituloEl.className = 'falha'; // Aplica a cor vermelha
                setTimeout(() => { window.location.href = urlFalha; }, 2000);
            }
        });
    });
});