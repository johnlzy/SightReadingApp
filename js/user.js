/* --- USER LOGIC --- */
function loadUsers() {
    const list = JSON.parse(localStorage.getItem('fsr_users_v2') || '[]');
    const cont = document.getElementById('existing-users-list');
    cont.innerHTML = '';
    if(list.length === 0) {
        cont.innerHTML = '<p style="color:#888; text-align:center;">No existing players found.</p>';
    } else {
        list.forEach((u, index) => {
            const row = document.createElement('div');
            row.className = 'user-row';
            row.innerHTML = `
                <button class="user-btn" onclick="loginUser(${index})">
                    <span style="font-size:1.5rem">${u.avatar}</span> 
                    <strong>${u.name}</strong> 
                    <span style="color:#888; font-size:0.8rem">(${u.difficulty})</span>
                </button>
                <button class="btn-danger" onclick="deleteUser(${index})">🗑️</button>
            `;
            cont.appendChild(row);
        });
    }
}

function generateName() {
    const adjs = ['Happy','Sparkly','Jolly','Sunny','Bouncy','Lucky','Magic','Super','Cool'];
    const nouns = ['Panda','Kitty','Puppy','Star','Cookie','Bunny','Tiger','Moon','Bear'];
    tempUser.name = adjs[Math.floor(Math.random()*adjs.length)] + ' ' + nouns[Math.floor(Math.random()*nouns.length)];
    document.getElementById('gen-name').innerText = tempUser.name;
}

function setRegDiff(lvl, el) {
    tempUser.diff = lvl;
    document.querySelectorAll('.toggle-opt').forEach(d => d.classList.remove('selected'));
    el.classList.add('selected');
    let t = "C to G (White keys)";
    if(lvl === 'medium') t = "One Octave (White keys)";
    if(lvl === 'hard') t = "One Octave (Black & White)";
    document.getElementById('diff-desc').innerText = t;
}

function selectAvatar(em, event) {
    tempUser.avatar = em;
    document.querySelectorAll('.emoji-opt').forEach(e => e.classList.remove('selected'));
    if(event && event.target) event.target.classList.add('selected');
}

function showNewUserForm() {
    document.getElementById('new-user-form').style.display='block';
    generateName();
}

function hideNewUserForm() {
    document.getElementById('new-user-form').style.display='none';
}

function createUser() {
    const list = JSON.parse(localStorage.getItem('fsr_users_v2') || '[]');
    const newUser = {
        name: tempUser.name,
        avatar: tempUser.avatar,
        difficulty: tempUser.diff,
        tCoins: 0,
        bCoins: 0,
        instruments: ['piano'],
        unlockedSongs: 0,
        scores: {
            coin: { easy: [], medium: [], hard: [] },
            songs: {}
        }
    };
    list.push(newUser);
    localStorage.setItem('fsr_users_v2', JSON.stringify(list));
    hideNewUserForm();
    loadUsers();
    loginUser(list.length - 1);
}

function deleteUser(index) {
    if(!confirm("Are you sure you want to delete this player?")) return;
    const list = JSON.parse(localStorage.getItem('fsr_users_v2') || '[]');
    list.splice(index, 1);
    localStorage.setItem('fsr_users_v2', JSON.stringify(list));
    loadUsers();
}

function loginUser(index) {
    const list = JSON.parse(localStorage.getItem('fsr_users_v2') || '[]');
    currentUser = list[index];
    currentUser.idx = index; 
    
    // Legacy migration check
    if(!currentUser.scores) {
        currentUser.scores = { coin: { easy: [], medium: [], hard: [] }, songs: {} };
    }

    updateLanding();
    showScreen('screen-landing');
}

function saveCurrentUser() {
    if(currentUser === null) return;
    const list = JSON.parse(localStorage.getItem('fsr_users_v2') || '[]');
    list[currentUser.idx] = currentUser;
    localStorage.setItem('fsr_users_v2', JSON.stringify(list));
    updateLanding();
}

function logout() {
    currentUser = null;
    showScreen('screen-register');
    loadUsers();
}
