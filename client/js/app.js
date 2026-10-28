const socket = io('http://localhost:3000');
const home = document.getElementById('home');
const lobby = document.getElementById('lobby');
const gameEl = document.getElementById('game');
const end = document.getElementById('end');

let playerId = null;
let roomId = null;
let isOwner = false;
let avatar = [Math.floor(Math.random()*10), Math.floor(Math.random()*10), Math.floor(Math.random()*10), -1];
let drawing = false;
let drawerId = null;
let myId = null;
let brushColor = '#000000';
let brushSize = 8;
let lastX = 0, lastY = 0;
let paths = [];

const nameInput = document.getElementById('name');
const playBtn = document.getElementById('play');
const createBtn = document.getElementById('create');
const joinBtn = document.getElementById('join');
const roomcode = document.getElementById('roomcode');

const avaLeft = document.getElementById('ava-left');
const avaRight = document.getElementById('ava-right');
const avaRand = document.getElementById('ava-rand');
const avaPrev = document.getElementById('avatar-preview');
const avaCtx = avaPrev.getContext('2d');

function drawAvatar(ctx, a) {
  ctx.clearRect(0,0,80,80);
  ctx.fillStyle = '#1f1f2e';
  ctx.fillRect(0,0,80,80);
  const palettes = [
    ['#f59e0b','#fbbf24','#fcd34d'],
    ['#22d3ee','#38bdf8','#60a5fa'],
    ['#a855f7','#c084fc','#d8b4fe'],
  ];
  ctx.fillStyle = palettes[a[0]%palettes.length][0];
  ctx.beginPath(); ctx.arc(40,42,24,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath(); ctx.arc(32,38,4,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(48,38,4,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = '#111827';
  ctx.beginPath(); ctx.arc(32,38,2,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(48,38,2,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(40,48,6,Math.PI*0.2,Math.PI*0.8); ctx.stroke();
}

function randAvatar(){ avatar=[Math.floor(Math.random()*10),Math.floor(Math.random()*10),Math.floor(Math.random()*10),-1]; drawAvatar(avaCtx,avatar); }
avaLeft.onclick=()=>{avatar[0]=(avatar[0]-1+10)%10; drawAvatar(avaCtx,avatar);};
avaRight.onclick=()=>{avatar[0]=(avatar[0]+1)%10; drawAvatar(avaCtx,avatar);};
avaRand.onclick=randAvatar;
randAvatar();

playBtn.onclick=()=>{
  const name = nameInput.value.trim()||'Player';
  socket.emit('join_room', { roomId: (roomcode.value||'').toLowerCase(), name, avatar });
};
createBtn.onclick=()=>{
  const name = nameInput.value.trim()||'Player';
  socket.emit('create_room', { name, avatar });
};
joinBtn.onclick=()=>{
  const name = nameInput.value.trim()||'Player';
  socket.emit('join_room', { roomId: (roomcode.value||'').toLowerCase(), name, avatar });
};

socket.on('room_joined', (data)=>{
  roomId = data.roomId;
  playerId = data.playerId;
  isOwner = data.isOwner;
  home.classList.add('hidden');
  lobby.classList.remove('hidden');
  document.getElementById('room-id').textContent = roomId;
  const startBtn = document.getElementById('start');
  startBtn.style.display = isOwner ? 'flex' : 'none';
});

socket.on('players', (list)=>{
  const lobbyList = document.getElementById('lobby-players');
  const gameList = document.getElementById('game-players');
  const lobbyCount = document.getElementById('lobby-player-count');
  if (lobbyCount) lobbyCount.textContent = list.length;
  lobbyList.innerHTML = '';
  gameList.innerHTML = '';
  list.forEach(p => {
    const item = document.createElement('div');
    item.className = 'player-item' + (p.id === playerId ? ' you' : '');
    item.innerHTML = `<canvas class="player-avatar" width="42" height="42"></canvas><div class="player-info"><div class="player-name">${escapeHtml(p.name)}</div><div class="player-score">${p.score} pts</div></div>`;
    drawAvatar(item.querySelector('canvas').getContext('2d'), p.avatar || [0, 0, 0, -1]);
    const clone = item.cloneNode(true);
    lobbyList.appendChild(clone);
    gameList.appendChild(item);
  });
});

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

socket.on('owner', (d) => {
  isOwner = d.ownerId === playerId;
  const startBtn = document.getElementById('start');
  startBtn.style.display = isOwner ? 'flex' : 'none';
});

document.getElementById('start').onclick = ()=>{ if(isOwner) socket.emit('start_game'); };

const lobbyChat = document.getElementById('lobby-chat');
const lobbyChatForm = document.getElementById('lobby-chat-form');
const lobbyChatInput = document.getElementById('lobby-chat-input');
lobbyChatForm.onsubmit = (e)=>{ e.preventDefault(); if(!lobbyChatInput.value.trim()) return; socket.emit('chat', { text: lobbyChatInput.value.trim() }); lobbyChatInput.value=''; };

socket.on('chat', (msg) => {
  const div = document.createElement('div');
  div.className = 'chat-line ' + msg.type;
  if (msg.type === 'correct') {
    div.textContent = `${msg.name} guessed the word!`;
  } else if (msg.type === 'lobby') {
    div.textContent = `${msg.name}: ${msg.text}`;
  } else {
    div.textContent = `${msg.name}: ${msg.text}`;
  }
  if (lobby && !lobby.classList.contains('hidden')) {
    lobbyChat.appendChild(div);
    lobbyChat.scrollTop = lobbyChat.scrollHeight;
  }
  if (gameEl && !gameEl.classList.contains('hidden')) {
    const div2 = div.cloneNode(true);
    gameChat.appendChild(div2);
    gameChat.scrollTop = gameChat.scrollHeight;
  }
});

// Game
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
ctx.fillStyle = '#ffffff';
ctx.fillRect(0, 0, 800, 600);
let isDrawing = false;

canvas.addEventListener('mousedown', startDraw);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', stopDraw);
canvas.addEventListener('mouseleave', stopDraw);

canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  if (!drawing || drawerId !== playerId) return;
  const touch = e.touches[0];
  const rect = canvas.getBoundingClientRect();
  isDrawing = true;
  lastX = (touch.clientX - rect.left) * (800 / rect.width);
  lastY = (touch.clientY - rect.top) * (600 / rect.height);
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  if (!isDrawing || !drawing || drawerId !== playerId) return;
  const touch = e.touches[0];
  const rect = canvas.getBoundingClientRect();
  const x = (touch.clientX - rect.left) * (800 / rect.width);
  const y = (touch.clientY - rect.top) * (600 / rect.height);
  ctx.beginPath();
  ctx.moveTo(lastX, lastY);
  ctx.lineTo(x, y);
  ctx.strokeStyle = brushColor;
  ctx.lineWidth = brushSize;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
  socket.emit('draw', { x1: lastX, y1: lastY, x2: x, y2: y, color: brushColor, size: brushSize });
  lastX = x;
  lastY = y;
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
  e.preventDefault();
  isDrawing = false;
}, { passive: false });

function startDraw(e){
  if(!drawing || drawerId !== playerId) return;
  isDrawing = true;
  const rect = canvas.getBoundingClientRect();
  lastX = (e.clientX - rect.left)*(800/rect.width);
  lastY = (e.clientY - rect.top)*(600/rect.height);
}
function draw(e){
  if(!isDrawing || !drawing || drawerId !== playerId) return;
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left)*(800/rect.width);
  const y = (e.clientY - rect.top)*(600/rect.height);
  ctx.beginPath();
  ctx.moveTo(lastX,lastY);
  ctx.lineTo(x,y);
  ctx.strokeStyle = brushColor;
  ctx.lineWidth = brushSize;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
  socket.emit('draw', { x1:lastX,y1:lastY,x2:x,y2:y,color:brushColor,size:brushSize });
  lastX=x; lastY=y;
}
function stopDraw(){ isDrawing=false; }

socket.on('draw', (d)=>{
  if(drawing && drawerId === playerId) return;
  ctx.beginPath();
  ctx.moveTo(d.x1,d.y1);
  ctx.lineTo(d.x2,d.y2);
  ctx.strokeStyle = d.color;
  ctx.lineWidth = d.size;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
});
socket.on('clear', ()=>{
  ctx.fillStyle='#ffffff'; ctx.fillRect(0,0,800,600);
});

const colors = document.getElementById('colors');
['#000000','#ffffff','#ef4444','#f97316','#f59e0b','#22c55e','#22d3ee','#3b82f6','#a855f7','#ec4899','#78716c','#92400e'].forEach(c=>{
  const sw = document.createElement('div');
  sw.className='color-swatch'; sw.style.background=c; sw.onclick=()=>{ brushColor=c; document.querySelectorAll('.color-swatch').forEach(x=>x.classList.remove('active')); sw.classList.add('active'); };
  colors.appendChild(sw);
});
document.querySelectorAll('.color-swatch')[0].classList.add('active');

document.querySelectorAll('.size-btn').forEach(b=>{
  b.onclick=()=>{ document.querySelectorAll('.size-btn').forEach(x=>x.classList.remove('active')); b.classList.add('active'); brushSize=parseInt(b.dataset.size); };
});

document.getElementById('clear').onclick = () => {
  if (drawing && drawerId === playerId) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 800, 600);
    socket.emit('clear');
  }
};
document.getElementById('undo').onclick = () => {};

