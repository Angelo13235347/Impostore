require('dotenv').config();
const express = require('express');
const cors = require('cors');
const socketio = require('socket.io');
const http = require('http');

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = socketio(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Database in-memory (per demo)
const rooms = {};
const songs = [
  { id: 1, title: "Canzone Pop 1", url: "pop1.mp3", genre: "pop" },
  { id: 2, title: "Canzone Rock 1", url: "rock1.mp3", genre: "rock" },
  // Aggiungi altre canzoni...
];

io.on('connection', (socket) => {
  console.log(`New connection: ${socket.id}`);

  // Creazione stanza
  socket.on('createRoom', ({ playerName }, callback) => {
    const roomCode = generateRoomCode();
    rooms[roomCode] = {
      players: [{ id: socket.id, name: playerName, score: 0 }],
      status: 'waiting',
      currentRound: 0,
      impostor: null,
      currentSong: null,
      votes: {}
    };
    socket.join(roomCode);
    callback({ roomCode });
  });

  // Partecipa a stanza
  socket.on('joinRoom', ({ roomCode, playerName }, callback) => {
    if (!rooms[roomCode]) {
      return callback({ error: "Stanza non trovata" });
    }

    const room = rooms[roomCode];
    room.players.push({ id: socket.id, name: playerName, score: 0 });
    socket.join(roomCode);
    
    io.to(roomCode).emit('roomUpdate', room);
    callback({ success: true, room });
  });

  // Inizia gioco
  socket.on('startGame', (roomCode) => {
    const room = rooms[roomCode];
    if (!room) return;

    room.status = 'playing';
    startNewRound(roomCode);
  });

  // Votazione
  socket.on('submitVote', ({ roomCode, voterId, suspectId }) => {
    const room = rooms[roomCode];
    if (!room || room.status !== 'voting') return;

    room.votes[voterId] = suspectId;
    io.to(roomCode).emit('voteReceived', { voterId, suspectId });

    // Controlla se tutti hanno votato
    if (Object.keys(room.votes).length === room.players.length) {
      concludeVoting(roomCode);
    }
  });

  // Disconnessione
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
    // Gestisci uscita dalle stanze...
  });
});

function startNewRound(roomCode) {
  const room = rooms[roomCode];
  room.currentRound++;
  room.votes = {};
  
  // Scegli impostore casuale
  const impostorIndex = Math.floor(Math.random() * room.players.length);
  room.impostor = room.players[impostorIndex].id;
  
  // Scegli canzone principale
  const mainSong = songs[Math.floor(Math.random() * songs.length)];
  room.currentSong = mainSong;
  
  // Scegli canzone impostore (stesso genere)
  const impostorSong = songs
    .filter(s => s.genre === mainSong.genre && s.id !== mainSong.id)
    [Math.floor(Math.random() * (songs.length - 1))];
  
  // Notifica i giocatori
  io.to(roomCode).emit('roundStart', { 
    round: room.currentRound,
    duration: 30000 // 30 secondi
  });
  
  // Invia le canzoni
  room.players.forEach(player => {
    const isImpostor = player.id === room.impostor;
    io.to(player.id).emit('playSong', {
      song: isImpostor ? impostorSong : mainSong,
      isImpostor: isImpostor
    });
  });
  
  // Avvia timer
  setTimeout(() => {
    room.status = 'voting';
    io.to(roomCode).emit('startVoting', {
      players: room.players.map(p => ({ id: p.id, name: p.name }))
    });
  }, 30000);
}

function concludeVoting(roomCode) {
  const room = rooms[roomCode];
  
  // Conta voti
  const voteCount = {};
  Object.values(room.votes).forEach(votedId => {
    voteCount[votedId] = (voteCount[votedId] || 0) + 1;
  });
  
  // Trova giocatore più votato
  const eliminatedId = Object.keys(voteCount).reduce((a, b) => 
    voteCount[a] > voteCount[b] ? a : b
  );
  
  const wasImpostor = eliminatedId === room.impostor;
  const eliminatedPlayer = room.players.find(p => p.id === eliminatedId);
  
  // Aggiorna punteggi
  room.players.forEach(player => {
    if (player.id === eliminatedId) return;
    if (wasImpostor) player.score += 100;
    else if (player.id === room.impostor) player.score += 200;
  });
  
  // Rimuovi giocatore
  room.players = room.players.filter(p => p.id !== eliminatedId);
  
  // Invia risultati
  io.to(roomCode).emit('roundResults', {
    eliminatedPlayer: eliminatedPlayer.name,
    wasImpostor,
    scores: room.players.map(p => ({ id: p.id, name: p.name, score: p.score })),
    impostor: room.impostor
  });
  
  // Controlla se il gioco è finito
  if (room.players.length <= 2 || room.players.every(p => p.id === room.impostor)) {
    endGame(roomCode);
  } else {
    // Nuovo round dopo 10 secondi
    setTimeout(() => startNewRound(roomCode), 10000);
  }
}

function endGame(roomCode) {
  const room = rooms[roomCode];
  room.status = 'finished';
  
  io.to(roomCode).emit('gameOver', {
    winner: room.players[0], // Per semplicità
    scores: room.players.map(p => ({ name: p.name, score: p.score }))
  });
  
  // Pulisci dopo 1 minuto
  setTimeout(() => {
    delete rooms[roomCode];
  }, 60000);
}

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
