import React, { useEffect, useRef } from 'react';

interface WavesBackgroundProps {
  className?: string;
}

export const WavesBackground: React.FC<WavesBackgroundProps> = ({ className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || window.innerHeight);

    let mouseX = width * 0.65;
    let mouseY = height * 0.55;
    let targetMouseX = mouseX;
    let targetMouseY = mouseY;

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      targetMouseX = e.clientX - rect.left;
      targetMouseY = e.clientY - rect.top;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    let step = 0;

    // Harmonized neon flowing wave strands: Vibrant Purples (#5DBA58, #5DBA58) and Electric Blues (#4F46E5, #38BDF8, #6366F1)
    const waveStrands = [
      { speed: 0.007, amplitude: 65, freq: 0.0018, yOffset: 0.50, color: 'rgba(168, 85, 247, 0.65)', glowColor: '#5DBA58', lineWidth: 2.2 },
      { speed: 0.005, amplitude: 55, freq: 0.0015, yOffset: 0.53, color: 'rgba(79, 70, 229, 0.70)', glowColor: '#4F46E5', lineWidth: 2.0 },
      { speed: 0.008, amplitude: 45, freq: 0.0022, yOffset: 0.47, color: 'rgba(192, 132, 252, 0.55)', glowColor: '#5DBA58', lineWidth: 1.8 },
      { speed: 0.006, amplitude: 75, freq: 0.0012, yOffset: 0.58, color: 'rgba(99, 102, 241, 0.60)', glowColor: '#6366F1', lineWidth: 2.0 },
      { speed: 0.009, amplitude: 35, freq: 0.0026, yOffset: 0.44, color: 'rgba(56, 189, 248, 0.45)', glowColor: '#38BDF8', lineWidth: 1.5 },
      { speed: 0.004, amplitude: 85, freq: 0.0010, yOffset: 0.62, color: 'rgba(139, 92, 246, 0.50)', glowColor: '#5DBA58', lineWidth: 1.6 },
      { speed: 0.007, amplitude: 60, freq: 0.0019, yOffset: 0.56, color: 'rgba(79, 70, 229, 0.40)', glowColor: '#4F46E5', lineWidth: 1.4 },
      { speed: 0.005, amplitude: 70, freq: 0.0014, yOffset: 0.66, color: 'rgba(168, 85, 247, 0.35)', glowColor: '#5DBA58', lineWidth: 1.2 },
      { speed: 0.003, amplitude: 95, freq: 0.0009, yOffset: 0.70, color: 'rgba(99, 102, 241, 0.30)', glowColor: '#6366F1', lineWidth: 1.0 },
      { speed: 0.006, amplitude: 80, freq: 0.0011, yOffset: 0.75, color: 'rgba(192, 132, 252, 0.25)', glowColor: '#5DBA58', lineWidth: 0.9 },
    ];

    const render = () => {
      step++;
      mouseX += (targetMouseX - mouseX) * 0.04;
      mouseY += (targetMouseY - mouseY) * 0.04;

      ctx.clearRect(0, 0, width, height);

      // 1. Deep pure black foundation (#050407)
      ctx.fillStyle = '#050407';
      ctx.fillRect(0, 0, width, height);

      // 2. Atmospheric ambient glows: Electric Blue on lower right, Vibrant Purple on upper right
      const purpleGlowX = width * 0.75 + (mouseX - width * 0.5) * 0.04;
      const purpleGlowY = height * 0.45 + (mouseY - height * 0.5) * 0.04;
      const purpleRad = ctx.createRadialGradient(purpleGlowX, purpleGlowY, 15, purpleGlowX, purpleGlowY, width * 0.42);
      purpleRad.addColorStop(0, 'rgba(168, 85, 247, 0.22)');
      purpleRad.addColorStop(0.4, 'rgba(139, 92, 246, 0.10)');
      purpleRad.addColorStop(0.8, 'rgba(79, 70, 229, 0.03)');
      purpleRad.addColorStop(1, 'rgba(5, 4, 7, 0)');
      ctx.fillStyle = purpleRad;
      ctx.fillRect(0, 0, width, height);

      const blueGlowX = width * 0.60 + (mouseX - width * 0.5) * 0.03;
      const blueGlowY = height * 0.65 + (mouseY - height * 0.5) * 0.03;
      const blueRad = ctx.createRadialGradient(blueGlowX, blueGlowY, 10, blueGlowX, blueGlowY, width * 0.38);
      blueRad.addColorStop(0, 'rgba(79, 70, 229, 0.18)');
      blueRad.addColorStop(0.45, 'rgba(56, 189, 248, 0.06)');
      blueRad.addColorStop(1, 'rgba(5, 4, 7, 0)');
      ctx.fillStyle = blueRad;
      ctx.fillRect(0, 0, width, height);

      // 3. Prominent Glowing Focal Horizon Arc (Hawklyn style glowing crest)
      const arcCenterX = width * 0.72 + (mouseX - width * 0.5) * 0.03;
      const arcCenterY = height * 0.54 + (mouseY - height * 0.5) * 0.03;
      const arcRadius = Math.min(width, height) * 0.38;

      ctx.save();
      ctx.beginPath();
      ctx.ellipse(arcCenterX, arcCenterY, arcRadius * 1.35, arcRadius * 0.68, -0.12, Math.PI * 0.95, Math.PI * 2.05);
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.95)';
      ctx.lineWidth = 3.5;
      ctx.shadowColor = '#5DBA58';
      ctx.shadowBlur = 35;
      ctx.stroke();

      // Soft electric blue inner crest
      ctx.beginPath();
      ctx.ellipse(arcCenterX, arcCenterY, arcRadius * 1.35, arcRadius * 0.68, -0.12, Math.PI * 1.12, Math.PI * 1.88);
      ctx.strokeStyle = 'rgba(79, 70, 229, 0.85)';
      ctx.lineWidth = 1.8;
      ctx.shadowColor = '#4F46E5';
      ctx.shadowBlur = 20;
      ctx.stroke();
      ctx.restore();

      // 4. Overlapping continuous wave ribbon lines
      const mouseInfluenceX = (mouseX / width - 0.5) * 45;
      const mouseInfluenceY = (mouseY / height - 0.5) * 35;

      waveStrands.forEach((strand, index) => {
        ctx.save();
        ctx.beginPath();

        const baseLineY = height * strand.yOffset + mouseInfluenceY * ((index % 3) - 1);
        ctx.moveTo(0, baseLineY);

        const pointSpacing = 16;
        for (let x = 0; x <= width + pointSpacing; x += pointSpacing) {
          const wave1 = Math.sin(x * strand.freq + step * strand.speed + mouseInfluenceX * 0.01) * strand.amplitude;
          const wave2 = Math.cos(x * (strand.freq * 0.75) - step * (strand.speed * 0.5)) * (strand.amplitude * 0.45);
          const y = baseLineY + wave1 + wave2;

          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }

        // Full width smooth gradient from subtle on left to glowing neon on right
        const lineGrad = ctx.createLinearGradient(0, 0, width, 0);
        lineGrad.addColorStop(0, 'rgba(5, 4, 7, 0.05)');
        lineGrad.addColorStop(0.35, strand.color.replace(/[\d\.]+\)$/, '0.22)'));
        lineGrad.addColorStop(0.70, strand.color);
        lineGrad.addColorStop(1, strand.color);

        ctx.strokeStyle = lineGrad;
        ctx.lineWidth = strand.lineWidth;
        ctx.shadowColor = strand.glowColor;
        ctx.shadowBlur = 18;
        ctx.stroke();
        ctx.restore();
      });

      // Bottom fade out into statistics
      const bottomFade = ctx.createLinearGradient(0, height * 0.88, 0, height);
      bottomFade.addColorStop(0, 'rgba(5, 4, 7, 0)');
      bottomFade.addColorStop(1, '#050407');
      ctx.fillStyle = bottomFade;
      ctx.fillRect(0, height * 0.88, width, height * 0.12);

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <div className={`absolute inset-0 w-full h-full overflow-hidden pointer-events-none select-none ${className}`}>
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
};

