import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Plus, Move, X } from "lucide-react";

interface FloatingActionButtonProps {
  onClick: () => void;
  text: string;
  variant?: 'primary' | 'secondary';
  storageKey?: string;
  onCancel?: () => void;
}

const LONG_PRESS_MS = 1500;
const MIN_SCALE = 0.6;
const MAX_SCALE = 2.0;
const VOICE_TRIGGER_SELECTOR = '[data-voice-appointment-trigger]';
const FLOATING_ACTION_GAP = 12;

function loadSaved<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function getDefaultPos(): { x: number; y: number } {
  // Place at bottom-right with a safe margin; actual clamp happens after mount
  return {
    x: window.innerWidth - 210,
    y: window.innerHeight - 76,
  };
}

export function FloatingActionButton({
  onClick,
  text,
  variant = 'primary',
  storageKey = 'fab-position',
  onCancel,
}: FloatingActionButtonProps) {
  const { t } = useTranslation();
  const posKey   = storageKey;
  const scaleKey = `${storageKey}-scale`;

  const [pos, setPos] = useState<{ x: number; y: number }>(
    () => loadSaved<{ x: number; y: number } | null>(posKey, null) ?? getDefaultPos()
  );
  const [scale, setScale]       = useState<number>(() => loadSaved<number>(scaleKey, 1));
  const [isBlinking, setIsBlinking] = useState(false);
  const [isDraggingUI, setIsDraggingUI] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Use refs for drag logic to avoid stale closures in pointer callbacks
  const isDraggingRef = useRef(false);
  const posRef        = useRef(pos);
  const scaleRef      = useRef(scale);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragStart = useRef<{ px: number; py: number; ex: number; ey: number } | null>(null);
  const hasDragged    = useRef(false);

  // Keep refs in sync with state
  posRef.current   = pos;
  scaleRef.current = scale;

  // Pinch-to-scale state
  const pinchRef = useRef<{ dist: number; scale0: number } | null>(null);

  // Blinking pulse
  useEffect(() => {
    const id = setInterval(() => setIsBlinking(p => !p), 1000);
    return () => clearInterval(id);
  }, []);

  const clamp = useCallback((x: number, y: number) => {
    const baseWidth = containerRef.current?.offsetWidth ?? 180;
    const baseHeight = containerRef.current?.offsetHeight ?? 48;
    const currentScale = scaleRef.current;

    // The FAB scales around its bottom-right corner. Keep the calculations in
    // sync with the transformed visual rectangle, not only the CSS left/top.
    const getVisualRect = (candidateX: number, candidateY: number) => ({
      left: candidateX - baseWidth * (currentScale - 1),
      top: candidateY - baseHeight * (currentScale - 1),
      right: candidateX + baseWidth * currentScale,
      bottom: candidateY + baseHeight * currentScale,
    });

    const clampToViewport = (candidateX: number, candidateY: number) => ({
      x: Math.max(
        8 + baseWidth * (currentScale - 1),
        Math.min(window.innerWidth - baseWidth * currentScale - 8, candidateX)
      ),
      y: Math.max(
        8 + baseHeight * (currentScale - 1),
        Math.min(window.innerHeight - baseHeight * currentScale - 8, candidateY)
      ),
    });

    const viewportPosition = clampToViewport(x, y);
    const voiceTrigger = document.querySelector<HTMLElement>(VOICE_TRIGGER_SELECTOR);
    if (!voiceTrigger) return viewportPosition;

    const voiceRect = voiceTrigger.getBoundingClientRect();
    const overlapsVoiceButton = (candidate: { x: number; y: number }) => {
      const rect = getVisualRect(candidate.x, candidate.y);
      return (
        rect.right + FLOATING_ACTION_GAP > voiceRect.left &&
        rect.left - FLOATING_ACTION_GAP < voiceRect.right &&
        rect.bottom + FLOATING_ACTION_GAP > voiceRect.top &&
        rect.top - FLOATING_ACTION_GAP < voiceRect.bottom
      );
    };

    if (!overlapsVoiceButton(viewportPosition)) return viewportPosition;

    // Prefer keeping the manual action in the same bottom row, immediately
    // left of the voice action. If that space is unavailable, try above it.
    const alternatives = [
      clampToViewport(
        voiceRect.left - FLOATING_ACTION_GAP - baseWidth * currentScale,
        viewportPosition.y
      ),
      clampToViewport(
        viewportPosition.x,
        voiceRect.top - FLOATING_ACTION_GAP - baseHeight * currentScale
      ),
      clampToViewport(
        viewportPosition.x,
        voiceRect.bottom + FLOATING_ACTION_GAP + baseHeight * (currentScale - 1)
      ),
    ];

    return alternatives.find(candidate => !overlapsVoiceButton(candidate))
      || alternatives[0];
  }, []);

  // After mount (and on resize): clamp position to the viewport and keep the
  // manual appointment action clear of the fixed voice action. This also
  // repairs positions saved by an older layout on the current device.
  useEffect(() => {
    const recalc = () => {
      setPos(prev => clamp(prev.x, prev.y));
    };
    // Small delay lets the browser paint both floating actions first.
    const t = setTimeout(recalc, 120);
    window.addEventListener('resize', recalc);
    return () => { clearTimeout(t); window.removeEventListener('resize', recalc); };
  }, [clamp]);

  // --- Pointer events for drag ---

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    hasDragged.current = false;
    longPressTimer.current = setTimeout(() => {
      isDraggingRef.current = true;
      setIsDraggingUI(true);
      dragStart.current = {
        px: posRef.current.x,
        py: posRef.current.y,
        ex: e.clientX,
        ey: e.clientY,
      };
    }, LONG_PRESS_MS);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDraggingRef.current || !dragStart.current) return;
    const dx = e.clientX - dragStart.current.ex;
    const dy = e.clientY - dragStart.current.ey;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) hasDragged.current = true;
    const newPos = clamp(dragStart.current.px + dx, dragStart.current.py + dy);
    posRef.current = newPos;
    setPos(newPos);
  }, [clamp]);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    // Prevent the browser from synthesising a click/mousedown/mouseup event
    // after pointerup. Without this, on Android the synthesised click fires
    // on whatever element is at that position *after* a React re-render —
    // i.e. the modal backdrop — which would immediately close the modal.
    e.preventDefault();
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (isDraggingRef.current && dragStart.current) {
      const dx = e.clientX - dragStart.current.ex;
      const dy = e.clientY - dragStart.current.ey;
      const newPos = clamp(dragStart.current.px + dx, dragStart.current.py + dy);
      posRef.current = newPos;
      setPos(newPos);
      localStorage.setItem(posKey, JSON.stringify(newPos));
      dragStart.current    = null;
      isDraggingRef.current = false;
      setIsDraggingUI(false);
    } else if (!hasDragged.current) {
      onClick();
    }
    hasDragged.current = false;
  }, [clamp, posKey, onClick]);

  const onPointerCancel = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    isDraggingRef.current = false;
    setIsDraggingUI(false);
    dragStart.current  = null;
    hasDragged.current = false;
  }, []);

  // --- Touch events for pinch-to-scale ---

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dx   = e.touches[0].clientX - e.touches[1].clientX;
      const dy   = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      pinchRef.current = { dist, scale0: scaleRef.current };
    }
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchRef.current) {
      e.preventDefault();
      const dx      = e.touches[0].clientX - e.touches[1].clientX;
      const dy      = e.touches[0].clientY - e.touches[1].clientY;
      const dist    = Math.hypot(dx, dy);
      const newScale = Math.min(
        MAX_SCALE,
        Math.max(MIN_SCALE, pinchRef.current.scale0 * (dist / pinchRef.current.dist))
      );
      scaleRef.current = newScale;
      setScale(newScale);
    }
  }, []);

  const onTouchEnd = useCallback(() => {
    if (pinchRef.current) {
      localStorage.setItem(scaleKey, JSON.stringify(scaleRef.current));
      pinchRef.current = null;
    }
  }, [scaleKey]);

  // --- Styling ---

  const activeClass   = variant === 'primary' ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-500 hover:bg-gray-600';
  const inactiveClass = variant === 'primary' ? 'bg-green-600/60 hover:bg-green-700' : 'bg-gray-500/60 hover:bg-gray-600';

  return (
    <div
      ref={containerRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      className={variant === 'primary' ? 'appointment-action-pulse-green' : undefined}
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        zIndex: 50,
        touchAction: 'none',
        userSelect: 'none',
        cursor: isDraggingUI ? 'grabbing' : 'pointer',
        borderRadius: '9999px',
        transform: `scale(${scale})`,
        transformOrigin: 'bottom right',
        boxShadow: isDraggingUI
          ? `0 0 0 4px ${shadowColor}, 0 8px 24px rgba(0,0,0,0.25)`
          : undefined,
      }}
    >
      <Button
        className={`h-14 rounded-full px-4 text-xs font-extrabold flex items-center gap-2 select-none transition-colors duration-300 ${
          isDraggingUI
            ? activeClass + ' opacity-80'
            : isBlinking ? activeClass : inactiveClass
        }`}
        style={{ pointerEvents: 'none' }}
      >
        {isDraggingUI ? <Move className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
        {isDraggingUI ? t('fab.dragging') : text}
      </Button>
      {onCancel && !isDraggingUI && (
        <button
          onPointerDown={e => e.stopPropagation()}
          onPointerUp={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); onCancel(); }}
          className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gray-700 hover:bg-gray-900 text-white flex items-center justify-center shadow-md z-10"
          aria-label={t('common.cancel')}
          style={{ touchAction: 'none' }}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
