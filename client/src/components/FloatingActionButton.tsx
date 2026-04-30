import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Plus, Move } from "lucide-react";

interface FloatingActionButtonProps {
  onClick: () => void;
  text: string;
  variant?: 'primary' | 'secondary';
  position?: 'top-right' | 'bottom-right' | 'bottom-left' | 'top-left' | 'none';
  storageKey?: string;
}

const LONG_PRESS_MS = 1500;

function getDefaultPos(): { x: number; y: number } {
  return {
    x: window.innerWidth - 200,
    y: window.innerHeight - 80,
  };
}

function loadSavedPos(key: string): { x: number; y: number } | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const pos = JSON.parse(raw);
    if (typeof pos.x === 'number' && typeof pos.y === 'number') return pos;
  } catch {}
  return null;
}

export function FloatingActionButton({
  onClick,
  text,
  variant = 'primary',
  storageKey = 'fab-position',
}: FloatingActionButtonProps) {
  const key = storageKey;
  const [isBlinking, setIsBlinking] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number }>(
    () => loadSavedPos(key) ?? getDefaultPos()
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragStart = useRef<{ px: number; py: number; ex: number; ey: number } | null>(null);
  const hasDragged = useRef(false);
  const posRef = useRef(pos);
  posRef.current = pos;

  const shadowColor = variant === 'primary' ? 'rgba(74,222,128,0.7)' : 'rgba(156,163,175,0.7)';
  const shadowFade  = variant === 'primary' ? 'rgba(74,222,128,0)'   : 'rgba(156,163,175,0)';
  const activeClass   = variant === 'primary' ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-500 hover:bg-gray-600';
  const inactiveClass = variant === 'primary' ? 'bg-green-600/60 hover:bg-green-700' : 'bg-gray-500/60 hover:bg-gray-600';

  useEffect(() => {
    const interval = setInterval(() => setIsBlinking(p => !p), 1000);
    return () => clearInterval(interval);
  }, []);

  const clamp = useCallback((x: number, y: number) => {
    const w = containerRef.current?.offsetWidth ?? 160;
    const h = containerRef.current?.offsetHeight ?? 48;
    return {
      x: Math.max(8, Math.min(window.innerWidth - w - 8, x)),
      y: Math.max(8, Math.min(window.innerHeight - h - 8, y)),
    };
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    hasDragged.current = false;
    longPressTimer.current = setTimeout(() => {
      setIsDragging(true);
      dragStart.current = { px: posRef.current.x, py: posRef.current.y, ex: e.clientX, ey: e.clientY };
    }, LONG_PRESS_MS);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragStart.current) return;
    const dx = e.clientX - dragStart.current.ex;
    const dy = e.clientY - dragStart.current.ey;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) hasDragged.current = true;
    if (isDragging) setPos(clamp(dragStart.current.px + dx, dragStart.current.py + dy));
  }, [isDragging, clamp]);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
    if (isDragging && dragStart.current) {
      const dx = e.clientX - dragStart.current.ex;
      const dy = e.clientY - dragStart.current.ey;
      const newPos = clamp(dragStart.current.px + dx, dragStart.current.py + dy);
      setPos(newPos);
      localStorage.setItem(key, JSON.stringify(newPos));
      dragStart.current = null;
      setIsDragging(false);
    } else if (!hasDragged.current) {
      onClick();
    }
    hasDragged.current = false;
  }, [isDragging, clamp, key, onClick]);

  const onPointerCancel = useCallback(() => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
    setIsDragging(false);
    dragStart.current = null;
    hasDragged.current = false;
  }, []);

  return (
    <div
      ref={containerRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        zIndex: 50,
        touchAction: 'none',
        userSelect: 'none',
        cursor: isDragging ? 'grabbing' : 'pointer',
        borderRadius: '9999px',
        boxShadow: isDragging ? `0 0 0 4px ${shadowColor}, 0 8px 24px rgba(0,0,0,0.25)` : undefined,
        animation: isDragging || variant !== 'primary' ? undefined : 'fab-pulse 2s infinite',
      }}
    >
      <style>{`
        @keyframes fab-pulse {
          0%   { transform: scale(1);    box-shadow: 0 0 0 0 ${shadowColor}; }
          70%  { transform: scale(1.05); box-shadow: 0 0 0 15px ${shadowFade}; }
          100% { transform: scale(1);    box-shadow: 0 0 0 0 ${shadowFade}; }
        }
      `}</style>
      <Button
        size="lg"
        className={`rounded-full flex items-center gap-2 select-none transition-colors duration-300 ${
          isDragging ? activeClass + ' opacity-80' : isBlinking ? activeClass : inactiveClass
        }`}
        style={{ pointerEvents: 'none' }}
      >
        {isDragging ? <Move className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
        {isDragging ? 'Sposta...' : text}
      </Button>
    </div>
  );
}
