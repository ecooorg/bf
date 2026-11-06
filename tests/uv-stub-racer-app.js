const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let car = { x: 0, speed: 0 };
function update() {
  ctx.fillStyle = '#333';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'red';
  ctx.fillRect(100 + car.x, 200, 50, 80);
  requestAnimationFrame(update);
}
update();
