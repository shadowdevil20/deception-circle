// ========== GLOBAL STATE ==========
const gameState = {
    // Default roles
    defaultRoles: {
        detective: {
            name: "Detective",
            emoji: "👮",
            description: "Knows the word. Find the Spy without revealing it!",
            seesWord: true,
            isSpy: false,
            defaultCount: 3
        },
        spy: {
            name: "Spy",
            emoji: "🕵️",
            description: "Doesn't know the word. Must guess it without being discovered!",
            seesWord: false,
            isSpy: true,
            defaultCount: 1
        },
        mole: {
            name: "Mole",
            emoji: "🐭",
            description: "Knows the word but secretly helps the Spy guess it!",
            seesWord: true,
            isSpy: false,
            defaultCount: 0
        },
        liar: {
            name: "Liar",
            emoji: "🤥",
            description: "Knows the word but must lie on EVERY answer!",
            seesWord: true,
            isSpy: false,
            defaultCount: 0
        },
        usurper: {
            name: "Usurper",
            emoji: "👑",
            description: "Knows the word but tries to get mistaken for the Spy!",
            seesWord: true,
            isSpy: false,
            defaultCount: 0
        }
    },
    
    // Game state
    roles: {detective:3, spy:1, mole:0, liar:0, usurper:0},
    customRoles: {},
    currentPlayer: 0,
    totalPlayers: 4,
    players: [],
    word: "",
    spyIndex: -1,
    timerMinutes: 3,
    timerInterval: null,
    theme: 'dark',
    customWords: [],
    
    // Settings state
    rolePreset: 'standard',
    adminUnlocked: false,
    creatorUnlocked: false,
    
    // Tap tracking
    versionTapCount: 0,
    versionTapTimeout: null,
    
    // Keyboard state
    currentPassword: '',
    keyboardShift: false,
    keyboardMode: 'letters',
    passwordTimeout: null,
    lastKeyPressTime: 0
};

const words = ["Polar Bear","Penguin","Dolphin","Elephant","Giraffe","Skipping Rope","Dance","Swimming","Football","Pizza","Coffee","Garden","Beach","Sunset","Rainbow","Forest","Ocean","Mountain","Restaurant","Library","Hospital","Airport","Piano","Castle","Dragon","Birthday","Wedding","Carnival","Circus","Music","Vacation","Adventure","Treasure","Space Station","Robot","Superhero","Wizard","Unicorn","Pirate Ship"];
const questions = ["Is it something you can hold in your hand?","Is it larger than a basketball?","Can it be found indoors?","Is it typically colorful?","Does it make sound?","Is it associated with a specific season?","Can you eat or drink it?","Is it commonly found in nature?","Does it have moving parts?","Is it usually expensive?","Would a child be familiar with this?","Is it something you use every day?","Can you find it in most homes?","Is it man-made or natural?","Is it associated with a specific profession?","Would it fit inside a car?","Does it require electricity?","Is it something you wear?","Is it typically used for entertainment?","Can it be dangerous?"];

// ========== GAME FUNCTIONS (KEPT FROM ORIGINAL) ==========
function changeRole(role, delta) {
    const count = gameState.roles[role];
    const newCount = Math.max(0, count + delta);
    
    const roleData = gameState.customRoles[role] || gameState.defaultRoles[role];
    if (roleData?.isSpy && newCount > 1) {
        alert("Maximum 1 Spy role allowed!");
        return;
    }
    
    gameState.roles[role] = newCount;
    updateRoleSetupUI();
    updateTotalPlayers();
}

function updateTotalPlayers() {
    const total = Object.values(gameState.roles).reduce((a, b) => a + b, 0);
    gameState.totalPlayers = total;
    document.getElementById('totalPlayers').textContent = total;
}

function resetRoles() {
    for (const role in gameState.defaultRoles) {
        gameState.roles[role] = gameState.defaultRoles[role].defaultCount;
    }
    
    for (const role in gameState.customRoles) {
        gameState.roles[role] = 0;
    }
    
    updateRoleSetupUI();
    updateTotalPlayers();
}

function updateRoleSetupUI() {
    const container = document.getElementById('roleSetupContainer');
    if (!container) return;
    container.innerHTML = '';
    
    for (const [key, data] of Object.entries(gameState.defaultRoles)) {
        container.appendChild(createRoleSelector(key, data));
    }
    
    for (const [key, data] of Object.entries(gameState.customRoles)) {
        container.appendChild(createRoleSelector(key, data));
    }
}

function createRoleSelector(roleKey, roleData) {
    const div = document.createElement('div');
    div.className = 'role-selector';
    div.innerHTML = `
        <span class="role-name">
            <span class="role-emoji">${roleData.emoji}</span> ${roleData.name}
        </span>
        <div class="counter">
            <button onclick="changeRole('${roleKey}', -1)">-</button>
            <span id="${roleKey}Count">${gameState.roles[roleKey] || 0}</span>
            <button onclick="changeRole('${roleKey}', 1)">+</button>
        </div>
    `;
    return div;
}

