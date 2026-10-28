const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, { cors: { origin: '*' } });
const { v4: uuidv4 } = require('uuid');
const path = require('path');

app.use(express.static(path.join(__dirname, '../client')));

const WORDS = {
  english: [
    'cat','dog','house','car','tree','sun','moon','star','fish','bird','boat','train','plane','book','chair','table','phone','hat','shoe','ball',
    'cake','pizza','flower','guitar','drum','robot','castle','mountain','river','beach','apple','banana','elephant','tiger','lion','frog',
    'snake','butterfly','dragon','wizard','computer','keyboard','rocket','lighthouse','submarine','helicopter','volcano','jellyfish','unicorn',
    'umbrella','snowman','penguin','octopus','pirate','ninja','astronaut','firetruck','icecream','cactus','mushroom','skeleton','mermaid',
    'bicycle','skateboard','airplane','helicopter','laptop','camera','headphones','microphone','backpack','telescope'
  ],
  german: ['haus','baum','auto','katze','hund','vogel','fisch','blume','ball','buch','stuhl','tisch','kerze','schloss','burg'],
  french: ['chat','chien','maison','arbre','voiture','fleur','bateau','avion','gateau','ballon','chateau','robot']
};

function getWords(lang='english') { return WORDS[lang] || WORDS.english; }

function pickWords(n, lang='english') {
  const pool = [...getWords(lang)];
  const arr = [];
  while(arr.length < n && pool.length) {
    const i = Math.floor(Math.random()*pool.length);
    arr.push(pool.splice(i,1)[0]);
  }
  return arr;
}

const rooms = new Map();

function createRoom() {
  const id = uuidv4().slice(0,6).toLowerCase();
  const room = {
    id,
    players: new Map(),
    ownerId: null,
    state: 'lobby',
    settings: { rounds: 3, drawTime: 80, wordCount: 3, hints: 2, wordMode: 'normal', language: 'english' },
    round: 0,
    drawerId: null,
    word: null,
    guessedSet: new Set(),
    scores: new Map(),
    turnOrder: [],
    timer: null,
    timeLeft: 0,
    hintsRevealed: 0
  };
  rooms.set(id, room);
  return room;
}

function broadcast(room, ev, data) { io.to(room.id).emit(ev, data); }

function getPlayerList(room) {
  return Array.from(room.players.values()).map(p => ({
    id: p.id,
    name: p.name,
    avatar: p.avatar,
    score: room.scores.get(p.id) || 0,
    guessed: room.guessedSet.has(p.id),
    isOwner: p.id === room.ownerId
  }));
}

function startGame(room) {
  if(room.players.size < 2) return;
  room.state = 'playing';
  room.round = 0;
  room.turnOrder = Array.from(room.players.keys());
  for(let i=room.turnOrder.length-1;i>0;i--) {
    const j = Math.floor(Math.random()*(i+1));
    [room.turnOrder[i],room.turnOrder[j]] = [room.turnOrder[j],room.turnOrder[i]];
  }
  room.scores.clear();
  for(const pid of room.players.keys()) room.scores.set(pid, 0);
  nextTurn(room);
}

function nextTurn(room) {
  clearInterval(room.timer);
  room.guessedSet.clear();
  room.hintsRevealed = 0;
  room.round++;
  const maxTurns = room.settings.rounds * room.turnOrder.length;
  if(room.round > maxTurns) { endGame(room); return; }
  const idx = (room.round-1) % room.turnOrder.length;
  room.drawerId = room.turnOrder[idx];
  const words = pickWords(room.settings.wordCount, room.settings.language);
  room.word = null;
  room.state = 'choosing';
  broadcast(room, 'state', {
    state: 'choosing',
    drawerId: room.drawerId,
    words,
    round: room.round,
    maxRounds: maxTurns,
    players: getPlayerList(room)
  });
}

