import React, { useState } from 'react';
import HomeScreen from './pages/HomeScreen';
import RoomScreen from './pages/RoomScreen';
import GameScreen from './pages/GameScreen';

function App() {
  const [screen, setScreen] = useState('home');
  const [roomCode, setRoomCode] = useState('');
  const [players, setPlayers] = useState([]);

  return (
    <div className="app">
      {screen === 'home' && <HomeScreen setScreen={setScreen} />}
      {screen === 'room' && (
        <RoomScreen 
          roomCode={roomCode} 
          players={players} 
          setScreen={setScreen} 
        />
      )}
      {screen === 'game' && <GameScreen />}
    </div>
  );
}

export default App;