function startGame() {
    if (gameState.totalPlayers < 3) {
        alert("Need at least 3 players!");
        return;
    }
    
    let spyCount = 0;
    for (const [roleKey, count] of Object.entries(gameState.roles)) {
        if (count > 0) {
            const roleData = gameState.customRoles[roleKey] || gameState.defaultRoles[roleKey];
            if (roleData?.isSpy) {
                spyCount += count;
            }
        }
    }
    
    if (spyCount === 0) {
        alert("Need at least 1 Spy role!");
        return;
    }
    
    gameState.players = [];
    for (let roleKey in gameState.roles) {
        for (let i = 0; i < gameState.roles[roleKey]; i++) {
            gameState.players.push({
                role: roleKey,
                data: gameState.customRoles[roleKey] || gameState.defaultRoles[roleKey]
            });
        }
    }
    
    for (let i = gameState.players.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [gameState.players[i], gameState.players[j]] = [gameState.players[j], gameState.players[i]];
    }
    
    gameState.spyIndex = gameState.players.findIndex(player => player.data.isSpy);
    
    const allWords = [...words, ...gameState.customWords];
    gameState.word = allWords[Math.floor(Math.random() * allWords.length)];
    gameState.currentPlayer = 0;
    
    showPage('passPage');
    document.getElementById('currentPlayerNum').textContent = 1;
}

function showRole() {
    const player = gameState.players[gameState.currentPlayer];
    const roleData = player.data;
    
    document.getElementById('playerRole').textContent = roleData.name;
    document.getElementById('roleInstruction').textContent = `As a ${roleData.name}, ${roleData.description}`;
    
    const wordDisplay = document.getElementById('wordDisplay');
    if (roleData.seesWord) {
        wordDisplay.textContent = gameState.word;
        wordDisplay.style.color = '#FFD166';
    } else {
        wordDisplay.textContent = '🔍 FIND THE SECRET WORD! 🔍';
        wordDisplay.style.color = '#FF6B6B';
    }
    
    const questionsList = document.getElementById('questionsList');
    questionsList.innerHTML = '';
    const shuffled = [...questions].sort(() => Math.random() - 0.5).slice(0, 5);
    shuffled.forEach(q => {
        const div = document.createElement('div');
        div.className = 'question-item';
        div.textContent = '• ' + q;
        div.onclick = () => {
            navigator.clipboard?.writeText(q);
        };
        questionsList.appendChild(div);
    });
    
    showPage('rolePage');
}

function backToPass() {
    showPage('passPage');
}

function nextPlayer() {
    gameState.currentPlayer++;
    if (gameState.currentPlayer >= gameState.totalPlayers) {
        startTimer();
    } else {
        document.getElementById('currentPlayerNum').textContent = gameState.currentPlayer + 1;
        showPage('passPage');
    }
}

function startTimer() {
    showPage('timerPage');
    const timerQuestions = document.getElementById('timerQuestions');
    timerQuestions.innerHTML = '';
    const shuffled = [...questions].sort(() => Math.random() - 0.5).slice(0, 8);
    shuffled.forEach(q => {
        const div = document.createElement('div');
        div.className = 'question-item';
        div.textContent = '• ' + q;
        timerQuestions.appendChild(div);
    });
    
    const objectivesDiv = document.getElementById('timerRoleObjectives');
    objectivesDiv.innerHTML = '';
    
    const uniqueRoles = {};
    gameState.players.forEach(player => {
        const roleKey = player.role;
        if (!uniqueRoles[roleKey]) {
            uniqueRoles[roleKey] = player.data;
        }
    });
    
    for (const roleData of Object.values(uniqueRoles)) {
        const p = document.createElement('p');
        p.innerHTML = `• <strong>${roleData.emoji} ${roleData.name}:</strong> ${roleData.description}`;
        objectivesDiv.appendChild(p);
    }
    
    let timeLeft = gameState.timerMinutes * 60;
    const timerDisplay = document.getElementById('timerDisplay');
    gameState.timerInterval = setInterval(() => {
        timeLeft--;
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        
        if (timeLeft <= 30) {
            timerDisplay.classList.add('warning');
        }
        if (timeLeft <= 0) {
            clearInterval(gameState.timerInterval);
            revealAll();
        }
    }, 1000);
}

function revealAll() {
    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
    }
    
    document.getElementById('finalWord').textContent = gameState.word;
    document.getElementById('spyPlayer').textContent = gameState.spyIndex + 1;
    
    const roleList = document.getElementById('finalRoleList');
    roleList.innerHTML = '';
    
    gameState.players.forEach((player, index) => {
        const roleData = player.data;
        const div = document.createElement('div');
        div.className = 'player-role';
        div.innerHTML = `<span>Player ${index + 1}</span><span>${roleData.emoji} ${roleData.name}</span>`;
        roleList.appendChild(div);
    });
    
    showPage('resultsPage');
}

function playAgain() {
    startGame();
}

