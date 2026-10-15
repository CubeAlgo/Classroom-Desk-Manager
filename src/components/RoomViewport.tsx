import { useEffect, useRef, useState, type ReactNode } from "react";
import { Maximize2, Minimize2 } from "lucide-react";

const BOARD_H = 70;

// Renders the room at a fixed real-world scale and fits it to the available space (or full screen).
export function RoomViewport({ width, height, actions, children }: { width: number; height: number; actions?: ReactNode; children: ReactNode }) {
  const outer = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [full, setFull] = useState(false);

  useEffect(() => {
    const el = outer.current;
    if (!el) return;
    const fit = () => {
      const isFull = document.fullscreenElement === el;
      setFull(isFull);
      const availW = el.clientWidth - (isFull ? 80 : 0);
      const availH = isFull ? window.innerHeight - 110 : Infinity;
      setScale(Math.max(0.3, Math.min(availW / width, availH / (height + BOARD_H), isFull ? 2 : 1.15)));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    document.addEventListener("fullscreenchange", fit);
    return () => { ro.disconnect(); document.removeEventListener("fullscreenchange", fit); };
  }, [width, height]);

  const toggle = () => (document.fullscreenElement ? document.exitFullscreen() : outer.current?.requestFullscreen())?.catch(console.error);

  return (
    <div ref={outer} className={`room-viewport ${full ? "is-full" : ""}`} data-testid="room-viewport">
      <div className="room-toolbar">
        <span className="room-scale" data-testid="room-scale">{Math.round(scale * 100)}% scale</span>
        <div className="room-toolbar-actions">
          {full && actions}
          <button className="ghost-pill room-full-btn" data-testid="room-fullscreen-btn" onClick={toggle}>
            {full ? <Minimize2 size={14} /> : <Maximize2 size={14} />} {full ? "Exit full screen" : "Full screen"}
          </button>
        </div>
      </div>
      <div className="room-stage" style={{ width: width * scale, height: (height + BOARD_H) * scale }}>
        <div className="room-scaled" style={{ width, transform: `scale(${scale})` }}>{children}</div>
      </div>
    </div>
  );
}
