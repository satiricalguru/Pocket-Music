import React from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight } from 'lucide-react';
import type { ContextMenuState } from '../../hooks/useContextMenu';

interface ContextMenuProps {
  menu: ContextMenuState;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onClose: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ menu, containerRef, onClose }) => {
  const [coords, setCoords] = React.useState({ x: menu.x, y: menu.y });
  const [visible, setVisible] = React.useState(false);

  React.useLayoutEffect(() => {
    if (menu.visible && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;

      // Adjust X if it overflows the right edge
      let adjustedX = menu.x;
      if (menu.x + w > window.innerWidth) {
        adjustedX = menu.x - w;
      }
      if (adjustedX < 0) adjustedX = 0;

      // Adjust Y if it overflows the bottom edge (leaving a small 8px safety margin)
      let adjustedY = menu.y;
      if (menu.y + h > window.innerHeight - 8) {
        adjustedY = menu.y - h;
      }
      if (adjustedY < 0) adjustedY = 0;

      setCoords({ x: adjustedX, y: adjustedY });
      setVisible(true);
    } else {
      setVisible(false);
    }
  }, [menu.visible, menu.x, menu.y, containerRef]);

  if (!menu.visible) return null;

  const handleItemClick = (item: (typeof menu.items)[number]) => {
    if (item.separator || item.disabled) return;
    if (item.onClick) {
      item.onClick();
    }
    onClose();
  };

  return createPortal(
    <div
      ref={containerRef as React.RefObject<HTMLDivElement>}
      className="fixed z-[100] min-w-[220px] py-1 bg-elevated rounded shadow-2xl border border-border fade-in"
      style={{
        left: coords.x,
        top: coords.y,
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      {menu.items.map((item, idx) => {
        if (item.separator) {
          return <div key={item.id || `sep-${idx}`} className="h-px bg-border my-1" />;
        }

        const hasSubmenu = item.submenu && item.submenu.length > 0;
        if (hasSubmenu) {
          const isNearRightEdge = coords.x + 440 > window.innerWidth;
          const submenuAlignClass = isNearRightEdge ? 'right-full mr-1' : 'left-full ml-1';

          return (
            <div key={item.id} className="relative group">
              <button
                disabled={item.disabled}
                className={`
                  w-full flex items-center gap-3 px-3 py-2 text-sm text-left transition-colors
                  text-text1 hover:bg-surface-h
                  ${item.disabled ? 'opacity-40 cursor-not-allowed' : ''}
                `}
              >
                {item.icon && <span className="w-4 flex items-center justify-center">{item.icon}</span>}
                <span className="flex-1">{item.label}</span>
                <ChevronRight size={14} className="text-text3" />
              </button>
              
              {/* Submenu Panel */}
              <div
                className={`
                  absolute top-0 hidden group-hover:block min-w-[200px] py-1
                  bg-elevated rounded shadow-2xl border border-border
                  ${submenuAlignClass}
                `}
              >
                {item.submenu!.map((subItem) => (
                  <button
                    key={subItem.id}
                    onClick={() => handleItemClick(subItem)}
                    disabled={subItem.disabled}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2 text-sm text-left transition-colors
                      text-text1 hover:bg-surface-h
                      ${subItem.disabled ? 'opacity-40 cursor-not-allowed' : ''}
                    `}
                  >
                    <span className="flex-1">{subItem.label}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        }

        return (
          <button
            key={item.id}
            onClick={() => handleItemClick(item)}
            disabled={item.disabled}
            className={`
              w-full flex items-center gap-3 px-3 py-2 text-sm text-left transition-colors
              ${item.danger ? 'text-red-400 hover:bg-red-500/20' : 'text-text1 hover:bg-surface-h'}
              ${item.disabled ? 'opacity-40 cursor-not-allowed' : ''}
            `}
          >
            {item.icon && <span className="w-4 flex items-center justify-center">{item.icon}</span>}
            <span className="flex-1">{item.label}</span>
            {item.shortcut && <span className="text-xs text-text3">{item.shortcut}</span>}
          </button>
        );
      })}
    </div>,
    document.body
  );
};