function newGame() {
    showPage('gamePage');
}

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(pageId).classList.add('active');
    
    if (pageId !== 'settingsPage') {
        resetVersionTap();
    }
}

// ========== SETTINGS FUNCTIONS (KEPT FROM ORIGINAL) ==========
function openSettings() {
    renderSettingsContent();
    showPage('settingsPage');
}

function closeSettings() {
    showPage('gamePage');
}

let currentAdminTab = 'words';

function renderSettingsContent() {
    const content = document.getElementById('settingsContent');
    if (!content) return;
    content.innerHTML = '';
    
    // Add logout button if admin is unlocked
    if (gameState.adminUnlocked) {
        const logoutSection = document.createElement('div');
        logoutSection.className = 'settings-section';
        logoutSection.innerHTML = `
            <div class="section-title">🔐 Admin Session</div>
            <p class="compact-text">You are logged in as ${gameState.creatorUnlocked ? 'Creator' : 'Admin'}</p>
            <button class="btn btn-secondary" onclick="logout()" style="background: #FF6B6B;">Logout</button>
        `;
        content.appendChild(logoutSection);
    }
    
    // Appearance Section
    const appearanceSection = document.createElement('div');
    appearanceSection.className = 'settings-section';
    appearanceSection.innerHTML = `
        <div class="section-title">🎨 Appearance</div>
        <div class="theme-option ${gameState.theme === 'dark' ? 'selected' : ''}" onclick="changeTheme('dark')">
            <h4 style="font-size:14px;margin-bottom:3px;">🌙 Dark Mode</h4>
            <p class="compact-text">Dark background with vibrant colors</p>
        </div>
        <div class="theme-option ${gameState.theme === 'light' ? 'selected' : ''}" onclick="changeTheme('light')">
            <h4 style="font-size:14px;margin-bottom:3px;">☀️ Light Mode</h4>
            <p class="compact-text">Vibrant teal background</p>
        </div>
    `;
    content.appendChild(appearanceSection);
    
    // Gameplay Section
    const gameplaySection = document.createElement('div');
    gameplaySection.className = 'settings-section';
    gameplaySection.innerHTML = `
        <div class="section-title">🎮 Gameplay</div>
        <div style="margin-bottom: 12px;">
            <h4 style="color:#FF9A55; margin-bottom: 6px; font-size:14px;">Timer Duration</h4>
            <p style="text-align:center; margin-bottom: 6px; font-size:12px;">${gameState.timerMinutes} minutes</p>
            <input type="range" min="1" max="10" value="${gameState.timerMinutes}" style="width:100%" oninput="updateTimer(this.value)">
        </div>
        <div>
            <h4 style="color:#FF9A55; margin-bottom: 6px; font-size:14px;">Role Presets</h4>
            <select style="width:100%; padding:8px; border-radius:6px; background:rgba(255,255,255,0.1); color:white; border:1px solid rgba(255,255,255,0.2); font-size:12px;" 
                    onchange="changeRolePreset(this.value)">
                <option value="standard" ${gameState.rolePreset === 'standard' ? 'selected' : ''}>Standard (3 Detectives, 1 Spy)</option>
                <option value="large" ${gameState.rolePreset === 'large' ? 'selected' : ''}>Large Game (4 Detectives, 1 Spy, 1 Mole)</option>
                <option value="chaotic" ${gameState.rolePreset === 'chaotic' ? 'selected' : ''}>Chaotic (2 Detectives, 1 Spy, 1 Liar, 1 Usurper)</option>
                <option value="custom" ${gameState.rolePreset === 'custom' ? 'selected' : ''}>Custom Roles</option>
            </select>
        </div>
    `;
    content.appendChild(gameplaySection);
    
    // Personalization Section
    const personalizationSection = document.createElement('div');
    personalizationSection.className = 'settings-section';
    personalizationSection.innerHTML = `
        <div class="section-title">👤 Personalization</div>
        <div style="margin:6px 0; padding:6px; background:rgba(255,255,255,0.05); border-radius:6px;">
            <h4 style="color:#FF9A55; margin-bottom:3px; font-size:13px;">🎮 Creator</h4>
            <p class="compact-text">Happypratik</p>
        </div>
        <div style="margin:6px 0; padding:6px; background:rgba(255,255,255,0.05); border-radius:6px;">
            <h4 style="color:#4ECDC4; margin-bottom:3px; font-size:13px;">🖋️ Signature</h4>
            <p class="compact-text">Happy</p>
        </div>
        <div class="info-section compact-text">
            <p>This information cannot be changed and verifies the original creator of Deception Circle.</p>
        </div>
    `;
    content.appendChild(personalizationSection);
    
    // Game Rules Section
    const rulesSection = document.createElement('div');
    rulesSection.className = 'settings-section';
    rulesSection.innerHTML = `
        <div class="section-title">📘 Game Rules</div>
        <div class="rules-tabs">
            <button class="rules-tab active" onclick="switchRulesTab(0)">Overview</button>
            <button class="rules-tab" onclick="switchRulesTab(1)">Roles</button>
            <button class="rules-tab" onclick="switchRulesTab(2)">Flow</button>
            <button class="rules-tab" onclick="switchRulesTab(3)">Tips</button>
        </div>
        <div class="rules-content" id="rulesContent">
            <h4 style="color:#FF9A55;margin-bottom:6px;font-size:14px;">Welcome to Deception Circle!</h4>
            <p class="compact-text">Deception Circle is a social deduction game where players try to uncover hidden roles while protecting a secret word.</p>
            <p class="compact-text"><strong>Players:</strong> 3-8 players</p>
            <p class="compact-text"><strong>Time:</strong> ${gameState.timerMinutes} minutes per round</p>
            <p class="compact-text"><strong>Objective:</strong> Detectives find the Spy, Spy guesses the word!</p>
        </div>
    `;
    content.appendChild(rulesSection);
    
    // Admin Panel (if unlocked)
    if (gameState.adminUnlocked) {
        const adminSection = document.createElement('div');
        adminSection.className = 'settings-section';
        adminSection.innerHTML = `
            <div class="section-title">⭐ Admin Panel</div>
            <p class="compact-text">Welcome, Admin! You can manage words and create custom roles.</p>
            
            <div class="admin-tabs">
                <button class="admin-tab ${currentAdminTab === 'words' ? 'active' : ''}" onclick="switchAdminTab('words')">Words</button>
                <button class="admin-tab ${currentAdminTab === 'roles' ? 'active' : ''}" onclick="switchAdminTab('roles')">Roles</button>
            </div>
            
            <div id="adminTabContent"></div>
        `;
        content.appendChild(adminSection);
        renderAdminTabContent();
    }
    
    // About Section
    const aboutSection = document.createElement('div');
    aboutSection.className = 'settings-section';
    aboutSection.innerHTML = `
        <div class="section-title">ℹ️ About</div>
        <div style="text-align:center; margin:12px 0;">
            <h3 style="color:#4ECDC4;font-size:16px;">Deception Circle</h3>
            <p class="compact-text">Social Deduction Party Game</p>
        </div>
        <div style="margin:6px 0; padding:6px; background:rgba(255,255,255,0.05); border-radius:6px;">
            <p class="compact-text"><strong>Version:</strong> <span id="versionNumber" onclick="handleVersionTap()" style="cursor:pointer;color:#FF9A55;">2.0.0</span></p>
            <p class="compact-text"><strong>Created by:</strong> Happypratik</p>
            <p class="compact-text"><strong>Copyright:</strong> © 2024 All Rights Reserved</p>
        </div>
    `;
    content.appendChild(aboutSection);
}

