// static/js/combate.js (VERSÃO COM SELEÇÃO DE ALVO MÚLTIPLO)

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
    const botaoRolarManual = document.getElementById('botao-rolar-manual');

    let combatentes = [];
    let ordemTurno = [];
    let turnoAtualIndex = 0;
    let combateAtivo = false;
    let combateFinalizado = false;
    let acao_usada = false;
    let acao_bonus_usada = false;
    
    // --- NOVO: Variável para guardar alvos selecionados ---
    let alvosSelecionados = [];

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
            
            rolagemCombateTitulo.textContent = titulo;
            rolagemCombateAtacante.textContent = `Por: ${atacante.nome || atacante.nome_unico}`;
            rolagemCombateSpinner.textContent = '...';
            rolagemCombateDetalhes.innerHTML = `(${expressao})`;
            rolagemCombateResultado.classList.add('hidden');
            botaoRolarManual.classList.add('hidden'); 
            overlayRolagemCombate.classList.remove('hidden');

            const executarAnimacao = () => {
                return new Promise(async (resolveAnimacao) => {
                    const animacaoInterval = setInterval(() => {
                        rolagemCombateSpinner.textContent = Math.floor(Math.random() * 20) + 1;
                    }, 80);
                    await sleep(1500);
                    clearInterval(animacaoInterval);
                    resolveAnimacao();
                });
            };

            if (isPlayer) {
                botaoRolarManual.classList.remove('hidden');
                botaoRolarManual.onclick = async () => {
                    botaoRolarManual.classList.add('hidden');
                    await executarAnimacao();
                    const resultado = rolarDado(expressao).total;
                    rolagemCombateSpinner.textContent = resultado;
                    resolve(resultado); 
                };
            } else { 
                await executarAnimacao();
                const resultado = rolarDado(expressao).total;
                rolagemCombateSpinner.textContent = resultado;
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
    // === 4. LÓGICA DE TURNO
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
            desenharInterfaceJogador(combatenteAtual); 
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
        limparSelecaoDeAlvos(); // Limpa alvos caso o jogador encerre o turno sem atacar
        turnoAtualIndex = (turnoAtualIndex + 1) % ordemTurno.length;
        setTimeout(proximoTurno, 1000);
    };

    const desenharInterfaceJogador = (jogador) => {
        acoesNormaisContainer.innerHTML = '';
        acoesBonusContainer.innerHTML = '';
        encerrarTurnoContainer.innerHTML = '';
        limparSelecaoDeAlvos(); // Garante que a seleção seja limpa ao redesenhar

        // --- AÇÕES NORMAIS (HABILIDADES) ---
        if (!acao_usada) {
            (jogador.classe.habilidades || []).forEach(habilidade => {
                const btn = document.createElement('button');
                btn.className = 'botao-escolha';
                btn.textContent = habilidade.nome;
                btn.onclick = () => {
                    acao_usada = true;
                    resolverHabilidade(jogador, habilidade);
                };
                acoesNormaisContainer.appendChild(btn);
            });
        }
        
        // --- AÇÕES BÔNUS ---
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

        // --- ENCERRAR TURNO ---
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
    // === 5. RESOLVEDORES DE HABILIDADES (ATAQUE, CURA, AOE)
    // =====================================================================

    /**
     * Função Mestre: Decide qual lógica de alvo usar.
     */
    async function resolverHabilidade(jogador, habilidade) {
        const { alvos } = habilidade;

        if (alvos === 'multiplos') {
            // NOVO: Inicia o modo de seleção múltipla
            iniciarSelecaoMultipla(jogador, habilidade);
        } else if (alvos === 'unico') {
            // Lógica antiga para alvo único
            iniciarSelecaoUnica(jogador, habilidade);
        } else {
            // (Para futuras magias como cura em área em aliados)
            log(`Habilidade ${habilidade.nome} não tem lógica de alvo definida.`);
            desenharInterfaceJogador(jogador);
        }
    }

    /**
     * Lógica de Ação Bônus (Corrigida para bug do Mago).
     */
    async function resolverAcaoBonus(jogador, acaoId) {
        let redesenharUIImediatamente = true;
        switch(acaoId) {
            case 'guerreiro_curar':
                const acaoCura = jogador.classe.acoes_bonus.find(a => a.id === 'guerreiro_curar');
                const dadoCura = acaoCura.dado_cura || '2d6'; 
                const cura = rolarDado(dadoCura).total;
                jogador.hp_atual = Math.min(jogador.classe.hp_max, jogador.hp_atual + cura);
                log(`⚔️ ${jogador.nome} recupera o fôlego e cura <strong>${cura}</strong> de vida!`);
                atualizarHP(jogador);
                break;
            case 'guerreiro_ataque_extra':
                log(`⚔️ ${jogador.nome} prepara um Ataque Rápido!`);
                // Ataque extra usa a primeira habilidade (Ataque Poderoso)
                iniciarSelecaoUnica(jogador, jogador.classe.habilidades[0]);
                redesenharUIImediatamente = false;
                break;
            case 'mago_escudo':
                const escudo = rolarDado('2d10').total;
                jogador.temp_hp = escudo;
                log(`✨ ${jogador.nome} conjura um Escudo Arcano, ganhando <strong>${escudo}</strong> de HP temporário!`);
                atualizarHP(jogador);
                break;
            case 'mago_feitico_extra':
                log(`✨ ${jogador.nome} acelera sua magia! Escolha um feitiço.`);
                acao_usada = false; // Devolve a Ação Normal.
                break;
            case 'ladino_ocultar':
                jogador.status_effects.push({ nome: 'oculto', duracao: 2 });
                log(`🏹 ${jogador.nome} se esconde nas sombras. O próximo ataque contra ele irá errar!`);
                break;
            case 'ladino_apunhalar':
                log(`🏹 ${jogador.nome} prepara uma Apunhalada Crítica!`);
                // Apunhalar usa a primeira habilidade (Ataque Furtivo) com bônus
                iniciarSelecaoUnica(jogador, jogador.classe.habilidades[0], true);
                redesenharUIImediatamente = false;
                break;
        }
        if (redesenharUIImediatamente) {
        desenharInterfaceJogador(jogador);
    }}

    /**
     * Limpa a seleção de alvos e remove os listeners
     */
    const limparSelecaoDeAlvos = () => {
        alvosSelecionados = [];
        document.querySelectorAll('.alvo-potencial').forEach(card => {
            card.classList.remove('alvo-potencial', 'alvo-selecionado');
            card.onclick = null; // Remove o listener de clique
        });
    };

    /**
     * Lógica para Seleção de Alvo ÚNICO.
     */
    const iniciarSelecaoUnica = async (atacante, habilidade, isCrit = false) => {
        acoesNormaisContainer.innerHTML = '';
        acoesBonusContainer.innerHTML = '';
        encerrarTurnoContainer.innerHTML = `<p style="color: white; font-family: 'Cinzel', serif;">Clique no alvo para ${habilidade.nome}...</p>`;
        
        limparSelecaoDeAlvos(); // Garante que tudo esteja limpo

        const alvosDisponiveis = document.querySelectorAll('.inimigo:not(.derrotado)');
        alvosDisponiveis.forEach(alvoEl => {
            alvoEl.classList.add('alvo-potencial');
            alvoEl.onclick = async () => {
                limparSelecaoDeAlvos(); // Limpa após o clique
                const idAlvo = alvoEl.id;
                const alvo = combatentes.find(c => c.id_html === idAlvo);
                await resolverAtaque(atacante, alvo, habilidade, isCrit);
                desenharInterfaceJogador(atacante); // Redesenha a UI
            };
        });
    };

    /**
     * NOVO: Lógica para Seleção de Alvos MÚLTIPLOS.
     */
    const iniciarSelecaoMultipla = (jogador, habilidade) => {
        acoesNormaisContainer.innerHTML = '';
        acoesBonusContainer.innerHTML = '';
        encerrarTurnoContainer.innerHTML = ''; // Limpa o botão "Encerrar Turno"

        limparSelecaoDeAlvos();
        log(`🔥 ${jogador.nome} prepara ${habilidade.nome}. Selecione os alvos.`);

        // Cria o botão de confirmação
        const btnConfirmar = document.createElement('button');
        btnConfirmar.className = 'botao-escolha';
        btnConfirmar.textContent = 'Confirmar Alvos (0)';
        btnConfirmar.disabled = true;
        btnConfirmar.onclick = async () => {
            // Pega os objetos de combatente com base nos IDs selecionados
            const alvosObjetos = alvosSelecionados.map(id => combatentes.find(c => c.id_html === id));
            await resolverAtaqueMultiplo(jogador, habilidade, alvosObjetos);
            desenharInterfaceJogador(jogador); // Redesenha a UI normal
        };
        encerrarTurnoContainer.appendChild(btnConfirmar);

        // Adiciona listeners aos inimigos
        const alvosDisponiveis = document.querySelectorAll('.inimigo:not(.derrotado)');
        alvosDisponiveis.forEach(alvoEl => {
            alvoEl.classList.add('alvo-potencial');
            
            alvoEl.onclick = () => {
                const idAlvo = alvoEl.id;
                if (alvosSelecionados.includes(idAlvo)) {
                    // Remove da seleção
                    alvosSelecionados = alvosSelecionados.filter(id => id !== idAlvo);
                    alvoEl.classList.remove('alvo-selecionado');
                } else {
                    // Adiciona à seleção
                    alvosSelecionados.push(idAlvo);
                    alvoEl.classList.add('alvo-selecionado');
                }
                
                // Atualiza o botão
                btnConfirmar.textContent = `Confirmar Alvos (${alvosSelecionados.length})`;
                btnConfirmar.disabled = alvosSelecionados.length === 0;
            };
        });
    };

    /**
     * NOVO: Lógica de Ataque Múltiplo (agora recebe os alvos)
     */
    async function resolverAtaqueMultiplo(jogador, habilidade, alvos) {
        log(`🔥 ${jogador.nome} conjura ${habilidade.nome} sobre ${alvos.length} alvos!`);
        
        for (const alvo of alvos) {
            // Reutiliza a função de ataque principal para cada alvo
            await resolverAtaque(jogador, alvo, habilidade);
            await sleep(500); // Pausa entre os ataques
            if (checarFimDeCombate()) return; // Para o ataque se o combate acabou
        }
    }


    /**
     * Lógica Principal de Ataque (Usada por jogadores e inimigos).
     */
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
        
        // Prepara a party para salvar
        const partyFinal = gameData.party.map(personagemOriginal => {
            const combatenteCorrespondente = combatentes.find(c => c.nome === personagemOriginal.nome);
            if (combatenteCorrespondente) { 
                return { ...personagemOriginal, hp_atual: combatenteCorrespondente.hp_atual }; 
            }
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