// Načtení plátna (canvas)
let canvas = document.getElementById('gameCanvas');
let ctx = canvas.getContext('2d');

// Globální proměnné
let lives = 5;
const maxLives = 5;
let score = 0;
let gameOver = false;
let words = [];
let bullets = [];
let speedMultiplier = 0.01; // Začínáme s poloviční rychlostí
let bonusStar = null;
let correctHits = [];
let missedPronouns = [];

// Seznam zájmen a ostatních slov
let pronouns = ["já", "mě", "mne", "mně", "mi", "my", "nás", "nám", "ty", "tě", "tebe", "tobě", "vy", "vás", "vám", "on", "jeho", "ho", "jej", "jemu", "mu", "ona", "ji", "ní", "jí", "ono", "oni", "ony", "jejich", "jim", "je"];
let otherWords = ["pes", "kočka", "strom", "auto", "škola", "učitel", "žák", "stůl", "židle", "hora", "řeka", "moře", "kniha"];

// Načtení obrázků
let rocketImage = new Image();
rocketImage.src = 'rocket.png';
let ufoImage = new Image();
ufoImage.src = 'ufo.png';
let starImage = new Image();
starImage.src = 'star.png';

// Zvuky
let correctSound = new Audio('correct.mp3');
let wrongSound = new Audio('wrong.mp3');

// Hráč
let player = {
    x: canvas.width / 2 - 25,
    y: canvas.height - 80,
    width: 50,
    height: 50,
    speed: 10
};

// Načtení kláves
let keys = {};

// Funkce pro herní smyčku
let lastTimestamp = 0;
function gameLoop(timestamp) {
    const deltaTime = timestamp - lastTimestamp;
    lastTimestamp = timestamp;

    if (!gameOver) {
        update(deltaTime);
        draw();
        requestAnimationFrame(gameLoop);
    }
}

// Funkce pro inicializaci hry
function initGame() {
    console.log("Inicializace hry začíná...");
    lives = 5;
    score = 0;
    gameOver = false;
    words = [];
    bullets = [];
    bonusStar = null;
    speedMultiplier = 0.05; // Nastavení pomalejší rychlosti na začátku
    correctHits = [];
    missedPronouns = [];

    canvas.style.display = "block";
    document.getElementById("controls").style.display = "flex";

    initControls();

    console.log("Spuštění herní smyčky a intervalů...");
    lastTimestamp = performance.now();
    spawnInterval = setInterval(spawnWord, 1000);
    speedIncreaseInterval = setInterval(() => {
        speedMultiplier *= 5; // Exponenciální zrychlení (nahradíme lineárním)
        console.log("Nový násobitel rychlosti:", speedMultiplier);
    }, 30000);
    requestAnimationFrame(gameLoop); // Zavolání gameLoop
}

// Funkce pro inicializaci dotykových tlačítek
function initControls() {
    const leftButton = document.getElementById('left-button');
    const rightButton = document.getElementById('right-button');
    const fireButtonLeft = document.getElementById('fire-button-left');
    const fireButtonRight = document.getElementById('fire-button-right');

    leftButton.addEventListener('touchstart', () => keys['ArrowLeft'] = true);
    leftButton.addEventListener('touchend', () => keys['ArrowLeft'] = false);

    rightButton.addEventListener('touchstart', () => keys['ArrowRight'] = true);
    rightButton.addEventListener('touchend', () => keys['ArrowRight'] = false);

    const fireAction = () => {
        bullets.push({
            x: player.x + player.width / 2 - 2.5,
            y: player.y,
            speed: 5
        });
    };

    fireButtonLeft.addEventListener('touchstart', fireAction);
    fireButtonRight.addEventListener('touchstart', fireAction);

    // Zamezení nabídky "kopírovat/vyhledat" při podržení na tlačítkách
    document.querySelectorAll('#controls button').forEach(button => {
        button.addEventListener('contextmenu', event => {
            event.preventDefault();
        });

        button.addEventListener('dblclick', event => {
            event.preventDefault(); // Zamezí zoomování při dvojkliku
        });
    });

    // Zamezení dvojitému klepnutí na celé stránce
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (event) => {
        const now = new Date().getTime();
        if (now - lastTouchEnd <= 300) {
            event.preventDefault();
        }
        lastTouchEnd = now;
    }, false);
}

