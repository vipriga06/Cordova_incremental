/**
    Licensed to the Apache Software Foundation (ASF) under one
    or more contributor license agreements.  See the NOTICE file
    distributed with this work for additional information
    regarding copyright ownership.  The ASF licenses this file
    to you under the Apache License, Version 2.0 (the
    "License"); you may not use this file except in compliance
    with the License.  You may obtain a copy of the License at

        http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing,
    software distributed under the License is distributed on an
    "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
    KIND, either express or implied.  See the License for the
    specific language governing permissions and limitations
    under the License.
*/

const state = {
    wool: 0,
    perClick: 1,
    upgradeCost: 5,
    bonus: 1,
    totalWoolEarned: 0,
    totalClicks: 0,
    passiveIncome: 0,
    passiveIncomeRate: 0,
    level: 1,
    multiplier: 1,
    passiveBuffer: 0,
    critChance: 0.1,
    critMultiplier: 2,
    comboCount: 0,
    comboMultiplier: 1,
    lastClickTime: 0,
};

function formatLana(value) {
    const v = Math.max(0, value);
    if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(2)}B`;
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(2)}K`;
    return Math.floor(v).toString();
}

// Inicia en DOM listo o después de deviceready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGame);
} else {
    initGame();
}
document.addEventListener('deviceready', initGame, false);

function initGame() {
    setupGame();
    fetchBonus();
    startPassiveIncome();
    startWindfallEvents();
    startComboDecay();
}

function setupGame() {
    console.log('setupGame iniciado');
    const area = document.getElementById('game-area');
    const sheep = document.getElementById('sheep');
    const shearBtn = document.getElementById('shear-btn');
    const upgradeBtn = document.getElementById('upgrade-btn');
    const refreshBtn = document.getElementById('refresh-bonus');
    const menuPlay = document.getElementById('menu-play');
    const menuChallenges = document.getElementById('menu-challenges');
    const menuStore = document.getElementById('menu-store');
    const menuOptions = document.getElementById('menu-options');

    console.log('Elementos:', { sheep, shearBtn, upgradeBtn, refreshBtn });

    // Clic directo en botón esquilar
    if (shearBtn) {
        shearBtn.addEventListener('click', (e) => {
            console.log('Click en shearBtn');
            shearSheep();
        });
    }

    // Clic en oveja
    if (sheep) {
        sheep.addEventListener('click', (e) => {
            console.log('Click en sheep');
            shearSheep();
        });
    }

    if (upgradeBtn) {
        upgradeBtn.addEventListener('click', buyUpgrade);
    }
    if (refreshBtn) {
        refreshBtn.addEventListener('click', fetchBonus);
    }

    menuPlay?.addEventListener('click', () => openModal('modal-play'));
    menuChallenges?.addEventListener('click', () => openModal('modal-challenges'));
    menuStore?.addEventListener('click', () => openModal('modal-store'));
    menuOptions?.addEventListener('click', () => openModal('modal-options'));

    // Event listeners para opciones
    const soundToggle = document.getElementById('sound-toggle');
    const animToggle = document.getElementById('animations-toggle');
    
    if (soundToggle) {
        soundToggle.addEventListener('change', (e) => {
            localStorage.setItem('soundEnabled', e.target.checked);
        });
    }
    
    if (animToggle) {
        animToggle.addEventListener('change', (e) => {
            localStorage.setItem('animationsEnabled', e.target.checked);
        });
    }

    // Event listeners para botones de modales
    const btnClosePlay = document.getElementById('btn-close-play');
    const btnResetGame = document.getElementById('btn-reset-game');
    const btnCloseChallenges = document.getElementById('btn-close-challenges');
    const btnCloseStore = document.getElementById('btn-close-store');
    const btnCloseOptions = document.getElementById('btn-close-options');

    if (btnClosePlay) {
        btnClosePlay.addEventListener('click', () => closeModal('modal-play'));
    }
    if (btnResetGame) {
        btnResetGame.addEventListener('click', resetGame);
    }
    if (btnCloseChallenges) {
        btnCloseChallenges.addEventListener('click', () => closeModal('modal-challenges'));
    }
    if (btnCloseStore) {
        btnCloseStore.addEventListener('click', () => closeModal('modal-store'));
    }
    if (btnCloseOptions) {
        btnCloseOptions.addEventListener('click', () => closeModal('modal-options'));
    }

    updateHud();
    console.log('setupGame completado');
}

