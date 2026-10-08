(() => {
  'use strict';

  const STORAGE_KEY = 'metodo_leitura_pwa_state_v1';
  const THEME_COOKIE = 'metodo_leitura_theme';
  const APP_VERSION = 1;

  const stages = [
    {
      id: 'pre', number: '01', title: 'Livro novo', subtitle: 'Faça a pré-leitura antes de começar.',
      hero: 'É um livro novo?', description: 'Comece pela pré-leitura e reconheça o terreno antes de ler de verdade.',
      intro: 'Faça esta etapa uma única vez em cada livro novo. Você ainda não está estudando; está apenas conhecendo a estrutura.',
      checks: [
        'Olhei a capa: título, subtítulo e proposta.',
        'Li a contracapa.',
        'Li as duas orelhas, quando existirem.',
        'Observei o índice/sumário e entendi o mapa do livro.',
        'Fiz a Leitura Z passando rapidamente pelas páginas.'
      ]
    },
    {
      id: 'read', number: '02', title: 'Comece a leitura', subtitle: 'Nos 5 primeiros livros, foque em I e M/P.',
      hero: 'Hora de ler', description: 'Leia normalmente e marque somente o que quer lembrar ou aplicar.',
      intro: 'Pegue seu marca-texto. Não tente marcar tudo: o objetivo é selecionar.',
      checks: [
        'Quando penso “quero lembrar disso”, marco I — Ideia Importante.',
        'Quando penso “quero aplicar isso”, marco M/P — Método / Prática.',
        'Se não é algo para lembrar ou aplicar, sigo lendo sem marcar.'
      ]
    },
    {
      id: 'review1', number: '03', title: '1ª revisão', subtitle: 'Faça no mesmo dia, antes de fechar o livro.',
      hero: 'Terminou a sessão?', description: 'Antes de fechar o livro, releia tudo o que marcou hoje.',
      intro: 'Nesta etapa você só relê. Ainda não use Post-it.',
      checks: [
        'Parei na página onde terminei.',
        'Voltei às marcações feitas nesta sessão.',
        'Reli cada marcação uma vez.',
        'Não coloquei Post-it ainda.',
        'Agora posso fechar o livro.'
      ]
    },
    {
      id: 'review2', number: '04', title: '2ª revisão + Post-it', subtitle: 'Faça antes de continuar a próxima leitura.',
      hero: 'Voltou ao livro?', description: 'Primeiro revise as marcações anteriores e decida o que merece Post-it.',
      intro: 'Não abra direto na página onde parou. Primeiro processe o que você marcou na sessão anterior.',
      checks: [
        'Revisei as marcações da sessão anterior.',
        'Perguntei: “isso ainda merece continuar no funil?”',
        'Coloquei Post-it somente no que merecia continuar.',
        'O que não recebeu Post-it permaneceu apenas marcado.'
      ]
    },
    {
      id: 'brain', number: '05', title: 'Segundo Cérebro', subtitle: 'Entre aproximadamente a cada 3 sessões de leitura.',
      hero: 'Hora do Segundo Cérebro', description: 'Revise os Post-its e leve adiante apenas o que realmente merece permanecer.',
      intro: 'Faça um novo filtro. Nem todo Post-it precisa passar para a folha.',
      checks: [
        'Revisei os Post-its acumulados.',
        'Perguntei: “isso ainda merece ir para o meu Segundo Cérebro?”',
        'Escrevi página + tipo + síntese com minhas palavras.',
        'Ideias, exemplos e referências úteis foram para a Caixa de Ferramentas.',
        'Métodos e práticas foram para a Caderneta / Prática.'
      ]
    },
    {
      id: 'finish', number: '06', title: 'Fim do livro', subtitle: 'Finalize o método antes de pegar outro livro.',
      hero: 'Terminou o livro?', description: 'Feche as pendências e escolha uma única prática da Caderneta.',
      intro: 'Terminar as páginas não encerra o método. Primeiro finalize o conhecimento extraído.',
      checks: [
        'Concluí as revisões pendentes.',
        'Finalizei o Segundo Cérebro deste livro.',
        'Abri a Caderneta / Prática.',
        'Escolhi apenas UMA prática importante para aplicar agora.'
      ]
    },
    {
      id: 'action', number: '07', title: 'Plano de Ação', subtitle: 'Transforme uma prática em execução real.',
      hero: 'Agora é aplicação', description: 'Defina O QUÊ, QUANDO e COMO. Execute uma prática de cada vez.',
      intro: 'Não tente aplicar tudo ao mesmo tempo. Execute uma ação e só depois escolha a próxima.',
      checks: [
        'Defini O QUÊ vou fazer.',
        'Defini QUANDO vou fazer.',
        'Defini COMO vou começar.',
        'Executei a ação.'
      ]
    }
  ];

  const defaultState = () => ({
    version: APP_VERSION,
    bookTitle: 'Meu livro',
    page: '',
    currentStage: 'pre',
    checks: Object.fromEntries(stages.map(s => [s.id, Array(s.checks.length).fill(false)])),
    completedStages: [],
    readingSessionsSinceBrain: 0,
    updatedAt: new Date().toISOString(),
    timer: { preset: 25, remaining: 1500, mode: 'focus', running: false, startedAt: null }
  });

  let memoryFallback = null;
  let state = loadState();
  let deferredInstallPrompt = null;
  let timerHandle = null;
  let toastHandle = null;

  const $ = sel => document.querySelector(sel);
  const $$ = sel => [...document.querySelectorAll(sel)];

  function safeGetLocalStorage() {
    try {
      const test = '__ml_test__';
      localStorage.setItem(test, '1');
      localStorage.removeItem(test);
      return localStorage;
    } catch (_) {
      return null;
    }
  }

  const storage = safeGetLocalStorage();

  function normalizeState(candidate) {
    const base = defaultState();
    if (!candidate || typeof candidate !== 'object') return base;
    base.bookTitle = typeof candidate.bookTitle === 'string' ? candidate.bookTitle.slice(0,120) : base.bookTitle;
    base.page = String(candidate.page ?? '').slice(0,5);
    base.currentStage = stages.some(s => s.id === candidate.currentStage) ? candidate.currentStage : 'pre';
    base.completedStages = Array.isArray(candidate.completedStages) ? candidate.completedStages.filter(id => stages.some(s => s.id === id)) : [];
    base.readingSessionsSinceBrain = Math.max(0, Math.min(99, Number(candidate.readingSessionsSinceBrain) || 0));
    if (candidate.checks && typeof candidate.checks === 'object') {
      stages.forEach(stage => {
        const source = Array.isArray(candidate.checks[stage.id]) ? candidate.checks[stage.id] : [];
        base.checks[stage.id] = stage.checks.map((_, i) => Boolean(source[i]));
      });
    }
    if (candidate.timer && typeof candidate.timer === 'object') {
      base.timer.preset = candidate.timer.preset === 15 ? 15 : 25;
      base.timer.remaining = clampInt(candidate.timer.remaining, 0, 60*60, base.timer.preset*60);
      base.timer.mode = candidate.timer.mode === 'break' ? 'break' : 'focus';
      base.timer.running = Boolean(candidate.timer.running);
      base.timer.startedAt = candidate.timer.startedAt || null;
    }
    return base;
  }

  function loadState() {
    try {
      if (storage) {
        const raw = storage.getItem(STORAGE_KEY);
        if (raw) return normalizeState(JSON.parse(raw));
      }
    } catch (_) {}
    return memoryFallback ? normalizeState(memoryFallback) : defaultState();
  }

  function saveState() {
    state.updatedAt = new Date().toISOString();
    const payload = JSON.stringify(state);
    memoryFallback = JSON.parse(payload);
    try { if (storage) storage.setItem(STORAGE_KEY, payload); } catch (_) {}
  }

  function clampInt(value, min, max, fallback) {
    const n = Number.parseInt(value, 10);
    return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
  }

  function cookieGet(name) {
    const parts = document.cookie.split(';').map(v => v.trim());
    const prefix = name + '=';
    const found = parts.find(v => v.startsWith(prefix));
    return found ? decodeURIComponent(found.slice(prefix.length)) : null;
  }

  function cookieSet(name, value, days=365) {
    const maxAge = days * 24 * 60 * 60;
    document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${maxAge}; Path=/; SameSite=Lax`;
  }

  function applyTheme(theme, persist=true) {
    const next = theme === 'light' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    $('#themeColorMeta').setAttribute('content', next === 'dark' ? '#0b0f0e' : '#f7f8f6');
    $('#darkChoice')?.classList.toggle('is-selected', next === 'dark');
    $('#lightChoice')?.classList.toggle('is-selected', next === 'light');
    if (persist) cookieSet(THEME_COOKIE, next);
  }

  function initializeTheme() {
    applyTheme(cookieGet(THEME_COOKIE) || 'dark', false);
  }

  function currentStageIndex() {
    return Math.max(0, stages.findIndex(s => s.id === state.currentStage));
  }

  function isChecked(stageId, index) {
    return Boolean(state.checks[stageId]?.[index]);
  }

  function stageIsComplete(stageId) {
    const stage = stages.find(s => s.id === stageId);
    return stage ? stage.checks.every((_,i) => isChecked(stageId,i)) : false;
  }

  function setStage(stageId) {
    if (!stages.some(s => s.id === stageId)) return;
    state.currentStage = stageId;
    saveState();
    renderAll();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function completeCurrentStage(nextStage) {
    const stage = stages.find(s => s.id === state.currentStage);
    if (!stage || !stageIsComplete(stage.id)) {
      setMessage('Marque todos os itens desta etapa antes de continuar.');
      return;
    }
    if (!state.completedStages.includes(stage.id)) state.completedStages.push(stage.id);

    if (stage.id === 'review1') state.readingSessionsSinceBrain += 1;
    if (stage.id === 'brain') state.readingSessionsSinceBrain = 0;

    state.currentStage = nextStage;
    saveState();
    renderAll();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function progressPercent() {
    const total = stages.reduce((sum,s) => sum + s.checks.length, 0);
    const done = stages.reduce((sum,s) => sum + state.checks[s.id].filter(Boolean).length, 0);
    return total ? Math.round(done / total * 100) : 0;
  }

  function renderMethod() {
    const idx = currentStageIndex();
    const stage = stages[idx];
    $('#heroTitle').textContent = stage.hero;
    $('#heroDescription').textContent = stage.description;
    $('#stageChip').textContent = `Etapa ${idx+1} de ${stages.length}`;
    const pct = progressPercent();
    $('#progressFill').style.width = `${pct}%`;
    $('#progressText').textContent = `${pct}% do método`;
    $('#sessionCounter').textContent = `${state.readingSessionsSinceBrain} ${state.readingSessionsSinceBrain === 1 ? 'sessão' : 'sessões'} desde o 2º cérebro`;

    $('#stageNumber').textContent = stage.number;
    $('#stageTitle').textContent = stage.title;
    $('#stageSubtitle').textContent = stage.subtitle;
    $('#stageIntro').textContent = stage.intro;

    const list = $('#stageChecklist');
    list.innerHTML = '';
    stage.checks.forEach((label, i) => {
      const row = document.createElement('label');
      row.className = 'check-row';
      const box = document.createElement('input');
      box.type = 'checkbox';
      box.checked = isChecked(stage.id, i);
      box.setAttribute('aria-label', label);
      box.addEventListener('change', () => {
        state.checks[stage.id][i] = box.checked;
        saveState();
        renderAll(false);
      });
      const text = document.createElement('span');
      text.textContent = label;
      row.append(box, text);
      list.appendChild(row);
    });

    renderSupport(stage);
    renderStageActions(stage);
  }

  function renderSupport(stage) {
    const support = $('#stageSupport');
    support.hidden = false;
    if (stage.id === 'read') {
      const page = state.page ? `Página registrada: ${state.page}. ` : '';
      support.textContent = `${page}Quando encerrar a sessão, registre a página onde parou nas Configurações. Depois faça a 1ª revisão.`;
    } else if (stage.id === 'review2') {
      support.textContent = state.page ? `Depois dos Post-its, volte para a página ${state.page} e continue a leitura.` : 'Depois dos Post-its, volte exatamente à página onde parou e continue a leitura.';
    } else if (stage.id === 'brain') {
      support.textContent = 'Depois de organizar o Segundo Cérebro, volte ao ponto onde parou e continue a leitura normalmente.';
    } else if (stage.id === 'action') {
      support.textContent = 'Depois de executar esta prática, volte à Caderneta e escolha a próxima. Uma ação por vez.';
    } else {
      support.hidden = true;
      support.textContent = '';
    }
  }

  function renderStageActions(stage) {
    const actions = $('#stageActions');
    actions.innerHTML = '';

    const addButton = (label, kind, handler, disabled=false) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = kind === 'primary' ? 'primary-btn' : 'secondary-btn';
      btn.textContent = label;
      btn.disabled = disabled;
      btn.addEventListener('click', handler);
      actions.appendChild(btn);
    };

    const ready = stageIsComplete(stage.id);

    switch(stage.id) {
      case 'pre':
        addButton('Concluir pré-leitura e começar a ler', 'primary', () => completeCurrentStage('read'), !ready);
        break;
      case 'read':
        addButton('Terminei esta sessão', 'primary', () => completeCurrentStage('review1'), !ready);
        addButton('Terminei o livro', 'secondary', () => {
          if (!ready) return setMessage('Conclua os itens da leitura antes de finalizar o livro.');
          if (!state.completedStages.includes(stage.id)) state.completedStages.push(stage.id);
          setStage('finish');
        });
        break;
      case 'review1':
        addButton('Concluir 1ª revisão e fechar o livro', 'primary', () => completeCurrentStage('review2'), !ready);
        break;
      case 'review2':
        if (state.readingSessionsSinceBrain >= 3) {
          addButton('Concluir e organizar o Segundo Cérebro', 'primary', () => completeCurrentStage('brain'), !ready);
          addButton('Continuar leitura agora', 'secondary', () => completeCurrentStage('read'), !ready);
        } else {
          addButton(state.page ? `Voltar à página ${state.page} e continuar` : 'Continuar leitura de onde parei', 'primary', () => completeCurrentStage('read'), !ready);
        }
        break;
      case 'brain':
        addButton(state.page ? `Voltar à página ${state.page} e continuar` : 'Concluir e voltar à leitura', 'primary', () => completeCurrentStage('read'), !ready);
        break;
      case 'finish':
        addButton('Escolher prática e criar Plano de Ação', 'primary', () => completeCurrentStage('action'), !ready);
        break;
      case 'action':
        addButton('Concluir método deste livro', 'primary', () => {
          if (!ready) return setMessage('Conclua os itens do Plano de Ação antes de finalizar.');
          if (!state.completedStages.includes('action')) state.completedStages.push('action');
          saveState();
          renderAll(false);
          toast('Método concluído para este livro.');
        }, !ready);
        break;
    }
  }

  function renderOverview() {
    const list = $('#overviewList');
    list.innerHTML = '';
    stages.forEach(stage => {
      const count = state.checks[stage.id].filter(Boolean).length;
      const pct = Math.round(count / stage.checks.length * 100);
      const complete = stageIsComplete(stage.id);
      const item = document.createElement('article');
      item.className = `overview-item${complete ? ' is-complete' : ''}`;
      item.innerHTML = `
        <div class="overview-top">
          <div class="overview-mark">${complete ? '✓' : stage.number}</div>
          <div>
            <div class="overview-title">${escapeHtml(stage.title)}</div>
            <div class="overview-meta">${count} de ${stage.checks.length} itens concluídos</div>
          </div>
        </div>
        <div class="overview-progress"><span style="width:${pct}%"></span></div>`;
      item.addEventListener('click', () => {
        setView('method');
        setStage(stage.id);
      });
      list.appendChild(item);
    });
  }

  function escapeHtml(text) {
    return String(text).replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  }

  function renderHeaderAndSettings() {
    $('#headerBookName').textContent = state.bookTitle || 'Meu livro';
    $('#bookTitleInput').value = state.bookTitle || '';
    $('#pageInput').value = state.page || '';
  }

  function renderAll(renderMethodToo=true) {
    if (renderMethodToo) renderMethod();
    else {
      // Refresh the current method card without switching view.
      renderMethod();
    }
    renderOverview();
    renderHeaderAndSettings();
    renderTimer();
  }

  function setView(name) {
    $$('.view').forEach(v => v.classList.toggle('is-active', v.dataset.view === name));
    $$('.nav-item').forEach(b => b.classList.toggle('is-active', b.dataset.target === name));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function setMessage(text) {
    $('#stageMessage').textContent = text;
    window.setTimeout(() => { if ($('#stageMessage').textContent === text) $('#stageMessage').textContent = ''; }, 3200);
  }

  function toast(text) {
    const el = $('#toast');
    el.textContent = text;
    el.classList.add('is-visible');
    clearTimeout(toastHandle);
    toastHandle = setTimeout(() => el.classList.remove('is-visible'), 2600);
  }

  function openSettings() {
    $('#backdrop').hidden = false;
    $('#settingsDrawer').classList.add('is-open');
    $('#settingsDrawer').setAttribute('aria-hidden', 'false');
  }

  function closeSettings() {
    $('#settingsDrawer').classList.remove('is-open');
    $('#settingsDrawer').setAttribute('aria-hidden', 'true');
    setTimeout(() => { if (!$('#settingsDrawer').classList.contains('is-open')) $('#backdrop').hidden = true; }, 220);
  }

  function isIOS() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }

  function isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  }

  function openInstallFlow() {
    if (isStandalone()) return toast('O aplicativo já está instalado.');
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      deferredInstallPrompt.userChoice.finally(() => { deferredInstallPrompt = null; });
      return;
    }
    $('#installModal').hidden = false;
  }

  function closeInstallModal() {
    $('#installModal').hidden = true;
  }

  function exportBackup() {
    const backup = {
      app: 'metodo-de-leitura-pwa',
      version: APP_VERSION,
      exportedAt: new Date().toISOString(),
      theme: document.documentElement.dataset.theme,
      state
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeDate = new Date().toISOString().slice(0,10);
    a.href = url;
    a.download = `backup-metodo-leitura-${safeDate}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('Backup gerado.');
  }

  function restoreBackup(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const payload = parsed && parsed.state ? parsed.state : parsed;
        state = normalizeState(payload);
        saveState();
        if (parsed.theme) applyTheme(parsed.theme);
        renderAll();
        closeSettings();
        toast('Backup restaurado com sucesso.');
      } catch (_) {
        toast('Não foi possível restaurar este arquivo.');
      }
      $('#restoreInput').value = '';
    };
    reader.onerror = () => toast('Erro ao ler o arquivo de backup.');
    reader.readAsText(file);
  }

  function resetApp() {
    const ok = window.confirm('Apagar todo o progresso deste livro neste dispositivo? Esta ação não pode ser desfeita sem um backup.');
    if (!ok) return;
    state = defaultState();
    saveState();
    stopTimer();
    renderAll();
    closeSettings();
    setView('method');
    toast('Progresso apagado.');
  }

  function timerRemainingFromTimestamp() {
    if (!state.timer.running || !state.timer.startedAt) return state.timer.remaining;
    const elapsed = Math.max(0, Math.floor((Date.now() - new Date(state.timer.startedAt).getTime()) / 1000));
    return Math.max(0, state.timer.remaining - elapsed);
  }

  function renderTimer() {
    const remaining = timerRemainingFromTimestamp();
    const min = Math.floor(remaining / 60);
    const sec = remaining % 60;
    $('#timerValue').textContent = `${String(min).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
    $('#timerMode').textContent = state.timer.mode === 'break' ? 'Pausa' : 'Foco';
    $$('.pill-btn').forEach(btn => btn.classList.toggle('is-selected', Number(btn.dataset.minutes) === state.timer.preset));
  }

  function tickTimer() {
    const remaining = timerRemainingFromTimestamp();
    if (remaining <= 0) {
      stopTimer(false);
      if (state.timer.mode === 'focus') {
        state.timer.mode = 'break';
        state.timer.remaining = 300;
        state.timer.startedAt = null;
        state.timer.running = false;
        saveState();
        renderTimer();
        toast('Foco concluído. Faça 5 minutos de pausa.');
      } else {
        state.timer.mode = 'focus';
        state.timer.remaining = state.timer.preset * 60;
        saveState();
        renderTimer();
        toast('Pausa concluída.');
      }
      return;
    }
    renderTimer();
  }

  function startTimer() {
    if (state.timer.running) return;
    state.timer.running = true;
    state.timer.startedAt = new Date().toISOString();
    saveState();
    clearInterval(timerHandle);
    timerHandle = setInterval(tickTimer, 500);
    renderTimer();
  }

  function stopTimer(persistRemaining=true) {
    if (persistRemaining && state.timer.running) state.timer.remaining = timerRemainingFromTimestamp();
    state.timer.running = false;
    state.timer.startedAt = null;
    clearInterval(timerHandle);
    timerHandle = null;
    saveState();
    renderTimer();
  }

  function resetTimer() {
    stopTimer(false);
    state.timer.mode = 'focus';
    state.timer.remaining = state.timer.preset * 60;
    saveState();
    renderTimer();
  }

  function setTimerPreset(minutes) {
    stopTimer(false);
    state.timer.preset = minutes === 15 ? 15 : 25;
    state.timer.mode = 'focus';
    state.timer.remaining = state.timer.preset * 60;
    saveState();
    renderTimer();
  }

  function registerServiceWorker() {
    if ('serviceWorker' in navigator && location.protocol === 'https:') {
      navigator.serviceWorker.register('/service-worker.js').catch(() => {});
    }
  }

  function attachEvents() {
    $$('.nav-item').forEach(btn => btn.addEventListener('click', () => setView(btn.dataset.target)));
    $('#themeToggle').addEventListener('click', () => applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
    $('#settingsBtn').addEventListener('click', openSettings);
    $('#closeSettingsBtn').addEventListener('click', closeSettings);
    $('#backdrop').addEventListener('click', closeSettings);
    $('#darkChoice').addEventListener('click', () => applyTheme('dark'));
    $('#lightChoice').addEventListener('click', () => applyTheme('light'));

    $('#bookTitleInput').addEventListener('input', e => {
      state.bookTitle = e.target.value.slice(0,120) || 'Meu livro';
      saveState();
      $('#headerBookName').textContent = state.bookTitle;
    });
    $('#pageInput').addEventListener('input', e => {
      const raw = e.target.value.trim();
      state.page = raw === '' ? '' : String(clampInt(raw, 0, 99999, 0));
      saveState();
      renderSupport(stages[currentStageIndex()]);
      renderStageActions(stages[currentStageIndex()]);
    });

    $('#backupBtn').addEventListener('click', exportBackup);
    $('#restoreInput').addEventListener('change', e => restoreBackup(e.target.files?.[0]));
    $('#resetAppBtn').addEventListener('click', resetApp);

    $('#installBtn').addEventListener('click', openInstallFlow);
    $('#installFromSettings').addEventListener('click', openInstallFlow);
    $('#closeInstallModal').addEventListener('click', closeInstallModal);
    $('#installModal').addEventListener('click', e => { if (e.target.id === 'installModal') closeInstallModal(); });
    $('#shareAppBtn').addEventListener('click', async () => {
      if (navigator.share) {
        try { await navigator.share({ title: 'Método de Leitura', text: 'Guia interativo do método de leitura', url: location.href }); } catch (_) {}
      } else {
        toast('Use o botão Compartilhar do Safari.');
      }
    });

    $('#timerStart').addEventListener('click', startTimer);
    $('#timerPause').addEventListener('click', () => stopTimer(true));
    $('#timerReset').addEventListener('click', resetTimer);
    $$('.pill-btn').forEach(btn => btn.addEventListener('click', () => setTimerPreset(Number(btn.dataset.minutes))));

    window.addEventListener('beforeinstallprompt', e => {
      e.preventDefault();
      deferredInstallPrompt = e;
    });

    window.addEventListener('appinstalled', () => {
      deferredInstallPrompt = null;
      toast('Aplicativo instalado.');
    });

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && state.timer.running) tickTimer();
    });
  }

  function init() {
    initializeTheme();
    attachEvents();
    renderAll();
    if (state.timer.running) {
      timerHandle = setInterval(tickTimer, 500);
      tickTimer();
    }
    if (isIOS()) $('#installHelpText').textContent = 'No iPhone/iPad: Safari → Compartilhar → Adicionar à Tela de Início.';
    registerServiceWorker();
  }

  init();
})();
