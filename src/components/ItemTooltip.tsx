import React from 'react';
import { createPortal } from 'react-dom';
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { describeEquipment, describeInventoryItem, describeSpell } from '../data/itemDetails';
import type { EquipSlot } from '../engine/types';

type TooltipProps = (
  | { kind: 'equipment'; name: string; slot: EquipSlot }
  | { kind: 'inventory'; name: string; quantity: number }
  | { kind: 'spell'; name: string; level: number }
) & { children?: React.ReactNode };

/**
 * Closes whichever tooltip is currently open when another opens.
 *
 * Dismissal cannot rest on focus alone. WebKit does not focus a button when it is tapped, so the
 * blur that closes the previous tooltip never arrives there and taps accumulate visible tooltips.
 * A single shared closer is the smallest thing that makes "one at a time" true in every browser
 * rather than only in the ones that focus on click.
 */
let openTooltip: React.RefObject<(() => void) | null> | null = null;

export const ItemTooltip: React.FC<TooltipProps> = (props) => {
  const tooltipId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const closeTimerRef = useRef<number>(undefined);
  const openAtPressRef = useRef(false);
  const hideRef = useRef<(() => void) | null>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ left: 8, top: 8 });
  const details = props.kind === 'equipment'
    ? describeEquipment(props.name, props.slot)
    : props.kind === 'spell'
      ? describeSpell(props.name, props.level)
      : describeInventoryItem(props.name, props.quantity);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current || !tooltipRef.current) return;

    const updatePosition = () => {
      const trigger = triggerRef.current?.getBoundingClientRect();
      const tooltip = tooltipRef.current?.getBoundingClientRect();
      if (!trigger || !tooltip) return;

      const gap = 8;
      const left = Math.min(Math.max(gap, trigger.left), window.innerWidth - tooltip.width - gap);
      const above = trigger.top - tooltip.height - gap;
      const top = above >= gap ? above : Math.min(window.innerHeight - tooltip.height - gap, trigger.bottom + gap);
      setPosition({ left, top: Math.max(gap, top) });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const dismiss = (event: KeyboardEvent) => {
      if (event.key === 'Escape') hide();
    };
    document.addEventListener('keydown', dismiss);
    return () => document.removeEventListener('keydown', dismiss);
  }, [open]);

  useEffect(() => () => window.clearTimeout(closeTimerRef.current), []);

  const hide = () => {
    if (openTooltip === hideRef) openTooltip = null;
    setOpen(false);
  };
  // Registered by ref rather than by function: `hide` is a new identity every render, so
  // comparing the functions themselves would stop recognising this tooltip as the open one the
  // first time anything re-renders it. The ref object outlives every render this component has.
  hideRef.current = hide;

  const show = () => {
    window.clearTimeout(closeTimerRef.current);
    if (openTooltip && openTooltip !== hideRef) openTooltip.current?.();
    openTooltip = hideRef;
    setOpen(true);
  };
  const scheduleHide = () => {
    closeTimerRef.current = window.setTimeout(hide, 100);
  };
  const showFromHover = (event: React.PointerEvent) => {
    if (event.pointerType === 'mouse') show();
  };
  const hideFromHover = (event: React.PointerEvent) => {
    if (event.pointerType === 'mouse') scheduleHide();
  };
  const toggleFromPointer = (event: React.MouseEvent) => {
    if (event.detail > 0) setOpen(!openAtPressRef.current);
  };
  const toggleFromKeyboard = (event: React.KeyboardEvent) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    setOpen((current) => !current);
  };

  const tooltip = open ? createPortal(
    <span
      className="item-tooltip item-tooltip-visible"
      id={tooltipId}
      ref={tooltipRef}
      role="tooltip"
      style={{ left: position.left, top: position.top }}
      onPointerEnter={showFromHover}
      onPointerLeave={hideFromHover}
    >
      <strong>{props.name || 'Empty slot'}</strong>
      <span>{details.description}</span>
      <span className="tooltip-effect">{details.effect}</span>
    </span>,
    document.body,
  ) : null;

  return (
    <>
      <button
      type="button"
      className="tooltip-trigger"
      ref={triggerRef}
      aria-controls={open ? tooltipId : undefined}
      aria-describedby={open ? tooltipId : undefined}
      aria-expanded={open}
      title={details.description}
      onPointerEnter={showFromHover}
      onPointerLeave={hideFromHover}
      onFocus={show}
      onBlur={hide}
      onPointerDown={() => { openAtPressRef.current = open; }}
      onClick={toggleFromPointer}
      onKeyDown={toggleFromKeyboard}
    >
      <span className="tooltip-trigger-label">{props.children ?? props.name}</span>
      </button>
      {tooltip}
    </>
  );
};