function shearSheep() {
    console.log('shearSheep llamada');
    const now = Date.now();
    const withinCombo = state.lastClickTime && (now - state.lastClickTime) < 2000;
    if (withinCombo) {
        state.comboCount += 1;
    } else {
        state.comboCount = 1;
    }
    state.lastClickTime = now;
    const prevComboMultiplier = state.comboMultiplier;
    state.comboMultiplier = Math.min(1 + 0.1 * (state.comboCount - 1), 3); // hasta x3
    if (state.comboMultiplier > prevComboMultiplier) {
        addLog(`Combo x${state.comboMultiplier.toFixed(1)} (+${state.comboCount} golpes)`);
    }

    const isCrit = Math.random() < state.critChance;
    const critFactor = isCrit ? state.critMultiplier : 1;
    const gain = Math.round(state.perClick * state.bonus * state.multiplier * critFactor * state.comboMultiplier);
    console.log('Ganancia:', gain, 'perClick:', state.perClick, 'bonus:', state.bonus, 'critico:', isCrit);
    state.wool += gain;
    state.totalWoolEarned += gain;
    state.totalClicks += 1;
    console.log('Lana total:', state.wool);
    animateSheep();
    updateHud();
    addLog(isCrit ? `¡CRÍTICO! +${formatLana(gain)} lana` : `+${formatLana(gain)} lana`);
    checkLevelUp();
    
    // Efecto visual flotante
    const sheep = document.getElementById('sheep');
    const rect = sheep.getBoundingClientRect();
    showFloatingText(isCrit ? `★+${formatLana(gain)}` : `+${formatLana(gain)}`, rect.left + rect.width / 2, rect.top);
}

function animateSheep() {
    const sheep = document.getElementById('sheep');
    sheep.classList.add('hit');
    setTimeout(() => sheep.classList.remove('hit'), 140);
}

function showFloatingText(text, x, y) {
    const floatingText = document.createElement('div');
    floatingText.textContent = text;
    floatingText.style.position = 'fixed';
    floatingText.style.left = x + 'px';
    floatingText.style.top = y + 'px';
    floatingText.style.pointerEvents = 'none';
    floatingText.style.color = '#0f9b0f';
    floatingText.style.fontWeight = 'bold';
    floatingText.style.fontSize = '20px';
    floatingText.style.zIndex = '50';
    floatingText.style.textShadow = '2px 2px 4px rgba(0,0,0,0.3)';
    floatingText.style.animation = 'float-up 1s ease-out forwards';
    
    document.body.appendChild(floatingText);
    setTimeout(() => floatingText.remove(), 1000);
}
function buyUpgrade() {
    if (state.wool < state.upgradeCost) {
        addLog('Necesitas más lana para mejorar.');
        return;
    }

    state.wool -= state.upgradeCost;
    state.perClick += 1;
    state.upgradeCost = Math.round(state.upgradeCost * 1.8 + 1);
    updateHud();
    addLog('Tijeras mejoradas: +1 lana por clic.');
}

