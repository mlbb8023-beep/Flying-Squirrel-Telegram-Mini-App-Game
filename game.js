const game = document.getElementById("game");
const squirrel = document.getElementById("squirrel");
const message = document.getElementById("message");
const startButton = document.getElementById("startButton");
const scoreElement = document.getElementById("score");
// Запрет масштабирования страницы на iPhone
document.addEventListener("gesturestart", function(event) {
    event.preventDefault();
}, { passive: false });

document.addEventListener("gesturechange", function(event) {
    event.preventDefault();
}, { passive: false });

document.addEventListener("gestureend", function(event) {
    event.preventDefault();
}, { passive: false });


// НАСТРОЙКИ ИГРЫ

const GAME_WIDTH = 400;
const GAME_HEIGHT = 650;

const SQUIRREL_X = 85;
const SQUIRREL_WIDTH = 60;
const SQUIRREL_HEIGHT = 55;

const OBSTACLE_WIDTH = 75;
const GAP = 200;

const GRAVITY = 0.38;
const JUMP_POWER = -7;
const SPEED = 3;

// СОСТОЯНИЕ

const tg = window.Telegram?.WebApp;

if (tg) {
    tg.ready();
    tg.expand();
}

let bestScore = Number(
    localStorage.getItem("flyingSquirrelBest") || 0
);

// ПОЛЕ РЕКОРДА

const bestElement = document.createElement("div");

bestElement.textContent = "РЕКОРД: " + bestScore;

bestElement.style.position = "absolute";
bestElement.style.top = "55px";
bestElement.style.left = "15px";
bestElement.style.zIndex = "10";
bestElement.style.color = "white";
bestElement.style.fontSize = "16px";
bestElement.style.fontWeight = "bold";
bestElement.style.textShadow = "1px 1px 3px black";

game.appendChild(bestElement);

// ОБНОВЛЕНИЕ РЕКОРДА

function updateBestScore(value) {
    if (value <= bestScore) return;

    bestScore = value;

    localStorage.setItem(
        "flyingSquirrelBest",
        String(bestScore)
    );

    bestElement.textContent = "РЕКОРД: " + bestScore;

    // СИНХРОНИЗАЦИЯ С TELEGRAM

    if (tg?.CloudStorage) {
        tg.CloudStorage.setItem(
            "best_score",
            String(bestScore)
        );
    }
}

// ЗАГРУЗКА ОБЛАЧНОГО РЕКОРДА

if (tg?.CloudStorage) {
    tg.CloudStorage.getItem("best_score", (error, value) => {
        if (!error && value !== null && value !== "") {
            const cloudScore = Number(value);

            if (Number.isFinite(cloudScore)) {
                bestScore = Math.max(bestScore, cloudScore);

                localStorage.setItem(
                    "flyingSquirrelBest",
                    String(bestScore)
                );

                bestElement.textContent =
                    "РЕКОРД: " + bestScore;
            }
        }
    });
}

let y = 280;
let velocity = 0;
let running = false;
let score = 0;
let obstacles = [];

function createLog(element, height, isTop) {
    element.style.position = "absolute";
    element.style.left = GAME_WIDTH + "px";
    element.style.width = OBSTACLE_WIDTH + "px";
    element.style.height = height + "px";
    element.style.boxSizing = "border-box";
    element.style.overflow = "hidden";
    element.style.zIndex = "3";

    element.style.background = `
        linear-gradient(
            90deg,
            #42251c,
            #89502d 25%,
            #b47743 50%,
            #75432a 75%,
            #392119
        )
    `;

    element.style.borderLeft = "3px solid #392119";
    element.style.borderRight = "3px solid #392119";
    element.style.borderRadius = "12px";

    const cut = document.createElement("div");

    cut.style.position = "absolute";
    cut.style.left = "-3px";
    cut.style.width = "calc(100% + 6px)";
    cut.style.height = "20px";
    cut.style.boxSizing = "border-box";
    cut.style.border = "3px solid #54351f";
    cut.style.borderRadius = "50%";

    cut.style.background = `
        repeating-radial-gradient(
            ellipse at center,
            #d6a16a 0px,
            #d6a16a 2px,
            #9b653b 3px,
            #c18a55 5px,
            #82502e 7px
        )
    `;

    cut.style.pointerEvents = "none";

    if (isTop) {
        cut.style.bottom = "0";
    } else {
        cut.style.top = "0";
    }

    element.appendChild(cut);
}

// СОЗДАНИЕ ПРЕПЯТСТВИЙ

