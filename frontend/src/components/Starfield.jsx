import { useEffect, useRef } from 'react';

export default function Starfield() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let W = window.innerWidth;
    let H = window.innerHeight;
    canvas.width = W;
    canvas.height = H;

    let stars = [];
    let shootingStars = [];
    let mouseX = 0;
    let mouseY = 0;
    let animationFrameId;

    // Track mouse coordinates for gentle parallax shifting
    const handleMouseMove = (e) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 15;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 15;
    };

    window.addEventListener('mousemove', handleMouseMove);

    // Optimized Star Class using fillRect instead of costly arc paths
    class Star {
      constructor() {
        this.reset(true);
      }

      reset(initial = false) {
        this.x = Math.random() * W;
        this.y = initial ? Math.random() * H : -2;
        this.r = Math.random() * 1.3 + 0.3; // size radius/half-width
        this.alpha = Math.random() * 0.7 + 0.2;
        this.speed = Math.random() * 0.08 + 0.01;
        this.twinkleSpeed = Math.random() * 0.02 + 0.005;
        this.twinkleDir = Math.random() > 0.5 ? 1 : -1;
        this.baseAlpha = this.alpha;
      }

      update() {
        // Slow falling speed
        this.y += this.speed;
        if (this.y > H + 5) {
          this.reset(false);
          return;
        }

        // Twinkling effect
        this.alpha += this.twinkleSpeed * this.twinkleDir;
        if (this.alpha > this.baseAlpha + 0.25 || this.alpha < this.baseAlpha - 0.25) {
          this.twinkleDir *= -1;
        }
        this.alpha = Math.max(0.05, Math.min(0.95, this.alpha));
      }

      draw() {
        ctx.fillStyle = `rgba(255, 255, 255, ${this.alpha})`;
        // Rapid square draws (faster for GPU rasterization than arc paths)
        ctx.fillRect(this.x - this.r, this.y - this.r, this.r * 2, this.r * 2);
      }
    }

    // Shooting Star Class
    class ShootingStar {
      constructor() {
        this.x = Math.random() * W * 0.7 + W * 0.1;
        this.y = Math.random() * H * 0.3;
        this.len = Math.random() * 100 + 50;
        this.speed = Math.random() * 7 + 5;
        this.angle = Math.PI / 4 + (Math.random() - 0.5) * 0.25;
        this.alpha = 1.0;
        this.decay = Math.random() * 0.015 + 0.012;
        this.active = true;
      }

      update() {
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
        this.alpha -= this.decay;
        if (this.alpha <= 0) this.active = false;
      }

      draw() {
        const tailX = this.x - Math.cos(this.angle) * this.len;
        const tailY = this.y - Math.sin(this.angle) * this.len;
        const grad = ctx.createLinearGradient(tailX, tailY, this.x, this.y);
        grad.addColorStop(0, `rgba(255, 255, 255, 0)`);
        grad.addColorStop(0.6, `rgba(200, 220, 255, ${this.alpha * 0.35})`);
        grad.addColorStop(1, `rgba(255, 255, 255, ${this.alpha})`);

        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(this.x, this.y);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Tip glow
        ctx.fillStyle = `rgba(255, 255, 255, ${this.alpha})`;
        ctx.fillRect(this.x - 1, this.y - 1, 2, 2);
      }
    }

    // Initialize optimized star count (capped at 120 stars)
    const initStars = () => {
      stars = Array.from({ length: 120 }, () => new Star());
    };

    const handleResize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W;
      canvas.height = H;
      initStars();
    };

    window.addEventListener('resize', handleResize);
    initStars();

    let shootTimer = 0;

    // Animation Loop
    const loop = () => {
      ctx.clearRect(0, 0, W, H);
      ctx.save();
      ctx.translate(mouseX, mouseY); // mouse parallax translate

      // Render stars
      for (let i = 0; i < stars.length; i++) {
        stars[i].update();
        stars[i].draw();
      }

      // Handle shooting stars
      shootTimer++;
      if (shootTimer > 120) {
        shootingStars.push(new ShootingStar());
        if (Math.random() > 0.6) shootingStars.push(new ShootingStar());
        shootTimer = 0;
      }

      shootingStars = shootingStars.filter((s) => s.active);
      for (let i = 0; i < shootingStars.length; i++) {
        shootingStars[i].update();
        shootingStars[i].draw();
      }

      ctx.restore();
      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} id="starfield" />;
}
