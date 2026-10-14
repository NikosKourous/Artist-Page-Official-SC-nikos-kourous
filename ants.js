const overall_transparency=0.3;

const ant_count=1;
const ant_speed=5;
const ant_alpha=0.8;
const start_x=500;
const start_y=100;
const cell_size=2;
const colors=['white', 'black'];

const canvas=document.getElementById('antBackground');
const ctx=canvas.getContext('2d');
canvas.width=window.innerWidth;
canvas.height=window.innerHeight;

canvas.style.opacity=overall_transparency;

const cols=Math.floor(canvas.width / cell_size);
const rows=Math.floor(canvas.height / cell_size);

const grid=Array.from({ length: cols }, () => Array(rows).fill(0));

const ants=[];
for (let i=0; i < ant_count; i++) {
    ants.push({
        x: start_x + Math.floor(Math.random() * 401) - 150,
        y: start_y + Math.floor(Math.random() * 401) - 100,
        dir: Math.floor(Math.random() * 4)
    });
}

function drawCell(x, y, state) {
    ctx.fillStyle=colors[state];
    ctx.globalAlpha=ant_alpha;
    ctx.fillRect(x * cell_size, y * cell_size, cell_size, cell_size);
    ctx.globalAlpha=1;
}

function rebound(ant) {
    const bounceOptions=[
        (ant.dir + 1) % 4,
        (ant.dir + 3) % 4
    ];
    ant.dir=bounceOptions[Math.floor(Math.random() * 2)];

    if (ant.x < 0) ant.x=1;
    if (ant.y < 0) ant.y=1;
    if (ant.x >= cols) ant.x=cols - 2;
    if (ant.y >= rows) ant.y=rows - 2;

    if (ant.dir === 0) ant.y--;
    else if (ant.dir === 1) ant.x++;
    else if (ant.dir === 2) ant.y++;
    else if (ant.dir === 3) ant.x--;
}

function stepAnt(ant) {
    if (ant.x < 0 || ant.y < 0 || ant.x >= cols || ant.y >= rows) {
        rebound(ant);
    }

    const x=ant.x;
    const y=ant.y;

    const current=grid[x][y];
    grid[x][y]=1 - current;
    drawCell(x, y, grid[x][y]);

    if (current === 0) {
        ant.dir=(ant.dir + 1) % 4;
    } else {
        ant.dir=(ant.dir + 3) % 4;
    }

    if (ant.dir === 0) ant.y--;
    else if (ant.dir === 1) ant.x++;
    else if (ant.dir === 2) ant.y++;
    else if (ant.dir === 3) ant.x--;
}

function animate() {
    for (let i=0; i < ant_speed; i++) {
        ants.forEach(stepAnt);
    }
    requestAnimationFrame(animate);
}

animate();