// Funkce pro generování slov
function spawnWord() {
    if (words.length >= 10) return;

    let isPronoun = Math.random() < 0.5;
    let text = isPronoun ? pronouns[Math.floor(Math.random() * pronouns.length)] : otherWords[Math.floor(Math.random() * otherWords.length)];

    let x, y, speed;
    do {
        x = Math.random() * (canvas.width - 50);
        y = -50;
        speed = 1 + speedMultiplier + Math.random() * 0.5; // Náhodná rychlost
    } while (words.some(word => Math.abs(word.x - x) < 50 && Math.abs(word.y - y) < 50)); // Kontrola překrývání

    words.push({ text, x, y, speed });
}

// Funkce pro aktualizaci herních prvků
function update(deltaTime) {
    if (keys['ArrowLeft'] && player.x > 0) player.x -= player.speed;
    if (keys['ArrowRight'] && player.x + player.width < canvas.width) player.x += player.speed;

    words.forEach((word, index) => {
        word.y += word.speed;
        if (word.y > canvas.height) {
            if (pronouns.includes(word.text)) {
                loseLife();
                missedPronouns.push(word.text);
                wrongSound.play();
            }
            words.splice(index, 1);
        }
    });

    if (!bonusStar && Math.random() < 0.001) { // Náhodný spawn hvězdy
        bonusStar = {
            x: Math.random() * (canvas.width - 50),
            y: -50,
            speed: 1 + speedMultiplier * 0.5
        };
        console.log("Bonusová hvězda vytvořena!");
    }

    if (bonusStar) {
        bonusStar.y += bonusStar.speed;
        if (bonusStar.y > canvas.height) bonusStar = null;
    }

    bullets = bullets.filter(bullet => {
        bullet.y -= bullet.speed;

        if (bonusStar && bullet.x > bonusStar.x && bullet.x < bonusStar.x + 50 && bullet.y > bonusStar.y && bullet.y < bonusStar.y + 50) {
            if (lives < maxLives) lives++;
            correctSound.play();
            bonusStar = null;
            return false;
        }

        const hitIndex = words.findIndex(word =>
            bullet.x > word.x && bullet.x < word.x + 50 &&
            bullet.y > word.y && bullet.y < word.y + 50
        );

        if (hitIndex !== -1) {
            const word = words[hitIndex];
            if (pronouns.includes(word.text)) {
                score++;
                correctHits.push(word.text);
                correctSound.play();
            } else {
                loseLife();
                wrongSound.play();
            }
            words.splice(hitIndex, 1);
            return false;
        }
        return bullet.y > 0;
    });
}

function loseLife() {
    lives--;
    if (lives <= 0) endGame();
}

// Funkce pro ukončení hry
function endGame() {
    gameOver = true;
    clearInterval(spawnInterval);
    clearInterval(speedIncreaseInterval);

    const correct = correctHits.length > 0 ? correctHits.join(', ') : 'Žádná';
    const missed = missedPronouns.length > 0 ? missedPronouns.join(', ') : 'Žádná';

    alert(`Hra skončila! Skóre: ${score}\nSprávně: ${correct}\nUniklá: ${missed}`);
    document.getElementById("controls").style.display = "none";
    canvas.style.display = "none";
    document.getElementById("start-screen").style.display = "block";
}

// Funkce pro vykreslení herních prvků
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.drawImage(rocketImage, player.x, player.y, player.width, player.height);

    words.forEach(word => {
        ctx.drawImage(ufoImage, word.x, word.y, 50, 50);
        ctx.fillStyle = 'green';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(word.text, word.x + 25, word.y + 70);
    });

    if (bonusStar) ctx.drawImage(starImage, bonusStar.x, bonusStar.y, 50, 50);

    ctx.fillStyle = 'red';
    bullets.forEach(bullet => ctx.fillRect(bullet.x, bullet.y, 5, 10));

    drawLivesAndScore();
}

function drawLivesAndScore() {
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Skóre: ${score}`, 10, 30);

    for (let i = 0; i < lives; i++) {
        ctx.drawImage(starImage, 10 + i * 25, 50, 20, 20);
    }
}

document.addEventListener('keydown', e => {
    keys[e.key] = true;
    if (e.key === ' ') {
        bullets.push({ x: player.x + player.width / 2 - 2.5, y: player.y, speed: 5 });
    }
});
document.addEventListener('keyup', e => keys[e.key] = false);
