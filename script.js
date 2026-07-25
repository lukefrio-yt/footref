let partCount = 0;
let matches = JSON.parse(localStorage.getItem('matches')) || [];
let activeMatch = null;

// Proměnné časovačů
let timerInterval = null;
let currentPartIndex = 1;
let mainTimeRemaining = 0;
let addedTimeRemaining = 0;
let isTimerRunning = false;
let isMainTimeDone = false;
let autoFinishNoExtra = false;
let confirmCallback = null;

// Skóre
let goalsTeam1 = 0;
let goalsTeam2 = 0;

// Storage pro střídání a karty
let activePlayersTeam1 = [];
let benchPlayersTeam1 = [];
let activePlayersTeam2 = [];
let benchPlayersTeam2 = [];

let subsUsedTeam1 = 0;
let subsUsedTeam2 = 0;
let currentSubTeamNum = 1;

let selectedSubOffPlayer = null;
let selectedSubOnPlayer = null;

let playerCardsStorage = {};
let currentCardTypeToAssign = 'yellow';

// Web Audio API
let audioCtx = null;

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('btn-go-to-setup').addEventListener('click', () => showScreen('screen-setup'));
    document.getElementById('btn-back-to-menu').addEventListener('click', () => showScreen('screen-menu'));
    document.getElementById('btn-back-from-detail').addEventListener('click', () => showScreen('screen-menu'));
    document.getElementById('btn-exit-timer').addEventListener('click', exitTimer);

    document.getElementById('btn-add-part').addEventListener('click', addPart);
    setupGameTypeSelection();
    document.getElementById('setup-form').addEventListener('submit', handleFormSubmit);

    // Ovládání časovačů
    document.getElementById('btn-toggle-timer').addEventListener('click', toggleTimer);
    document.getElementById('btn-reset-timer').addEventListener('click', resetTimer);

    // Rychlé přičítání a reset přidaného času
    document.getElementById('btn-add-1m').addEventListener('click', () => addQuickTime(1));
    document.getElementById('btn-add-2m').addEventListener('click', () => addQuickTime(2));
    document.getElementById('btn-add-5m').addEventListener('click', () => addQuickTime(5));
    document.getElementById('btn-reset-added-time').addEventListener('click', resetAddedTime);

    // Přepínač ukončení hned po základní době
    document.getElementById('btn-toggle-auto-finish').addEventListener('click', toggleAutoFinish);

    // Tlačítka Karty
    document.getElementById('btn-trigger-yellow').addEventListener('click', () => triggerCardShow('yellow'));
    document.getElementById('btn-trigger-red').addEventListener('click', () => triggerCardShow('red'));
    document.getElementById('btn-card-next').addEventListener('click', openPlayerSelectionModal);
    document.getElementById('btn-close-player-select').addEventListener('click', () => {
        document.getElementById('select-player-modal').classList.add('hidden');
    });

    // Střídání modal tlačítka
    document.getElementById('btn-sub-cancel').addEventListener('click', () => {
        document.getElementById('sub-modal').classList.add('hidden');
    });
    document.getElementById('btn-sub-confirm').addEventListener('click', processSubstitution);

    // Modal tlačítka
    document.getElementById('btn-modal-add').addEventListener('click', addMinutesFromModal);
    document.getElementById('btn-modal-finish').addEventListener('click', finishCurrentPart);

    // Custom confirm dialog tlačítka
    document.getElementById('btn-confirm-cancel').addEventListener('click', closeConfirmModal);
    document.getElementById('btn-confirm-ok').addEventListener('click', () => {
        closeConfirmModal();
        if (confirmCallback) confirmCallback();
    });

    setupClickSounds();
    addPart();
    addPart();
    renderMatchesList();
});

