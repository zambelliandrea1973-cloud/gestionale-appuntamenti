import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Plus, X, Move } from "lucide-react";

interface FloatingActionButtonProps {
  onClick: () => void;
  text: string;
  variant?: 'primary' | 'secondary';
  position?: 'top-right' | 'bottom-right' | 'bottom-left' | 'top-left' | 'none';
}

const STORAGE_KEY = 'fab-position';
const LONG_PRESS_MS = 1500;

function getDefaultPos(): { x: number; y: number } {
  return {
    x: window.innerWidth - 200,
    y: window.innerHeight - 80,
  };
}

function loadSavedPos(): { x: number; y: number } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
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
}: FloatingActionButtonProps) {
  const [isBlinking, setIsBlinking] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isLongPress, setIsLongPress] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number }>(() => loadSavedPos() ?? getDefaultPos());

  const containerRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragStart = useRef<{ px: number; py: number; ex: number; ey: number } | null>(null);
  const hasDragged = useRef(false);

  const selectedColors = variant === 'primary'
    ? { active: 'bg-green-600 hover:bg-green-700', inactive: 'bg-green-600/50 hover:bg-green-600/70', shadowColor: 'rgba(74,222,128,0.7)', shadowFade: 'rgba(74,222,128,0)' }
    : { active: 'bg-gray-500 hover:bg-gray-600', inactive: 'bg-gray-500/50 hover:bg-gray-500/70', shadowColor: 'rgba(156,163,175,0.7)', shadowFade: 'rgba(156,163,175,0)' };

  useEffect(() => {
    const interval = setInterval(() => setIsBlinking(p => !p), 1000);
    return () => clearInterval(interval);
  }, []);

  const clampPos = useCallback((x: number, y: number) => {
    const w = containerRef.current?.offsetWidth ?? 160;
    const h = containerRef.current?.offsetHeight ?? 48;
    return {
      x: Math.max(8, Math.min(window.innerWidth - w - 8, x)),
      y: Math.max(8, Math.min(window.innerHeight - h - 8, y)),
    };
  }, []);

  const startLongPress = useCallback((ex: number, ey: number) => {
    longPressTimer.current = setTimeout(() => {
      setIsLongPress(true);
      setIsDragging(true);
      dragStart.current = { px: pos.x, py: pos.y, ex, ey };
      hasDragged.current = false;
    }, LONG_PRESS_MS);
  }, [pos]);

  const cancelLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    startLongPress(e.clientX, e.clientY);
  }, [startLongPress]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging || !dragStart.current) return;
    const dx = e.clientX - dragStart.current.ex;
    const dy = e.clientY - dragStart.current.ey;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) hasDragged.current = true;
    const newPos = clampPos(dragStart.current.px + dx, dragStart.current.py + dy);
    setPos(newPos);
  }, [isDragging, clampPos]);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    cancelLongPress();
    if (isDragging) {
      setIsDragging(false);
      setIsLongPress(false);
      const dx = e.clientX - (dragStart.current?.ex ?? e.clientX);
      const dy = e.clientY - (dragStart.current?.ey ?? e.clientY);
      const newPos = clampPos(
        (dragStart.current?.px ?? pos.x) + dx,
        (dragStart.current?.py ?? pos.y) + dy,
      );
      setPos(newPos);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newPos));
      dragStart.current = null;
    } else if (!hasDragged.current) {
      onClick();
    }
    hasDragged.current = false;
  }, [isDragging, cancelLongPress, clampPos, pos, onClick]);

  const onPointerCancel = useCallback(() => {
    cancelLongPress();
    setIsDragging(false);
    setIsLongPress(false);
    dragStart.current = null;
    hasDragged.current = false;
  }, [cancelLongPress]);

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
        transition: isDragging ? 'none' : 'box-shadow 0.3s',
        animation: isDragging || variant !== 'primary' ? undefined : 'fab-pulse 2s infinite',
        borderRadius: '9999px',
        boxShadow: isDragging ? '0 0 0 3px rgba(74,222,128,0.8), 0 8px 24px rgba(0,0,0,0.25)' : undefined,
      }}
    >
      <style>{`
        @keyframes fab-pulse {
          0%   { transform: scale(1);    box-shadow: 0 0 0 0 ${selectedColors.shadowColor}; }
          70%  { transform: scale(1.05); box-shadow: 0 0 0 15px ${selectedColors.shadowFade}; }
          100% { transform: scale(1);    box-shadow: 0 0 0 0 ${selectedColors.shadowFade}; }
        }
      `}</style>

      <Button
        size="lg"
        className={`rounded-full flex items-center gap-2 transition-all duration-300 select-none ${
          isBlinking && !isDragging ? selectedColors.active : selectedColors.inactive
        } ${isDragging ? 'opacity-80 scale-105' : ''}`}
        style={{ pointerEvents: 'none' }}
      >
        {isDragging
          ? <Move className="h-5 w-5" />
          : variant === 'primary'
            ? <Plus className="h-5 w-5" />
            : <X className="h-5 w-5" />
        }
        {isDragging ? 'Sposta...' : text}
      </Button>

      {isLongPress && !isDragging && (
        <div
          style={{
            position: 'absolute', inset: 0, borderRadius: '9999px',
            background: 'rgba(255,255,255,0.3)',
            animation: 'none',
          }}
        />
      )}
    </div>
  );
}
