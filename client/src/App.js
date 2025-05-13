import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import HomeScreen from './screens/HomeScreen';
import LobbyScreen from './screens/LobbyScreen';
import GameScreen from './screens/GameScreen';
import VotingScreen from './screens/VotingScreen';
import ResultsScreen from './screens/ResultsScreen';
import GameOverScreen from './screens/GameOverScreen';
import { AppContainer, GlobalStyle } from './styles';

const socket = io(process.env.REACT_APP_SERVER_URL || 'http://localhost:3001');

function App() {
  const [screen, setScreen] = useState('home');
  const [player, setPlayer] = useState({ id: '', name: '' });
  const [room, setRoom] = useState(null);
  const [gameData, setGameData] = useState(null);

  useEffect(() => {
    socket.on('connect', () => {
      setPlayer(p => ({ ...p, id: socket.id }));
    });

    socket.on('roomUpdate', (roomData) => {
      setRoom(roomData);
      setScreen('lobby');
    });

    socket.on('roundStart', (data) => {
      setGameData({ ...data, phase: 'playing' });
      setScreen('game');
    });

    socket.on('playSong', (data) => {
      setGameData(prev => ({ ...prev, ...data, phase: 'playing' }));
    });

    socket.on('startVoting', (data) => {
      setGameData(prev => ({ ...prev, ...data, phase: 'voting' }));
      setScreen('voting');
    });

    socket.on('roundResults', (data) => {
      setGameData(prev => ({ ...prev, ...data, phase: 'results' }));
      setScreen('results');
    });

    socket.on('gameOver', (data) => {
      setGameData(prev => ({ ...prev, ...data, phase: 'gameOver' }));
      setScreen('gameOver');
    });

    return () => {
      socket.off('connect');
      socket.off('roomUpdate');
      socket.off('roundStart');
      socket.off('playSong');
      socket.off('startVoting');
      socket.off('roundResults');
      socket.off('gameOver');
    };
  }, []);

  return (
    <AppContainer>
      <GlobalStyle />
      {screen === 'home' && <HomeScreen socket={socket} setPlayer={setPlayer} setScreen={setScreen} />}
      {screen === 'lobby' && <LobbyScreen socket={socket} room={room} player={player} setScreen={setScreen} />}
      {screen === 'game' && <GameScreen socket={socket} gameData={gameData} player={player} />}
      {screen === 'voting' && <VotingScreen socket={socket} gameData={gameData} player={player} />}
      {screen === 'results' && <ResultsScreen socket={socket} gameData={gameData} />}
      {screen === 'gameOver' && <GameOverScreen gameData={gameData} setScreen={setScreen} />}
    </AppContainer>
  );
}

export default App;