function fetchBonus() {
    const statusEl = document.getElementById('api-status');
    statusEl.textContent = 'Bonus API: cargando...';

    const xhr = new XMLHttpRequest();
    xhr.open('GET', 'https://jsonplaceholder.typicode.com/todos/1');
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const data = JSON.parse(xhr.responseText);
                    const extra = ((data.id % 3) + 1) * 0.1;
                    state.bonus = 1 + extra;
                    statusEl.textContent = `Bonus API: x${state.bonus.toFixed(1)}`;
                    document.getElementById('bonus').textContent = `x${state.bonus.toFixed(1)}`;
                    addLog('Bonus actualizado via AJAX.');
                } catch (err) {
                    handleBonusError();
                }
            } else {
                handleBonusError();
            }
        }
    };
    xhr.onerror = handleBonusError;
    xhr.send();
}

function handleBonusError() {
    const statusEl = document.getElementById('api-status');
    state.bonus = 1;
    statusEl.textContent = 'Bonus API: sin conexion';
    document.getElementById('bonus').textContent = 'x1.0';
    addLog('No se pudo obtener bonus, usando x1.0.');
}

function updateHud() {
    document.getElementById('score').textContent = formatLana(state.wool);
    document.getElementById('per-catch').textContent = formatLana(state.perClick);
    document.getElementById('upgrade-cost').textContent = formatLana(state.upgradeCost);
    document.getElementById('bonus').textContent = `x${state.bonus.toFixed(1)}`;
    document.getElementById('level').textContent = state.level;
    document.getElementById('passive-income').textContent = formatLana(state.passiveIncome);
    document.getElementById('multiplier').textContent = `x${state.multiplier.toFixed(1)}`;
    const comboEl = document.getElementById('combo');
    if (comboEl) {
        comboEl.textContent = state.comboMultiplier > 1 ? `x${state.comboMultiplier.toFixed(1)}` : 'x1.0';
    }
}

function addLog(text) {
    const log = document.getElementById('log');
    const entry = document.createElement('p');
    entry.textContent = text;
    log.prepend(entry);
    while (log.children.length > 5) {
        log.removeChild(log.lastChild);
    }
}

// Modal functions
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
        
        // Actualizar contenido específico por modal
        if (modalId === 'modal-play') {
            document.getElementById('play-wool').textContent = formatLana(state.wool);
            document.getElementById('play-level').textContent = state.level;
            document.getElementById('play-total-wool').textContent = formatLana(state.totalWoolEarned);
            document.getElementById('play-clicks').textContent = state.totalClicks;
            document.getElementById('play-per-click').textContent = formatLana(state.perClick);
            document.getElementById('play-passive').textContent = formatLana(state.passiveIncome);
            document.getElementById('play-multiplier').textContent = `x${state.multiplier.toFixed(1)}`;
            document.getElementById('play-bonus').textContent = `x${state.bonus.toFixed(1)}`;
        } else if (modalId === 'modal-store') {
            document.getElementById('store-wool').textContent = formatLana(state.wool);
            populateStore();
        } else if (modalId === 'modal-challenges') {
            populateChallenges();
        } else if (modalId === 'modal-options') {
            const soundToggle = document.getElementById('sound-toggle');
            const animToggle = document.getElementById('animations-toggle');
            soundToggle.checked = localStorage.getItem('soundEnabled') !== 'false';
            animToggle.checked = localStorage.getItem('animationsEnabled') !== 'false';
        }
        
        // Cerrar al hacer clic en el fondo oscuro (fuera del modal)
        modal.addEventListener('click', function closeOnOverlay(e) {
            if (e.target === modal) {
                closeModal(modalId);
                modal.removeEventListener('click', closeOnOverlay);
            }
        });
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
    }
}

function resetGame() {
    if (confirm('¿Estás seguro? Se perderá todo el progreso.')) {
        state.wool = 0;
        state.perClick = 1;
        state.upgradeCost = 5;
        state.totalWoolEarned = 0;
        state.totalClicks = 0;
        state.passiveIncome = 0;
        state.passiveIncomeRate = 0;
        state.level = 1;
        state.multiplier = 1;
        state.passiveBuffer = 0;
        state.comboCount = 0;
        state.comboMultiplier = 1;
        state.lastClickTime = 0;
        state.bonus = 1;
        updateHud();
        closeModal('modal-play');
        addLog('Juego reseteado. ¡A empezar de nuevo!');
    }
}