function renderAdminTabContent() {
    const container = document.getElementById('adminTabContent');
    if (!container) return;
    
    if (currentAdminTab === 'words') {
        container.innerHTML = `
            <div class="admin-section">
                <h4 style="color:#FF9A55;margin:12px 0 6px 0;font-size:14px;">Word Manager</h4>
                <div class="input-group">
                    <input type="text" id="newWordInput" placeholder="Add a new secret word">
                    <button class="btn" onclick="addCustomWord()" style="white-space:nowrap; padding:8px 10px; font-size:12px;">Add</button>
                </div>
                
                <div class="word-list">
                    <h5 style="color:#4ECDC4;margin:10px 0 6px 0;font-size:13px;">Custom Words (${gameState.customWords.length})</h5>
                    ${gameState.customWords.length === 0 ? 
                        '<p style="text-align:center;color:#888;padding:12px;font-size:12px;">No custom words yet</p>' : 
                        gameState.customWords.map((word, index) => `
                            <div class="word-item">
                                <span>${word}</span>
                                <button class="delete-btn" onclick="removeCustomWord(${index})">Delete</button>
                            </div>
                        `).join('')
                    }
                </div>
            </div>
        `;
    } else {
        container.innerHTML = `
            <div class="admin-section">
                <h4 style="color:#FF9A55;margin:12px 0 6px 0;font-size:14px;">Role Manager</h4>
                
                <div class="card compact-padding">
                    <h5 style="color:#4ECDC4;margin-bottom:8px;font-size:13px;">Create New Role</h5>
                    
                    <div class="type-selector" id="roleTypeSelector">
                        <div class="type-option selected" onclick="selectRoleType('good')">👤 Role</div>
                    </div>
                    
                    <div class="input-group">
                        <input type="text" id="newRoleName" placeholder="Role Name (e.g., Traitor)">
                    </div>
                    
                    <div class="input-group">
                        <input type="text" id="newRoleEmoji" placeholder="Emoji (e.g., 🎭)" maxlength="3">
                    </div>
                    
                    <div class="input-group">
                        <textarea id="newRoleDescription" placeholder="Role Description (e.g., Knows the word but must always tell the truth)"></textarea>
                    </div>
                    
                    <div style="margin:10px 0; padding:8px; background:rgba(255,255,255,0.05); border-radius:6px;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                            <span style="font-size:12px;">👀 Can see the secret word?</span>
                            <label class="toggle-switch">
                                <input type="checkbox" id="roleSeesWord" checked>
                                <span class="toggle-slider"></span>
                            </label>
                        </div>
                        
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span style="font-size:12px;">🕵️ Is this a Spy role? (Max 1 per game)</span>
                            <label class="toggle-switch">
                                <input type="checkbox" id="roleIsSpy">
                                <span class="toggle-slider"></span>
                            </label>
                        </div>
                    </div>
                    
                    <button class="btn btn-secondary" onclick="addCustomRole()" style="font-size:12px;">➕ Add Custom Role</button>
                </div>
                
                <div class="role-list">
                    <h5 style="color:#4ECDC4;margin:10px 0 6px 0;font-size:13px;">Custom Roles (${Object.keys(gameState.customRoles).length})</h5>
                    ${Object.keys(gameState.customRoles).length === 0 ? 
                        '<p style="text-align:center;color:#888;padding:12px;font-size:12px;">No custom roles yet</p>' : 
                        Object.entries(gameState.customRoles).map(([key, role], index) => `
                            <div class="role-item">
                                <div style="display:flex; align-items:center;">
                                    <div class="role-icon-preview">${role.emoji}</div>
                                    <div class="role-info">
                                        <div style="font-weight:bold;font-size:12px;">${role.name}</div>
                                        <div style="font-size:10px;color:#888;">${role.description}</div>
                                        <div style="font-size:9px; margin-top:2px;">
                                            ${role.seesWord ? '👀 Sees word' : '👁️‍🗨️ Blind'} • 
                                            ${role.isSpy ? '🕵️ Spy role' : '👤 Regular role'}
                                        </div>
                                    </div>
                                </div>
                                <button class="delete-btn" onclick="removeCustomRole('${key}')">Delete</button>
                            </div>
                        `).join('')
                    }
                </div>
            </div>
        `;
    }
}

