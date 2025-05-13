import React, { useState } from 'react';
import './HomeScreen.css';

function HomeScreen({ setScreen }) {
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');

  const createRoom = () => {
    // Connessione al server e creazione stanza
    setScreen('room');
  };

  const joinRoom = () => {
    // Connessione al server e join stanza
    setScreen('room');
  };

  return (
    <div className="home-screen">
      <h1>🎮 IMPOSTORE</h1>
      
      <input
        type="text"
        placeholder="Il tuo nome"
        value={playerName}
        onChange={(e) => setPlayerName(e.target.value)}
      />
      
      <div className="buttons">
        <button onClick={createRoom} className="btn-create">
          ➕ Crea Stanza
        </button>
        
        <div className="join-section">
          <input
            type="text"
            placeholder="Codice Stanza"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
          />
          <button onClick={joinRoom} className="btn-join">
            🔑 Partecipa
          </button>
        </div>
      </div>
    </div>
  );
}

export default HomeScreen;
