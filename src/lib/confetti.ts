export const triggerConfetti = () => {
  if (typeof window === "undefined") return;

  const canvas = document.createElement("canvas");
  canvas.style.position = "fixed";
  canvas.style.top = "0";
  canvas.style.left = "0";
  canvas.style.width = "100vw";
  canvas.style.height = "100vh";
  canvas.style.pointerEvents = "none";
  canvas.style.zIndex = "99999";
  document.body.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    canvas.remove();
    return;
  }

  const width = (canvas.width = window.innerWidth);
  const height = (canvas.height = window.innerHeight);

  const colors = ["#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#fbbf24"];
  const particles: Array<{
    x: number;
    y: number;
    r: number;
    d: number;
    color: string;
    tilt: number;
    tiltAngleIncrement: number;
    tiltAngle: number;
  }> = [];

  for (let i = 0; i < 150; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height - height * 0.5,
      r: Math.random() * 6 + 4,
      d: Math.random() * 30 + 10,
      color: colors[Math.floor(Math.random() * colors.length)],
      tilt: Math.floor(Math.random() * 10) - 10,
      tiltAngleIncrement: Math.random() * 0.07 + 0.05,
      tiltAngle: 0,
    });
  }

  let animationFrameId: number;
  const startTime = Date.now();

  const draw = () => {
    ctx.clearRect(0, 0, width, height);
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.tiltAngle += p.tiltAngleIncrement;
      p.y += (Math.cos(p.d) + 3 + p.r / 2) / 2;
      p.x += Math.sin(0.01 * p.d);
      p.tilt = Math.sin(p.tiltAngle) * 15;

      ctx.beginPath();
      ctx.lineWidth = p.r / 2;
      ctx.strokeStyle = p.color;
      ctx.moveTo(p.x + p.tilt + p.r / 4, p.y);
      ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 4);
      ctx.stroke();
    }

    if (Date.now() - startTime < 4000) {
      animationFrameId = requestAnimationFrame(draw);
    } else {
      cancelAnimationFrame(animationFrameId);
      canvas.remove();
    }
  };

  draw();
};
