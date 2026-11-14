const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

const rooms = {
  25: { players: {}, food: [] },
  50: { players: {}, food: [] },
  100: { players: {}, food: [] }
};

// Initialize food for rooms
Object.keys(rooms).forEach(roomKey => {
  for (let i = 0; i < 60; i++) {
    rooms[roomKey].food.push({
      id: Math.random().toString(36).substr(2, 9),
      x: Math.random() * 2400 - 1200,
      y: Math.random() * 2400 - 1200,
      color: ['#ff4757', '#2ed573', '#1e90ff', '#ffa502', '#9b59b6'][Math.floor(Math.random() * 5)]
    });
  }
});

io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);

  socket.on('join_room', ({ roomTier, playerName }) => {
    socket.join(roomTier);
    socket.data.roomTier = roomTier;
    socket.data.playerName = playerName;

    rooms[roomTier].players[socket.id] = {
      id: socket.id,
      name: playerName || 'Player',
      x: Math.random() * 1000 - 500,
      y: Math.random() * 1000 - 500,
      angle: 0,
      score: 15,
      boosting: false
    };

    socket.emit('init', { id: socket.id, room: roomTier });
  });

  socket.on('update_movement', (data) => {
    const tier = socket.data.roomTier;
    if (tier && rooms[tier] && rooms[tier].players[socket.id]) {
      const player = rooms[tier].players[socket.id];
      player.x = data.x;
      player.y = data.y;
      player.angle = data.angle;
      player.score = data.score;
      player.boosting = data.boosting;
    }
  });

  socket.on('eat_food', (foodId) => {
    const tier = socket.data.roomTier;
    if (tier && rooms[tier]) {
      const foodIndex = rooms[tier].food.findIndex(f => f.id === foodId);
      if (foodIndex !== -1) {
        rooms[tier].food.splice(foodIndex, 1);
        // Respawn food
        rooms[tier].food.push({
          id: Math.random().toString(36).substr(2, 9),
          x: Math.random() * 2400 - 1200,
          y: Math.random() * 2400 - 1200,
          color: ['#ff4757', '#2ed573', '#1e90ff', '#ffa502', '#9b59b6'][Math.floor(Math.random() * 5)]
        });
      }
    }
  });

  socket.on('cash_out', () => {
    const tier = socket.data.roomTier;
    if (tier && rooms[tier] && rooms[tier].players[socket.id]) {
      const player = rooms[tier].players[socket.id];
      const payout = Math.floor(player.score * (Number(tier) / 20));
      socket.emit('cash_out_success', { payout, tier });
      delete rooms[tier].players[socket.id];
    }
  });

  socket.on('disconnect', () => {
    const tier = socket.data.roomTier;
    if (tier && rooms[tier]) {
      delete rooms[tier].players[socket.id];
    }
    console.log('Player disconnected:', socket.id);
  });
});

// Game loop broadcast (30 FPS)
setInterval(() => {
  Object.keys(rooms).forEach(tier => {
    io.to(tier).emit('game_state', {
      players: rooms[tier].players,
      food: rooms[tier].food
    });
  });
}, 1000 / 30);

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