const storeItems = [
    { name: 'Mejora de esquila (+1)', cost: 5, effect: 'perClick', value: 1, description: 'Gana +1 lana por clic' },
    { name: 'Super Mejora (+5)', cost: 40, effect: 'perClick', value: 5, description: 'Gana +5 lana por clic' },
    { name: 'Obrero automático', cost: 50, effect: 'passiveIncome', value: 0.1, description: 'Genera lana pasivamente: +0.1/seg' },
    { name: 'Empleado dedicado', cost: 150, effect: 'passiveIncome', value: 0.5, description: 'Genera lana pasivamente: +0.5/seg' },
    { name: 'Multiplicador x1.5', cost: 100, effect: 'multiplier', value: 1.5, description: 'Multiplica tu lana ganada ×1.5' },
    { name: 'Multiplicador x2', cost: 250, effect: 'multiplier', value: 2, description: 'Multiplica tu lana ganada ×2' },
    { name: 'Bonus temporal (x1.5)', cost: 80, effect: 'bonus', value: 0.5, description: 'Aumenta bonus actual ×1.5' },
    { name: 'Tijeras Mágicas', cost: 300, effect: 'perClick', value: 15, description: 'Gana +15 lana por clic (premium)' },
    { name: 'Granja Automática', cost: 500, effect: 'passiveIncome', value: 2, description: 'Genera lana pasivamente: +2/seg' },
    { name: 'Super Multiplicador x5', cost: 1000, effect: 'multiplier', value: 5, description: 'Multiplica tu lana ganada ×5 (legendario)' },
];

function populateStore() {
    const storeContainer = document.getElementById('store-items');
    storeContainer.innerHTML = '';
    
    storeItems.forEach((item, idx) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'store-item';
        
        const infoDiv = document.createElement('div');
        infoDiv.className = 'store-item-info';
        infoDiv.innerHTML = `
            <div class="store-item-name">${item.name}</div>
            <div class="store-item-cost">Costo: ${formatLana(item.cost)} lana</div>
            <div class="store-item-description">${item.description}</div>
        `;
        
        const btn = document.createElement('button');
        btn.className = state.wool >= item.cost ? 'primary store-item-btn' : 'ghost store-item-btn';
        btn.textContent = 'Comprar';
        btn.disabled = state.wool < item.cost;
        btn.addEventListener('click', () => buyItem(idx));
        
        itemDiv.appendChild(infoDiv);
        itemDiv.appendChild(btn);
        storeContainer.appendChild(itemDiv);
    });
}

function buyItem(itemIdx) {
    const item = storeItems[itemIdx];
    
    if (state.wool < item.cost) {
        const faltante = Math.max(0, Math.round(item.cost - state.wool));
        addLog(`Necesitas ${formatLana(faltante)} más lana.`);
        return;
    }
    
    state.wool -= item.cost;
    
    if (item.effect === 'perClick') {
        state.perClick += item.value;
        addLog(`¡Mejora! Ahora ganas +${item.value} lana por clic.`);
    } else if (item.effect === 'bonus') {
        state.bonus = Math.min(state.bonus + item.value, 5);
        addLog(`¡Bonus aumentado! Ahora es x${state.bonus.toFixed(1)}`);
    } else if (item.effect === 'passiveIncome') {
        state.passiveIncome += item.value;
        state.passiveIncomeRate = state.passiveIncome;
        addLog(`¡Obrero contratado! Ahora ganas +${item.value}/seg.`);
    } else if (item.effect === 'multiplier') {
        state.multiplier *= item.value;
        addLog(`¡Multiplicador activado! Tu ganancia se multiplica ×${item.value}`);
    }
    
    updateHud();
    document.getElementById('store-wool').textContent = formatLana(state.wool);
    populateStore();
}

