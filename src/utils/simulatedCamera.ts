/**
 * Provides a high-fidelity simulated camera feed for environments
 * without a physical webcam, allowing full testing of photo/video stamping.
 */
export class SimulatedCameraStream {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animId: number | null = null;
  private stream: MediaStream | null = null;
  private tick: number = 0;

  constructor(width: number = 1280, height: number = 720) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    const context = this.canvas.getContext('2d');
    if (!context) throw new Error('No 2d context for simulated camera');
    this.ctx = context;
  }

  public start(): MediaStream {
    const width = this.canvas.width;
    const height = this.canvas.height;

    const render = () => {
      this.tick += 0.02;

      // Draw simulated outdoor inspection site backdrop
      const grad = this.ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, '#1e293b'); // Dark blue sky
      grad.addColorStop(0.5, '#334155');
      grad.addColorStop(0.8, '#475569');
      grad.addColorStop(1, '#0f172a'); // Ground
      this.ctx.fillStyle = grad;
      this.ctx.fillRect(0, 0, width, height);

      // Sun / Light flare
      const sunX = width * 0.75 + Math.sin(this.tick * 0.5) * 30;
      const sunY = height * 0.25;
      const sunGrad = this.ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 200);
      sunGrad.addColorStop(0, 'rgba(255, 235, 180, 0.45)');
      sunGrad.addColorStop(1, 'rgba(255, 235, 180, 0)');
      this.ctx.fillStyle = sunGrad;
      this.ctx.beginPath();
      this.ctx.arc(sunX, sunY, 200, 0, Math.PI * 2);
      this.ctx.fill();

      // Simulated architectural / building silhouette in background
      this.ctx.fillStyle = '#090d16';
      const buildingCount = 7;
      for (let i = 0; i < buildingCount; i++) {
        const bw = width / (buildingCount + 1);
        const bh = 140 + Math.sin(i * 1.5) * 60;
        const bx = i * (bw + 20) + 40;
        const by = height * 0.7 - bh;
        this.ctx.fillRect(bx, by, bw, bh + height * 0.3);

        // Simulated windows
        this.ctx.fillStyle = (i % 2 === 0) ? '#fde047' : '#93c5fd';
        for (let row = 0; row < 4; row++) {
          for (let col = 0; col < 3; col++) {
            if ((i + row + col) % 3 !== 0) {
              this.ctx.fillRect(bx + 12 + col * 20, by + 18 + row * 26, 10, 14);
            }
          }
        }
        this.ctx.fillStyle = '#090d16';
      }

      // Construction crane / scaffolding line
      this.ctx.strokeStyle = '#eab308';
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      const craneX = width * 0.35;
      this.ctx.moveTo(craneX, height * 0.7);
      this.ctx.lineTo(craneX, height * 0.18);
      this.ctx.lineTo(craneX + 160, height * 0.18);
      this.ctx.moveTo(craneX - 40, height * 0.18);
      this.ctx.lineTo(craneX, height * 0.12);
      this.ctx.lineTo(craneX + 80, height * 0.18);
      this.ctx.stroke();

      // Foreground ground & road
      this.ctx.fillStyle = '#1e1b18';
      this.ctx.fillRect(0, height * 0.7, width, height * 0.3);

      // Road markings
      this.ctx.strokeStyle = '#facc15';
      this.ctx.lineWidth = 6;
      this.ctx.setLineDash([30, 25]);
      this.ctx.beginPath();
      this.ctx.moveTo(0, height * 0.85);
      this.ctx.lineTo(width, height * 0.85);
      this.ctx.stroke();
      this.ctx.setLineDash([]);

      // Subtle dynamic camera drift (sway simulation)
      const swayX = Math.sin(this.tick) * 15;
      const swayY = Math.cos(this.tick * 0.8) * 10;

      // Simulated focus target box in center
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      this.ctx.lineWidth = 1.5;
      const centerBoxSize = 90;
      const cx = width / 2 + swayX;
      const cy = height / 2 + swayY;
      this.ctx.strokeRect(cx - centerBoxSize / 2, cy - centerBoxSize / 2, centerBoxSize, centerBoxSize);

      // Simulation mode banner badge at top
      this.ctx.fillStyle = 'rgba(234, 88, 12, 0.9)';
      this.ctx.beginPath();
      this.ctx.roundRect(width / 2 - 130, 24, 260, 32, 6);
      this.ctx.fill();
      this.ctx.font = '600 13px sans-serif';
      this.ctx.fillStyle = '#ffffff';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('⚡ โหมดจำลองกล้อง (SIMULATED CAMERA)', width / 2, 45);
      this.ctx.textAlign = 'left';

      this.animId = requestAnimationFrame(render);
    };

    render();

    this.stream = (this.canvas as unknown as { captureStream: (fps: number) => MediaStream }).captureStream(30);
    return this.stream;
  }

  public stop(): void {
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
  }
}