// SYNTÉZA ČISTÉ A HLADKÉ PÍŠŤALKY
function generateWhistleBuffer(duration) {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const sampleRate = audioCtx.sampleRate;
    const frameCount = sampleRate * duration;
    const buffer = audioCtx.createBuffer(1, frameCount, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < frameCount; i++) {
        const t = i / sampleRate;
        const freq1 = Math.sin(2 * Math.PI * 2600 * t);
        const freq2 = Math.sin(2 * Math.PI * 2660 * t);
        
        let envelope = 1;
        if (t < 0.02) envelope = t / 0.02;
        if (t > duration - 0.03) envelope = (duration - t) / 0.03;

        data[i] = (freq1 + freq2) * 0.35 * envelope;
    }
    return buffer;
}

function playSingleWhistle(duration, delay = 0) {
    setTimeout(() => {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const source = audioCtx.createBufferSource();
        source.buffer = generateWhistleBuffer(duration);
        source.connect(audioCtx.destination);
        source.start();
    }, delay);
}

function playWhistle(type) {
    if (type === 'short') {
        playSingleWhistle(0.18);
    } else if (type === 'long') {
        playSingleWhistle(0.75);
    } else if (type === 'combo') {
        playSingleWhistle(0.18, 0);
        playSingleWhistle(0.65, 250);
    }
}

function playClickSound() {
    try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.05);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.05);
    } catch (e) {}
}

function playAlarmSound() {
    try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        for (let i = 0; i < 3; i++) {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(880, audioCtx.currentTime + i * 0.2);
            gain.gain.setValueAtTime(0.2, audioCtx.currentTime + i * 0.2);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + i * 0.2 + 0.15);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(audioCtx.currentTime + i * 0.2);
            osc.stop(audioCtx.currentTime + i * 0.2 + 0.15);
        }
    } catch (e) {}
}

function triggerVibration() {
    if ("vibrate" in navigator) {
        navigator.vibrate([500, 200, 500, 200, 800]);
    }
}

function showCustomConfirm(title, message, callback, okText = "OK") {
    document.getElementById('confirm-title').innerText = title;
    document.getElementById('confirm-message').innerText = message;
    document.getElementById('btn-confirm-ok').innerText = okText;
    confirmCallback = callback;
    document.getElementById('custom-confirm-modal').classList.remove('hidden');
}

function closeConfirmModal() {
    document.getElementById('custom-confirm-modal').classList.add('hidden');
}

function setupClickSounds() {
    document.querySelectorAll('.btn-sound').forEach(btn => {
        btn.addEventListener('click', playClickSound);
    });
}

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

function addPart() {
    const container = document.getElementById('parts-container');
    partCount++;

    if (partCount > 1) {
        const breakDiv = document.createElement('div');
        breakDiv.className = 'break-row';
        breakDiv.innerHTML = `
            <div>⏱️ Přestávka po ${partCount - 1}. části:</div>
            <div><input type="number" value="15" min="0" max="60" class="break-duration"> min</div>
        `;
        container.appendChild(breakDiv);
    }

    const partDiv = document.createElement('div');
    partDiv.className = 'part-row';
    partDiv.innerHTML = `
        <div><strong>${partCount}. část</strong> (Délka):</div>
        <div><input type="number" value="45" min="1" max="120" class="part-duration"> min</div>
    `;
    container.appendChild(partDiv);
}

function setupGameTypeSelection() {
    const optGk = document.getElementById('opt-gk');
    const optLast = document.getElementById('opt-last');
    const gkBox1 = document.getElementById('gk-container-1');
    const gkBox2 = document.getElementById('gk-container-2');

    optGk.addEventListener('click', function() {
        optGk.classList.add('active');
        optLast.classList.remove('active');
        optGk.querySelector('input').checked = true;
        gkBox1.classList.remove('hidden');
        gkBox2.classList.remove('hidden');
    });

    optLast.addEventListener('click', function() {
        optLast.classList.add('active');
        optGk.classList.remove('active');
        optLast.querySelector('input').checked = true;
        gkBox1.classList.add('hidden');
        gkBox2.classList.add('hidden');
    });
}

function parsePlayersList(str) {
    if (!str) return [];
    return str.split(',').map(s => s.trim()).filter(s => s.length > 0);
}