const challenges = [
    { name: 'Primer clic', description: 'Esquila la oveja una vez', check: () => state.totalClicks >= 1, reward: '10 lana' },
    { name: 'Trabajador', description: 'Realiza 10 clics', check: () => state.totalClicks >= 10, reward: '50 lana' },
    { name: 'Recolector', description: 'Acumula 100 lana totales', check: () => state.totalWoolEarned >= 100, reward: '100 lana' },
    { name: 'Granjero', description: 'Gana 1000 lana totales', check: () => state.totalWoolEarned >= 1000, reward: '500 lana' },
    { name: 'Empresario', description: 'Compra una mejora de tienda', check: () => state.perClick > 1 || state.passiveIncome > 0 || state.multiplier > 1, reward: '200 lana' },
    { name: 'Inversor', description: 'Compra 5 mejoras de tienda', check: () => (state.perClick - 1) + state.passiveIncome * 10 + (state.multiplier - 1) >= 5, reward: '1000 lana' },
    { name: 'Constructor', description: 'Multiplica tu ganancia por 2', check: () => state.multiplier >= 2, reward: '300 lana' },
    { name: 'Maestro', description: 'Gana 50 lana por clic', check: () => state.perClick >= 50, reward: '2000 lana' },
    { name: 'Magnate', description: 'Acumula 10000 lana totales', check: () => state.totalWoolEarned >= 10000, reward: '5000 lana' },
    { name: 'Legenda', description: 'Multiplica tu ganancia por 5', check: () => state.multiplier >= 5, reward: 'Gloria eterna' },
];

function populateChallenges() {
    const challengesContainer = document.getElementById('challenges-list');
    challengesContainer.innerHTML = '';
    
    challenges.forEach((challenge) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'challenge-item';
        
        const isCompleted = challenge.check();
        
        itemDiv.innerHTML = `
            <div class="challenge-name">${isCompleted ? '⭐ ' : ''}${challenge.name}</div>
            <div class="challenge-progress">${challenge.description}</div>
            <div class="challenge-reward">Recompensa: ${challenge.reward}</div>
            ${isCompleted ? '<div class="challenge-completed">✓ Completado</div>' : '<div class="challenge-pending">Pendiente</div>'}
        `;
        
        challengesContainer.appendChild(itemDiv);
    });
}

function startPassiveIncome() {
    setInterval(() => {
        if (state.passiveIncome > 0) {
            state.passiveBuffer += state.passiveIncome * state.multiplier;
            const whole = Math.floor(state.passiveBuffer);
            if (whole >= 1) {
                state.wool += whole;
                state.totalWoolEarned += whole;
                state.passiveBuffer -= whole;
                updateHud();
            }
        }
    }, 1000);
}

function startWindfallEvents() {
    setInterval(() => {
        const base = 25 + Math.random() * 75; // 25 a 100 lana base
        const bonus = base * state.multiplier * state.bonus;
        const gain = Math.max(1, Math.round(bonus));
        state.wool += gain;
        state.totalWoolEarned += gain;
        updateHud();
        addLog(`¡Recompensa del campo! +${formatLana(gain)} lana`);
        const sheep = document.getElementById('sheep');
        if (sheep) {
            const rect = sheep.getBoundingClientRect();
            showFloatingText(`🍀 +${formatLana(gain)}`, rect.left + rect.width / 2, rect.top - 10);
        }
    }, 15000);
}

function startComboDecay() {
    setInterval(() => {
        const now = Date.now();
        const idle = now - state.lastClickTime;
        if (state.comboCount > 0 && idle > 2000) {
            state.comboCount = 0;
            state.comboMultiplier = 1;
            updateHud();
        }
    }, 1000);
}

function checkLevelUp() {
    const requiredXP = state.level * 100;
    if (state.totalClicks >= requiredXP) {
        state.level += 1;
        addLog(`¡NIVEL UP! Ahora eres nivel ${state.level}`);
        updateHud();
    }
}
