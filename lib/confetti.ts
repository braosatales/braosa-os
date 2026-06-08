interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  color: string
  alpha: number
  w: number
  h: number
  rot: number
  rotV: number
}

export function burstConfetti(x: number, y: number): void {
  const canvas = document.createElement("canvas")
  canvas.style.cssText =
    "position:fixed;inset:0;pointer-events:none;z-index:99999;width:100%;height:100%;"
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  document.body.appendChild(canvas)

  const ctx = canvas.getContext("2d")!
  const cs = getComputedStyle(document.documentElement)
  const colors = [
    cs.getPropertyValue("--c-fin").trim(),
    cs.getPropertyValue("--c-task").trim(),
    cs.getPropertyValue("--pos").trim(),
    cs.getPropertyValue("--ink-soft").trim(),
  ]

  const COUNT = 28
  const particles: Particle[] = []

  for (let i = 0; i < COUNT; i++) {
    const angle = (Math.PI * 2 * i) / COUNT + (Math.random() - 0.5) * 0.6
    const speed = 2.5 + Math.random() * 4.5
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2.5,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: 1,
      w: 5 + Math.random() * 5,
      h: 3 + Math.random() * 3,
      rot: Math.random() * Math.PI * 2,
      rotV: (Math.random() - 0.5) * 0.25,
    })
  }

  const GRAVITY = 0.13
  const DURATION = 900
  const start = performance.now()

  function frame(now: number) {
    const elapsed = now - start
    const progress = elapsed / DURATION

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    for (const p of particles) {
      p.vy += GRAVITY
      p.x += p.vx
      p.y += p.vy
      p.rot += p.rotV
      p.alpha = Math.max(0, 1 - progress * 1.4)

      ctx.save()
      ctx.globalAlpha = p.alpha
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rot)
      ctx.fillStyle = p.color
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
      ctx.restore()
    }

    if (elapsed < DURATION) {
      requestAnimationFrame(frame)
    } else {
      canvas.remove()
    }
  }

  requestAnimationFrame(frame)
}
