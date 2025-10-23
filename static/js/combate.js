// static/js/combate.js (VERSÃO FINAL E CORRIGIDA)

document.addEventListener('DOMContentLoaded', () => {
    // =====================================================================
    // === 1. CONFIGURAÇÃO INICIAL E ELEMENTOS DOM
    // =====================================================================
    const gameDataEl = document.getElementById('game-data');
    if (!gameDataEl) return;
    const gameData = JSON.parse(gameDataEl.textContent);
    if (!gameData.dados_combate) return;

    const overlayCombate = document.getElementById('overlay-combate');
    const areaJogadores = document.getElementById('area-jogadores');
    const areaInimigos = document.getElementById('area-inimigos');
    const logCombate = document.getElementById('log-combate');
    
    // --- NOVOS CONTAINERS DO RODAPÉ ---
    const acoesNormaisContainer = document.getElementById('acoes-normais-container');
    const acoesBonusContainer = document.getElementById('acoes-bonus-container');
    const encerrarTurnoContainer = document.getElementById('encerrar-turno-container');
    
    const partyContainer = document.querySelector('.party-card-container');
    const overlayRolagemCombate = document.getElementById('overlay-rolagem-combate');
    const rolagemCombateTitulo = document.getElementById('rolagem-combate-titulo');
    const rolagemCombateAtacante = document.getElementById('rolagem-combate-atacante');
    const rolagemCombateSpinner = document.getElementById('rolagem-combate-spinner');
    const rolagemCombateDetalhes = document.getElementById('rolagem-combate-detalhes');
    const rolagemCombateResultado = document.getElementById('rolagem-combate-resultado');

    let combatentes = [];
    let ordemTurno = [];
    let turnoAtualIndex = 0;
    let combateAtivo = false;
    let combateFinalizado = false;
    let acao_usada = false;
    let acao_bonus_usada = false;

    // =====================================================================
    // === 2. FUNÇÕES UTILITÁRIAS
    // =====================================================================
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    const log = (mensagem) => {
        logCombate.innerHTML += `<p>${mensagem}</p>`;
        logCombate.scrollTop = logCombate.scrollHeight;
    };
    const rolarDado = (expressao) => {
        if (!expressao || typeof expressao !== 'string') { return { rolagem: 0, bonus: 0, total: 0 }; }
        const match = expressao.toLowerCase().match(/(\d+)d(\d+)(?:\+(\d+))?/);
        if (!match) { return { rolagem: 0, bonus: 0, total: 0 }; }
        const [_, numDados, tipoDado, bonusStr] = match;
        const bonus = parseInt(bonusStr) || 0;
        let totalRolagem = 0;
        for (let i = 0; i < parseInt(numDados, 10); i++) {
            totalRolagem += Math.floor(Math.random() * parseInt(tipoDado, 10)) + 1;
        }
        return { rolagem: totalRolagem, bonus: bonus, total: totalRolagem + bonus };
    };
    const atualizarHP = (combatente) => {
        const card = document.getElementById(combatente.id_html);
        if (!card) return;
        const hpBar = card.querySelector('.hp-bar');
        const hpBarFill = card.querySelector('.hp-bar-fill');
        const hpText = card.querySelector('.hp-text');
        if (!hpBarFill || !hpText) return;
        const tempHpBar = card.querySelector('.temp-hp-bar-fill');
        if (tempHpBar) tempHpBar.remove();
        if (combatente.temp_hp > 0) {
            const tempHpEl = document.createElement('div');
            tempHpEl.className = 'temp-hp-bar-fill';
            const hp_max_total = combatente.hp_max || combatente.classe.hp_max;
            tempHpEl.style.width = `${(combatente.temp_hp / hp_max_total) * 100}%`;
            hpBar.appendChild(tempHpEl);
        }
        const hp_max = combatente.hp_max || combatente.classe.hp_max;
        const percHP = (combatente.hp_atual / hp_max) * 100;
        hpBarFill.style.width = `${Math.max(0, percHP)}%`;
        hpText.textContent = `${combatente.hp_atual}/${hp_max}`;
        hpBarFill.classList.remove('hp-high', 'hp-medium', 'hp-low');
        if (percHP <= 10) { hpBarFill.classList.add('hp-low'); }
        else if (percHP <= 50) { hpBarFill.classList.add('hp-medium'); }
        else { hpBarFill.classList.add('hp-high'); }
        if (combatente.hp_atual <= 0) { card.classList.add('derrotado'); }
    };
    const mostrarRolagemVisual = (titulo, atacante, expressao) => {
    return new Promise(async (resolve) => {
        const isPlayer = atacante.tipo === 'jogador';
        const botaoRolar = document.getElementById('botao-rolar-manual');
        const spinnerEl = rolagemCombateSpinner;

        // 1. Prepara e exibe o overlay
        rolagemCombateTitulo.textContent = titulo;
        rolagemCombateAtacante.textContent = `Por: ${atacante.nome || atacante.nome_unico}`;
        spinnerEl.textContent = '...';
        rolagemCombateDetalhes.innerHTML = `(${expressao})`;
        rolagemCombateResultado.classList.add('hidden');
        botaoRolar.classList.add('hidden'); // Garante que o botão comece escondido
        overlayRolagemCombate.classList.remove('hidden');

        // Função interna para a animação
        const executarAnimacao = () => {
            return new Promise(async (resolveAnimacao) => {
                const animacaoInterval = setInterval(() => {
                    spinnerEl.textContent = Math.floor(Math.random() * 20) + 1;
                }, 80);
                await sleep(1500);
                clearInterval(animacaoInterval);
                resolveAnimacao();
            });
        };

        // 2. Lógica de rolagem
        if (isPlayer) {
            // Mostra o botão para o jogador e espera o clique
            botaoRolar.classList.remove('hidden');
            botaoRolar.onclick = async () => {
                botaoRolar.classList.add('hidden');
                await executarAnimacao();
                const resultado = rolarDado(expressao).total;
                spinnerEl.textContent = resultado;
                resolve(resultado); // Devolve o resultado para o jogo continuar
            };
        } else { // Lógica automática para inimigos
            await executarAnimacao();
            const resultado = rolarDado(expressao).total;
            spinnerEl.textContent = resultado;
            
            
            resolve(resultado); 
        }
    });
};

    // =====================================================================
    // === 3. PREPARAÇÃO DO COMBATE
    // =====================================================================
    const iniciarCombate = async () => {
        log('A batalha está prestes a começar!');
        combateAtivo = true;
        const jogadores = gameData.party.map((p, i) => ({ ...p, tipo: 'jogador', id_html: `jogador-${i}`, temp_hp: 0, status_effects: [] }));
        const inimigos = gameData.dados_combate.inimigos.map((e, i) => ({ ...e, tipo: 'inimigo', id_html: `inimigo-${i}`, temp_hp: 0, status_effects: [] }));
        combatentes = [...jogadores, ...inimigos];
        criarCards(jogadores, inimigos);
        ordemTurno = rolarIniciativa();
        log('--- Ordem de Iniciativa Definida ---');
        ordemTurno.forEach((c, i) => log(`${i + 1}º: ${c.nome || c.nome_unico}`));
        await sleep(2000);
        proximoTurno();
    };
    const criarCards = (jogadores, inimigos) => {
        partyContainer.classList.add('hidden');
        areaJogadores.innerHTML = '';
        areaInimigos.innerHTML = '';
        jogadores.forEach(jogador => {
            const cardHTML = `<div class="character-card-small" id="${jogador.id_html}"><div class="char-nome-small">${jogador.nome}</div><div class="char-classe-small">${jogador.classe.nome_classe} - Nv ${jogador.nivel}</div><div class="hp-bar"><div class="hp-bar-fill"></div><span class="hp-text">${jogador.hp_atual}/${jogador.classe.hp_max}</span></div></div>`;
            areaJogadores.innerHTML += cardHTML;
            atualizarHP(jogador);
        });
        inimigos.forEach(inimigo => {
            const cardHTML = `<div class="character-card-small inimigo" id="${inimigo.id_html}"><div class="char-nome-small">${inimigo.nome_unico} ${inimigo.icone || ''}</div><div class="hp-bar"><div class="hp-bar-fill hp-high"></div><span class="hp-text">${inimigo.hp_atual}/${inimigo.hp_max}</span></div></div>`;
            areaInimigos.innerHTML += cardHTML;
            atualizarHP(inimigo);
        });
    };
    const rolarIniciativa = () => {
        combatentes.forEach(c => {
            const bonus = c.tipo === 'jogador' ? 2 : (c.iniciativa_bonus || 0);
            c.iniciativa = rolarDado(`1d20+${bonus}`).total;
        });
        return combatentes.sort((a, b) => b.iniciativa - a.iniciativa);
    };

    // =====================================================================
    // === 4. LÓGICA DE TURNO CORRIGIDA
    // =====================================================================
    const proximoTurno = async () => {
        if (!combateAtivo || combateFinalizado) return;
        if (checarFimDeCombate()) return;

        const combatenteAtual = ordemTurno[turnoAtualIndex];
        combatenteAtual.status_effects = combatenteAtual.status_effects.filter(ef => { ef.duracao--; return ef.duracao > 0; });
        
        if (combatenteAtual.hp_atual <= 0) {
            turnoAtualIndex = (turnoAtualIndex + 1) % ordemTurno.length;
            proximoTurno();
            return;
        }

        document.querySelectorAll('.character-card-small').forEach(c => c.classList.remove('turno-ativo'));
        document.getElementById(combatenteAtual.id_html).classList.add('turno-ativo');
        
        if (combatenteAtual.tipo === 'jogador') {
            acao_usada = false;
            acao_bonus_usada = false;
            log(`<strong>--- Turno de ${combatenteAtual.nome} ---</strong>`);
            desenharInterfaceJogador(combatenteAtual); // Chamada inicial para desenhar a UI
        } else {
            acoesNormaisContainer.innerHTML = '';
            acoesBonusContainer.innerHTML = '';
            encerrarTurnoContainer.innerHTML = '';
            await turnoDoInimigo(combatenteAtual);
        }
    };

    const encerrarTurnoJogador = () => {
        acoesNormaisContainer.innerHTML = '';
        acoesBonusContainer.innerHTML = '';
        encerrarTurnoContainer.innerHTML = '';
        turnoAtualIndex = (turnoAtualIndex + 1) % ordemTurno.length;
        setTimeout(proximoTurno, 1000);
    };

    const desenharInterfaceJogador = (jogador) => {
        acoesNormaisContainer.innerHTML = '';
        acoesBonusContainer.innerHTML = '';
        encerrarTurnoContainer.innerHTML = '';

        if (!acao_usada) {
            (jogador.classe.habilidades || []).forEach(habilidade => {
                const btn = document.createElement('button');
                btn.className = 'botao-escolha';
                btn.textContent = habilidade.nome;
                btn.onclick = () => {
                    acao_usada = true;
                    escolherAlvo(jogador, habilidade);
                };
                acoesNormaisContainer.appendChild(btn);
            });
        }
        
        if (!acao_bonus_usada) {
            (jogador.classe.acoes_bonus || []).forEach(acao => {
                const btn = document.createElement('button');
                btn.className = 'botao-escolha';
                btn.textContent = acao.nome;
                btn.onclick = () => {
                    acao_bonus_usada = true;
                    resolverAcaoBonus(jogador, acao.id);
                };
                acoesBonusContainer.appendChild(btn);
            });
        }

        const btnEncerrar = document.createElement('button');
        btnEncerrar.className = 'botao-escolha';
        btnEncerrar.textContent = 'Encerrar Turno';
        btnEncerrar.onclick = encerrarTurnoJogador;
        encerrarTurnoContainer.appendChild(btnEncerrar);
    };

    const turnoDoInimigo = async (inimigo) => {
        log(`<strong>--- Turno de ${inimigo.nome_unico} ---</strong>`);
        await sleep(1500);
        const alvosVivos = ordemTurno.filter(c => c.tipo === 'jogador' && c.hp_atual > 0);
        if (alvosVivos.length > 0) {
            const alvo = alvosVivos[Math.floor(Math.random() * alvosVivos.length)];
            await resolverAtaque(inimigo, alvo, inimigo.ataques[0]);
        } else { log(`${inimigo.nome_unico} não tem quem atacar!`); }
        await sleep(1000);
        turnoAtualIndex = (turnoAtualIndex + 1) % ordemTurno.length;
        proximoTurno();
    };

    // =====================================================================
    // === 5. AÇÕES, AÇÕES BÔNUS E RESOLUÇÃO
    // =====================================================================
    const escolherAlvo = async (atacante, habilidade, isCrit = false) => {
        acoesNormaisContainer.innerHTML = '';
        acoesBonusContainer.innerHTML = '';
        encerrarTurnoContainer.innerHTML = `<p style="color: white; font-family: 'Cinzel', serif;">Clique no alvo para usar ${habilidade.nome}...</p>`;
        
        const alvosDisponiveis = document.querySelectorAll('.inimigo:not(.derrotado)');
        alvosDisponiveis.forEach(alvoEl => {
            alvoEl.classList.add('alvo-potencial');
            alvoEl.onclick = async () => {
                alvosDisponiveis.forEach(el => { el.classList.remove('alvo-potencial'); el.onclick = null; });
                const idAlvo = alvoEl.id;
                const alvo = combatentes.find(c => c.id_html === idAlvo);
                await resolverAtaque(atacante, alvo, habilidade, isCrit);
                desenharInterfaceJogador(atacante);
            };
        });
    };

    async function resolverAcaoBonus(jogador, acaoId) {
        switch(acaoId) {
            case 'guerreiro_curar':
                const cura = rolarDado('1d8').total;
                jogador.hp_atual = Math.min(jogador.classe.hp_max, jogador.hp_atual + cura);
                log(`⚔️ ${jogador.nome} recupera o fôlego e cura <strong>${cura}</strong> de vida!`);
                atualizarHP(jogador);
                desenharInterfaceJogador(jogador);
                break;
            case 'guerreiro_ataque_extra':
                log(`⚔️ ${jogador.nome} prepara um Ataque Rápido!`);
                escolherAlvo(jogador, jogador.classe.habilidades[0]);
                break;
            case 'mago_escudo':
                const escudo = rolarDado('1d6').total;
                jogador.temp_hp = escudo;
                log(`✨ ${jogador.nome} conjura um Escudo Arcano, ganhando <strong>${escudo}</strong> de HP temporário!`);
                atualizarHP(jogador);
                desenharInterfaceJogador(jogador);
                break;
            case 'mago_feitico_extra':
                log(`✨ ${jogador.nome} acelera sua magia! Escolha um feitiço.`);
                desenharInterfaceJogador(jogador);
                break;
            case 'ladino_ocultar':
                jogador.status_effects.push({ nome: 'oculto', duracao: 2 });
                log(`🏹 ${jogador.nome} se esconde nas sombras. O próximo ataque contra ele irá errar!`);
                desenharInterfaceJogador(jogador);
                break;
            case 'ladino_apunhalar':
                log(`🏹 ${jogador.nome} prepara uma Apunhalada Crítica!`);
                escolherAlvo(jogador, jogador.classe.habilidades[0], true);
                break;
        }
    }
    
    const resolverAtaque = async (atacante, alvo, habilidade, isCrit = false) => {
    const nomeAtacante = atacante.nome || atacante.nome_unico;

    // Checa status (Ladino Oculto)
    if (alvo.status_effects.some(ef => ef.nome === 'oculto')) {
        log(`💨 ${alvo.nome} está oculto! O ataque de ${nomeAtacante} erra automaticamente!`);
        alvo.status_effects = alvo.status_effects.filter(ef => ef.nome !== 'oculto');
        await sleep(1500);
        return;
    }

    const nomeAtaque = habilidade.nome;
    const dadoDano = habilidade.dado_dano;
    const acertoBonus = (atacante.tipo === 'jogador') ? 5 : (habilidade.chance_acerto || 3);
    log(`${nomeAtacante} usa ${nomeAtaque} contra ${alvo.nome || alvo.nome_unico}.`);
    
    // --- ROLAGEM DE ACERTO ---
    const rolagemAcerto = await mostrarRolagemVisual("Rolagem de Acerto", atacante, `1d20+${acertoBonus}`);
    const armaduraAlvo = 12;
    rolagemCombateDetalhes.innerHTML += ` (vs Armadura ${armaduraAlvo})`;
    await sleep(1000);

    if (rolagemAcerto >= armaduraAlvo || isCrit) {
        rolagemCombateResultado.textContent = isCrit ? "ACERTO CRÍTICO!" : "ACERTO!";
        rolagemCombateResultado.className = 'sucesso';
        rolagemCombateResultado.classList.remove('hidden');
        await sleep(1500);

        // --- ROLAGEM DE DANO ---
        let danoCausado = await mostrarRolagemVisual("Rolagem de Dano", atacante, dadoDano);
        if (isCrit) {
            log(`💥 **DANO CRÍTICO!** Rolando dano extra...`);
            await sleep(1000);
            // Para críticos, rolamos o dano uma segunda vez
            const danoExtra = await mostrarRolagemVisual("Dano Crítico Extra", atacante, dadoDano);
            danoCausado += danoExtra;
        }

        // Aplica o dano
        let danoRestante = danoCausado;
        if (alvo.temp_hp > 0) {
            const danoNoEscudo = Math.min(alvo.temp_hp, danoRestante);
            alvo.temp_hp -= danoNoEscudo;
            danoRestante -= danoNoEscudo;
            log(`O escudo absorve <strong>${danoNoEscudo}</strong> de dano!`);
        }
        alvo.hp_atual = Math.max(0, alvo.hp_atual - danoRestante);

        rolagemCombateResultado.textContent = `CAUSOU ${danoCausado} DE DANO!`;
        log(`<span class="acerto">${nomeAtacante} ACERTOU!</span> Causou <strong>${danoCausado}</strong> de dano total em ${alvo.nome || alvo.nome_unico}.`);
        atualizarHP(alvo);
        if (alvo.hp_atual <= 0) { log(`<strong>${alvo.nome || alvo.nome_unico} foi derrotado!</strong>`); }
    } else {
        rolagemCombateResultado.textContent = "ERROU!";
        rolagemCombateResultado.className = 'falha';
        rolagemCombateResultado.classList.remove('hidden');
        log(`<span class="falha">${nomeAtacante} ERROU!</span>`);
    }
    await sleep(2000);
    overlayRolagemCombate.classList.add('hidden');
};

    // =====================================================================
    // === 6. FIM DO COMBATE
    // =====================================================================
    const finalizarCombate = async (status) => {
        if (combateFinalizado) return;
        combateFinalizado = true;
        combateAtivo = false;
        const urlDestino = (status === 'vitoria') ? gameData.dados_combate.destino_vitoria : gameData.dados_combate.destino_derrota;
        const partyFinal = gameData.party.map(personagemOriginal => {
            const combatenteCorrespondente = combatentes.find(c => c.nome === personagemOriginal.nome);
            if (combatenteCorrespondente) { return { ...personagemOriginal, hp_atual: combatenteCorrespondente.hp_atual, temp_hp: 0, status_effects: [] }; }
            return personagemOriginal;
        });
        try {
            const response = await fetch('/atualizar-party', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ party: partyFinal })
            });
            if (!response.ok) throw new Error('Falha ao salvar o progresso no servidor.');
            log('Salvando progresso...');
            await sleep(1500);
            window.location.href = urlDestino;
        } catch (error) {
            console.error('Erro ao finalizar o combate:', error);
            log('ERRO: Não foi possível salvar seu progresso. Por favor, recarregue a página.');
        }
    };
    const checarFimDeCombate = () => {
        if (!combateAtivo) return false;
        const jogadoresVivos = combatentes.filter(c => c.tipo === 'jogador' && c.hp_atual > 0);
        const inimigosVivos = combatentes.filter(c => c.tipo === 'inimigo' && c.hp_atual > 0);
        if (inimigosVivos.length === 0) {
            log('<h1>VITÓRIA!</h1>');
            finalizarCombate('vitoria');
            return true;
        }
        if (jogadoresVivos.length === 0) {
            log('<h1>DERROTA!</h1>');
            finalizarCombate('derrota');
            return true;
        }
        return false;
    };

    // =====================================================================
    // === INICIA O PROCESSO
    // =====================================================================
    overlayCombate.classList.remove('hidden');
    iniciarCombate();
});