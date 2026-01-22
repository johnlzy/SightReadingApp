/* js/user.js */

// Helper to verify PIN
function verifyParentPin(callback) {
    const pin = prompt("Enter Parent PIN:");
    if (pin === PARENT_PIN) {
        callback();
    } else {
        alert("Incorrect PIN.");
    }
}

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

// Protected: Delete User
function deleteUser(index) {
    verifyParentPin(() => {
        const list = JSON.parse(localStorage.getItem('fsr_users_v2') || '[]');
        list.splice(index, 1);
        localStorage.setItem('fsr_users_v2', JSON.stringify(list));
        loadUsers();
    });
}

// Protected: Show New User Form
function showNewUserForm() {
    verifyParentPin(() => {
        document.getElementById('new-user-form').style.display = 'block';
        document.getElementById('existing-users-list').style.display = 'none';
        generateName();
    });
}

function hideNewUserForm() {
    document.getElementById('new-user-form').style.display = 'none';
    document.getElementById('existing-users-list').style.display = 'block';
}

// Protected: Refill Credits
function refillCredits() {
    verifyParentPin(() => {
        if(currentUser) {
            currentUser.credits += 8;
            saveCurrentUser();
            alert("Added 8 credits!");
        }
    });
}

/* Form Helpers (Missing in original) */
function selectAvatar(avatar, event) {
    tempUser.avatar = avatar;
    document.querySelectorAll('.emoji-opt').forEach(el => el.classList.remove('selected'));
    event.target.classList.add('selected');
}

function setRegDiff(diff, el) {
    tempUser.diff = diff;
    document.querySelectorAll('.toggle-opt').forEach(e => e.classList.remove('selected'));
    el.classList.add('selected');
    document.getElementById('diff-desc').innerText = diff === 'easy' ? 'C to G (White keys)' : (diff === 'medium' ? 'C to C (White keys)' : 'All keys (Sharps/Flats)');
}

function generateName() {
    const adjs = ['Happy','Sparkly','Jolly','Sunny','Bouncy','Lucky','Magic','Super','Cool'];
    const nouns = ['Panda','Kitty','Puppy','Star','Cookie','Bunny','Tiger','Moon','Bear'];
    tempUser.name = adjs[Math.floor(Math.random()*adjs.length)] + ' ' + nouns[Math.floor(Math.random()*nouns.length)];
    document.getElementById('gen-name').innerText = tempUser.name;
}

function createUser() {
    const list = JSON.parse(localStorage.getItem('fsr_users_v2') || '[]');
    const today = new Date().toDateString();
    
    const newUser = {
        name: tempUser.name,
        avatar: tempUser.avatar,
        difficulty: tempUser.diff,
        tCoins: 0, bCoins: 0,
        instruments: ['piano'],
        unlockedSongs: 0,
        credits: DAILY_CREDITS, // Init Credits
        lastLoginDate: today,   // Init Date
        scores: { coin: { easy: [], medium: [], hard: [] }, songs: {} }
    };
    list.push(newUser);
    localStorage.setItem('fsr_users_v2', JSON.stringify(list));
    hideNewUserForm();
    loadUsers();
    loginUser(list.length - 1);
}

function loginUser(index) {
    const list = JSON.parse(localStorage.getItem('fsr_users_v2') || '[]');
    currentUser = list[index];
    currentUser.idx = index; 
    
    // Safety check for old data
    if(!currentUser.scores) currentUser.scores = { coin: { easy: [], medium: [], hard: [] }, songs: {} };
    
    // Check Daily Credits
    const today = new Date().toDateString();
    if(currentUser.lastLoginDate !== today || typeof currentUser.credits === 'undefined') {
        currentUser.credits = DAILY_CREDITS;
        currentUser.lastLoginDate = today;
        saveCurrentUser();
    }

    updateLanding();
    showScreen('screen-landing');
}

function saveCurrentUser() {
    if(!currentUser) return;
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