function handleFormSubmit(e) {
    e.preventDefault();
    const isWithGk = document.querySelector('input[name="gk_mode"]:checked').value === 'with_gk';
    const partInputs = document.querySelectorAll('.part-duration');
    const partDurations = Array.from(partInputs).map(input => parseInt(input.value) || 45);

    const matchData = {
        id: Date.now(),
        name: document.getElementById('match-name').value,
        isWithGk: isWithGk,
        maxSubsPerPart: parseInt(document.getElementById('max-subs-per-part').value) || 3,
        team1: {
            name: document.getElementById('team1-name').value,
            gk: isWithGk ? document.getElementById('team1-gk').value : '',
            playersList: parsePlayersList(document.getElementById('team1-players').value),
            subsList: parsePlayersList(document.getElementById('team1-subs').value)
        },
        team2: {
            name: document.getElementById('team2-name').value,
            gk: isWithGk ? document.getElementById('team2-gk').value : '',
            playersList: parsePlayersList(document.getElementById('team2-players').value),
            subsList: parsePlayersList(document.getElementById('team2-subs').value)
        },
        partDurations: partDurations,
        partsCount: partDurations.length
    };

    matches.push(matchData);
    localStorage.setItem('matches', JSON.stringify(matches));
    document.getElementById('setup-form').reset();
    showScreen('screen-menu');
    renderMatchesList();
}

function renderMatchesList() {
    const listContainer = document.getElementById('matches-list');
    listContainer.innerHTML = '';

    if (matches.length === 0) {
        listContainer.innerHTML = '<div class="empty-state">Zatím nemáš vytvořený žádný zápas.</div>';
        return;
    }

    matches.forEach(match => {
        const item = document.createElement('div');
        item.className = 'match-item btn-sound';
        item.innerHTML = `
            <div>
                <div class="match-item-title">${match.name}</div>
                <div class="match-item-teams">${match.team1.name} vs ${match.team2.name} (${match.partsCount} části)</div>
            </div>
            <span style="color: var(--accent-green); font-weight: bold; font-size: 1.2rem;">›</span>
        `;
        item.addEventListener('click', () => {
            playClickSound();
            openMatchDetail(match);
        });
        listContainer.appendChild(item);
    });
}

function openMatchDetail(match) {
    activeMatch = match;
    document.getElementById('detail-title').innerText = match.name;
    const content = document.getElementById('detail-content');

    content.innerHTML = `
        <div class="card">
            <h3>Týmy</h3>
            <p><strong>${match.team1.name}</strong> ${match.team1.gk ? '(BR: ' + match.team1.gk + ')' : ''}</p>
            <p style="color: var(--text-sub); font-size: 0.85rem;">Základ: ${match.team1.playersList.join(', ') || 'Neuvedeno'}</p>
            <p style="color: var(--text-sub); font-size: 0.85rem;">Střídačka: ${match.team1.subsList.join(', ') || 'Žádní'}</p>
            <hr style="border-color: var(--border-color); margin: 10px 0;">
            <p><strong>${match.team2.name}</strong> ${match.team2.gk ? '(BR: ' + match.team2.gk + ')' : ''}</p>
            <p style="color: var(--text-sub); font-size: 0.85rem;">Základ: ${match.team2.playersList.join(', ') || 'Neuvedeno'}</p>
            <p style="color: var(--text-sub); font-size: 0.85rem;">Střídačka: ${match.team2.subsList.join(', ') || 'Žádní'}</p>
        </div>

        <div class="card">
            <h3>Info o zápase</h3>
            <p>Typ hry: <strong>${match.isWithGk ? 'S brankářem' : 'Na posledního'}</strong></p>
            <p>Max. střídání na část: <strong>${match.maxSubsPerPart}</strong></p>
            <p>Počet částí: <strong>${match.partsCount}</strong></p>
        </div>

        <button id="btn-start-live-match" class="btn-start btn-sound">▶ Spustit zápas (Stopky)</button>
    `;

    document.getElementById('btn-start-live-match').addEventListener('click', () => {
        playClickSound();
        startLiveMatch(match);
    });

    showScreen('screen-detail');
}

