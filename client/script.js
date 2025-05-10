document.addEventListener('DOMContentLoaded', () => {
    // Elementi UI
    const startScreen = document.getElementById('start-screen');
    const createRoomScreen = document.getElementById('create-room-screen');
    const joinRoomScreen = document.getElementById('join-room-screen');
    const gameScreen = document.getElementById('game-screen');
    const voteResultsScreen = document.getElementById('vote-results-screen');
    const gameOverScreen = document.getElementById('game-over-screen');
    
    const hostNameInput = document.getElementById('host-name');
    const roomCodeDisplay = document.getElementById('room-code');
    const playersList = document.getElementById('players-list');
    const joinedPlayersList = document.getElementById('joined-players-list');
    const currentSongDisplay = document.getElementById('current-song');
    const songPlayer = document.getElementById('song-player');
    const votingOptions = document.getElementById('voting-options');
    const eliminationResult = document.getElementById('elimination-result');
    const winnerMessage = document.getElementById('winner-message');
    
    // Connessione Socket.IO
    const socket = io('http://localhost:5000');
    
    // Stato del gioco
    let currentRoomCode = '';
    let currentPlayerId = '';
    let isHost = false;
    let isImpostor = false;
    
    // Gestione pulsanti
    document.getElementById('create-room-btn').addEventListener('click', () => {
        startScreen.classList.add('hidden');
        createRoomScreen.classList.remove('hidden');
    });
    
    document.getElementById('join-room-btn').addEventListener('click', () => {
        startScreen.classList.add('hidden');
        joinRoomScreen.classList.remove('hidden');
    });
    
    document.getElementById('confirm-create-room').addEventListener('click', () => {
        const hostName = hostNameInput.value.trim();
        if (hostName) {
            socket.emit('create_room', { host_name: hostName });
        }
    });
    
    document.getElementById('confirm-join-room').addEventListener('click', () => {
        const roomCode = document.getElementById('room-code-input').value.trim().toUpperCase();
        const playerName = document.getElementById('player-name').value.trim();
        
        if (roomCode && playerName) {
            currentRoomCode = roomCode;
            socket.emit('join_room', {
                room_code: roomCode,
                player_name: playerName
            });
        }
    });
    
    document.getElementById('start-game-btn').addEventListener('click', () => {
        socket.emit('start_game', { room_code: currentRoomCode });
    });
    
    document.getElementById('submit-vote').addEventListener('click', () => {
        const selectedOption = document.querySelector('input[name="vote"]:checked');
        if (selectedOption) {
            socket.emit('submit_vote', {
                room_code: currentRoomCode,
                voted_player_id: selectedOption.value
            });
        }
    });
    
    document.getElementById('play-again-btn').addEventListener('click', () => {
        location.reload();
    });
    
    // Gestione eventi Socket.IO
    socket.on('room_created', (data) => {
        currentRoomCode = data.room_code;
        isHost = true;
        
        document.getElementById('room-code').textContent = currentRoomCode;
        document.getElementById('room-created').classList.remove('hidden');
    });
    
    socket.on('welcome', (data) => {
        if (isHost) {
            updatePlayersList(data.players);
            document.getElementById('start-game-btn').classList.remove('hidden');
        } else {
            document.getElementById('waiting-for-host').classList.remove('hidden');
            updateJoinedPlayersList(data.players);
        }
    });
    
    socket.on('player_joined', (data) => {
        if (isHost) {
            const players = JSON.parse(localStorage.getItem('players') || [];
            players.push(data.player_name);
            localStorage.setItem('players', JSON.stringify(players));
            updatePlayersList(players);
        }
    });
    
    socket.on('player_left', (data) => {
        if (isHost) {
            const players = JSON.parse(localStorage.getItem('players') || []);
            const updatedPlayers = players.filter(p => p.id !== data.player_id);
            localStorage.setItem('players', JSON.stringify(updatedPlayers));
            updatePlayersList(updatedPlayers);
        }
    });
    
    socket.on('play_song', (data) => {
        createRoomScreen.classList.add('hidden');
        joinRoomScreen.classList.add('hidden');
        gameScreen.classList.remove('hidden');
        
        currentSongDisplay.textContent = data.song;
        songPlayer.src = `assets/${data.song}`;
        songPlayer.play();
        
        // L'impostore sa di esserlo
        if (data.song.includes('impostor')) {
            isImpostor = true;
            currentSongDisplay.textContent += " (Sei l'impostore!)";
        }
    });
    
    socket.on('start_voting', (data) => {
        songPlayer.pause();
        document.getElementById('song-info').classList.add('hidden');
        document.getElementById('voting-section').classList.remove('hidden');
        
        votingOptions.innerHTML = '';
        data.players.forEach(player => {
            const option = document.createElement('div');
            option.className = 'vote-option';
            
            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = 'vote';
            radio.value = player.id;
            radio.id = `vote-${player.id}`;
            
            const label = document.createElement('label');
            label.htmlFor = `vote-${player.id}`;
            label.textContent = player.name;
            
            option.appendChild(radio);
            option.appendChild(label);
            votingOptions.appendChild(option);
        });
    });
    
    socket.on('vote_result', (data) => {
        gameScreen.classList.add('hidden');
        voteResultsScreen.classList.remove('hidden');
        
        if (data.was_impostor) {
            eliminationResult.textContent = `${data.eliminated_player} era l'impostore! Gioco terminato.`;
        } else {
            eliminationResult.textContent = `${data.eliminated_player} è stato eliminato ma non era l'impostore!`;
        }
    });
    
    socket.on('game_over', (data) => {
        voteResultsScreen.classList.add('hidden');
        gameOverScreen.classList.remove('hidden');
        
        if (data.winner.is_impostor) {
            winnerMessage.textContent = `L'impostore ${data.winner.name} ha vinto!`;
        } else {
            winnerMessage.textContent = `I giocatori ${data.winner.names.join(', ')} hanno trovato l'impostore!`;
        }
    });
    
    socket.on('error', (data) => {
        alert(data.message);
    });
    
    // Funzioni di supporto
    function updatePlayersList(players) {
        playersList.innerHTML = '';
        players.forEach(player => {
            const playerItem = document.createElement('div');
            playerItem.className = 'player-item';
            playerItem.textContent = player.name;
            playersList.appendChild(playerItem);
        });
    }
    
    function updateJoinedPlayersList(players) {
        joinedPlayersList.innerHTML = '';
        players.forEach(player => {
            const playerItem = document.createElement('div');
            playerItem.className = 'player-item';
            playerItem.textContent = player.name;
            joinedPlayersList.appendChild(playerItem);
        });
    }
});
