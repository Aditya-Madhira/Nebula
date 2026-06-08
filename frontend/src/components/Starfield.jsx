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
    let dust = [];
    let shootingStars = [];
    let clickParticles = [];
    
    let mouseX = 0;
    let mouseY = 0;
    let targetMouseX = 0;
    let targetMouseY = 0;
    let animationFrameId;
    let time = 0;
    let isWarping = false;

    // Track mouse coordinates with lerped easing for liquid-smooth parallax shifting
    const handleMouseMove = (e) => {
      targetMouseX = (e.clientX / window.innerWidth - 0.5) * 25;
      targetMouseY = (e.clientY / window.innerHeight - 0.5) * 25;
    };

    window.addEventListener('mousemove', handleMouseMove);

    // Dynamic Warp State Handlers
    const handleWarpStart = () => {
      isWarping = true;
    };

    const handleWarpEnd = () => {
      isWarping = false;
      // Re-init stars so they aren't clumped after warp
      initStars();
    };

    window.addEventListener('nebula-warp-start', handleWarpStart);
    window.addEventListener('nebula-warp-end', handleWarpEnd);

    // Interactive Particle Class for Click-bursts
    class ClickParticle {
      constructor(x, y) {
        this.x = x;
        this.y = y;
        this.r = Math.random() * 3 + 1.2;
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 4.5 + 1.5;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.alpha = 1.0;
        this.decay = Math.random() * 0.02 + 0.015;
        
        // Curated cosmic palette
        const colors = [
          'rgba(6, 182, 212, ',   // Neon Cyan
          'rgba(167, 139, 250, ', // Neon Violet/Purple
          'rgba(236, 72, 153, ',  // Neon Pink
          'rgba(251, 191, 36, '   // Star Gold
        ];
        this.colorBase = colors[Math.floor(Math.random() * colors.length)];
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vx *= 0.96; // drag physics
        this.vy *= 0.96;
        this.alpha -= this.decay;
      }

      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        ctx.fillStyle = `${this.colorBase}${this.alpha})`;
        ctx.fill();
      }
    }

    // Trigger Click Particle Burst
    const triggerClickBurst = (x, y) => {
      for (let i = 0; i < 20; i++) {
        clickParticles.push(new ClickParticle(x, y));
      }
    };

    const handleWindowClick = (e) => {
      // Avoid generating bursts if clicking interactive buttons, lists, cards, or inputs
      const path = e.composedPath ? e.composedPath() : [];
      const isInteractive = path.some(el => {
        if (!el.tagName) return false;
        const tag = el.tagName.toUpperCase();
        return (
          tag === 'BUTTON' ||
          tag === 'A' ||
          tag === 'INPUT' ||
          tag === 'TEXTAREA' ||
          (el.classList && (
            el.classList.contains('anime-card') ||
            el.classList.contains('chat-box') ||
            el.classList.contains('modal-box') ||
            el.classList.contains('auth-box') ||
            el.classList.contains('nav-links')
          ))
        );
      });

      if (isInteractive) return;
      triggerClickBurst(e.clientX, e.clientY);
    };

    window.addEventListener('click', handleWindowClick);

    // Optimized High-Resolution Star Class
    class Star {
      constructor(layer) {
        this.layer = layer; // 0 = far, 1 = mid, 2 = near
        this.reset(true);
      }

      reset(initial = false) {
        if (isWarping) {
          // Reset star near the center so they continuously blast outwards
          this.x = W / 2 + (Math.random() - 0.5) * 80;
          this.y = H / 2 + (Math.random() - 0.5) * 80;
          this.r = Math.random() * 1.5 + 0.8;
          this.alpha = Math.random() * 0.8 + 0.2;
          this.speed = Math.random() * 0.08 + 0.02;
        } else {
          this.x = Math.random() * W;
          this.y = initial ? Math.random() * H : -5;
          
          if (this.layer === 0) {
            // Distant tiny background stars
            this.r = Math.random() * 0.5 + 0.15;
            this.alpha = Math.random() * 0.35 + 0.1;
            this.speed = Math.random() * 0.008 + 0.003;
            this.twinkleSpeed = Math.random() * 0.005 + 0.001;
          } else if (this.layer === 1) {
            // Midground stars
            this.r = Math.random() * 0.7 + 0.5;
            this.alpha = Math.random() * 0.65 + 0.25;
            this.speed = Math.random() * 0.025 + 0.008;
            this.twinkleSpeed = Math.random() * 0.015 + 0.004;
          } else {
            // Bright foreground stars
            this.r = Math.random() * 1.1 + 0.9;
            this.alpha = Math.random() * 0.85 + 0.45;
            this.speed = Math.random() * 0.06 + 0.025;
            this.twinkleSpeed = Math.random() * 0.025 + 0.008;
          }
        }
        
        this.twinkleDir = Math.random() > 0.5 ? 1 : -1;
        this.baseAlpha = this.alpha;
      }

      update() {
        if (isWarping) {
          // Radial vector outward from the center
          const dx = this.x - W / 2;
          const dy = this.y - H / 2;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const vx = dx / dist;
          const vy = dy / dist;

          // Stars travel 45x faster during warp drive
          const warpAcceleration = this.speed * 48 + 1.8;
          this.x += vx * warpAcceleration;
          this.y += vy * warpAcceleration;

          // If off-screen during warp, loop back to warp core center
          if (this.x < -100 || this.x > W + 100 || this.y < -100 || this.y > H + 100) {
            this.reset(false);
          }
        } else {
          this.y += this.speed;
          if (this.y > H + 5) {
            this.reset(false);
            return;
          }

          // Star Twinkle pulsing
          this.alpha += this.twinkleSpeed * this.twinkleDir;
          if (this.alpha > this.baseAlpha + 0.2 || this.alpha < this.baseAlpha - 0.2) {
            this.twinkleDir *= -1;
          }
          this.alpha = Math.max(0.05, Math.min(0.95, this.alpha));
        }
      }

      draw() {
        if (isWarping) {
          // Draw radial warp speed streak lines
          const dx = this.x - W / 2;
          const dy = this.y - H / 2;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const vx = dx / dist;
          const vy = dy / dist;

          // Streak length proportional to distance from center
          const len = (this.speed * 180) + (dist * 0.06) + 4;
          const tailX = this.x - vx * len;
          const tailY = this.y - vy * len;

          ctx.beginPath();
          ctx.moveTo(tailX, tailY);
          ctx.lineTo(this.x, this.y);

          // Color interpolations: mostly cyan/white streaks with purple aura
          const grad = ctx.createLinearGradient(tailX, tailY, this.x, this.y);
          grad.addColorStop(0, 'rgba(124, 58, 237, 0)');
          grad.addColorStop(0.5, `rgba(167, 139, 250, ${this.alpha * 0.5})`);
          grad.addColorStop(1, `rgba(255, 255, 255, ${this.alpha})`);

          ctx.strokeStyle = grad;
          ctx.lineWidth = this.r * 1.5;
          ctx.stroke();
        } else {
          // Star color depends on layer depth for realistic stellar scattering
          if (this.layer === 2) {
            // Crisp glowing circle for nearby stars
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(224, 242, 254, ${this.alpha})`; // Light icy blue glow
            ctx.fill();
          } else {
            // Faint pinpricks for distant depth
            ctx.fillStyle = `rgba(255, 255, 255, ${this.alpha})`;
            ctx.fillRect(this.x - this.r, this.y - this.r, this.r * 2, this.r * 2);
          }
        }
      }
    }

    // Drifting Space Dust/Cosmic Particles
    class DustParticle {
      constructor() {
        this.x = Math.random() * W;
        this.y = Math.random() * H;
        this.r = Math.random() * 2.5 + 1.2;
        this.alpha = Math.random() * 0.15 + 0.03;
        this.speedX = (Math.random() - 0.5) * 0.05;
        this.speedY = Math.random() * 0.03 + 0.01;
      }

      update() {
        if (isWarping) {
          // Disperse space dust extremely quickly outward
          const dx = this.x - W / 2;
          const dy = this.y - H / 2;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          this.x += (dx / dist) * 12;
          this.y += (dy / dist) * 12;
          if (this.x < -50 || this.x > W + 50 || this.y < -50 || this.y > H + 50) {
            this.x = Math.random() * W;
            this.y = Math.random() * H;
          }
        } else {
          this.x += this.speedX;
          this.y += this.speedY;
          if (this.y > H + 10) {
            this.y = -10;
            this.x = Math.random() * W;
          }
          if (this.x < -10 || this.x > W + 10) {
            this.x = Math.random() * W;
          }
        }
      }

      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(167, 139, 250, ${this.alpha})`; // Violet space dust glow
        ctx.fill();
      }
    }

    // High-Resolution Shooting Star
    class ShootingStar {
      constructor() {
        this.x = Math.random() * W * 0.6 + W * 0.1;
        this.y = Math.random() * H * 0.2;
        this.len = Math.random() * 120 + 80;
        this.speed = Math.random() * 10 + 8;
        this.angle = Math.PI / 4 + (Math.random() - 0.5) * 0.15;
        this.alpha = 1.0;
        this.decay = Math.random() * 0.012 + 0.008;
        this.active = true;
      }

      update() {
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
        this.alpha -= this.decay;
        if (this.alpha <= 0) this.active = false;
      }

      draw() {
        if (isWarping) return; // Hide shooting stars during warp
        const tailX = this.x - Math.cos(this.angle) * this.len;
        const tailY = this.y - Math.sin(this.angle) * this.len;
        
        ctx.beginPath();
        const grad = ctx.createLinearGradient(tailX, tailY, this.x, this.y);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
        grad.addColorStop(0.7, `rgba(196, 181, 253, ${this.alpha * 0.4})`); // Violet tail
        grad.addColorStop(1, `rgba(255, 255, 255, ${this.alpha})`);
        
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(this.x, this.y);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }

    // Initialize all entities
    const initStars = () => {
      stars = [];
      // 300 total stars divided across 3 depth levels for perfect parallax
      for (let i = 0; i < 200; i++) stars.push(new Star(0)); // Distant tiny layer
      for (let i = 0; i < 80; i++) stars.push(new Star(1));  // Mid layer
      for (let i = 0; i < 20; i++) stars.push(new Star(2));  // Close bright layer
      
      dust = Array.from({ length: 25 }, () => new DustParticle());
      clickParticles = [];
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

    // Draw living, photorealistic cosmic nebulae on the canvas
    const drawNebulaeCloud = () => {
      ctx.save();
      // Apply smooth mouse parallax (disable/reduce during warp drive)
      const pX = isWarping ? 0 : mouseX * 0.4;
      const pY = isWarping ? 0 : mouseY * 0.4;
      ctx.translate(pX, pY);
      
      const timeScale = time * (isWarping ? 0.001 : 0.00015);
      
      // 1. Cyber Cyan Cosmic Dust Cloud
      const cyanX = W * 0.75 + Math.sin(timeScale) * 80;
      const cyanY = H * 0.25 + Math.cos(timeScale) * 60;
      const cyanRadius = Math.max(W, H) * (isWarping ? 0.8 : 0.5);
      const gradCyan = ctx.createRadialGradient(cyanX, cyanY, 10, cyanX, cyanY, cyanRadius);
      gradCyan.addColorStop(0, isWarping ? 'rgba(6, 182, 212, 0.16)' : 'rgba(6, 182, 212, 0.08)');
      gradCyan.addColorStop(0.3, 'rgba(6, 182, 212, 0.035)');
      gradCyan.addColorStop(0.7, 'rgba(124, 58, 237, 0.015)');
      gradCyan.addColorStop(1, 'rgba(0, 0, 0, 0)');
      
      ctx.fillStyle = gradCyan;
      ctx.fillRect(-W, -H, W * 3, H * 3);
      
      // 2. Cosmic Pink/Violet Nebula
      const violetX = W * 0.15 + Math.cos(timeScale * 0.8) * 100;
      const violetY = H * 0.75 + Math.sin(timeScale * 0.8) * 80;
      const violetRadius = Math.max(W, H) * (isWarping ? 0.95 : 0.65);
      const gradViolet = ctx.createRadialGradient(violetX, violetY, 10, violetX, violetY, violetRadius);
      gradViolet.addColorStop(0, isWarping ? 'rgba(236, 72, 153, 0.12)' : 'rgba(236, 72, 153, 0.06)');
      gradViolet.addColorStop(0.4, 'rgba(124, 58, 237, 0.025)');
      gradViolet.addColorStop(0.8, 'rgba(59, 7, 100, 0.008)');
      gradViolet.addColorStop(1, 'rgba(0, 0, 0, 0)');
      
      ctx.fillStyle = gradViolet;
      ctx.fillRect(-W, -H, W * 3, H * 3);

      // 3. Golden Helix Center Cloud (warmth)
      const goldX = W * 0.45 + Math.sin(timeScale * 1.2) * 50;
      const goldY = H * 0.55 + Math.cos(timeScale * 0.9) * 50;
      const goldRadius = Math.max(W, H) * (isWarping ? 0.6 : 0.4);
      const gradGold = ctx.createRadialGradient(goldX, goldY, 5, goldX, goldY, goldRadius);
      gradGold.addColorStop(0, isWarping ? 'rgba(245, 158, 11, 0.08)' : 'rgba(245, 158, 11, 0.035)');
      gradGold.addColorStop(0.5, 'rgba(124, 58, 237, 0.01)');
      gradGold.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = gradGold;
      ctx.fillRect(-W, -H, W * 3, H * 3);

      ctx.restore();
    };

    // Animation Loop
    const loop = () => {
      time++;
      
      // Clear screen
      ctx.fillStyle = '#030008';
      ctx.fillRect(0, 0, W, H);

      // Smoothly interpolate mouse coordinates (lerp)
      mouseX += (targetMouseX - mouseX) * 0.05;
      mouseY += (targetMouseY - mouseY) * 0.05;

      // 1. Draw glowing procedural space dust clouds (nebulae) first in background
      drawNebulaeCloud();

      // 2. Render stars (reduce/disable mouse translation during warp)
      ctx.save();
      if (!isWarping) {
        ctx.translate(mouseX, mouseY); // Apply deep parallax translation to stars
      }

      // Drifting space dust particles
      for (let i = 0; i < dust.length; i++) {
        dust[i].update();
        dust[i].draw();
      }

      // Star updates and draws
      for (let i = 0; i < stars.length; i++) {
        stars[i].update();
        stars[i].draw();
      }

      // Handle shooting stars (only in normal cruise mode)
      if (!isWarping) {
        shootTimer++;
        if (shootTimer > 150) {
          shootingStars.push(new ShootingStar());
          if (Math.random() > 0.7) shootingStars.push(new ShootingStar());
          shootTimer = 0;
        }

        shootingStars = shootingStars.filter((s) => s.active);
        for (let i = 0; i < shootingStars.length; i++) {
          shootingStars[i].update();
          shootingStars[i].draw();
        }
      }

      ctx.restore();

      // 3. Render Click Particle Bursts (unaffected by camera movement)
      clickParticles = clickParticles.filter((p) => p.alpha > 0);
      for (let i = 0; i < clickParticles.length; i++) {
        clickParticles[i].update();
        clickParticles[i].draw();
      }

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('click', handleWindowClick);
      window.removeEventListener('nebula-warp-start', handleWarpStart);
      window.removeEventListener('nebula-warp-end', handleWarpEnd);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} id="starfield" />;
}
