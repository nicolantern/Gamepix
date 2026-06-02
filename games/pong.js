(function () {
  const W = 600, H = 400;
  const PADDLE_W = 10, PADDLE_H = 80;
  const BALL_R = 6;
  const PADDLE_SPEED = 6;
  const AI_SPEED = 4;
  const WIN_SCORE = 7;

  let rootEl = null;
  let canvas = null;
  let ctx = null;
  let rafId = null;
  let keyDownHandler = null;
  let keyUpHandler = null;
  let mouseHandler = null;

  let leftY = 0, rightY = 0;
  let ball = { x: 0, y: 0, vx: 0, vy: 0 };
  let leftScore = 0, rightScore = 0;
  let upPressed = false, downPressed = false;
  let useMouse = false;
  let mouseY = H / 2;
  let gameOver = false;

  function resetBall(direction) {
    ball.x = W / 2;
    ball.y = H / 2;
    const angle = (Math.random() - 0.5) * (Math.PI / 3);
    const speed = 5;
    ball.vx = Math.cos(angle) * speed * direction;
    ball.vy = Math.sin(angle) * speed;
  }

  function reset() {
    leftY = H / 2 - PADDLE_H / 2;
    rightY = H / 2 - PADDLE_H / 2;
    leftScore = 0;
    rightScore = 0;
    gameOver = false;
    resetBall(Math.random() < 0.5 ? -1 : 1);
  }

  function step() {
    if (gameOver) return;

    if (useMouse) {
      const target = mouseY - PADDLE_H / 2;
      leftY = Math.max(0, Math.min(H - PADDLE_H, target));
    } else {
      if (upPressed)   leftY = Math.max(0, leftY - PADDLE_SPEED);
      if (downPressed) leftY = Math.min(H - PADDLE_H, leftY + PADDLE_SPEED);
    }

    const aiCenter = rightY + PADDLE_H / 2;
    if (ball.y < aiCenter - 8) rightY = Math.max(0, rightY - AI_SPEED);
    else if (ball.y > aiCenter + 8) rightY = Math.min(H - PADDLE_H, rightY + AI_SPEED);

    ball.x += ball.vx;
    ball.y += ball.vy;

    if (ball.y - BALL_R < 0) { ball.y = BALL_R; ball.vy *= -1; }
    if (ball.y + BALL_R > H) { ball.y = H - BALL_R; ball.vy *= -1; }

    if (ball.x - BALL_R < PADDLE_W && ball.y > leftY && ball.y < leftY + PADDLE_H && ball.vx < 0) {
      ball.x = PADDLE_W + BALL_R;
      ball.vx *= -1.05;
      const offset = (ball.y - (leftY + PADDLE_H / 2)) / (PADDLE_H / 2);
      ball.vy = offset * 5;
    }
    if (ball.x + BALL_R > W - PADDLE_W && ball.y > rightY && ball.y < rightY + PADDLE_H && ball.vx > 0) {
      ball.x = W - PADDLE_W - BALL_R;
      ball.vx *= -1.05;
      const offset = (ball.y - (rightY + PADDLE_H / 2)) / (PADDLE_H / 2);
      ball.vy = offset * 5;
    }

    if (ball.x < 0) {
      rightScore += 1;
      if (rightScore >= WIN_SCORE) gameOver = true;
      else resetBall(1);
    } else if (ball.x > W) {
      leftScore += 1;
      if (leftScore >= WIN_SCORE) gameOver = true;
      else resetBall(-1);
    }
  }

  function draw(statusEl) {
    ctx.fillStyle = '#0f0f1e';
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = '#3a3a4e';
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(W/2, 0); ctx.lineTo(W/2, H);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#eaeaea';
    ctx.fillRect(0, leftY, PADDLE_W, PADDLE_H);
    ctx.fillRect(W - PADDLE_W, rightY, PADDLE_W, PADDLE_H);

    ctx.beginPath();
    ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = 'bold 32px system-ui';
    ctx.fillText(String(leftScore), W/2 - 50, 40);
    ctx.fillText(String(rightScore), W/2 + 30, 40);

    if (gameOver) {
      const winner = leftScore >= WIN_SCORE ? 'You win!' : 'AI wins!';
      statusEl.textContent = `${winner} Press Space to play again.`;
    } else {
      statusEl.textContent = `${leftScore} — ${rightScore}  (first to ${WIN_SCORE})`;
    }
  }

  function loop(statusEl) {
    step();
    draw(statusEl);
    rafId = requestAnimationFrame(() => loop(statusEl));
  }

  function mount(container) {
    rootEl = document.createElement('div');
    rootEl.innerHTML = `
      <style>
        .pong-wrap { text-align: center; }
        .pong-status { font-size: 18px; margin-bottom: 12px; min-height: 24px; }
        .pong-canvas { background: #0f0f1e; border: 2px solid #4a4a6a; border-radius: 4px; cursor: none; }
        .pong-hint { font-size: 12px; color: #888; margin-top: 8px; }
      </style>
      <div class="pong-wrap">
        <div class="pong-status"></div>
        <canvas class="pong-canvas" width="${W}" height="${H}"></canvas>
        <div class="pong-hint">Mouse over canvas or ↑/↓ arrow keys</div>
      </div>
    `;
    container.appendChild(rootEl);

    canvas = rootEl.querySelector('.pong-canvas');
    ctx = canvas.getContext('2d');
    const statusEl = rootEl.querySelector('.pong-status');

    reset();

    keyDownHandler = (e) => {
      if (e.key === 'ArrowUp')   { upPressed = true; useMouse = false; e.preventDefault(); }
      if (e.key === 'ArrowDown') { downPressed = true; useMouse = false; e.preventDefault(); }
      if (e.key === ' ' && gameOver) { reset(); e.preventDefault(); }
    };
    keyUpHandler = (e) => {
      if (e.key === 'ArrowUp')   upPressed = false;
      if (e.key === 'ArrowDown') downPressed = false;
    };
    mouseHandler = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouseY = (e.clientY - rect.top) * (H / rect.height);
      useMouse = true;
    };

    window.addEventListener('keydown', keyDownHandler);
    window.addEventListener('keyup', keyUpHandler);
    canvas.addEventListener('mousemove', mouseHandler);

    rafId = requestAnimationFrame(() => loop(statusEl));
  }

  function unmount() {
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    if (keyDownHandler) { window.removeEventListener('keydown', keyDownHandler); keyDownHandler = null; }
    if (keyUpHandler)   { window.removeEventListener('keyup', keyUpHandler);     keyUpHandler = null; }
    if (mouseHandler && canvas) { canvas.removeEventListener('mousemove', mouseHandler); mouseHandler = null; }
    if (rootEl) { rootEl.remove(); rootEl = null; }
    canvas = null; ctx = null;
    upPressed = false; downPressed = false; useMouse = false;
    gameOver = false;
  }

  window.MiniGames = window.MiniGames || {};
  window.MiniGames.pong = { mount, unmount };
})();
