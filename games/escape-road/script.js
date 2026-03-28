// --- Game Setup ---
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.width = 800;
canvas.height = 400;

// --- Game Classes ---

class Player {
  constructor(game) {
    this.game = game;
    this.width = 30;
    this.height = 30;
    this.x = 50;
    this.y = this.game.groundLevel - this.height;
    this.color = "#4db8ff";
    this.velocityY = 0;
    this.isJumping = false;
    this.isGrounded = true;
  }

  draw() {
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.width, this.height);
    // Shield visual effect
    if (this.game.shieldActive) {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(
        this.x + this.width / 2,
        this.y + this.height / 2,
        this.width,
        0,
        2 * Math.PI
      );
      ctx.stroke();
    }
  }

  update() {
    // Apply gravity if not on the ground
    if (!this.isGrounded) {
      this.velocityY += this.game.physics.gravity;
    }
    this.y += this.velocityY;

    // Check for ground collision
    if (this.y >= this.game.groundLevel - this.height) {
      this.y = this.game.groundLevel - this.height;
      this.velocityY = 0;
      this.isGrounded = true;
      this.isJumping = false;
    }
  }

  jump() {
    if (this.isGrounded) {
      this.isGrounded = false;
      this.isJumping = true;
      this.velocityY = this.game.physics.jumpForce;
    }
  }
}

class Obstacle {
  constructor(game) {
    this.game = game;
    this.width = 30;
    this.height = 30;
    this.x = canvas.width;
    this.y = this.game.groundLevel - this.height;
    this.color = "#ff4d4d";
  }

  draw() {
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }

  update() {
    if (!this.game.timeSlowed) {
      this.x -= this.game.obstacleSpeed;
    } else {
      this.x -= this.game.obstacleSpeed / 2;
    }
  }
}

class PowerUp {
  constructor(game) {
    this.game = game;
    this.width = 20;
    this.height = 20;
    this.x = canvas.width;
    this.y = this.game.groundLevel - this.height - Math.random() * 80 - 40; // Random height
    this.duration = 5000; // 5 seconds for all power-ups
    this.type = this.getRandomType();
    this.color = this.getColorForType();
  }

  getRandomType() {
    const types = ["scoreMultiplier", "shield", "highJump", "slowTime"];
    return types[Math.floor(Math.random() * types.length)];
  }

  getColorForType() {
    switch (this.type) {
      case "scoreMultiplier":
        return "#ffd700"; // Gold
      case "shield":
        return "#00bfff"; // Deep Sky Blue
      case "highJump":
        return "#32cd32"; // Lime Green
      case "slowTime":
        return "#8a2be2"; // Blue Violet
      default:
        return "#cccccc";
    }
  }

  draw() {
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }

  update() {
    if (!this.game.timeSlowed) {
      this.x -= this.game.obstacleSpeed;
    } else {
      this.x -= this.game.obstacleSpeed / 2;
    }
  }
}

class Game {
  constructor() {
    this.player = new Player(this);
    this.physics = {
      gravity: 0.5,
      jumpForce: -12
    };
    this.obstacles = [];
    this.powerUps = [];
    this.obstacleSpeed = 5;
    this.obstacleInterval = 1200;
    this.powerUpInterval = 5000;
    this.lastObstacleTime = Date.now();
    this.lastPowerUpTime = Date.now();
    this.gameOver = false;
    this.score = 0;
    this.highScore = localStorage.getItem("highScore") || 0;
    this.scoreMultiplier = 1;
    this.groundLevel = canvas.height - 30;
    this.lastUpdateTime = 0;
    this.parallaxBackground = { x: 0, y: 0, speed: 1 };
    this.shieldActive = false;
    this.timeSlowed = false;
  }

  drawParallaxBackground() {
    ctx.fillStyle = "#6b5e54";
    ctx.fillRect(
      0,
      this.groundLevel,
      canvas.width,
      canvas.height - this.groundLevel
    );
    ctx.fillStyle = "#87ceeb";
    ctx.fillRect(0, 0, canvas.width, this.groundLevel);

    ctx.fillStyle = "#cccccc";
    for (let i = 0; i < 50; i++) {
      const starX = (i * 50 + this.parallaxBackground.x) % canvas.width;
      ctx.beginPath();
      ctx.arc(starX, (i * 20) % this.groundLevel, 1, 0, 2 * Math.PI);
      ctx.fill();
    }
    this.parallaxBackground.x -= this.parallaxBackground.speed;
  }

  drawUI() {
    ctx.fillStyle = "white";
    ctx.font = "20px Arial";
    ctx.textAlign = "left";
    ctx.fillText(`Score: ${this.score}`, 10, 25);
    ctx.textAlign = "right";
    ctx.fillText(`High Score: ${this.highScore}`, canvas.width - 10, 25);

    ctx.textAlign = "center";
    if (this.scoreMultiplier > 1) {
      ctx.fillStyle = "#ffd700";
      ctx.fillText(
        `Multiplier: x${this.scoreMultiplier}`,
        canvas.width / 2,
        25
      );
    }
    if (this.shieldActive) {
      ctx.fillStyle = "#00bfff";
      ctx.fillText("Shield Active!", canvas.width / 2, 50);
    }
    if (this.timeSlowed) {
      ctx.fillStyle = "#8a2be2";
      ctx.fillText("Time Slowed!", canvas.width / 2, 75);
    }
  }