const wordBar = document.getElementById('word-bar');
const wordChoose = document.getElementById('word-choose');
const wordOptions = document.getElementById('word-options');
const roundNum = document.getElementById('round-num');
const roundMax = document.getElementById('round-max');
const timeEl = document.getElementById('time');

socket.on('state', (data) => {
  lobby.classList.add('hidden');
  gameEl.classList.remove('hidden');
  drawerId = data.drawerId;
  drawing = data.state === 'drawing';
  myId = playerId;
  roundNum.textContent = data.round;
  roundMax.textContent = data.maxRounds;
  if (data.state === 'choosing') {
    wordChoose.classList.remove('hidden');
    wordOptions.innerHTML = '';
    if (drawerId === playerId) {
      wordBar.textContent = 'Choose a word!';
      if (data.words) {
        data.words.forEach(w => {
          const b = document.createElement('div');
          b.className = 'word-option';
          b.textContent = w;
          b.onclick = () => {
            socket.emit('choose_word', { word: w });
            wordChoose.classList.add('hidden');
          };
          wordOptions.appendChild(b);
        });
      }
    } else {
      wordBar.textContent = 'Waiting for drawer to choose...';
    }
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 800, 600);
  } else if (data.state === 'drawing') {
    wordChoose.classList.add('hidden');
    if (drawerId === playerId) {
      wordBar.textContent = `DRAW: ${data.word || ''}`;
    } else {
      wordBar.textContent = data.wordLength ? '_ '.repeat(data.wordLength).trim() : 'Guess the word!';
    }
  }
});

