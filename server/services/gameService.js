const Room = require('../models/Room');
const wordService = require('./wordService');
const aiService = require('./aiService');

class GameService {
  generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  async createRoom(hostId) {
    const code = this.generateRoomCode();
    const room = new Room({ code, hostId, players: [] });
    await room.save();
    return room;
  }

  async joinRoom(code, playerId, playerName) {
    const room = await Room.findOne({ code });
    if (!room) throw new Error('Room not found');
    if (room.status !== 'lobby') throw new Error('Game already started');
    
    if (room.players.find(p => p.id === playerId)) {
      throw new Error('Already in room');
    }
    
    room.players.push({ id: playerId, name: playerName });
    await room.save();
    return room;
  }

  async startGame(code, mode) {
    const room = await Room.findOne({ code });
    if (!room) throw new Error('Room not found');
    if (room.players.length < 3) throw new Error('Need at least 3 players');
    
    room.mode = mode;
    room.status = 'speaking';
    
    // Assign roles and words
    const { domain, mainWord } = wordService.getRandomWord();
    room.wordDomain = domain;
    room.mainWord = mainWord;
    
    // Randomly select special role player
    const specialRoleIndex = Math.floor(Math.random() * room.players.length);
    
    if (mode === 'infiltrator') {
      room.players.forEach((player, index) => {
        player.role = index === specialRoleIndex ? 'infiltrator' : 'citizen';
        player.word = index === specialRoleIndex ? '' : mainWord;
      });
    } else {
      // Spy mode - generate spy word using AI
      const spyWord = await aiService.generateSpyWordPair(mainWord);
      room.spyWord = spyWord;
      
      room.players.forEach((player, index) => {
        player.role = index === specialRoleIndex ? 'spy' : 'agent';
        player.word = index === specialRoleIndex ? spyWord : mainWord;
      });
    }
    
    room.currentSpeaker = 0;
    room.speakerTimeLeft = 30;
    
    await room.save();
    return room;
  }

  async nextSpeaker(code) {
    const room = await Room.findOne({ code });
    if (!room) throw new Error('Room not found');
    
    room.players[room.currentSpeaker].hasSpoken = true;
    
    // Find next alive player
    let nextIndex = (room.currentSpeaker + 1) % room.players.length;
    let attempts = 0;
    
    while (!room.players[nextIndex].isAlive && attempts < room.players.length) {
      nextIndex = (nextIndex + 1) % room.players.length;
      attempts++;
    }
    
    // Check if all alive players have spoken
    const alivePlayers = room.players.filter(p => p.isAlive);
    const allSpoken = alivePlayers.every(p => p.hasSpoken);
    
    if (allSpoken) {
      room.status = 'voting';
      room.players.forEach(p => p.votedFor = null);
    } else {
      room.currentSpeaker = nextIndex;
      room.speakerTimeLeft = 30;
    }
    
    await room.save();
    return room;
  }

  async submitVote(code, playerId, votedForId) {
    const room = await Room.findOne({ code });
    if (!room) throw new Error('Room not found');
    
    const player = room.players.find(p => p.id === playerId);
    if (!player || !player.isAlive) throw new Error('Cannot vote');
    
    player.votedFor = votedForId;
    await room.save();
    
    // Check if all alive players have voted
    const alivePlayers = room.players.filter(p => p.isAlive);
    const allVoted = alivePlayers.every(p => p.votedFor);
    
    if (allVoted) {
      return this.processVotes(code);
    }
    
    return room;
  }

  async processVotes(code) {
    const room = await Room.findOne({ code });
    
    // Count votes
    const voteCounts = {};
    room.players.filter(p => p.isAlive).forEach(player => {
      voteCounts[player.votedFor] = (voteCounts[player.votedFor] || 0) + 1;
    });
    
    // Find player with most votes
    let maxVotes = 0;
    let eliminatedId = null;
    
    for (const [playerId, votes] of Object.entries(voteCounts)) {
      if (votes > maxVotes) {
        maxVotes = votes;
        eliminatedId = playerId;
      }
    }
    
    if (eliminatedId) {
      const eliminated = room.players.find(p => p.id === eliminatedId);
      eliminated.isAlive = false;
      
      // Check win conditions
      const specialRole = room.mode === 'infiltrator' ? 'infiltrator' : 'spy';
      const normalRole = room.mode === 'infiltrator' ? 'citizen' : 'agent';
      
      if (eliminated.role === specialRole) {
        room.winner = normalRole + 's';
        room.status = 'ended';
      } else {
        const alivePlayers = room.players.filter(p => p.isAlive);
        if (alivePlayers.length === 2) {
          const specialStillAlive = alivePlayers.some(p => p.role === specialRole);
          if (specialStillAlive) {
            room.winner = specialRole;
            room.status = 'ended';
          }
        }
        
        if (room.status !== 'ended') {
          // Continue to next round
          room.status = 'speaking';
          room.players.forEach(p => p.hasSpoken = false);
          room.currentSpeaker = room.players.findIndex(p => p.isAlive);
          room.speakerTimeLeft = 30;
        }
      }
    }
    
    await room.save();
    return room;
  }
}

module.exports = new GameService();