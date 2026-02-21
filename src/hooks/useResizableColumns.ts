'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

export function useResizableColumns(initialWidths: number[]) {
  const [widths, setWidths] = useState(initialWidths);
  const dragging = useRef<{ col: number; startX: number; startW: number } | null>(null);

  const onMouseDown = useCallback((col: number, e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = { col, startX: e.clientX, startW: widths[col] };

    const onMouseMove = (ev: MouseEvent) => {
      if (!dragging.current) return;
      const diff = ev.clientX - dragging.current.startX;
      const newW = Math.max(40, dragging.current.startW + diff);
      setWidths(prev => {
        const next = [...prev];
        next[dragging.current!.col] = newW;
        return next;
      });
    };

    const onMouseUp = () => {
      dragging.current = null;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [widths]);

  return { widths, onMouseDown };
}
