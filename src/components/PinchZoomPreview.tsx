import { useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";

interface PinchZoomPreviewProps {
  src: string;
  alt: string;
  onClose: () => void;
}

const PinchZoomPreview = ({ src, alt, onClose }: PinchZoomPreviewProps) => {
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const initialDistance = useRef<number | null>(null);
  const initialScale = useRef(1);
  const lastTranslate = useRef({ x: 0, y: 0 });
  const lastCenter = useRef({ x: 0, y: 0 });
  const isPanning = useRef(false);

  const getDistance = (t0: React.Touch, t1: React.Touch) => {
    const dx = t0.clientX - t1.clientX;
    const dy = t0.clientY - t1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const getCenter = (t0: React.Touch, t1: React.Touch) => ({
    x: (t0.clientX + t1.clientX) / 2,
    y: (t0.clientY + t1.clientY) / 2,
  });

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      initialDistance.current = getDistance(e.touches[0], e.touches[1]);
      initialScale.current = scale;
      lastCenter.current = getCenter(e.touches[0], e.touches[1]);
      lastTranslate.current = { ...translate };
      isPanning.current = true;
    } else if (e.touches.length === 1 && scale > 1) {
      lastCenter.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      lastTranslate.current = { ...translate };
      isPanning.current = true;
    }
  }, [scale, translate]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && initialDistance.current !== null) {
      e.preventDefault();
      const dist = getDistance(e.touches[0], e.touches[1]);
      const newScale = Math.min(Math.max(initialScale.current * (dist / initialDistance.current), 1), 5);
      const center = getCenter(e.touches[0], e.touches[1]);
      setScale(newScale);
      setTranslate({
        x: lastTranslate.current.x + (center.x - lastCenter.current.x),
        y: lastTranslate.current.y + (center.y - lastCenter.current.y),
      });
    } else if (e.touches.length === 1 && isPanning.current && scale > 1) {
      const dx = e.touches[0].clientX - lastCenter.current.x;
      const dy = e.touches[0].clientY - lastCenter.current.y;
      setTranslate({
        x: lastTranslate.current.x + dx,
        y: lastTranslate.current.y + dy,
      });
    }
  }, [scale]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      initialDistance.current = null;
      if (e.touches.length === 1) {
        lastCenter.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        lastTranslate.current = { ...translate };
      }
    }
    if (e.touches.length === 0) {
      isPanning.current = false;
      if (scale <= 1.05) {
        setScale(1);
        setTranslate({ x: 0, y: 0 });
      }
    }
  }, [scale, translate]);

  const handleDoubleClick = useCallback(() => {
    if (scale > 1) {
      setScale(1);
      setTranslate({ x: 0, y: 0 });
    } else {
      setScale(2.5);
    }
  }, [scale]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (scale <= 1 && e.target === e.currentTarget) {
      onClose();
    }
  }, [scale, onClose]);

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 touch-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={handleBackdropClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <motion.img
        src={src}
        alt={alt}
        className="max-w-[90vw] max-h-[90vh] rounded-2xl object-contain select-none pointer-events-auto"
        style={{
          transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
          transition: scale <= 1.05 && !isPanning.current ? "transform 0.2s ease-out" : "none",
        }}
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.5, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        onDoubleClick={handleDoubleClick}
        draggable={false}
      />
      <button
        onClick={onClose}
        className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/10 backdrop-blur flex items-center justify-center text-white hover:bg-white/20 transition-colors z-10"
      >
        <X className="h-5 w-5" />
      </button>
      {scale > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/60 text-xs bg-black/40 rounded-full px-3 py-1 backdrop-blur">
          {Math.round(scale * 100)}% · Double-tap to reset
        </div>
      )}
    </motion.div>
  );
};

export default PinchZoomPreview;
