const OVERALL_TRANSPARENCY = 0.3; // Change this value (0.0 = invisible, 1.0 = fully opaque)

const ANT_COUNT = 1;
const ANT_SPEED = 5;
const ANT_ALPHA = 0.8;
const START_X =500;
const START_Y = 100;
const CELL_SIZE = 2;
const COLORS = ['white', 'black'];

const canvas = document.getElementById('antBackground');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Apply overall transparency to canvas
canvas.style.opacity = OVERALL_TRANSPARENCY;

const cols = Math.floor(canvas.width / CELL_SIZE);
const rows = Math.floor(canvas.height / CELL_SIZE);

const grid = Array.from({ length: cols }, () => Array(rows).fill(0));

const ants = [];
for (let i = 0; i < ANT_COUNT; i++) {
    ants.push({
        x: START_X + Math.floor(Math.random() * 401) - 150, // +/-200 px
        y: START_Y + Math.floor(Math.random() * 401) - 100,
        dir: Math.floor(Math.random() * 4) // Random initial direction
    });
}

function drawCell(x, y, state) {
    ctx.fillStyle = COLORS[state];
    ctx.globalAlpha = ANT_ALPHA;
    ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    ctx.globalAlpha = 1;
}

function rebound(ant) {
    const bounceOptions = [
        (ant.dir + 1) % 4,
        (ant.dir + 3) % 4
    ];
    ant.dir = bounceOptions[Math.floor(Math.random() * 2)];

    if (ant.x < 0) ant.x = 1;
    if (ant.y < 0) ant.y = 1;
    if (ant.x >= cols) ant.x = cols - 2;
    if (ant.y >= rows) ant.y = rows - 2;

    if (ant.dir === 0) ant.y--;
    else if (ant.dir === 1) ant.x++;
    else if (ant.dir === 2) ant.y++;
    else if (ant.dir === 3) ant.x--;
}

function stepAnt(ant) {
    if (ant.x < 0 || ant.y < 0 || ant.x >= cols || ant.y >= rows) {
        rebound(ant);
    }

    const x = ant.x;
    const y = ant.y;

    const current = grid[x][y];
    grid[x][y] = 1 - current;
    drawCell(x, y, grid[x][y]);

    // Standard Langston's ant rules:
    // If on white (0), turn right; if on black (1), turn left
    if (current === 0) {
        ant.dir = (ant.dir + 1) % 4;
    } else {
        ant.dir = (ant.dir + 3) % 4;
    }

    // Move forward
    if (ant.dir === 0) ant.y--;
    else if (ant.dir === 1) ant.x++;
    else if (ant.dir === 2) ant.y++;
    else if (ant.dir === 3) ant.x--;
}

function animate() {
    for (let i = 0; i < ANT_SPEED; i++) {
        ants.forEach(stepAnt);
    }
    requestAnimationFrame(animate);
}

animate();