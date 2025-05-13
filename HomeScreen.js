import React, { useState } from 'react';
import styled from 'styled-components';
import { Button, Input, Title } from '../components';

const HomeScreen = ({ socket, setPlayer, setScreen }) => {
  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const createRoom = () => {
    if (!name.trim()) return setError('Inserisci il tuo nome');
    setLoading(true);
    socket.emit('createRoom', { playerName: name }, (response) => {
      setLoading(false);
      if (response.error) {
        setError(response.error);
      } else {
        setPlayer(p => ({ ...p, name }));
        setScreen('lobby');
      }
    });
  };

  const joinRoom = () => {
    if (!name.trim()) return setError('Inserisci il tuo nome');
    if (!roomCode.trim()) return setError('Inserisci il codice stanza');
    setLoading(true);
    socket.emit('joinRoom', { roomCode, playerName: name }, (response) => {
      setLoading(false);
      if (response.error) {
        setError(response.error);
      } else {
        setPlayer(p => ({ ...p, name }));
        setScreen('lobby');
      }
    });
  };

  return (
    <Container>
      <Title>🎮 IMPOSTORE</Title>
      
      <Input
        placeholder="Il tuo nome"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      
      <Button onClick={createRoom} disabled={loading}>
        {loading ? 'Creando...' : '➕ Crea Stanza'}
      </Button>
      
      <Divider>o</Divider>
      
      <JoinContainer>
        <Input
          placeholder="Codice Stanza"
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
          maxLength="5"
        />
        <Button onClick={joinRoom} disabled={loading}>
          {loading ? 'Entrando...' : '🔑 Partecipa'}
        </Button>
      </JoinContainer>
      
      {error && <ErrorMessage>{error}</ErrorMessage>}
    </Container>
  );
};

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  padding: 20px;
`;

const JoinContainer = styled.div`
  display: flex;
  gap: 10px;
  width: 100%;
`;

const Divider = styled.div`
  margin: 10px 0;
  color: #666;
`;

const ErrorMessage = styled.div`
  color: #ff4444;
  margin-top: 10px;
`;

export default HomeScreen;
