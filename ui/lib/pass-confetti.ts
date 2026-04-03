"use client";

const CELEBRATED_PASSES_STORAGE_KEY = "sepurux.runs.pass-confetti.v1";
const MAX_STORED_IDS = 256;
const BURST_COOLDOWN_MS = 2400;
const CONFETTI_COLORS = ["#60A5FA", "#3B82F6", "#93C5FD", "#34D399", "#F59E0B", "#F97316"];
const EMIT_DURATION_MS = 1800;
const EFFECT_DURATION_MS = 2800;
const PARTICLE_SPAWN_RATE = 180;

let lastBurstAt = 0;

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  gravity: number;
  rotation: number;
  spin: number;
  width: number;
  height: number;
  color: string;
  alpha: number;
  ageMs: number;
  lifeMs: number;
};

export function celebratePassesOnce(ids: string[]): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const normalizedIds = Array.from(
    new Set(ids.map((id) => id.trim()).filter((id) => id.length > 0))
  );
  if (normalizedIds.length === 0) {
    return false;
  }

  const celebrated = new Set(readCelebratedIds());
  const unseenIds = normalizedIds.filter((id) => !celebrated.has(id));
  if (unseenIds.length === 0) {
    return false;
  }

  for (const id of normalizedIds) {
    celebrated.add(id);
  }
  writeCelebratedIds(Array.from(celebrated));

  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
    return true;
  }

  const now = Date.now();
  if (now - lastBurstAt < BURST_COOLDOWN_MS) {
    return true;
  }

  lastBurstAt = now;
  launchConfettiBurst();
  return true;
}

function readCelebratedIds(): string[] {
  try {
    const raw = window.localStorage.getItem(CELEBRATED_PASSES_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((value): value is string => typeof value === "string").slice(-MAX_STORED_IDS);
  } catch {
    return [];
  }
}

function writeCelebratedIds(ids: string[]) {
  try {
    window.localStorage.setItem(
      CELEBRATED_PASSES_STORAGE_KEY,
      JSON.stringify(ids.slice(-MAX_STORED_IDS))
    );
  } catch {
    // Ignore localStorage failures in restricted browsers.
  }
}

function launchConfettiBurst() {
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.position = "fixed";
  canvas.style.inset = "0";
  canvas.style.width = "100vw";
  canvas.style.height = "100vh";
  canvas.style.pointerEvents = "none";
  canvas.style.zIndex = "120";

  const context = canvas.getContext("2d");
  if (!context) {
    return;
  }

  document.body.appendChild(canvas);

  const devicePixelRatio = Math.max(1, window.devicePixelRatio || 1);
  const resize = () => {
    canvas.width = Math.floor(window.innerWidth * devicePixelRatio);
    canvas.height = Math.floor(window.innerHeight * devicePixelRatio);
  };
  resize();

  const particles: Particle[] = [];
  const startedAt = performance.now();
  let previousFrameAt = startedAt;
  let emissionCarry = 0;

  const cleanup = () => {
    window.removeEventListener("resize", resize);
    canvas.remove();
  };

  const frame = (now: number) => {
    const elapsed = now - startedAt;
    const deltaSeconds = Math.min((now - previousFrameAt) / 1000, 0.04);
    previousFrameAt = now;
    const deltaMs = deltaSeconds * 1000;

    if (elapsed < EMIT_DURATION_MS) {
      emissionCarry += PARTICLE_SPAWN_RATE * deltaSeconds;
      const particlesToSpawn = Math.floor(emissionCarry);
      emissionCarry -= particlesToSpawn;
      for (let index = 0; index < particlesToSpawn; index += 1) {
        particles.push(createParticle(canvas.width, canvas.height));
      }
    }

    context.clearRect(0, 0, canvas.width, canvas.height);

    for (let index = particles.length - 1; index >= 0; index -= 1) {
      const particle = particles[index];
      particle.ageMs += deltaMs;
      particle.vy += particle.gravity * deltaSeconds;
      particle.x += particle.vx * deltaSeconds;
      particle.y += particle.vy * deltaSeconds;
      particle.rotation += particle.spin * deltaSeconds;

      const fadeStartMs = particle.lifeMs * 0.65;
      if (particle.ageMs > fadeStartMs) {
        const fadeProgress = (particle.ageMs - fadeStartMs) / Math.max(1, particle.lifeMs - fadeStartMs);
        particle.alpha = Math.max(0, 1 - fadeProgress);
      }

      const isExpired =
        particle.ageMs >= particle.lifeMs ||
        particle.y - particle.height > canvas.height + 64 ||
        particle.x + particle.width < -96 ||
        particle.x - particle.width > canvas.width + 96;
      if (isExpired) {
        particles.splice(index, 1);
        continue;
      }

      context.save();
      context.translate(particle.x, particle.y);
      context.rotate(particle.rotation);
      context.globalAlpha = particle.alpha;
      context.fillStyle = particle.color;
      context.fillRect(
        -particle.width / 2,
        -particle.height / 2,
        particle.width,
        particle.height
      );
      context.restore();
    }

    if (elapsed < EFFECT_DURATION_MS || particles.length > 0) {
      window.requestAnimationFrame(frame);
      return;
    }

    cleanup();
  };

  window.addEventListener("resize", resize);
  window.requestAnimationFrame(frame);
}

function createParticle(viewportWidth: number, viewportHeight: number): Particle {
  const size = 8 + Math.random() * 10;
  const lateralSpread = viewportWidth * 0.12;

  return {
    x: Math.random() * viewportWidth,
    y: -24 - Math.random() * viewportHeight * 0.08,
    vx: (Math.random() - 0.5) * lateralSpread,
    vy: viewportHeight * (0.26 + Math.random() * 0.14),
    gravity: viewportHeight * (0.26 + Math.random() * 0.12),
    rotation: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 10,
    width: size,
    height: size * (0.45 + Math.random() * 0.55),
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    alpha: 1,
    ageMs: 0,
    lifeMs: 1800 + Math.random() * 1200,
  };
}
