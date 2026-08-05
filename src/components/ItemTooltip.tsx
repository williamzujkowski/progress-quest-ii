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

export const ItemTooltip: React.FC<TooltipProps> = (props) => {
  const tooltipId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const closeTimerRef = useRef<number>(undefined);
  const openAtPressRef = useRef(false);
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
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', dismiss);
    return () => document.removeEventListener('keydown', dismiss);
  }, [open]);

  useEffect(() => () => window.clearTimeout(closeTimerRef.current), []);

  const show = () => {
    window.clearTimeout(closeTimerRef.current);
    setOpen(true);
  };
  const scheduleHide = () => {
    closeTimerRef.current = window.setTimeout(() => setOpen(false), 100);
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
      onBlur={() => setOpen(false)}
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
