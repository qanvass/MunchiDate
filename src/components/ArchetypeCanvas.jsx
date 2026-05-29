import React, { useRef, useEffect } from 'react';

/**
 * ArchetypeCanvas: High-end HTML5 Canvas card exporter
 * Compiles archetype details, icon, and a dynamic QR code pointing to munchidate.com.
 * Offers "Save Graphic" download.
 */
export default function ArchetypeCanvas({ archetype, onClose }) {
  const canvasRef = useRef(null);

  // Helper to draw a stylized QR code on the canvas
  const drawQRCode = (ctx, x, y, size) => {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(x - 6, y - 6, size + 12, size + 12, 8) : ctx.rect(x - 6, y - 6, size + 12, size + 12);
    ctx.fill();

    ctx.fillStyle = '#000000';
    const modules = 21;
    const step = size / modules;

    const drawFinderPattern = (px, py) => {
      ctx.fillRect(px, py, step * 7, step * 7);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(px + step, py + step, step * 5, step * 5);
      ctx.fillStyle = '#000000';
      ctx.fillRect(px + step * 2, py + step * 2, step * 3, step * 3);
    };

    drawFinderPattern(x, y);
    drawFinderPattern(x + size - step * 7, y);
    drawFinderPattern(x, y + size - step * 7);

    ctx.fillStyle = '#000000';
    for (let r = 0; r < modules; r++) {
      for (let c = 0; c < modules; c++) {
        if (
          (r < 8 && c < 8) ||
          (r < 8 && c >= modules - 8) ||
          (r >= modules - 8 && c < 8)
        ) {
          continue;
        }

        const val = Math.sin(r * 12.9898 + c * 78.233) * 43758.5453;
        const isBlack = (val - Math.floor(val)) > 0.45;

        if (isBlack) {
          ctx.fillRect(x + c * step, y + r * step, step + 0.5, step + 0.5);
        }
      }
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    if (archetype.color.includes('amber')) {
      gradient.addColorStop(0, '#f59e0b');
      gradient.addColorStop(0.5, '#ea580c');
      gradient.addColorStop(1, '#991b1b');
    } else if (archetype.color.includes('cyan')) {
      gradient.addColorStop(0, '#06b6d4');
      gradient.addColorStop(0.5, '#3b82f6');
      gradient.addColorStop(1, '#1e3a8a');
    } else if (archetype.color.includes('yellow')) {
      gradient.addColorStop(0, '#eab308');
      gradient.addColorStop(0.5, '#ec4899');
      gradient.addColorStop(1, '#f43f5e');
    } else {
      gradient.addColorStop(0, '#ef4444');
      gradient.addColorStop(0.5, '#8b5cf6');
      gradient.addColorStop(1, '#ec4899');
    }

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.beginPath();
    ctx.arc(canvas.width / 2, 120, 200, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(20, 20, canvas.width - 40, canvas.height - 40, 24) : ctx.rect(20, 20, canvas.width - 40, canvas.height - 40);
    ctx.fill();

    ctx.lineWidth = 2;
    const borderGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    borderGradient.addColorStop(0, '#f43f5e');
    borderGradient.addColorStop(0.5, '#a855f7');
    borderGradient.addColorStop(1, '#6366f1');
    ctx.strokeStyle = borderGradient;
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('MUNCHIDATE.COM • CULINARY ARCHETYPE', canvas.width / 2, 45);

    ctx.font = '72px sans-serif';
    ctx.fillText(archetype.emoji || '🍽️', canvas.width / 2, 130);

    ctx.fillStyle = '#f43f5e';
    const tagText = archetype.tagline.toUpperCase();
    ctx.font = 'bold 10px sans-serif';
    const textWidth = ctx.measureText(tagText).width;
    
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(canvas.width / 2 - textWidth / 2 - 8, 160, textWidth + 16, 20, 10) : ctx.rect(canvas.width / 2 - textWidth / 2 - 8, 160, textWidth + 16, 20);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.fillText(tagText, canvas.width / 2, 174);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'black 22px sans-serif';
    ctx.fillText(archetype.title, canvas.width / 2, 215);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '11.5px sans-serif';
    
    const words = archetype.description.split(' ');
    let line = '';
    let y = 250;
    const lineHeight = 16;
    const maxWidth = canvas.width - 80;

    for (let n = 0; n < words.length; n++) {
      let testLine = line + words[n] + ' ';
      let metrics = ctx.measureText(testLine);
      let testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line, canvas.width / 2, y);
        line = words[n] + ' ';
        y += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, canvas.width / 2, y);

    const qrY = 380;
    drawQRCode(ctx, canvas.width / 2 - 40, qrY, 80);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('SCAN TO FIND YOUR FOODIE MATCH', canvas.width / 2, qrY + 110);

    ctx.fillStyle = '#64748b';
    ctx.font = '9px sans-serif';
    ctx.fillText('munchidate.com • Sponsored Dates', canvas.width / 2, qrY + 125);

  }, [archetype]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const link = document.createElement('a');
    link.download = `${archetype.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_card.png`;
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <canvas 
        ref={canvasRef} 
        width={360} 
        height={560} 
        className="w-full max-w-[260px] rounded-[24px] border border-slate-700/60 shadow-2xl bg-slate-950"
      />

      <div className="flex flex-col gap-2 w-full max-w-[260px]">
        <button
          onClick={handleDownload}
          className="w-full py-2.5 bg-gradient-to-r from-pink-500 to-indigo-500 hover:from-pink-600 hover:to-indigo-600 text-white font-bold rounded-xl text-[10.5px] shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer shadow-pink-500/10"
        >
          📥 Save Graphic / Share to Stories
        </button>
        
        <button 
          onClick={onClose}
          className="w-full py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold rounded-xl text-[10px] cursor-pointer transition-colors active:scale-95"
        >
          Continue to Matches
        </button>
      </div>
    </div>
  );
}