function startDrawing(room) {
  clearInterval(room.timer);
  room.state = 'drawing';
  room.timeLeft = room.settings.drawTime;
  const revealTimes = [];
  if(room.settings.hints > 0) {
    const interval = Math.floor(room.settings.drawTime / (room.settings.hints + 1));
    for(let i=1;i<=room.settings.hints;i++) revealTimes.push(room.settings.drawTime - interval*i);
  }
  room.timer = setInterval(() => {
    room.timeLeft--;
    if(revealTimes.includes(room.timeLeft)) revealHint(room);
    if(room.timeLeft <= 0) {
      clearInterval(room.timer);
      endTurn(room, false);
      return;
    }
    broadcast(room, 'time', { timeLeft: room.timeLeft });
  }, 1000);
  const displayWord = (room.word||'').split('').map(c=>c===' ' ? ' ' : '_').join('');
  broadcast(room, 'state', {
    state: 'drawing',
    drawerId: room.drawerId,
    word: room.word,
    displayWord,
    hints: room.settings.hints,
    timeLeft: room.timeLeft,
    round: room.round,
    maxRounds: room.settings.rounds * room.turnOrder.length,
    players: getPlayerList(room)
  });
}

function revealHint(room) {
  if(room.hintsRevealed >= room.settings.hints) return;
  room.hintsRevealed++;
  const w = room.word.toLowerCase();
  const positions = [];
  for(let i=0;i<w.length;i++) if(w[i] !== ' ') positions.push(i);
  if(positions.length === 0) return;
  const p = positions[Math.floor(Math.random()*positions.length)];
  broadcast(room, 'hint', { position: p, letter: w[p] });
}

function endTurn(room, correct) {
  clearInterval(room.timer);
  room.state = 'reveal';
  if(correct) {
    const drawer = room.drawerId;
    for(const pid of room.guessedSet) {
      const pts = Math.max(20, Math.floor(room.timeLeft * 2.5));
      room.scores.set(pid, (room.scores.get(pid)||0) + pts);
    }
    if(room.guessedSet.size > 0) {
      room.scores.set(drawer, (room.scores.get(drawer)||0) + Math.max(30, room.guessedSet.size * 10));
    }
  }
  broadcast(room, 'reveal', {
    word: room.word,
    scores: getPlayerList(room)
  });
  setTimeout(() => nextTurn(room), 4500);
}

function endGame(room) {
  clearInterval(room.timer);
  room.state = 'end';
  const results = getPlayerList(room).sort((a,b)=>b.score-a.score);
  broadcast(room, 'end', { results });
}

