/* --- UI NAVIGATION & STORE --- */

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

function setClef(c) {
    currentClef = c;
    document.getElementById('clef-treble').classList.toggle('selected', c==='treble');
    document.getElementById('clef-bass').classList.toggle('selected', c==='bass');
}

function updateLanding() {
    if(!currentUser) return;
    document.getElementById('user-display').innerText = `${currentUser.avatar} ${currentUser.name}`;
    document.getElementById('landing-t-coins').innerText = currentUser.tCoins;
    document.getElementById('landing-b-coins').innerText = currentUser.bCoins;
    
    // Instrument Bag
    const bag = document.getElementById('landing-bag');
    bag.innerHTML = '';
    const allKeys = Object.keys(INSTRUMENTS);
    allKeys.sort((a,b) => {
        const hasA = currentUser.instruments.includes(a);
        const hasB = currentUser.instruments.includes(b);
        return hasB - hasA;
    });

    allKeys.forEach(k => {
        const div = document.createElement('div');
        const owned = currentUser.instruments.includes(k);
        div.className = `inst-item ${owned?'unlocked':'locked'} ${currentInstKey===k && owned ? 'selected':''}`;
        div.innerText = INSTRUMENTS[k].name.split(' ')[1]; // Emoji
        if(owned) {
            div.onclick = () => {
                currentInstKey = k;
                playRun(k);
                updateLanding();
            }
        }
        bag.appendChild(div);
    });
}

function goToStore() {
    const isT = (currentClef === 'treble');
    const currency = isT ? currentUser.tCoins : currentUser.bCoins;
    document.getElementById('store-currency-icon').innerText = isT ? '🎼' : '𝄢';
    document.getElementById('store-coins').innerText = currency;
    document.getElementById('store-title').innerText = isT ? "Treble Store" : "Bass Store";
    
    const list = Object.keys(INSTRUMENTS).filter(k => {
        if(k==='piano') return true;
        const isLow = ['cello','tuba','bassoon','drum','bassg'].includes(k);
        return isT ? !isLow : isLow;
    });

    const grid = document.getElementById('store-grid');
    grid.innerHTML = '';
    
    list.forEach(k => {
        const item = INSTRUMENTS[k];
        const owned = currentUser.instruments.includes(k);
        const el = document.createElement('div');
        el.className = 'store-item';
        el.innerHTML = `
            <div style="font-size:3rem; margin-bottom:5px;">${item.name.split(' ')[1]}</div>
            <strong>${item.name.split(' ')[0]}</strong><br>
            ${owned ? '<span style="color:#aaa">Owned</span>' : `<span class="price-tag">${item.price}</span>`}
        `;
        if(!owned) el.onclick = () => buyItem(k, item.price, isT);
        grid.appendChild(el);
    });
    showScreen('screen-store');
}

function buyItem(k, price, isT) {
    if(isT) {
        if(currentUser.tCoins >= price) {
            currentUser.tCoins -= price;
            currentUser.instruments.push(k);
            saveCurrentUser();
            goToStore();
            playRun(k);
        } else alert("Not enough coins!");
    } else {
        if(currentUser.bCoins >= price) {
            currentUser.bCoins -= price;
            currentUser.instruments.push(k);
            saveCurrentUser();
            goToStore();
            playRun(k);
        } else alert("Not enough coins!");
    }
}

function goToSongs() {
    const cont = document.getElementById('song-list-container');
    cont.innerHTML = '';
    
    SONG_DB.forEach((s, i) => {
        const locked = i > currentUser.unlockedSongs;
        const div = document.createElement('div');
        div.className = `song-item ${locked?'locked':''}`;
        div.innerHTML = `
            <div>
                <strong>${i+1}. ${s.title}</strong><br>
                <small>Reward: ${s.reward} coins</small>
            </div>
            <div style="font-size:1.5rem">${locked?'🔒':'▶️'}</div>
        `;
        if(!locked) div.onclick = () => startGame('song', i);
        cont.appendChild(div);
    });
    showScreen('screen-songs');
}
