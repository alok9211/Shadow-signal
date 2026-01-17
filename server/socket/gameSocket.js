const gameService = require('../services/gameService');
const Room = require('../models/Room');

module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('create-room', async (callback) => {
      try {
        const room = await gameService.createRoom(socket.id);
        socket.join(room.code);
        callback({ success: true, room });
      } catch (error) {
        callback({ success: false, error: error.message });
      }
    });

    socket.on('join-room', async ({ code, name }, callback) => {
      try {
        const room = await gameService.joinRoom(code, socket.id, name);
        socket.join(code);
        io.to(code).emit('player-joined', room);
        callback({ success: true, room });
      } catch (error) {
        callback({ success: false, error: error.message });
      }
    });

    socket.on('start-game', async ({ code, mode }, callback) => {
      try {
        const room = await gameService.startGame(code, mode);
        io.to(code).emit('game-started', room);
        callback({ success: true });
        
        // Start speaker timer
        startSpeakerTimer(code);
      } catch (error) {
        callback({ success: false, error: error.message });
      }
    });

    socket.on('next-speaker', async ({ code }) => {
      try {
        const room = await gameService.nextSpeaker(code);
        io.to(code).emit('speaker-changed', room);
        
        if (room.status === 'speaking') {
          startSpeakerTimer(code);
        }
      } catch (error) {
        socket.emit('error', error.message);
      }
    });

    socket.on('submit-vote', async ({ code, votedForId }, callback) => {
      try {
        const room = await gameService.submitVote(code, socket.id, votedForId);
        io.to(code).emit('vote-submitted', room);
        callback({ success: true });
      } catch (error) {
        callback({ success: false, error: error.message });
      }
    });

    socket.on('disconnect', async () => {
      console.log('User disconnected:', socket.id);
      // Handle player disconnect - could mark as inactive
    });
  });

  // Helper function for speaker timer
  function startSpeakerTimer(code) {
    const interval = setInterval(async () => {
      const room = await Room.findOne({ code });
      if (!room || room.status !== 'speaking') {
        clearInterval(interval);
        return;
      }
      
      room.speakerTimeLeft--;
      await room.save();
      
      io.to(code).emit('timer-tick', room.speakerTimeLeft);
      
      if (room.speakerTimeLeft <= 0) {
        clearInterval(interval);
        const updatedRoom = await gameService.nextSpeaker(code);
        io.to(code).emit('speaker-changed', updatedRoom);
        
        if (updatedRoom.status === 'speaking') {
          startSpeakerTimer(code);
        }
      }
    }, 1000);
  }
};