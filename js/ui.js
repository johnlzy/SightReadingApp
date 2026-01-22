function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

function updateLanding() {
    if(!currentUser) return;
    document.getElementById('user-display').innerText = `${currentUser.avatar} ${currentUser.name}`;
    document.getElementById('landing-t-coins').innerText = currentUser.tCoins;
    document.getElementById('landing-b-coins').innerText = currentUser.bCoins;
    
    const bag = document.getElementById('landing-bag');
    bag.innerHTML = '';
    Object.keys(INSTRUMENTS).forEach(k => {
        const owned = currentUser.instruments.includes(k);
        const div = document.createElement('div');
        div.className = `inst-item ${owned?'unlocked':'locked'} ${currentInstKey===k && owned ? 'selected':''}`;
        div.innerText = INSTRUMENTS[k].name.split(' ')[1];
        if(owned) div.onclick = () => { currentInstKey = k; playRun(k); updateLanding(); };
        bag.appendChild(div);
    });
}

function goToStore() {
    const isT = (currentClef === 'treble');
    const currency = isT ? currentUser.tCoins : currentUser.bCoins;
    document.getElementById('store-currency-icon').innerText = isT ? '🎼' : '𝄢';
    document.getElementById('store-coins').innerText = currency;
    
    const grid = document.getElementById('store-grid');
    grid.innerHTML = '';
    Object.keys(INSTRUMENTS).forEach(k => {
        const item = INSTRUMENTS[k];
        const owned = currentUser.instruments.includes(k);
        const el = document.createElement('div');
        el.className = 'store-item';
        el.innerHTML = `<strong>${item.name}</strong><br>${owned ? 'Owned' : `<span class="price-tag">${item.price}</span>`}`;
        if(!owned) el.onclick = () => buyItem(k, item.price, isT);
        grid.appendChild(el);
    });
    showScreen('screen-store');
}

function goToSongs() {
    const cont = document.getElementById('song-list-container');
    cont.innerHTML = '';
    SONG_DB.forEach((s, i) => {
        const locked = i > currentUser.unlockedSongs;
        const div = document.createElement('div');
        div.className = `song-item ${locked?'locked':''}`;
        div.innerHTML = `<div><strong>${s.title}</strong></div><div>${locked?'🔒':'▶️'}</div>`;
        if(!locked) div.onclick = () => startGame('song', i);
        cont.appendChild(div);
    });
    showScreen('screen-songs');
}
