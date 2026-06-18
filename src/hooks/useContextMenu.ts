import { useState, useEffect, useCallback, useRef } from 'react';

export interface ContextMenuAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  shortcut?: string;
  separator?: boolean;
  disabled?: boolean;
  danger?: boolean;
  submenu?: ContextMenuAction[];
  onClick?: () => void;
}

export interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  items: ContextMenuAction[];
  onClose: () => void;
}

export function useContextMenu() {
  const [menu, setMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    items: [],
    onClose: () => {},
  });
  const containerRef = useRef<HTMLDivElement>(null);

  const show = useCallback((x: number, y: number, items: ContextMenuAction[], onClose?: () => void) => {
    setMenu({
      visible: true,
      x,
      y,
      items,
      onClose: onClose ?? (() => setMenu((m) => ({ ...m, visible: false }))),
    });
  }, []);

  const hide = useCallback(() => {
    setMenu((m) => ({ ...m, visible: false }));
  }, []);

  // Close on click outside
  useEffect(() => {
    if (!menu.visible) return;
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (containerRef.current && !containerRef.current.contains(target)) {
        hide();
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        hide();
      }
    };
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', onMouseDown);
      document.addEventListener('keydown', onKeyDown, true);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, [menu.visible, hide]);

  // Close on scroll
  useEffect(() => {
    if (!menu.visible) return;
    const handler = () => hide();
    window.addEventListener('scroll', handler, true);
    return () => window.removeEventListener('scroll', handler, true);
  }, [menu.visible, hide]);

  return { menu, containerRef, show, hide };
}