io.on('connection', (socket) => {
  socket.on('create_room', (data) => {
    const room = createRoom();
    const pid = socket.id;
    room.ownerId = pid;
    room.players.set(pid, { id: pid, name: (data.name||'Player').slice(0,16), avatar: data.avatar || [0,0,0,-1] });
    room.scores.set(pid, 0);
    socket.join(room.id);
    socket.emit('room_joined', { roomId: room.id, playerId: pid, isOwner: true, settings: room.settings });
    broadcast(room, 'players', getPlayerList(room));
  });

  socket.on('join_room', (data) => {
    const room = getRoom((data.roomId||'').toLowerCase());
    if(!room) { socket.emit('error', { msg: 'Room not found' }); return; }
    if(room.state !== 'lobby') { socket.emit('error', { msg: 'Game already started' }); return; }
    if(room.players.size >= 20) { socket.emit('error', { msg: 'Room is full' }); return; }
    const pid = socket.id;
    room.players.set(pid, { id: pid, name: (data.name||'Player').slice(0,16), avatar: data.avatar || [0,0,0,-1] });
    room.scores.set(pid, 0);
    socket.join(room.id);
    socket.emit('room_joined', { roomId: room.id, playerId: pid, isOwner: pid === room.ownerId, settings: room.settings });
    broadcast(room, 'players', getPlayerList(room));
  });

  socket.on('update_settings', (data) => {
    const room = Array.from(rooms.values()).find(r => r.players.has(socket.id));
    if(!room || room.ownerId !== socket.id || room.state !== 'lobby') return;
    if(data.rounds) room.settings.rounds = parseInt(data.rounds);
    if(data.drawTime) room.settings.drawTime = parseInt(data.drawTime);
    if(data.wordCount) room.settings.wordCount = parseInt(data.wordCount);
    if(data.hints !== undefined) room.settings.hints = parseInt(data.hints);
    if(data.language) room.settings.language = data.language;
    broadcast(room, 'settings', room.settings);
  });

  socket.on('start_game', () => {
    const room = Array.from(rooms.values()).find(r => r.players.has(socket.id));
    if(!room || room.ownerId !== socket.id) return;
    if(room.players.size < 2) { socket.emit('error', { msg: 'Need at least 2 players' }); return; }
    startGame(room);
  });

  socket.on('choose_word', (data) => {
    const room = Array.from(rooms.values()).find(r => r.players.has(socket.id));
    if(!room || room.drawerId !== socket.id || room.state !== 'choosing') return;
    room.word = data.word;
    startDrawing(room);
  });

  socket.on('draw', (data) => {
    const room = Array.from(rooms.values()).find(r => r.players.has(socket.id));
    if(!room || room.drawerId !== socket.id || room.state !== 'drawing') return;
    socket.broadcast.to(room.id).emit('draw', data);
  });

  socket.on('clear', () => {
    const room = Array.from(rooms.values()).find(r => r.players.has(socket.id));
    if(!room || room.drawerId !== socket.id || room.state !== 'drawing') return;
    socket.broadcast.to(room.id).emit('clear');
  });

  socket.on('fill', (data) => {
    const room = Array.from(rooms.values()).find(r => r.players.has(socket.id));
    if(!room || room.drawerId !== socket.id || room.state !== 'drawing') return;
    socket.broadcast.to(room.id).emit('fill', data);
  });

  socket.on('undo', () => {
    const room = Array.from(rooms.values()).find(r => r.players.has(socket.id));
    if(!room || room.drawerId !== socket.id || room.state !== 'drawing') return;
    socket.broadcast.to(room.id).emit('undo');
  });

  socket.on('guess', (data) => {
    const room = Array.from(rooms.values()).find(r => r.players.has(socket.id));
    if(!room || room.state !== 'drawing') return;
    const pid = socket.id;
    if(pid === room.drawerId) return;
    if(room.guessedSet.has(pid)) return;
    const guess = (data.text || '').trim().toLowerCase();
    const word = (room.word||'').toLowerCase();
    if(guess === word) {
      room.guessedSet.add(pid);
      const name = room.players.get(pid)?.name || 'Player';
      broadcast(room, 'chat', { type: 'correct', name, id: pid });
      const nonDrawer = Array.from(room.players.keys()).filter(id => id !== room.drawerId);
      if(nonDrawer.every(id => room.guessedSet.has(id))) {
        endTurn(room, true);
      }
    } else {
      const name = room.players.get(pid)?.name || 'Player';
      broadcast(room, 'chat', { type: 'guess', name, text: data.text, id: pid });
    }
  });

  socket.on('chat', (data) => {
    const room = Array.from(rooms.values()).find(r => r.players.has(socket.id));
    if(!room) return;
    const pid = socket.id;
    const name = room.players.get(pid)?.name || 'Player';
    broadcast(room, 'chat', { type: room.state === 'lobby' ? 'lobby' : 'guess', name, text: data.text, id: pid });
  });

  socket.on('kick', (data) => {
    const room = Array.from(rooms.values()).find(r => r.players.has(socket.id));
    if(!room || room.ownerId !== socket.id) return;
    const target = io.sockets.sockets.get(data.id);
    if(target && room.players.has(data.id)) {
      target.emit('kicked');
      target.leave(room.id);
      room.players.delete(data.id);
      room.scores.delete(data.id);
      room.turnOrder = room.turnOrder.filter(id => id !== data.id);
      broadcast(room, 'players', getPlayerList(room));
    }
  });

  socket.on('disconnect', () => {
    for(const [rid, room] of rooms) {
      if(room.players.has(socket.id)) {
        room.players.delete(socket.id);
        room.scores.delete(socket.id);
        room.guessedSet.delete(socket.id);
        room.turnOrder = room.turnOrder.filter(id => id !== socket.id);
        if(room.ownerId === socket.id && room.players.size > 0) {
          room.ownerId = Array.from(room.players.keys())[0];
          broadcast(room, 'owner', { ownerId: room.ownerId });
        }
        if(room.players.size === 0) { clearInterval(room.timer); rooms.delete(rid); continue; }
        if(room.drawerId === socket.id && (room.state === 'drawing' || room.state === 'choosing')) {
          endTurn(room, false);
        }
        broadcast(room, 'players', getPlayerList(room));
      }
    }
  });
});

http.listen(3000, () => {
  console.log('Yaply server running on http://localhost:3000');
});
