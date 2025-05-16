document.addEventListener('DOMContentLoaded', () => {
    // Connessione al server Socket.io
    const socket = io();
    
    // Elementi UI
    const screens = {
        home: document.getElementById('home-screen'),
        createRoom: document.getElementById('create-room-screen'),
        joinRoom: document.getElementById('join-room-screen'),
        lobby: document.getElementById('lobby-screen'),
        game: document.getElementById('game-screen'),
        results: document.getElementById('results-screen')
    };
    
    // Variabili di stato
    let currentRoom = null;
    let playerName = '';
    let isHost = false;
    let playerRole = '';
    
    // Gestione navigazione
    document.getElementById('create-room-btn').addEventListener('click', () => {
        screens.home.classList.add('hidden');
        screens.createRoom.classList.remove('hidden');
    });
    
    document.getElementById('join-room-btn').addEventListener('click', () => {
        screens.home.classList.add('hidden');
        screens.joinRoom.classList.remove('hidden');
    });
    
    document.querySelectorAll('.back-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            Object.values(screens).forEach(screen => screen.classList.add('hidden'));
            screens.home.classList.remove('hidden');
        });
    });
    
    // Creazione stanza
    document.getElementById('generate-room-btn').addEventListener('click', () => {
        const rounds = parseInt(document.getElementById('rounds').value);
        const roundDuration = parseInt(document.getElementById('round-duration').value);
        playerName = document.getElementById('player-name').value.trim();
        
        if (!playerName) {
            alert('Inserisci il tuo nome');
            return;
        }
        
        socket.emit('createRoom', { rounds, roundDuration, playerName });
    });
    
    // Accesso stanza
    document.getElementById('join-room-confirm-btn').addEventListener('click', () => {
        const roomCode = document.getElementById('room-code').value.trim();
        playerName = document.getElementById('join-player-name').value.trim();
        
        if (!roomCode || !playerName) {
            alert('Inserisci il codice della stanza e il tuo nome');
            return;
        }
        
        socket.emit('joinRoom', { roomCode, playerName });
    });
    
    // Avvio partita (solo host)
    document.getElementById('start-game-btn').addEventListener('click', () => {
        socket.emit('startGame');
    });
    
    // Gestione votazione
    document.getElementById('submit-vote-btn').addEventListener('click', () => {
        const selectedPlayer = document.querySelector('#voting-options li.selected');
        if (!selectedPlayer) {
            alert('Seleziona un giocatore');
            return;
        }
        
        const votedPlayer = selectedPlayer.dataset.playerId;
        socket.emit('submitVote', votedPlayer);
    });
    
    // Prossimo turno
    document.getElementById('next-round-btn').addEventListener('click', () => {
        socket.emit('nextRound');
    });
    
    // Torna alla lobby
    document.getElementById('return-to-lobby-btn').addEventListener('click', () => {
        socket.emit('returnToLobby');
    });
    
    // Ascolto eventi dal server
    socket.on('roomCreated', (data) => {
        currentRoom = data.roomCode;
        isHost = true;
        document.getElementById('room-code-display').textContent = data.roomCode;
        updatePlayersList(data.players);
        
        screens.createRoom.classList.add('hidden');
        screens.lobby.classList.remove('hidden');
        document.getElementById('host-controls').classList.remove('hidden');
    });
    
    socket.on('roomJoined', (data) => {
        currentRoom = data.roomCode;
        isHost = false;
        document.getElementById('room-code-display').textContent = data.roomCode;
        updatePlayersList(data.players);
        
        screens.joinRoom.classList.add('hidden');
        screens.lobby.classList.remove('hidden');
    });
    
    socket.on('playerJoined', (players) => {
        updatePlayersList(players);
    });
    
    socket.on('gameStarted', (data) => {
        playerRole = data.role;
        document.getElementById('role-display').textContent = 
            playerRole === 'impostor' ? 'Sei l\'IMPOSTORE!' : 'Sei INNOCENTE';
        
        screens.lobby.classList.add('hidden');
        screens.game.classList.remove('hidden');
        
        // Avvia la musica appropriata
        const audio = document.getElementById('game-audio');
        audio.src = playerRole === 'impostor' ? '/audio/impostor.mp3' : '/audio/innocent.mp3';
        audio.play();
        
        // Timer per la votazione
        setTimeout(() => {
            document.getElementById('voting-section').classList.remove('hidden');
            setupVotingOptions(data.players);
        }, data.roundDuration * 1000);
    });
    
    socket.on('votingResults', (results) => {
        let resultsHTML = '<h3>Risultati votazione:</h3><ul>';
        
        results.votes.forEach(vote => {
            resultsHTML += `<li>${vote.voter} ha votato ${vote.voted}</li>`;
        });
        
        resultsHTML += `</ul><p>L'impostore era: ${results.impostor}</p>`;
        resultsHTML += `<p>${results.winner ? 'Gli innocenti hanno vinto!' : 'L\'impostore ha vinto!'}</p>`;
        
        document.getElementById('results-content').innerHTML = resultsHTML;
        
        if (results.nextRound) {
            document.getElementById('next-round-btn').classList.remove('hidden');
        }
        
        screens.game.classList.add('hidden');
        screens.results.classList.remove('hidden');
    });
    
    socket.on('nextRoundStarted', (data) => {
        playerRole = data.role;
        document.getElementById('current-round').textContent = data.currentRound;
        document.getElementById('role-display').textContent = 
            playerRole === 'impostor' ? 'Sei l\'IMPOSTORE!' : 'Sei INNOCENTE';
        
        document.getElementById('voting-section').classList.add('hidden');
        
        screens.results.classList.add('hidden');
        screens.game.classList.remove('hidden');
        
        // Avvia la musica appropriata
        const audio = document.getElementById('game-audio');
        audio.src = playerRole === 'impostor' ? '/audio/impostor.mp3' : '/audio/innocent.mp3';
        audio.play();
        
        // Timer per la votazione
        setTimeout(() => {
            document.getElementById('voting-section').classList.remove('hidden');
            setupVotingOptions(data.players);
        }, data.roundDuration * 1000);
    });
    
    socket.on('gameEnded', (results) => {
        let resultsHTML = '<h3>Risultati finali:</h3><ul>';
        
        results.votes.forEach(vote => {
            resultsHTML += `<li>${vote.voter} ha votato ${vote.voted}</li>`;
        });
        
        resultsHTML += `</ul><p>L'impostore era: ${results.impostor}</p>`;
        resultsHTML += `<p>${results.winner ? 'Gli innocenti hanno vinto!' : 'L\'impostore ha vinto!'}</p>`;
        
        document.getElementById('results-content').innerHTML = resultsHTML;
        document.getElementById('next-round-btn').classList.add('hidden');
        
        screens.game.classList.add('hidden');
        screens.results.classList.remove('hidden');
    });
    
    socket.on('returnedToLobby', (players) => {
        updatePlayersList(players);
        
        screens.results.classList.add('hidden');
        screens.lobby.classList.remove('hidden');
    });
    
    socket.on('error', (message) => {
        alert(message);
    });
    
    // Funzioni helper
    function updatePlayersList(players) {
        const playersList = document.getElementById('players-list');
        playersList.innerHTML = '';
        
        players.forEach(player => {
            const li = document.createElement('li');
            li.textContent = player.name + (player.isHost ? ' (Host)' : '');
            playersList.appendChild(li);
        });
    }
    
    function setupVotingOptions(players) {
        const votingOptions = document.getElementById('voting-options');
        votingOptions.innerHTML = '';
        
        players.forEach(player => {
            if (player.name !== playerName) { // Non puoi votare te stesso
                const li = document.createElement('li');
                li.textContent = player.name;
                li.dataset.playerId = player.id;
                
                li.addEventListener('click', () => {
                    document.querySelectorAll('#voting-options li').forEach(item => {
                        item.classList.remove('selected');
                    });
                    li.classList.add('selected');
                });
                
                votingOptions.appendChild(li);
            }
        });
    }
});
