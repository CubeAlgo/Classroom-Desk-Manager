import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Maximize2, Minimize2, ZoomIn, ZoomOut } from "lucide-react";

const BOARD_H = 70;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

// Renders the room at a fixed real-world scale, fits it to the space, and supports pinch / ctrl+wheel zoom.
export function RoomViewport({ width, height, actions, children }: { width: number; height: number; actions?: ReactNode; children: ReactNode }) {
  const outer = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const anchor = useRef<{ fx: number; fy: number; mx: number; my: number } | null>(null);
  const [fit, setFit] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [full, setFull] = useState(false);
  const scale = fit * zoom;

  useEffect(() => {
    const el = outer.current;
    if (!el) return;
    const measure = () => {
      const isFull = document.fullscreenElement === el;
      setFull(isFull);
      const availW = el.clientWidth - (isFull ? 80 : 0);
      const availH = isFull ? window.innerHeight - 110 : Infinity;
      setFit(Math.max(0.3, Math.min(availW / width, availH / (height + BOARD_H), isFull ? 2 : 1.15)));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    document.addEventListener("fullscreenchange", measure);
    return () => { ro.disconnect(); document.removeEventListener("fullscreenchange", measure); };
  }, [width, height]);

  const zoomTo = (next: number, mx?: number, my?: number) => {
    const sc = scroller.current;
    const z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next));
    if (sc) {
      const px = mx ?? sc.clientWidth / 2;
      const py = my ?? sc.clientHeight / 2;
      anchor.current = { fx: (sc.scrollLeft + px) / sc.scrollWidth, fy: (sc.scrollTop + py) / sc.scrollHeight, mx: px, my: py };
    }
    setZoom(z);
  };

  useLayoutEffect(() => {
    const sc = scroller.current;
    const a = anchor.current;
    if (!sc || !a) return;
    sc.scrollLeft = a.fx * sc.scrollWidth - a.mx;
    sc.scrollTop = a.fy * sc.scrollHeight - a.my;
    anchor.current = null;
  }, [zoom]);

  useEffect(() => {
    const sc = scroller.current;
    if (!sc) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const r = sc.getBoundingClientRect();
      setZoom((z) => {
        const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z * Math.exp(-Math.max(-40, Math.min(40, e.deltaY)) * 0.006)));
        anchor.current = { fx: (sc.scrollLeft + e.clientX - r.left) / sc.scrollWidth, fy: (sc.scrollTop + e.clientY - r.top) / sc.scrollHeight, mx: e.clientX - r.left, my: e.clientY - r.top };
        return next;
      });
    };
    sc.addEventListener("wheel", onWheel, { passive: false });
    return () => sc.removeEventListener("wheel", onWheel);
  }, []);

  const toggle = () => (document.fullscreenElement ? document.exitFullscreen() : outer.current?.requestFullscreen())?.catch(console.error);
  const baseH = (height + BOARD_H) * fit;

  return (
    <div ref={outer} className={`room-viewport ${full ? "is-full" : ""}`} data-testid="room-viewport">
      <div className="room-toolbar">
        <span className="room-scale" data-testid="room-scale">{Math.round(scale * 100)}% scale · pinch or {navigator.platform.includes("Mac") ? "⌘" : "Ctrl"} + scroll to zoom</span>
        <div className="room-toolbar-actions">
          {full && actions}
          <div className="zoom-controls">
            <button data-testid="room-zoom-out-btn" onClick={() => zoomTo(zoom / 1.25)} disabled={zoom <= MIN_ZOOM} aria-label="Zoom out"><ZoomOut size={14} /></button>
            <button data-testid="room-zoom-reset-btn" onClick={() => zoomTo(1)} className="zoom-value">{Math.round(zoom * 100)}%</button>
            <button data-testid="room-zoom-in-btn" onClick={() => zoomTo(zoom * 1.25)} disabled={zoom >= MAX_ZOOM} aria-label="Zoom in"><ZoomIn size={14} /></button>
          </div>
          <button className="ghost-pill room-full-btn" data-testid="room-fullscreen-btn" onClick={toggle}>
            {full ? <Minimize2 size={14} /> : <Maximize2 size={14} />} {full ? "Exit full screen" : "Full screen"}
          </button>
        </div>
      </div>
      <div ref={scroller} className={`room-scroll ${zoom > 1 ? "zoomed" : ""}`} data-testid="room-scroll" style={{ height: baseH }}>
        <div className="room-stage" style={{ width: width * scale, height: (height + BOARD_H) * scale }}>
          <div className="room-scaled" style={{ width, transform: `scale(${scale})` }}>{children}</div>
        </div>
      </div>
    </div>
  );
}
