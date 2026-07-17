"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { ChevronDownIcon } from "@/components/ui/icons";

// Hand-rolled dropdown replacing the native <select> across /admin, so the
// hovered/active option can carry the app's own colour (bg-foreground-selected)
// instead of the browser's OS-blue — native <option> highlight is not stylable
// (§9 design language; AGENTS.md permits hand-rolled a11y widgets here).
//
// The listbox is rendered in a portal with fixed positioning: the column
// filters live inside the orders table's overflow-x-auto wrapper, which would
// otherwise clip an in-flow absolute menu. Focus stays on the trigger button;
// the open list is driven by aria-activedescendant (listbox popup pattern).

export type SelectOption<T extends string> = { value: T; label: string };

export function Select<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  disabled = false,
  triggerClassName = "",
  block = false,
}: {
  value: T;
  options: readonly SelectOption<T>[];
  onChange: (value: T) => void;
  ariaLabel: string;
  disabled?: boolean;
  /** Classes for the trigger button (transparent, monospace inherited, etc.). */
  triggerClassName?: string;
  /** Stretch the trigger to full width with the caret pushed to the far end. */
  block?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [pos, setPos] = useState<{
    top: number;
    left: number;
    minWidth: number;
  } | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  const selectedIndex = options.findIndex((o) => o.value === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined;

  // Anchor the fixed menu under the trigger (viewport coords).
  const place = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({ top: r.bottom + 2, left: r.left, minWidth: r.width });
  }, []);

  const choose = useCallback(
    (v: T) => {
      setOpen(false);
      triggerRef.current?.focus();
      if (v !== value) onChange(v);
    },
    [onChange, value],
  );

  function openMenu() {
    if (disabled) return;
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
    place();
    setOpen(true);
  }

  // While open: reposition on scroll/resize, close on outside pointer / Escape.
  useEffect(() => {
    if (!open) return;
    const reflow = () => place();
    window.addEventListener("scroll", reflow, true);
    window.addEventListener("resize", reflow);
    function onPointerDown(e: PointerEvent) {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      window.removeEventListener("scroll", reflow, true);
      window.removeEventListener("resize", reflow);
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [open, place]);

  // Clamp the menu into the viewport once its width is known.
  useLayoutEffect(() => {
    if (!open || !pos || !menuRef.current) return;
    const w = menuRef.current.offsetWidth;
    const maxLeft = window.innerWidth - w - 8;
    const clamped = Math.max(8, Math.min(pos.left, maxLeft));
    if (Math.abs(clamped - pos.left) > 0.5) {
      setPos((p) => (p ? { ...p, left: clamped } : p));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pos?.top, pos?.minWidth]);

  // Keep the active option in view as it moves.
  useEffect(() => {
    if (!open) return;
    document
      .getElementById(`${listboxId}-opt-${activeIndex}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex, listboxId]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        openMenu();
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => Math.min(options.length - 1, i + 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => Math.max(0, i - 1));
        break;
      case "Home":
        e.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        e.preventDefault();
        setActiveIndex(options.length - 1);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (options[activeIndex]) choose(options[activeIndex].value);
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        break;
      case "Tab":
        setOpen(false);
        break;
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-activedescendant={
          open ? `${listboxId}-opt-${activeIndex}` : undefined
        }
        aria-label={ariaLabel}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={onKeyDown}
        className={triggerClassName}
      >
        <span
          className={
            "flex items-center gap-1 " + (block ? "w-full justify-between" : "")
          }
        >
          <span className="truncate">{selected?.label ?? ""}</span>
          <ChevronDownIcon className="w-3 h-3 shrink-0 text-foreground-muted" />
        </span>
      </button>

      {open &&
        pos &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            id={listboxId}
            role="listbox"
            aria-label={ariaLabel}
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              minWidth: pos.minWidth,
            }}
            className="z-50 max-h-64 overflow-auto border border-border bg-white/70 backdrop-blur-md text-[12px] shadow-lg scrollbar-none"
          >
            {options.map((o, i) => (
              <div
                key={o.value}
                id={`${listboxId}-opt-${i}`}
                role="option"
                aria-selected={o.value === value}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => choose(o.value)}
                className={
                  "px-2 py-1 cursor-pointer whitespace-nowrap " +
                  (i === activeIndex
                    ? "bg-foreground-selected text-background"
                    : "text-foreground")
                }
              >
                {o.label}
              </div>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}
