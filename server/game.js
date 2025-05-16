class Game {
    constructor(rounds, roundDuration) {
        this.rounds = rounds;
        this.roundDuration = roundDuration;
        this.currentRound = 0;
        this.players = [];
        this.impostor = null;
        this.votes = [];
        this.gameStarted = false;
    }
    
    addPlayer(socketId, name, isHost) {
        const player = {
            id: socketId,
            name,
            isHost,
            role: null
        };
        
        this.players.push(player);
        return player;
    }
    
    removePlayer(socketId) {
        this.players = this.players.filter(p => p.id !== socketId);
        
        // Se l'host se ne va, assegna un nuovo host
        if (this.players.length > 0 && !this.players.some(p => p.isHost)) {
            this.players[0].isHost = true;
        }
    }
    
    getPlayer(socketId) {
        return this.players.find(p => p.id === socketId);
    }
    
    getPlayers() {
        return this.players.map(p => ({ ...p }));
    }
    
    isGameStarted() {
        return this.gameStarted;
    }
    
    startGame() {
        this.gameStarted = true;
        this.currentRound = 1;
        
        // Scegli un impostore casuale
        const impostorIndex = Math.floor(Math.random() * this.players.length);
        this.impostor = this.players[impostorIndex].id;
        
        // Assegna i ruoli
        this.players.forEach(player => {
            player.role = player.id === this.impostor ? 'impostor' : 'innocent';
        });
        
        this.votes = [];
    }
    
    addVote(voterId, votedPlayerId) {
        const voter = this.getPlayer(voterId);
        const voted = this.getPlayer(votedPlayerId);
        
        if (!voter || !voted) return;
        
        // Rimuovi eventuali voti precedenti dello stesso giocatore
        this.votes = this.votes.filter(v => v.voter !== voterId);
        
        this.votes.push({
            voter: voter.name,
            voted: voted.name,
            votedId: voted.id
        });
    }
    
    allVotesIn() {
        return this.votes.length === this.players.length;
    }
    
    calculateResults() {
        // Conta i voti
        const voteCount = {};
        this.votes.forEach(vote => {
            voteCount[vote.votedId] = (voteCount[vote.votedId] || 0) + 1;
        });
        
        // Trova il più votato
        let maxVotes = 0;
        let mostVoted = null;
        Object.entries(voteCount).forEach(([playerId, count]) => {
            if (count > maxVotes) {
                maxVotes = count;
                mostVoted = playerId;
            }
        });
        
        // Determina il vincitore
        const winner = mostVoted === this.impostor;
        
        return {
            votes: this.votes,
            impostor: this.getPlayer(this.impostor).name,
            winner,
            nextRound: this.currentRound < this.rounds
        };
    }
    
    prepareNextRound() {
        this.currentRound++;
        this.votes = [];
    }
    
    startNextRound() {
        // Scegli un nuovo impostore casuale (diverso dal precedente)
        let newImpostorIndex;
        do {
            newImpostorIndex = Math.floor(Math.random() * this.players.length);
        } while (this.players[newImpostorIndex].id === this.impostor);
        
        this.impostor = this.players[newImpostorIndex].id;
        
        // Assegna i ruoli
        this.players.forEach(player => {
            player.role = player.id === this.impostor ? 'impostor' : 'innocent';
        });
        
        this.votes = [];
    }
    
    endGame() {
        this.gameStarted = false;
    }
    
    resetGame() {
        this.gameStarted = false;
        this.currentRound = 0;
        this.impostor = null;
        this.votes = [];
        
        this.players.forEach(player => {
            player.role = null;
        });
    }
}

module.exports = Game;