// ZÁPAS & STOPKY
function startLiveMatch(match) {
    activeMatch = match;
    currentPartIndex = 1;
    goalsTeam1 = 0;
    goalsTeam2 = 0;
    playerCardsStorage = {};
    autoFinishNoExtra = false;

    activePlayersTeam1 = [...match.team1.playersList];
    benchPlayersTeam1 = [...match.team1.subsList];

    activePlayersTeam2 = [...match.team2.playersList];
    benchPlayersTeam2 = [...match.team2.subsList];

    subsUsedTeam1 = 0;
    subsUsedTeam2 = 0;

    updateAutoFinishButtonUI();
    initPart(currentPartIndex);
    showScreen('screen-timer');
}

function initPart(partNum) {
    pauseTimer();
    isMainTimeDone = false;
    addedTimeRemaining = 0;

    subsUsedTeam1 = 0;
    subsUsedTeam2 = 0;

    document.getElementById('timer-match-title').innerText = activeMatch.name;
    document.getElementById('timer-part-indicator').innerText = `${partNum}. Část z ${activeMatch.partsCount}`;
    document.getElementById('scoreboard-team1').innerText = activeMatch.team1.name;
    document.getElementById('scoreboard-team2').innerText = activeMatch.team2.name;

    document.getElementById('goals-team1-name').innerText = activeMatch.team1.name;
    document.getElementById('goals-team2-name').innerText = activeMatch.team2.name;

    updateGoalsDisplay();
    renderPlayerAccordionLists();
    updateSubstitutionButtonsUI();

    const durationMinutes = activeMatch.partDurations[partNum - 1] || 45;
    mainTimeRemaining = durationMinutes * 60;

    updateTimerDisplay();
}

function changeGoals(teamNum, delta) {
    if (teamNum === 1) {
        goalsTeam1 = Math.max(0, goalsTeam1 + delta);
    } else {
        goalsTeam2 = Math.max(0, goalsTeam2 + delta);
    }
    updateGoalsDisplay();
}

function updateGoalsDisplay() {
    document.getElementById('goals-team1-display').innerText = goalsTeam1;
    document.getElementById('goals-team2-display').innerText = goalsTeam2;
}

// STŘÍDÁNÍ - 2 SEZNAMY + VALIDACE STEJNÉHO HRÁČE
function openSubstitutionModal(teamNum) {
    currentSubTeamNum = teamNum;
    selectedSubOffPlayer = null;
    selectedSubOnPlayer = null;

    const team = teamNum === 1 ? activeMatch.team1 : activeMatch.team2;
    const subsUsed = teamNum === 1 ? subsUsedTeam1 : subsUsedTeam2;

    document.getElementById('sub-modal-title').innerText = `Střídání - ${team.name}`;
    document.getElementById('sub-modal-info').innerText = `Využito střídání: ${subsUsed} / ${activeMatch.maxSubsPerPart}`;

    renderSubLists();
    document.getElementById('sub-modal').classList.remove('hidden');
}

function renderSubLists() {
    const activeList = currentSubTeamNum === 1 ? activePlayersTeam1 : activePlayersTeam2;
    const benchList = currentSubTeamNum === 1 ? benchPlayersTeam1 : benchPlayersTeam2;

    const listOffEl = document.getElementById('sub-list-off');
    const listOnEl = document.getElementById('sub-list-on');

    listOffEl.innerHTML = '';
    listOnEl.innerHTML = '';

    if (activeList.length === 0) {
        listOffEl.innerHTML = '<li style="color:var(--text-sub); cursor:default;">Žádní hráči</li>';
    } else {
        activeList.forEach(player => {
            const li = document.createElement('li');
            li.textContent = player;
            if (selectedSubOffPlayer === player) li.classList.add('selected');
            li.onclick = () => {
                selectedSubOffPlayer = (selectedSubOffPlayer === player) ? null : player;
                renderSubLists();
                validateSubForm();
            };
            listOffEl.appendChild(li);
        });
    }

    if (benchList.length === 0) {
        listOnEl.innerHTML = '<li style="color:var(--text-sub); cursor:default;">Žádní náhradníci</li>';
    } else {
        benchList.forEach(player => {
            const li = document.createElement('li');
            li.textContent = player;
            if (selectedSubOnPlayer === player) li.classList.add('selected');
            li.onclick = () => {
                selectedSubOnPlayer = (selectedSubOnPlayer === player) ? null : player;
                renderSubLists();
                validateSubForm();
            };
            listOnEl.appendChild(li);
        });
    }

    validateSubForm();
}