function switchAdminTab(tab) {
    currentAdminTab = tab;
    renderSettingsContent();
}

function selectRoleType(type) {
    const options = document.querySelectorAll('#roleTypeSelector .type-option');
    options.forEach(opt => opt.classList.remove('selected'));
    
    const selected = document.querySelector(`#roleTypeSelector .type-option`);
    selected.classList.add('selected');
}

function switchRulesTab(index) {
    const content = document.getElementById('rulesContent');
    const tabs = document.querySelectorAll('.rules-tab');
    
    tabs.forEach(tab => tab.classList.remove('active'));
    tabs[index].classList.add('active');
    
    const rulesContent = [
        `<h4 style="color:#FF9A55;margin-bottom:6px;font-size:14px;">Overview</h4>
         <p class="compact-text">Deception Circle is a social deduction game where players try to uncover hidden roles while protecting a secret word.</p>
         <p class="compact-text"><strong>Players:</strong> 3-8 players</p>
         <p class="compact-text"><strong>Time:</strong> ${gameState.timerMinutes} minutes per round</p>
         <p class="compact-text"><strong>Objective:</strong> Detectives find the Spy, Spy guesses the word!</p>`,
         
        `<h4 style="color:#FF9A55;margin-bottom:6px;font-size:14px;">Roles</h4>
         <div style="margin:6px 0;">
             ${Object.values(gameState.defaultRoles).map(role => `
                 <p class="compact-text"><strong>${role.emoji} ${role.name}:</strong> ${role.description}</p>
             `).join('')}
             ${Object.values(gameState.customRoles).map(role => `
                 <p class="compact-text"><strong>${role.emoji} ${role.name}:</strong> ${role.description} <span style="color:#FF9A55;font-size:9px;">(Custom)</span></p>
             `).join('')}
         </div>`,
         
        `<h4 style="color:#FF9A55;margin-bottom:6px;font-size:14px;">Game Flow</h4>
         <ol style="margin-left:12px;font-size:12px;line-height:1.4;">
             <li>Setup roles and distribute devices</li>
             <li>Each player sees their secret role (except Spy sees no word)</li>
             <li>${gameState.timerMinutes}-minute questioning phase begins</li>
             <li>Players ask yes/no questions about the word</li>
             <li>When timer ends or Spy is caught, roles are revealed</li>
             <li>Spy wins if they guess the word, Detectives win if they catch Spy</li>
         </ol>`,
         
        `<h4 style="color:#FF9A55;margin-bottom:6px;font-size:14px;">Tips & Strategies</h4>
         <div style="margin:6px 0;">
             <p class="compact-text"><strong>For Detectives:</strong> Ask vague questions that test knowledge without revealing the word.</p>
             <p class="compact-text"><strong>For Spy:</strong> Listen carefully to questions and answers to deduce the word.</p>
             <p class="compact-text"><strong>For Special Roles:</strong> Blend in but fulfill your secret objective.</p>
             <p class="compact-text"><strong>Sample Questions:</strong> "Is it something you can hold?" "Is it larger than a basketball?" "Can it be found indoors?"</p>
         </div>`
    ];
    
    content.innerHTML = rulesContent[index];
}

