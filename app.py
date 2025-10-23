import json
import os
import random
import glob # Importação para encontrar arquivos dinamicamente
from flask import Flask, render_template, jsonify, abort, redirect, url_for, session, request

app = Flask(__name__)
# IMPORTANTE: Mude esta chave para algo único e secreto!
app.secret_key = 'sua-chave-secreta-muito-dificil-de-adivinhar-mude-isso'
#SAVE_FILE = 'save_data.json'

# --- CARREGAMENTO DAS BIBLIOTECAS DO JOGO ---

# Definição das propriedades de cada classe
CLASSES = {
    'guerreiro': {
        'nome_classe': 'Guerreiro', 'hp_max': 45,
        'habilidades': [
            {'id': 'ataque_poderoso', 'nome': 'Ataque Poderoso', 'dado_dano': '1d10+3', 'tipo': 'ataque', 'alvos': 'unico'}
        ],
        'acoes_bonus': [
            {'id': 'guerreiro_curar', 'nome': 'Recuperar Fôlego (Cura 1d8)'},
            {'id': 'guerreiro_ataque_extra', 'nome': 'Ataque Rápido'}
        ]
    },
    'mago': {
        'nome_classe': 'Mago', 'hp_max': 20,
        'habilidades': [
            {'id': 'bola_de_fogo', 'nome': 'Bola de Fogo', 'dado_dano': '2d6', 'tipo': 'magia', 'alvos': 'multiplos'},
            {'id': 'raio_de_gelo', 'nome': 'Raio de Gelo', 'dado_dano': '1d8', 'tipo': 'magia', 'alvos': 'unico'}
        ],
        'acoes_bonus': [
            {'id': 'mago_escudo', 'nome': 'Escudo Arcano (HP Temp)'},
            {'id': 'mago_feitico_extra', 'nome': 'Feitiço Acelerado'}
        ],
        'slots_magia': 4
    },
    'ladino': {
        'nome_classe': 'Ladino', 'hp_max': 30,
        'habilidades': [
            {'id': 'ataque_furtivo', 'nome': 'Ataque Furtivo', 'dado_dano': '1d6+4', 'tipo': 'ataque', 'alvos': 'unico', 'condicao': 'alvo_distraido'}
        ],
        'acoes_bonus': [
            {'id': 'ladino_ocultar', 'nome': 'Esconder-se nas Sombras'},
            {'id': 'ladino_apunhalar', 'nome': 'Apunhalada Crítica'}
        ]
    }
}

