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
  if (!ctx) { canvas.remove(); return; }

  const width = (canvas.width = window.innerWidth);
  const height = (canvas.height = window.innerHeight);

  const colors = ["#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#fbbf24"];
  const particles: Array<{ x: number; y: number; r: number; d: number; color: string; tilt: number; tiltAngleIncrement: number; tiltAngle: number }> = [];

  for (let i = 0; i < 150; i++) {
    particles.push({ x: Math.random() * width, y: Math.random() * height - height * 0.5, r: Math.random() * 6 + 4, d: Math.random() * 30 + 10, color: colors[Math.floor(Math.random() * colors.length)], tilt: Math.floor(Math.random() * 10) - 10, tiltAngleIncrement: Math.random() * 0.07 + 0.05, tiltAngle: 0 });
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
      ctx.beginPath(); ctx.lineWidth = p.r / 2; ctx.strokeStyle = p.color;
      ctx.moveTo(p.x + p.tilt + p.r / 4, p.y); ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 4); ctx.stroke();
    }
    if (Date.now() - startTime < 4000) { animationFrameId = requestAnimationFrame(draw); }
    else { cancelAnimationFrame(animationFrameId); canvas.remove(); }
  };
  draw();
};

/** Enhanced golden confetti burst for 1st/2nd/3rd place winners */
export const triggerWinnerConfetti = (rank: 1 | 2 | 3 = 1) => {
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
  if (!ctx) { canvas.remove(); return; }

  const width = (canvas.width = window.innerWidth);
  const height = (canvas.height = window.innerHeight);

  // Gold palette for 1st, silver for 2nd, bronze for 3rd
  const palettes: Record<number, string[]> = {
    1: ["#fbbf24", "#f59e0b", "#fde68a", "#fcd34d", "#fff7ed", "#ef4444", "#fb923c", "#facc15"],
    2: ["#e2e8f0", "#cbd5e1", "#94a3b8", "#f1f5f9", "#7dd3fc", "#38bdf8", "#fbbf24"],
    3: ["#f97316", "#ea580c", "#fb923c", "#fed7aa", "#fbbf24", "#a16207", "#92400e"],
  };
  const colors = palettes[rank] || palettes[1];
  const count = rank === 1 ? 350 : rank === 2 ? 250 : 200;
  const duration = rank === 1 ? 7000 : rank === 2 ? 5500 : 4500;

  interface Particle { x: number; y: number; vx: number; vy: number; r: number; color: string; shape: "rect" | "circle"; rotation: number; rotationSpeed: number; opacity: number; }
  const particles: Particle[] = [];

  // Burst from center-top, left cannon, right cannon
  const origins = [
    { x: width * 0.5, y: height * 0.3 },
    { x: width * 0.15, y: height * 0.5 },
    { x: width * 0.85, y: height * 0.5 },
  ];

  for (let i = 0; i < count; i++) {
    const origin = origins[i % origins.length];
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * (rank === 1 ? 12 : 8) + 3;
    particles.push({
      x: origin.x, y: origin.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - (rank === 1 ? 8 : 5),
      r: Math.random() * (rank === 1 ? 9 : 7) + 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      shape: Math.random() > 0.4 ? "rect" : "circle",
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.3,
      opacity: 1,
    });
  }

  let animationFrameId: number;
  const startTime = Date.now();

  const draw = () => {
    ctx.clearRect(0, 0, width, height);
    const elapsed = Date.now() - startTime;
    const progress = elapsed / duration;

    for (const p of particles) {
      p.vy += 0.25; // gravity
      p.vx *= 0.995; // air drag
      p.x += p.vx; p.y += p.vy;
      p.rotation += p.rotationSpeed;
      p.opacity = Math.max(0, 1 - progress * 1.3);

      ctx.save();
      ctx.globalAlpha = p.opacity;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;

      if (p.shape === "circle") {
        ctx.beginPath(); ctx.arc(0, 0, p.r / 2, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2);
      }
      ctx.restore();
    }

    if (elapsed < duration) { animationFrameId = requestAnimationFrame(draw); }
    else { cancelAnimationFrame(animationFrameId); canvas.remove(); }
  };
  draw();
};