function changeTheme(theme) {
    gameState.theme = theme;
    localStorage.setItem('theme', theme);
    
    if (theme === 'light') {
        document.body.classList.add('light-mode');
    } else {
        document.body.classList.remove('light-mode');
    }
    
    renderSettingsContent();
}

function updateTimer(value) {
    gameState.timerMinutes = parseInt(value);
    localStorage.setItem('timerMinutes', value);
    renderSettingsContent();
}

function changeRolePreset(preset) {
    gameState.rolePreset = preset;
    localStorage.setItem('rolePreset', preset);
    
    switch(preset) {
        case 'standard':
            for (const role in gameState.roles) {
                gameState.roles[role] = 0;
            }
            gameState.roles.detective = 3;
            gameState.roles.spy = 1;
            break;
        case 'large':
            for (const role in gameState.roles) {
                gameState.roles[role] = 0;
            }
            gameState.roles.detective = 4;
            gameState.roles.spy = 1;
            gameState.roles.mole = 1;
            break;
        case 'chaotic':
            for (const role in gameState.roles) {
                gameState.roles[role] = 0;
            }
            gameState.roles.detective = 2;
            gameState.roles.spy = 1;
            gameState.roles.liar = 1;
            gameState.roles.usurper = 1;
            break;
        case 'custom':
            break;
    }
    
    updateRoleSetupUI();
    updateTotalPlayers();
    renderSettingsContent();
}

// ========== TAP SYSTEM (KEPT FROM ORIGINAL) ==========
function handleVersionTap() {
    const versionElement = document.getElementById('versionNumber');
    
    if (gameState.versionTapTimeout) {
        clearTimeout(gameState.versionTapTimeout);
    }
    
    gameState.versionTapCount++;
    
    switch(gameState.versionTapCount) {
        case 1:
            versionElement.style.color = '#FF9A55';
            versionElement.classList.add('tap-animation');
            break;
        case 3:
            versionElement.style.color = '#F27A3A';
            versionElement.style.fontSize = '1.1em';
            versionElement.classList.add('tap-animation');
            break;
        case 5:
            versionElement.style.color = '#FF6B6B';
            versionElement.style.fontWeight = 'bold';
            versionElement.classList.add('tap-animation');
            break;
        case 6:
            versionElement.style.color = '#FFD166';
            versionElement.style.animation = 'spin 0.5s';
            
            openChoiceModal();
            
            setTimeout(() => {
                gameState.versionTapCount = 0;
                versionElement.style.color = '#FF9A55';
                versionElement.style.fontSize = '';
                versionElement.style.fontWeight = '';
                versionElement.style.animation = '';
            }, 500);
            return;
    }
    
    setTimeout(() => {
        versionElement.classList.remove('tap-animation');
    }, 300);
    
    gameState.versionTapTimeout = setTimeout(() => {
        gameState.versionTapCount = 0;
        versionElement.style.color = '#FF9A55';
        versionElement.style.fontSize = '';
        versionElement.style.fontWeight = '';
        versionElement.style.animation = '';
    }, 2000);
}

function resetVersionTap() {
    gameState.versionTapCount = 0;
    const versionElement = document.getElementById('versionNumber');
    if (versionElement) {
        versionElement.style.color = '#FF9A55';
        versionElement.style.fontSize = '';
        versionElement.style.fontWeight = '';
        versionElement.style.animation = '';
    }
    if (gameState.versionTapTimeout) {
        clearTimeout(gameState.versionTapTimeout);
    }
}

// ========== CHOICE MODAL FUNCTIONS (KEPT FROM ORIGINAL) ==========
function openChoiceModal() {
    document.getElementById('choiceModal').classList.add('active');
}

function closeChoiceModal() {
    document.getElementById('choiceModal').classList.remove('active');
}

// ========== KEYBOARD FUNCTIONS (KEPT FROM ORIGINAL) ==========
function openKeyboard() {
    gameState.currentPassword = '';
    gameState.keyboardShift = false;
    gameState.keyboardMode = 'letters';
    
    const modal = document.getElementById('keyboardModal');
    closeChoiceModal();
    renderKeyboard();
    updatePasswordPreview(true);
    modal.classList.add('active');
}

function closeKeyboard() {
    document.getElementById('keyboardModal').classList.remove('active');
    gameState.currentPassword = '';
    updatePasswordPreview(true);
}

function renderKeyboard() {
    const keyboard = document.getElementById('keyboard');
    if (!keyboard) return;
    keyboard.innerHTML = '';
    
    const layout = gameState.keyboardMode === 'letters' ? 
        getLetterLayout() : getNumberLayout();
    
    layout.forEach(row => {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'keyboard-row';
        
        row.keys.forEach(key => {
            const keyDiv = document.createElement('div');
            keyDiv.className = `key ${key.special ? 'key-special' : ''} ${key.action ? 'key-' + key.action : ''}`;
            keyDiv.textContent = key.label;
            
            if (key.action === 'space') {
                keyDiv.classList.add('key-space');
            }
            
            keyDiv.addEventListener('touchstart', (e) => {
                e.preventDefault();
                handleKeyPress(key);
            });
            
            keyDiv.addEventListener('click', () => {
                handleKeyPress(key);
            });
            
            rowDiv.appendChild(keyDiv);
        });
        
        keyboard.appendChild(rowDiv);
    });
}