  generateObstacle() {
    const currentTime = Date.now();
    const interval = this.timeSlowed
      ? this.obstacleInterval * 2
      : this.obstacleInterval;
    if (currentTime - this.lastObstacleTime > interval) {
      this.obstacles.push(new Obstacle(this));
      this.lastObstacleTime = currentTime;
    }
  }

  generatePowerUp() {
    const currentTime = Date.now();
    const interval = this.timeSlowed
      ? this.powerUpInterval * 2
      : this.powerUpInterval;
    if (currentTime - this.lastPowerUpTime > interval) {
      this.powerUps.push(new PowerUp(this));
      this.lastPowerUpTime = currentTime;
    }
  }

  checkCollision() {
    // Obstacle collision
    this.obstacles.forEach((obstacle, index) => {
      if (
        this.player.x < obstacle.x + obstacle.width &&
        this.player.x + this.player.width > obstacle.x &&
        this.player.y < obstacle.y + obstacle.height &&
        this.player.y + this.player.height > obstacle.y
      ) {
        if (this.shieldActive) {
          this.shieldActive = false;
          this.obstacles.splice(index, 1);
        } else {
          this.endGame();
        }
      }
    });

    // Power-up collision
    this.powerUps.forEach((powerUp, index) => {
      if (
        this.player.x < powerUp.x + powerUp.width &&
        this.player.x + this.player.width > powerUp.x &&
        this.player.y < powerUp.y + powerUp.height &&
        this.player.y + this.player.height > powerUp.y
      ) {
        this.powerUps.splice(index, 1);
        this.activatePowerUp(powerUp);
      }
    });
  }

  activatePowerUp(powerUp) {
    switch (powerUp.type) {
      case "scoreMultiplier":
        this.scoreMultiplier = 2;
        setTimeout(() => {
          this.scoreMultiplier = 1;
        }, powerUp.duration);
        break;
      case "shield":
        this.shieldActive = true;
        setTimeout(() => {
          this.shieldActive = false;
        }, powerUp.duration);
        break;
      case "highJump":
        const originalJumpForce = this.physics.jumpForce;
        this.physics.jumpForce = -18; // Increased jump
        setTimeout(() => {
          this.physics.jumpForce = originalJumpForce;
        }, powerUp.duration);
        break;
      case "slowTime":
        this.timeSlowed = true;
        setTimeout(() => {
          this.timeSlowed = false;
        }, powerUp.duration);
        break;
    }
  }

  updateDifficulty() {
    const speedMultiplier = this.timeSlowed ? 0.5 : 1;
    this.obstacleSpeed += 0.001 * speedMultiplier;
    if (this.obstacleInterval > 500) {
      this.obstacleInterval -= 0.1 * speedMultiplier;
    }
  }

  endGame() {
    this.gameOver = true;
    this.updateHighScore();
    ctx.fillStyle = "white";
    ctx.font = "40px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Game Over", canvas.width / 2, canvas.height / 2 - 40);
    ctx.font = "24px Arial";
    ctx.fillText(
      `Your score: ${this.score}`,
      canvas.width / 2,
      canvas.height / 2
    );
    ctx.fillText(
      "Press SPACE to restart",
      canvas.width / 2,
      canvas.height / 2 + 40
    );
  }

  updateHighScore() {
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem("highScore", this.highScore);
    }
  }

  restart() {
    this.player = new Player(this);
    this.obstacles = [];
    this.powerUps = [];
    this.obstacleSpeed = 5;
    this.obstacleInterval = 1200;
    this.score = 0;
    this.scoreMultiplier = 1;
    this.gameOver = false;
    this.lastObstacleTime = Date.now();
    this.lastPowerUpTime = Date.now();
    this.shieldActive = false;
    this.timeSlowed = false;
    this.gameLoop(0); // Restart the loop
  }

  gameLoop(timestamp) {
    if (this.gameOver) {
      return;
    }

    const deltaTime = timestamp - this.lastUpdateTime;
    this.lastUpdateTime = timestamp;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.drawParallaxBackground();

    this.player.update();
    this.obstacles.forEach((obstacle) => obstacle.update());
    this.powerUps.forEach((powerUp) => powerUp.update());

    this.generateObstacle();
    this.generatePowerUp();
    this.checkCollision();
    this.updateDifficulty();
    this.score += this.scoreMultiplier;

    this.obstacles = this.obstacles.filter(
      (obstacle) => obstacle.x + obstacle.width > 0
    );
    this.powerUps = this.powerUps.filter(
      (powerUp) => powerUp.x + powerUp.width > 0
    );

    this.player.draw();
    this.obstacles.forEach((obstacle) => obstacle.draw());
    this.powerUps.forEach((powerUp) => powerUp.draw());
    this.drawUI();

    requestAnimationFrame(this.gameLoop.bind(this));
  }
}

// --- Event Listeners ---
document.addEventListener("keydown", (event) => {
  if (event.code === "Space") {
    if (myGame.gameOver) {
      myGame.restart();
    } else {
      myGame.player.jump();
    }
  }
});

// --- Start the game ---
const myGame = new Game();
myGame.gameLoop(0);