function validateSubForm() {
    const btn = document.getElementById('btn-sub-confirm');
    const isValid = selectedSubOffPlayer && selectedSubOnPlayer && (selectedSubOffPlayer !== selectedSubOnPlayer);
    btn.disabled = !isValid;
}

function processSubstitution() {
    if (!selectedSubOffPlayer || !selectedSubOnPlayer || selectedSubOffPlayer === selectedSubOnPlayer) return;

    const activeList = currentSubTeamNum === 1 ? activePlayersTeam1 : activePlayersTeam2;
    const benchList = currentSubTeamNum === 1 ? benchPlayersTeam1 : benchPlayersTeam2;

    const offIndex = activeList.indexOf(selectedSubOffPlayer);
    const onIndex = benchList.indexOf(selectedSubOnPlayer);

    if (offIndex !== -1 && onIndex !== -1) {
        activeList[offIndex] = selectedSubOnPlayer;
        benchList[onIndex] = selectedSubOffPlayer;

        if (currentSubTeamNum === 1) subsUsedTeam1++;
        else subsUsedTeam2++;

        document.getElementById('sub-modal').classList.add('hidden');
        renderPlayerAccordionLists();
        updateSubstitutionButtonsUI();
        playClickSound();
    }
}

function updateSubstitutionButtonsUI() {
    const btn1 = document.getElementById('btn-sub-team1');
    const btn2 = document.getElementById('btn-sub-team2');

    btn1.innerText = `🔄 Střídat ${activeMatch.team1.name} (${subsUsedTeam1}/${activeMatch.maxSubsPerPart})`;
    btn2.innerText = `🔄 Střídat ${activeMatch.team2.name} (${subsUsedTeam2}/${activeMatch.maxSubsPerPart})`;

    btn1.disabled = subsUsedTeam1 >= activeMatch.maxSubsPerPart || benchPlayersTeam1.length === 0;
    btn2.disabled = subsUsedTeam2 >= activeMatch.maxSubsPerPart || benchPlayersTeam2.length === 0;
}

// HRÁČI ROZBALOVACÍ SEZNAM
function togglePlayerList(teamNum) {
    const listEl = document.getElementById(`player-list-${teamNum}`);
    listEl.classList.toggle('hidden');
}

function renderPlayerAccordionLists() {
    [1, 2].forEach(teamNum => {
        const listEl = document.getElementById(`player-list-${teamNum}`);
        const team = teamNum === 1 ? activeMatch.team1 : activeMatch.team2;
        const activeList = teamNum === 1 ? activePlayersTeam1 : activePlayersTeam2;
        let html = '';

        if (team.gk) {
            const gkCards = playerCardsStorage[team.gk] || { yellow: 0, red: 0 };
            html += `<div class="player-item-row">
                <span>🧤 ${team.gk} (BR)</span>
                <div>${getCardIconsHtml(gkCards)}</div>
            </div>`;
        }

        if (activeList && activeList.length > 0) {
            activeList.forEach(pName => {
                const pCards = playerCardsStorage[pName] || { yellow: 0, red: 0 };
                html += `<div class="player-item-row">
                    <span>🏃 ${pName}</span>
                    <div>${getCardIconsHtml(pCards)}</div>
                </div>`;
            });
        } else if (!team.gk) {
            html = '<div style="color:var(--text-sub);">Žádní hráči na hřišti</div>';
        }

        listEl.innerHTML = html;
    });
}

function getCardIconsHtml(cards) {
    if (cards.red > 0) {
        return '<span class="card-icon">🟥</span>';
    }
    let icons = '';
    for (let i = 0; i < cards.yellow; i++) icons += '<span class="card-icon">🟨</span>';
    return icons;
}