function getLetterLayout() {
    return [
        {keys: [{label: 'Q'}, {label: 'W'}, {label: 'E'}, {label: 'R'}, {label: 'T'}, {label: 'Y'}, {label: 'U'}, {label: 'I'}, {label: 'O'}, {label: 'P'}]},
        {keys: [{label: 'A'}, {label: 'S'}, {label: 'D'}, {label: 'F'}, {label: 'G'}, {label: 'H'}, {label: 'J'}, {label: 'K'}, {label: 'L'}]},
        {keys: [
            {label: '⇧', action: 'shift', special: true},
            {label: 'Z'}, {label: 'X'}, {label: 'C'}, {label: 'V'}, {label: 'B'}, {label: 'N'}, {label: 'M'},
            {label: '⌫', action: 'backspace', special: true}
        ]},
        {keys: [
            {label: '123', action: 'mode', special: true},
            {label: 'Space', action: 'space', special: true},
            {label: '⌫', action: 'backspace', special: true}
        ]}
    ];
}

function getNumberLayout() {
    return [
        {keys: [{label: '1'}, {label: '2'}, {label: '3'}, {label: '4'}, {label: '5'}, {label: '6'}, {label: '7'}, {label: '8'}, {label: '9'}, {label: '0'}]},
        {keys: [
            {label: '@'}, {label: '#'}, {label: '$'}, {label: '%'}, {label: '&'}, {label: '*'}, {label: '-'}, {label: '_'}, {label: '+'}
        ]},
        {keys: [
            {label: 'ABC', action: 'mode', special: true},
            {label: '('}, {label: ')'}, {label: '!'}, {label: '?'}, {label: '.'}, {label: ','},
            {label: '⌫', action: 'backspace', special: true}
        ]}
    ];
}

function handleKeyPress(key) {
    if (gameState.passwordTimeout) {
        clearTimeout(gameState.passwordTimeout);
    }
    
    switch(key.action) {
        case 'shift':
            gameState.keyboardShift = !gameState.keyboardShift;
            renderKeyboard();
            break;
            
        case 'mode':
            gameState.keyboardMode = gameState.keyboardMode === 'letters' ? 'numbers' : 'letters';
            renderKeyboard();
            break;
            
        case 'backspace':
            gameState.currentPassword = gameState.currentPassword.slice(0, -1);
            updatePasswordPreview(true);
            break;
            
        case 'space':
            break;
            
        default:
            let char = key.label;
            if (gameState.keyboardMode === 'letters' && gameState.keyboardShift) {
                char = char.toUpperCase();
                gameState.keyboardShift = false;
                renderKeyboard();
            } else if (gameState.keyboardMode === 'letters') {
                char = char.toLowerCase();
            }
            gameState.currentPassword += char;
            gameState.lastKeyPressTime = Date.now();
            updatePasswordPreview(true);
            break;
    }
    
    gameState.passwordTimeout = setTimeout(() => {
        updatePasswordPreview(false);
    }, 5000);
}

function updatePasswordPreview(showText = false) {
    const preview = document.getElementById('passwordPreview');
    if (!preview) return;
    
    if (showText && gameState.currentPassword.length > 0) {
        preview.textContent = gameState.currentPassword;
        preview.classList.add('showing');
    } else {
        const dots = '•'.repeat(Math.max(12, gameState.currentPassword.length));
        preview.textContent = dots;
        preview.classList.remove('showing');
    }
}

// ========== CERTIFICATE FUNCTIONS (KEPT FROM ORIGINAL) ==========
function openCertificate() {
    const certId = 'DC-' + Math.random().toString(36).substr(2, 6).toUpperCase() + '-HP';
    const discoveryDate = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    document.getElementById('certificateId').textContent = certId;
    document.getElementById('discoveryDate').textContent = discoveryDate;
    document.getElementById('creatorYear').textContent = new Date().getFullYear();
    
    localStorage.setItem('certificateDiscovered', new Date().toISOString());
    
    closeChoiceModal();
    document.getElementById('certificateModal').classList.add('active');
}

function closeCertificate() {
    document.getElementById('certificateModal').classList.remove('active');
}

function shareCertificate() {
    alert('📸 Take a screenshot to share this certificate!');
}

