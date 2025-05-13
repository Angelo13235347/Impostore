const express = require('express');
const socketio = require('socket.io');
const http = require('http');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

const rooms = {};

io.on('connection', (socket) => {
  console.log('New client connected');
  
  socket.on('createRoom', (playerName) => {
    const roomCode = generateRoomCode();
    rooms[roomCode] = {
      players: [{ id: socket.id, name: playerName, isImpostor: false }],
      songs: [],
      status: 'waiting'
    };
    socket.join(roomCode);
    socket.emit('roomCreated', roomCode);
  });
  
  socket.on('joinRoom', ({ roomCode, playerName }) => {
    if (rooms[roomCode]) {
      rooms[roomCode].players.push({ id: socket.id, name: playerName, isImpostor: false });
      socket.join(roomCode);
      io.to(roomCode).emit('playerJoined', rooms[roomCode].players);
    } else {
      socket.emit('invalidRoom');
    }
  });
  
  // Altri eventi: startGame, vote, nextRound, etc.
});

function generateRoomCode() {
  return Math.random().toString(36).substr(2, 5).toUpperCase();
}

server.listen(3001, () => {
  console.log('Server running on port 3001');
});