// CELOOBRAZOVKOVÁ KARTA
function triggerCardShow(type) {
    currentCardTypeToAssign = type;

    const overlay = document.getElementById('card-fullscreen');
    overlay.className = 'fullscreen-card-overlay';
    
    if (type === 'yellow') {
        overlay.classList.add('yellow-bg');
    } else {
        overlay.classList.add('red-bg');
    }

    overlay.classList.remove('hidden');
}

function openPlayerSelectionModal() {
    document.getElementById('card-fullscreen').classList.add('hidden');
    renderCardPlayerSelection();
    document.getElementById('select-player-modal').classList.remove('hidden');
}

function renderCardPlayerSelection() {
    document.getElementById('card-select-team1-title').innerText = activeMatch.team1.name;
    document.getElementById('card-select-team2-title').innerText = activeMatch.team2.name;

    const container1 = document.getElementById('card-select-team1-list');
    const container2 = document.getElementById('card-select-team2-list');

    container1.innerHTML = buildPlayerButtonsHtml(activeMatch.team1, activePlayersTeam1);
    container2.innerHTML = buildPlayerButtonsHtml(activeMatch.team2, activePlayersTeam2);
}

function buildPlayerButtonsHtml(team, activeList) {
    let all = [];
    if (team.gk) all.push(team.gk + ' (BR)');
    if (activeList) all = all.concat(activeList);

    if (all.length === 0) return '<div style="color:var(--text-sub); font-size:0.8rem;">Bez hráčů</div>';

    return all.map(pName => {
        const cleanName = pName.replace(' (BR)', '');
        const cards = playerCardsStorage[cleanName] || { yellow: 0, red: 0 };
        return `
            <button class="btn-select-player btn-sound" onclick="assignCardToPlayer('${cleanName}')">
                <span>${pName}</span>
                <div>${getCardIconsHtml(cards)}</div>
            </button>
        `;
    }).join('');
}

function assignCardToPlayer(playerName) {
    if (!playerCardsStorage[playerName]) {
        playerCardsStorage[playerName] = { yellow: 0, red: 0 };
    }

    const playerStats = playerCardsStorage[playerName];

    if (currentCardTypeToAssign === 'yellow') {
        if (playerStats.red > 0) {
            showCustomConfirm('Chyba!', `Hráč "${playerName}" již má červenou kartu a byl vyloučen!`, () => {}, "Rozumím");
            return;
        }

        if (playerStats.yellow >= 1) {
            showCustomConfirm(
                '⚠️ Druhá žlutá karta!',
                `Hráč "${playerName}" už žlutou má. Dostává druhou žlutou a tím ČERVENOU kartu!`,
                () => {
                    playerStats.yellow = 0;
                    playerStats.red = 1;
                    document.getElementById('select-player-modal').classList.add('hidden');
                    renderPlayerAccordionLists();
                    triggerCardShow('red');
                },
                "Zobrazit červenou kartu"
            );
            return;
        }

        playerStats.yellow++;
    } else if (currentCardTypeToAssign === 'red') {
        if (playerStats.red >= 1) {
            showCustomConfirm('Chyba!', `Hráč "${playerName}" již červenou kartu dostal dříve!`, () => {}, "Rozumím");
            return;
        }

        playerStats.yellow = 0;
        playerStats.red++;
    }

    document.getElementById('select-player-modal').classList.add('hidden');
    renderPlayerAccordionLists();
    playClickSound();
}

// OVLÁDÁNÍ ČASOVAČE
function toggleTimer() {
    if (isTimerRunning) {
        pauseTimer();
    } else {
        startTimer();
    }
}