def load_enemies():
    """Carrega a base de dados de inimigos do JSON."""
    try:
        with open('inimigos.json', 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        return {} # Retorna um dicionário vazio se o arquivo não existir

# Carrega os inimigos uma vez quando o aplicativo inicia
INIMIGOS_DB = load_enemies()


# --- FUNÇÕES DE SAVE/LOAD PERSISTENTE ---
def load_game_data():
    """Lê o progresso de desbloqueio da SESSÃO do jogador."""
    # Se 'game_data' não existir na sessão, começa um novo com historia1 desbloqueada.
    return session.get('game_data', {'unlocked_stories': ['historia1']})

def save_game_data(data):
    """Salva o progresso de desbloqueio na SESSÃO do jogador."""
    session['game_data'] = data
    session.modified = True #

def carregar_historia(nome_arquivo):
    """Carrega a estrutura completa de uma história."""
    try:
        with open(f'{nome_arquivo}.json', 'r', encoding='utf-8') as f:
            data = json.load(f)
            return data # <-- Mude aqui para retornar o objeto completo
    except (FileNotFoundError, KeyError):
        return None

# --- ROTAS DO MENU PRINCIPAL E FLUXO INICIAL ---
@app.route('/')
def menu_principal():
    """Exibe o menu principal."""
    save_exists = session.get('save_game_exists', False)
    return render_template('menu.html', save_exists=save_exists)

@app.route('/selecao-historia')
def selecao_historia():
    """Lê todos os arquivos de história, extrai os títulos e monta a tela de seleção."""
    session.clear()
    game_data = load_game_data()
    unlocked_stories_ids = game_data.get('unlocked_stories', ['historia1'])
    
    stories = []
    for filename in glob.glob('*.json'):
        if filename in ['save_data.json', 'inimigos.json']: # Pula arquivos que não são de história
            continue
        
        with open(filename, 'r', encoding='utf-8') as f:
            try:
                data = json.load(f)
                if 'metadata' in data:
                    stories.append(data['metadata'])
            except (KeyError, json.JSONDecodeError):
                continue
    stories.sort(key=lambda s: s['identificador'])
    return render_template('selecao_historia.html', stories=stories, unlocked_stories=unlocked_stories_ids)

@app.route('/continuar')
def continuar_jogo():
    """Carrega o jogo salvo da sessão e redireciona."""
    if session.get('save_game_exists'):
        session['party'] = session.get('saved_party', [])
        nome_da_historia = session.get('saved_story')
        id_da_pagina = session.get('saved_page_id')
        
        if nome_da_historia and id_da_pagina is not None:
            return redirect(url_for('livro_pagina', nome_da_historia=nome_da_historia, id_da_pagina=id_da_pagina))
    
    return redirect(url_for('menu_principal'))
    
@app.route('/sair')
def sair():
    """Exibe a tela de despedida."""
    return render_template('sair.html')

# --- ROTAS DE CRIAÇÃO DA PARTIDA E PERSONAGENS ---
@app.route('/configurar-partida/<nome_da_historia>')
def configurar_partida(nome_da_historia):
    """Valida se a história está desbloqueada e exibe a tela de configuração."""
    game_data = load_game_data()
    if nome_da_historia not in game_data.get('unlocked_stories', ['historia1']):
        return redirect(url_for('selecao_historia'))
    return render_template('configurar_partida.html', nome_da_historia=nome_da_historia)

@app.route('/iniciar-criacao', methods=['POST'])
def iniciar_criacao():
    """Define o número de jogadores e o nome da party, e inicia a criação sequencial."""
    session['nome_da_historia'] = request.form['nome_da_historia']
    session['num_jogadores'] = int(request.form['num_jogadores'])
    session['party_name'] = request.form.get('party_name', 'Aventureiros')
    session['party_temp'] = []
    return redirect(url_for('criar_personagem', player_num=1))

@app.route('/criar-personagem/<int:player_num>')
def criar_personagem(player_num):
    """Exibe a tela de criação para o jogador da vez."""
    num_jogadores = session.get('num_jogadores')
    return render_template('criar_personagem.html', player_num=player_num, num_jogadores=num_jogadores, classes=CLASSES)

@app.route('/processar-personagem', methods=['POST'])
def processar_personagem():
    """Processa a criação de um personagem e redireciona para o próximo ou para o jogo."""
    player_num = int(request.form['player_num'])
    nome_personagem = request.form['nome_personagem']
    classe_escolhida = request.form['classe']
    
    personagem = {'nome': nome_personagem, 'nivel': 1, 'classe': CLASSES[classe_escolhida], 'hp_atual': CLASSES[classe_escolhida]['hp_max']}
    
    party_temp = session.get('party_temp', [])
    party_temp.append(personagem)
    session['party_temp'] = party_temp

    if player_num < session.get('num_jogadores', 0):
        return redirect(url_for('criar_personagem', player_num=player_num + 1))
    else:
        session['party'] = session.pop('party_temp', [])
        nome_da_historia = session.get('nome_da_historia')
        return redirect(url_for('mostrar_premissa', nome_da_historia=nome_da_historia))

# --- ROTAS PRINCIPAIS DO JOGO ---
@app.route('/historia/<nome_da_historia>/premissa')
def mostrar_premissa(nome_da_historia):
    
    historia_data = carregar_historia(nome_da_historia)
    if not historia_data:
        abort(404)

    premissa_texto = historia_data.get('metadata', {}).get('premissa', 'A aventura está prestes a começar...')

    return render_template('premissa.html', 
                           premissa_texto=premissa_texto,
                           nome_da_historia=nome_da_historia)

@app.route('/livro/<nome_da_historia>/<int:id_da_pagina>')
def livro_pagina(nome_da_historia, id_da_pagina):
    """Lida com a exibição da página, aplicando efeitos e salvando o progresso."""
    party = session.get('party')
    party_name = session.get('party_name', 'Aventureiros')
    if not party:
        return redirect(url_for('menu_principal'))

    historia_data = carregar_historia(nome_da_historia) # Renomeado para clareza
    if not historia_data: abort(404)

    paginas_da_historia = historia_data.get('paginas', [])

    pagina_atual = next((p for p in paginas_da_historia if p['id'] == id_da_pagina), None) 
    if not pagina_atual: abort(404)

    # --- LÓGICA PARA APLICAR EFEITOS DA PÁGINA (DANO, ETC) ---
    if 'efeitos' in pagina_atual:
        efeitos = pagina_atual['efeitos']
        dano = efeitos.get('dano_hp')
        
        if dano:
            for personagem in party:
                personagem['hp_atual'] = max(0, personagem['hp_atual'] - dano)
        
        session['party'] = party
        session.modified = True
    
    # --- LÓGICA DE FILTRAGEM DE OPÇÕES ---
    if 'opcoes' in pagina_atual and pagina_atual['opcoes']:
        classes_na_party = {p['classe']['nome_classe'].lower() for p in party}
        opcoes_filtradas = []
        for opcao in pagina_atual['opcoes']:
            if 'requires' not in opcao:
                opcoes_filtradas.append(opcao)
            else:
                classe_requerida = opcao['requires'].get('classe')
                if classe_requerida in classes_na_party:
                    opcoes_filtradas.append(opcao)
        pagina_atual['opcoes'] = opcoes_filtradas
    
    # --- LÓGICA DE PREPARAÇÃO DE COMBATE ---
    dados_combate = None
    if pagina_atual.get('tipo') == 'combate':
        lista_inimigos_combate = []
        for inimigo_info in pagina_atual.get('inimigos', []):
            id_inimigo = inimigo_info.get('id_inimigo')
            if id_inimigo in INIMIGOS_DB:
                inimigo_base = INIMIGOS_DB[id_inimigo].copy()
                inimigo_base['nome_unico'] = inimigo_info.get('nome_unico', inimigo_base['nome'])
                inimigo_base['hp_atual'] = inimigo_base['hp_max']
                lista_inimigos_combate.append(inimigo_base)
        
        dados_combate = {
            'inimigos': lista_inimigos_combate,
            'destino_vitoria': url_for('livro_pagina', nome_da_historia=nome_da_historia, id_da_pagina=pagina_atual['destino_vitoria']),
            'destino_derrota': url_for('livro_pagina', nome_da_historia=nome_da_historia, id_da_pagina=pagina_atual['destino_derrota'])
        }

    # --- LÓGICA DE SAVE E DESBLOQUEIO ---
    session['save_game_exists'] = True
    session['saved_party'] = party
    session['saved_story'] = nome_da_historia
    session['saved_page_id'] = id_da_pagina
    if pagina_atual.get('unlocks'):
        historia_desbloqueada = pagina_atual['unlocks']
        game_data = load_game_data()
        if historia_desbloqueada not in game_data['unlocked_stories']:
            game_data['unlocked_stories'].append(historia_desbloqueada)
            save_game_data(game_data)

    return render_template('livro.html', 
                           pagina=pagina_atual, 
                           nome_da_historia=nome_da_historia, 
                           party=party, 
                           party_name=party_name,
                           dados_combate=dados_combate)

@app.route('/atualizar-party', methods=['POST'])
def atualizar_party():
    """Recebe os dados da party do frontend e atualiza a sessão."""
    data = request.get_json()
    if data and 'party' in data:
        # Atualiza a party na sessão com os novos dados (ex: hp_atual)
        session['party'] = data['party']
        session.modified = True # Informa ao Flask que a sessão foi alterada
        return jsonify({'status': 'success', 'message': 'Party atualizada.'})
    
    return jsonify({'status': 'error', 'message': 'Dados inválidos.'}), 400
