const socket = io();

const lobby = document.getElementById('lobby');
const gameContainer = document.getElementById('game-container');
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const playerNameInput = document.getElementById('playerName');
const scoreVal = document.getElementById('scoreVal');
const roomVal = document.getElementById('roomVal');
const cashOutBtn = document.getElementById('cashOutBtn');

let myId = null;
let currentRoom = null;
let gameState = { players: {}, food: [] };

let playerX = 0;
let playerY = 0;
let targetX = 0;
let targetY = 0;
let playerAngle = 0;
let score = 15;
let speed = 3;
let boosting = false;
let lastTap = 0;

// Resize canvas
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Room selection buttons
document.querySelectorAll('.room-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const roomTier = btn.getAttribute('data-tier');
        const playerName = playerNameInput.value.trim() || 'Player';

        currentRoom = roomTier;
        roomVal.textContent = roomTier;

        socket.emit('join_room', { roomTier, playerName });

        lobby.classList.add('hidden');
        gameContainer.classList.remove('hidden');
        requestAnimationFrame(gameLoop);
    });
});

socket.on('init', (data) => {
    myId = data.id;
});

socket.on('game_state', (state) => {
    gameState = state;
});

// Controls: Mouse movement & Double-tap boost
window.addEventListener('mousemove', (e) => {
    targetX = e.clientX;
    targetY = e.clientY;
});

window.addEventListener('click', () => {
    const now = Date.now();
    if (now - lastTap < 300) {
        boosting = true;
        setTimeout(() => { boosting = false; }, 1000);
    }
    lastTap = now;
});

// Cash out button logic (hold or click)
cashOutBtn.addEventListener('click', () => {
    if (confirm("Are you sure you want to cash out your current score?")) {
        socket.emit('cash_out');
    }
});

socket.on('cash_out_success', (data) => {
    alert(`Successfully cashed out! Payout: ${data.payout} EGP from ${data.tier} EGP room.`);
    window.location.reload();
});

function gameLoop() {
    // Movement physics towards mouse
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    const dx = targetX - centerX;
    const dy = targetY - centerY;
    const angle = Math.atan2(dy, dx);
    playerAngle = angle;

    const currentSpeed = boosting ? speed * 1.8 : speed;
    playerX += Math.cos(angle) * currentSpeed;
    playerY += Math.sin(angle) * currentSpeed;

    // Send position update to server
    socket.emit('update_movement', {
        x: playerX,
        y: playerY,
        angle: playerAngle,
        score: score,
        boosting: boosting
    });

    // Check food collisions locally
    if (gameState.food) {
        gameState.foodforEach = gameState.food.forEach(f => {
            // Distance check to food
            const dist = Math.hypot(f.x - playerX, f.y - playerY);
            if (dist < 25) {
                socket.emit('eat_food', f.id);
                score += 1;
                scoreVal.textContent = score;
            }
        });
    }

    // Render Graphics
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(centerX - playerX, centerY - playerY);

    // Draw grid background
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    const gridSize = 50;
    for (let x = -2000; x < 2000; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, -2000);
        ctx.lineTo(x, 2000);
        ctx.stroke();
    }
    for (let y = -2000; y < 2000; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(-2000, y);
        ctx.lineTo(2000, y);
        ctx.stroke();
    }

    // Draw food
    if (gameState.food) {
        gameState.food.forEach(f => {
            ctx.fillStyle = f.color;
            ctx.beginPath();
            ctx.arc(f.x, f.y, 6, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    // Draw all players
    if (gameState.players) {
        Object.values(gameState.players).forEach(p => {
            ctx.fillStyle = p.id === myId ? '#38bdf8' : '#ef4444';
            ctx.beginPath();
            ctx.arc(p.x, p.y, Math.min(10 + p.score * 0.2, 40), 0, Math.PI * 2);
            ctx.fill();

            // Name label
            ctx.fillStyle = '#fff';
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(p.name, p.x, p.y - 25);
        });
    }

    ctx.restore();

    requestAnimationFrame(gameLoop);
}