function createObstacle() {
    const minTop = 90;
    const maxTop = 350;

    const topHeight =
        Math.floor(Math.random() * (maxTop - minTop + 1))
        + minTop;

    const bottomY = topHeight + GAP;

    const top = document.createElement("div");
    const bottom = document.createElement("div");

    top.style.top = "0px";
    bottom.style.top = bottomY + "px";

    createLog(top, topHeight, true);

    createLog(
        bottom,
        GAME_HEIGHT - bottomY,
        false
    );

    game.appendChild(top);
    game.appendChild(bottom);

    obstacles.push({
        x: GAME_WIDTH,
        topHeight: topHeight,
        bottomY: bottomY,
        top: top,
        bottom: bottom,
        passed: false
    });
}

// СБРОС И ЗАПУСК

function startGame() {
    obstacles.forEach(o => {
        o.top.remove();
        o.bottom.remove();
    });

    obstacles = [];

    score = 0;
    y = 280;
    velocity = JUMP_POWER;

    scoreElement.textContent = "0";

    squirrel.style.top = y + "px";
    squirrel.style.transform = "rotate(0deg)";

    message.style.display = "none";

    running = true;

    createObstacle();
}

// ПРЫЖОК

function jump() {
    if (!running) return;

    velocity = JUMP_POWER;
}

// ПРОВЕРКА СТОЛКНОВЕНИЙ

function collision() {
    if (
        y < 0 ||
        y + SQUIRREL_HEIGHT > GAME_HEIGHT
    ) {
        return true;
    }

    const playerLeft = SQUIRREL_X + 10;
    const playerRight =
        SQUIRREL_X + SQUIRREL_WIDTH - 10;

    const playerTop = y + 8;
    const playerBottom =
        y + SQUIRREL_HEIGHT - 8;

    for (const o of obstacles) {
        const obstacleLeft = o.x;
        const obstacleRight =
            o.x + OBSTACLE_WIDTH;

        const overlapsX =
            playerRight > obstacleLeft &&
            playerLeft < obstacleRight;

        if (!overlapsX) continue;

        const hitsTop =
            playerTop < o.topHeight;

        const hitsBottom =
            playerBottom > o.bottomY;

        if (hitsTop || hitsBottom) {
            return true;
        }
    }

    return false;
}

// КОНЕЦ ИГРЫ

function endGame() {
    running = false;

    updateBestScore(score);

    message.style.display = "flex";

    message.querySelector("h1").textContent =
        "ИГРА ОКОНЧЕНА";

    message.querySelector("p").textContent =
        "Твой счёт: " + score;

    startButton.textContent = "ИГРАТЬ СНОВА";
}

// ИГРОВОЙ ЦИКЛ

function update() {
    if (running) {
        // ФИЗИКА

        velocity += GRAVITY;
        y += velocity;

        squirrel.style.top = y + "px";

        const angle = Math.max(
            -30,
            Math.min(50, velocity * 4)
        );

        squirrel.style.transform =
            `rotate(${angle}deg)`;

        // ДВИЖЕНИЕ ПРЕПЯТСТВИЙ

        obstacles.forEach(o => {
            o.x -= SPEED;

            o.top.style.left = o.x + "px";
            o.bottom.style.left = o.x + "px";

            // НАЧИСЛЕНИЕ ОЧКОВ

            if (
                !o.passed &&
                o.x + OBSTACLE_WIDTH < SQUIRREL_X
            ) {
                o.passed = true;
                score++;

                scoreElement.textContent = score;
            }
        });

        // УДАЛЕНИЕ СТАРЫХ ПРЕПЯТСТВИЙ

        obstacles = obstacles.filter(o => {
            if (o.x + OBSTACLE_WIDTH < 0) {
                o.top.remove();
                o.bottom.remove();

                return false;
            }

            return true;
        });

        // СОЗДАНИЕ НОВЫХ ПРЕПЯТСТВИЙ

        if (
            obstacles.length === 0 ||
            obstacles[obstacles.length - 1].x < 220
        ) {
            createObstacle();
        }

        // ПРОВЕРКА СТОЛКНОВЕНИЯ

        if (collision()) {
            endGame();
        }
    }

    requestAnimationFrame(update);
}

// УПРАВЛЕНИЕ КНОПКОЙ ЗАПУСКА

startButton.addEventListener("pointerdown", function(event) {
    event.preventDefault();
    event.stopPropagation();
    startGame();
});

// УПРАВЛЕНИЕ ПОЛЁТОМ

game.addEventListener("pointerdown", event => {
    if (event.target === startButton) return;

    jump();
});

// ЗАПУСК ЦИКЛА

update();

