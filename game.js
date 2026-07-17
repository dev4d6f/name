// --- SETUP & DOM ELEMENTS ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const btnStart = document.getElementById('btn-start');
const btnRestart = document.getElementById('btn-restart');
const finalScoreText = document.getElementById('final-score');

// --- GAME STATE VARIABLES ---
let isPlaying = false;
let isGameOver = false;
let animationId;
let score = 0;
let highScore = localStorage.getItem('retroRunnerHighScore') || 0;
let gameSpeed = 5;
let frameCount = 0;

// --- PHYSICS & ENVIRONMENT CONFIG ---
const GRAVITY = 0.6;
const JUMP_FORCE = -12;
const GROUND_HEIGHT = 50;

// --- PLAYER OBJECT ---
const player = {
    x: 50,
    y: canvas.height - GROUND_HEIGHT - 40,
    width: 40,
    height: 40,
    dy: 0,
    isGrounded: true,
    
    draw() {
        // Draw main body (Red Pixel Hero)
        ctx.fillStyle = '#ff0055'; 
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Draw Eye
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(this.x + 24, this.y + 8, 10, 10);
        
        // Draw Pupil
        ctx.fillStyle = '#000000';
        ctx.fillRect(this.x + 28, this.y + 10, 4, 4);
        
        // Draw Legs with simple 2-frame running animation
        ctx.fillStyle = '#ffcc00';
        if (this.isGrounded) {
            if (frameCount % 20 < 10) {
                // Stride 1
                ctx.fillRect(this.x + 5, this.y + this.height, 10, 10);
                ctx.fillRect(this.x + 25, this.y + this.height, 10, 10);
            } else {
                // Stride 2
                ctx.fillRect(this.x + 10, this.y + this.height, 10, 10);
                ctx.fillRect(this.x + 20, this.y + this.height, 10, 10);
            }
        } else {
            // Jumping pose
            ctx.fillRect(this.x + 15, this.y + this.height, 10, 10);
        }
    },
    
    update() {
        // Apply gravity to velocity
        this.dy += GRAVITY;
        this.y += this.dy;
        
        // Floor collision detection
        if (this.y + this.height >= canvas.height - GROUND_HEIGHT) {
            this.y = canvas.height - GROUND_HEIGHT - this.height;
            this.dy = 0;
            this.isGrounded = true;
        } else {
            this.isGrounded = false;
        }
    },
    
    jump() {
        if (this.isGrounded) {
            this.dy = JUMP_FORCE;
            this.isGrounded = false;
        }
    }
};

// --- OBSTACLES SYSTEM ---
let obstacles = [];

class Obstacle {
    constructor() {
        // Randomize dimensions to keep gameplay unpredictable
        this.width = 30 + Math.random() * 20; 
        this.height = 30 + Math.random() * 40; 
        this.x = canvas.width;
        this.y = canvas.height - GROUND_HEIGHT - this.height;
        // Randomize colors between classic arcade slime green and purple
        this.color = Math.random() > 0.5 ? '#00ff00' : '#9900ff';
    }
    
    draw() {
        // Draw slime body
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Draw pixel spikes on top of the slime
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(this.x + 5, this.y - 5, 5, 5);
        ctx.fillRect(this.x + this.width - 10, this.y - 5, 5, 5);
    }
    
    update() {
        this.x -= gameSpeed;
    }
}

function spawnObstacle() {
    // Generate new obstacles at random intervals
    if (frameCount % Math.floor(Math.random() * 60 + 50) === 0) {
        obstacles.push(new Obstacle());
    }
}

function handleObstacles() {
    for (let i = 0; i < obstacles.length; i++) {
        let obs = obstacles[i];
        
        obs.update();
        obs.draw();
        
        // Precise Bounding Box (AABB) Collision Detection
        if (
            player.x < obs.x + obs.width &&
            player.x + player.width > obs.x &&
            player.y < obs.y + obs.height &&
            player.y + player.height > obs.y
        ) {
            triggerGameOver();
        }
        
        // Remove obstacles that have left the screen
        if (obs.x + obs.width < 0) {
            obstacles.splice(i, 1);
            i--; 
        }
    }
}

// --- RENDERING ---
function drawEnvironment() {
    // Top Grass Layer
    ctx.fillStyle = '#33cc33'; 
    ctx.fillRect(0, canvas.height - GROUND_HEIGHT, canvas.width, GROUND_HEIGHT);
    
    // Deep Dirt Layer
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(0, canvas.height - GROUND_HEIGHT + 10, canvas.width, GROUND_HEIGHT - 10);
    
    // UI Score Rendering
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px "Courier New", Courier, monospace';
    ctx.textAlign = 'right';
    
    // Format scores with leading zeros (e.g., 0042)
    const displayScore = score.toString().padStart(4, '0');
    const displayHighScore = highScore.toString().padStart(4, '0');
    
    ctx.fillText(`HI-SCORE: ${displayHighScore}`, canvas.width - 20, 30);
    ctx.fillText(`SCORE: ${displayScore}`, canvas.width - 20, 60);
}

// --- MAIN GAME LOOP ---
function gameLoop() {
    if (!isPlaying) return;
    
    // Clear previous frame
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Fill Sky Background
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw all elements
    drawEnvironment();
    player.update();
    player.draw();
    handleObstacles();
    spawnObstacle();
    
    // Increase game speed gradually for progressive difficulty
    if (frameCount % 500 === 0 && gameSpeed < 18) {
        gameSpeed += 0.5;
    }
    
    // Increment score over time
    if (frameCount % 10 === 0) {
        score++;
    }
    
    frameCount++;
    
    // Loop
    animationId = requestAnimationFrame(gameLoop);
}

// --- INPUT HANDLING ---
function handleInput(e) {
    if (e.type === 'keydown') {
        if (e.code === 'Space' || e.code === 'ArrowUp') {
            e.preventDefault(); // Prevent scrolling on Spacebar press
            if (isPlaying) player.jump();
            checkStartFromKey(e);
        }
    } else if (e.type === 'touchstart' || e.type === 'mousedown') {
        // Prevent jumping if tapping a UI button
        if (e.target.tagName !== 'BUTTON' && isPlaying) {
            player.jump();
        }
    }
}

function checkStartFromKey(e) {
    if (e.code === 'Space') {
        if (!isPlaying && !isGameOver && !startScreen.classList.contains('hidden')) {
            startGame();
        } else if (isGameOver) {
            startGame();
        }
    }
}

// Attach event listeners for cross-platform support
window.addEventListener('keydown', handleInput);
window.addEventListener('mousedown', handleInput);
window.addEventListener('touchstart', handleInput, { passive: false });

// --- STATE MANAGEMENT ---
function startGame() {
    // Hide all UI overlays
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    
    // Reset all game variables for a fresh run
    obstacles = [];
    score = 0;
    frameCount = 0;
    gameSpeed = 6;
    
    // Reset player position and velocity
    player.y = canvas.height - GROUND_HEIGHT - player.height;
    player.dy = 0;
    
    isPlaying = true;
    isGameOver = false;
    
    // Start the animation loop
    gameLoop();
}

function triggerGameOver() {
    isPlaying = false;
    isGameOver = true;
    cancelAnimationFrame(animationId);
    
    // Save High Score to LocalStorage if beaten
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('retroRunnerHighScore', highScore);
    }
    
    // Update and show Game Over UI
    finalScoreText.innerText = score.toString().padStart(4, '0');
    gameOverScreen.classList.remove('hidden');
}

// Button Listeners
btnStart.addEventListener('click', startGame);
btnRestart.addEventListener('click', startGame);
