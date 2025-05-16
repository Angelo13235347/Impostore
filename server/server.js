const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const Game = require('./game');

// Servire file statici
app.use(express.static(path.join(__dirname, '../public')));

// Gestione delle stanze
const rooms = new Map();

io.on('connection', (socket) => {
    console.log('Nuovo client connesso:', socket.id);
    
    // Gestione creazione stanza
    socket.on('createRoom', (data) => {
        const { rounds, roundDuration, playerName } = data;
        
        // Genera un codice stanza univoco
        const roomCode = generateRoomCode();
        const game = new Game(rounds, roundDuration);
        
        // Aggiungi il primo giocatore (host)
        const player = game.addPlayer(socket.id, playerName, true);
        
        // Salva la stanza
        rooms.set(roomCode, game);
        
        // Unisci il client alla stanza
        socket.join(roomCode);
        
        // Notifica il client
        socket.emit('roomCreated', {
            roomCode,
            players: game.getPlayers()
        });
    });
    
    // Gestione accesso stanza
    socket.on('joinRoom', (data) => {
        const { roomCode, playerName } = data;
        
        if (!rooms.has(roomCode)) {
            socket.emit('error', 'Stanza non trovata');
            return;
        }
        
        const game = rooms.get(roomCode);
        
        if (game.isGameStarted()) {
            socket.emit('error', 'Partita già iniziata');
            return;
        }
        
        // Aggiungi il giocatore
        const player = game.addPlayer(socket.id, playerName, false);
        
        // Unisci il client alla stanza
        socket.join(roomCode);
        
        // Notifica il client
        socket.emit('roomJoined', {
            roomCode,
            players: game.getPlayers()
        });
        
        // Notifica tutti i giocatori nella stanza del nuovo arrivato
        io.to(roomCode).emit('playerJoined', game.getPlayers());
    });
    
    // Gestione avvio partita (solo host)
    socket.on('startGame', () => {
        const roomCode = findRoomBySocket(socket);
        if (!roomCode) return;
        
        const game = rooms.get(roomCode);
        
        // Verifica che il mittente sia l'host
        const player = game.getPlayer(socket.id);
        if (!player || !player.isHost) {
            socket.emit('error', 'Solo l\'host può avviare la partita');
            return;
        }
        
        // Avvia il gioco
        game.startGame();
        
        // Notifica tutti i giocatori
        game.getPlayers().forEach(player => {
            const role = player.role;
            io.to(player.id).emit('gameStarted', {
                role,
                players: game.getPlayers(),
                roundDuration: game.roundDuration
            });
        });
    });
    
    // Gestione votazione
    socket.on('submitVote', (votedPlayerId) => {
        const roomCode = findRoomBySocket(socket);
        if (!roomCode) return;
        
        const game = rooms.get(roomCode);
        const voter = game.getPlayer(socket.id);
        
        if (!voter || !votedPlayerId) return;
        
        // Registra il voto
        game.addVote(voter.id, votedPlayerId);
        
        // Se tutti hanno votato, calcola i risultati
        if (game.allVotesIn()) {
            const results = game.calculateResults();
            
            // Invia i risultati a tutti
            io.to(roomCode).emit('votingResults', results);
            
            // Se ci sono altri turni, prepara il prossimo
            if (results.nextRound) {
                game.prepareNextRound();
            } else {
                game.endGame();
            }
        }
    });
    
    // Gestione prossimo turno
    socket.on('nextRound', () => {
        const roomCode = findRoomBySocket(socket);
        if (!roomCode) return;
        
        const game = rooms.get(roomCode);
        
        // Verifica che il mittente sia l'host
        const player = game.getPlayer(socket.id);
        if (!player || !player.isHost) {
            socket.emit('error', 'Solo l\'host può avviare il prossimo turno');
            return;
        }
        
        // Avvia il prossimo turno
        game.startNextRound();
        
        // Notifica tutti i giocatori
        game.getPlayers().forEach(player => {
            const role = player.role;
            io.to(player.id).emit('nextRoundStarted', {
                role,
                players: game.getPlayers(),
                roundDuration: game.roundDuration,
                currentRound: game.currentRound
            });
        });
    });
    
    // Gestione ritorno alla lobby
    socket.on('returnToLobby', () => {
        const roomCode = findRoomBySocket(socket);
        if (!roomCode) return;
        
        const game = rooms.get(roomCode);
        
        // Verifica che il mittente sia l'host
        const player = game.getPlayer(socket.id);
        if (!player || !player.isHost) {
            socket.emit('error', 'Solo l\'host può tornare alla lobby');
            return;
        }
        
        // Resetta il gioco
        game.resetGame();
        
        // Notifica tutti i giocatori
        io.to(roomCode).emit('returnedToLobby', game.getPlayers());
    });
    
    // Gestione disconnessione
    socket.on('disconnect', () => {
        console.log('Client disconnesso:', socket.id);
        
        const roomCode = findRoomBySocket(socket);
        if (!roomCode) return;
        
        const game = rooms.get(roomCode);
        game.removePlayer(socket.id);
        
        // Se la stanza è vuota, eliminala
        if (game.getPlayers().length === 0) {
            rooms.delete(roomCode);
        } else {
            // Altrimenti notifica gli altri giocatori
            io.to(roomCode).emit('playerJoined', game.getPlayers());
        }
    });
    
    // Funzione helper per trovare la stanza di un socket
    function findRoomBySocket(socket) {
        for (const [roomCode, game] of rooms) {
            if (game.getPlayer(socket.id)) {
                return roomCode;
            }
        }
        return null;
    }
    
    // Funzione per generare un codice stanza casuale
    function generateRoomCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
        // Verifica che il codice non esista già
        if (rooms.has(result)) {
            return generateRoomCode();
        }
        
        return result;
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server in ascolto sulla porta ${PORT}`);
});