// ========== NEW SERVER-SIDE FUNCTIONS ==========
async function submitPassword() {
    try {
        const response = await fetch('/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: gameState.currentPassword })
        });
        
        const data = await response.json();
        
        if (data.success) {
            if (data.level === 'creator') {
                gameState.creatorUnlocked = true;
            }
            gameState.adminUnlocked = true;
            
            await loadCustomData();
            
            closeKeyboard();
            renderSettingsContent();
            
            showNotification(`✅ ${data.message}`, 'success');
        } else {
            showNotification('❌ Wrong password!', 'error');
            gameState.currentPassword = '';
            updatePasswordPreview(true);
        }
    } catch (error) {
        console.error('Login error:', error);
        showNotification('❌ Server error. Try again.', 'error');
    }
}

async function checkAdminStatus() {
    try {
        const response = await fetch('/api/admin/status');
        const data = await response.json();
        gameState.adminUnlocked = data.admin;
        gameState.creatorUnlocked = data.creator;
        
        if (data.admin) {
            await loadCustomData();
        }
    } catch (error) {
        console.error('Error checking admin status:', error);
    }
}

async function loadCustomData() {
    try {
        const wordsResponse = await fetch('/api/game/custom-words');
        const wordsData = await wordsResponse.json();
        gameState.customWords = wordsData.words || [];
        
        const rolesResponse = await fetch('/api/game/custom-roles');
        const rolesData = await rolesResponse.json();
        gameState.customRoles = rolesData.roles || {};
        
        for (const key in gameState.customRoles) {
            gameState.roles[key] = 0;
        }
        
        updateRoleSetupUI();
    } catch (error) {
        console.error('Error loading custom data:', error);
    }
}

async function addCustomWord() {
    const input = document.getElementById('newWordInput');
    const word = input.value.trim();
    
    if (!word) return;
    
    try {
        const response = await fetch('/api/game/custom-words', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ word })
        });
        
        const data = await response.json();
        
        if (data.success) {
            gameState.customWords = data.words;
            input.value = '';
            renderSettingsContent();
            showNotification('✅ Word added!', 'success');
        } else {
            showNotification('❌ Word already exists!', 'error');
        }
    } catch (error) {
        console.error('Error adding word:', error);
        showNotification('❌ Server error', 'error');
    }
}

async function removeCustomWord(index) {
    try {
        const response = await fetch(`/api/game/custom-words/${index}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            gameState.customWords = data.words;
            renderSettingsContent();
            showNotification('✅ Word removed!', 'success');
        }
    } catch (error) {
        console.error('Error removing word:', error);
        showNotification('❌ Server error', 'error');
    }
}

async function addCustomRole() {
    const name = document.getElementById('newRoleName').value.trim();
    const emoji = document.getElementById('newRoleEmoji').value.trim();
    const description = document.getElementById('newRoleDescription').value.trim();
    const seesWord = document.getElementById('roleSeesWord').checked;
    const isSpy = document.getElementById('roleIsSpy').checked;
    
    if (!name || !emoji || !description) {
        showNotification('❌ Please fill all fields!', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/game/custom-roles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, emoji, description, seesWord, isSpy })
        });
        
        const data = await response.json();
        
        if (data.success) {
            gameState.customRoles = data.roles;
            
            document.getElementById('newRoleName').value = '';
            document.getElementById('newRoleEmoji').value = '';
            document.getElementById('newRoleDescription').value = '';
            
            updateRoleSetupUI();
            renderSettingsContent();
            showNotification('✅ Custom role added!', 'success');
        }
    } catch (error) {
        console.error('Error adding role:', error);
        showNotification('❌ Server error', 'error');
    }
}

async function removeCustomRole(key) {
    if (!confirm('Are you sure you want to delete this custom role?')) return;
    
    try {
        const response = await fetch(`/api/game/custom-roles/${key}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            gameState.customRoles = data.roles;
            delete gameState.roles[key];
            updateRoleSetupUI();
            renderSettingsContent();
            showNotification('✅ Role removed!', 'success');
        }
    } catch (error) {
        console.error('Error removing role:', error);
        showNotification('❌ Server error', 'error');
    }
}

async function logout() {
    try {
        await fetch('/api/admin/logout', { method: 'POST' });
        gameState.adminUnlocked = false;
        gameState.creatorUnlocked = false;
        renderSettingsContent();
        showNotification('👋 Logged out successfully', 'info');
    } catch (error) {
        console.error('Logout error:', error);
    }
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: ${type === 'success' ? '#4ECDC4' : type === 'error' ? '#FF6B6B' : '#FF9A55'};
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        z-index: 9999;
        font-size: 14px;
        animation: slideDown 0.3s;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'fadeOut 0.3s';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ========== INITIALIZATION ==========
window.onload = async function() {
    await checkAdminStatus();
    
    const savedTheme = localStorage.getItem('theme') || 'dark';
    const savedTimer = localStorage.getItem('timerMinutes') || '3';
    const savedPreset = localStorage.getItem('rolePreset') || 'standard';
    
    gameState.theme = savedTheme;
    gameState.timerMinutes = parseInt(savedTimer);
    gameState.rolePreset = savedPreset;
    
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
    }
    
    updateRoleSetupUI();
    updateTotalPlayers();
};