function getName(id){
  // simple
  return 'Player';
}

socket.on('time', (d) => {
  if (timeEl) timeEl.textContent = d.timeLeft;
});

const gameChat = document.getElementById('game-chat');
const gameChatForm = document.getElementById('game-chat-form');
const gameChatInput = document.getElementById('game-chat-input');
gameChatForm.onsubmit = (e)=>{ e.preventDefault(); if(!gameChatInput.value.trim()) return; socket.emit('guess', { text: gameChatInput.value.trim() }); gameChatInput.value=''; };

socket.on('reveal', (data) => {
  wordBar.textContent = `The word was: ${data.word}`;
  const gameList = document.getElementById('game-players');
  gameList.innerHTML = '';
  if (data.scores) {
    data.scores.forEach(p => {
      const item = document.createElement('div');
      item.className = 'player-item' + (p.guessed ? ' you' : '');
      item.innerHTML = `<canvas class="player-avatar" width="42" height="42"></canvas><div class="player-info"><div class="player-name">${escapeHtml(p.name)}</div><div class="player-score">${p.score} pts</div></div>`;
      drawAvatar(item.querySelector('canvas').getContext('2d'), p.avatar || [0, 0, 0, -1]);
      gameList.appendChild(item);
    });
  }
});

socket.on('end', (data) => {
  gameEl.classList.add('hidden');
  end.classList.remove('hidden');
  const res = document.getElementById('results');
  res.innerHTML = '';
  if (data.results) {
    data.results.forEach((r, i) => {
      const row = document.createElement('div');
      row.className = 'result-row';
      row.innerHTML = `<div style="display:flex;align-items:center;gap:12px;"><span style="color:var(--accent);font-weight:700;">#${i + 1}</span><span style="font-weight:600;">${escapeHtml(r.name)}</span></div><div style="font-weight:700;color:var(--warning);">${r.score} pts</div>`;
      res.appendChild(row);
    });
  }
});

document.getElementById('back-home').onclick = ()=>{ location.reload(); };

socket.on('error', (e)=>{ alert(e.msg); });
