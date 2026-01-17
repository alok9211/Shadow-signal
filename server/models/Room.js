const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  id: String,
  name: String,
  role: String,
  word: String,
  isAlive: { type: Boolean, default: true },
  hasSpoken: { type: Boolean, default: false },
  votedFor: String
});

const roomSchema = new mongoose.Schema({
  code: { type: String, unique: true, required: true },
  hostId: String,
  mode: { type: String, enum: ['infiltrator', 'spy'], default: 'infiltrator' },
  status: { type: String, enum: ['lobby', 'speaking', 'voting', 'ended'], default: 'lobby' },
  players: [playerSchema],
  currentSpeaker: Number,
  speakerTimeLeft: Number,
  wordDomain: String,
  mainWord: String,
  spyWord: String,
  winner: String,
  createdAt: { type: Date, default: Date.now, expires: 86400 } // Auto-delete after 24h
});

module.exports = mongoose.model('Room', roomSchema);