function startTimer() {
    if (isTimerRunning) return;
    isTimerRunning = true;

    const btn = document.getElementById('btn-toggle-timer');
    btn.innerText = '⏸ Pozastavit';
    btn.className = 'btn-timer-ctrl btn-pause btn-sound';

    timerInterval = setInterval(() => {
        if (!isMainTimeDone) {
            if (mainTimeRemaining > 0) {
                mainTimeRemaining--;
            } else {
                isMainTimeDone = true;
                playAlarmSound();
                triggerVibration();

                if (autoFinishNoExtra) {
                    finishCurrentPart();
                } else if (addedTimeRemaining <= 0) {
                    pauseTimer();
                    document.getElementById('time-up-modal').classList.remove('hidden');
                }
            }
        } else {
            if (addedTimeRemaining > 0) {
                addedTimeRemaining--;
            } else {
                pauseTimer();
                playAlarmSound();
                triggerVibration();
                document.getElementById('time-up-modal').classList.remove('hidden');
            }
        }
        updateTimerDisplay();
    }, 1000);
}

function pauseTimer() {
    isTimerRunning = false;
    clearInterval(timerInterval);

    const btn = document.getElementById('btn-toggle-timer');
    btn.innerText = '▶ Spustit';
    btn.className = 'btn-timer-ctrl btn-play btn-sound';
}

function resetTimer() {
    showCustomConfirm(
        'Restartovat časovače',
        'Opravdu chceš restartovat oba časovače pro tuto část?',
        () => {
            initPart(currentPartIndex);
        }
    );
}

function updateTimerDisplay() {
    const m = Math.floor(mainTimeRemaining / 60);
    const s = mainTimeRemaining % 60;
    document.getElementById('timer-display').innerText = 
        `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

    const addedBox = document.getElementById('added-timer-box');
    
    // Pokud je aktivní možnost ukondčit zápas ihned, rámeček NIKDY neukazujeme
    if (autoFinishNoExtra) {
        addedBox.classList.add('hidden');
    } else if (addedTimeRemaining > 0 || isMainTimeDone) {
        addedBox.classList.remove('hidden');
        const am = Math.floor(addedTimeRemaining / 60);
        const as = addedTimeRemaining % 60;
        document.getElementById('added-timer-display').innerText = 
            `+${am.toString().padStart(2, '0')}:${as.toString().padStart(2, '0')}`;
    } else {
        addedBox.classList.add('hidden');
    }
}

function addQuickTime(minutes) {
    addedTimeRemaining += minutes * 60;
    playClickSound();
    updateTimerDisplay();
}

function resetAddedTime() {
    addedTimeRemaining = 0;
    playClickSound();
    updateTimerDisplay();
}

function toggleAutoFinish() {
    autoFinishNoExtra = !autoFinishNoExtra;
    updateAutoFinishButtonUI();
    updateTimerDisplay();
    playClickSound();
}

function updateAutoFinishButtonUI() {
    const btn = document.getElementById('btn-toggle-auto-finish');
    const icon = document.getElementById('auto-finish-icon');
    if (autoFinishNoExtra) {
        btn.classList.add('active');
        icon.innerText = '✓';
    } else {
        btn.classList.remove('active');
        icon.innerText = '❌';
    }
}

function addMinutesFromModal() {
    const val = parseInt(document.getElementById('modal-add-input').value) || 0;
    const minutes = Math.min(Math.max(val, 1), 15);

    addedTimeRemaining += minutes * 60;
    document.getElementById('time-up-modal').classList.add('hidden');
    updateTimerDisplay();
    startTimer();
}

function finishCurrentPart() {
    document.getElementById('time-up-modal').classList.add('hidden');
    pauseTimer();

    if (currentPartIndex < activeMatch.partsCount) {
        showCustomConfirm(
            'Konec části',
            `Konec ${currentPartIndex}. části! Převést zápas na další část?`,
            () => {
                currentPartIndex++;
                initPart(currentPartIndex);
            }
        );
    } else {
        showCustomConfirm(
            'Konec zápasu',
            'Zápas byl úspěšně ukončen. Chceš se vrátit do hlavního menu?',
            () => {
                showScreen('screen-menu');
            }
        );
    }
}

function exitTimer() {
    showCustomConfirm(
        'Opustit zápas',
        'Opravdu chceš opustit časovač? Stopky se pozastaví.',
        () => {
            pauseTimer();
            showScreen('screen-menu');
        }
    );
}