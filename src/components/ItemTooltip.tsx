import React from 'react';
import { createPortal } from 'react-dom';
import { useId, useLayoutEffect, useRef, useState } from 'react';
import { describeEquipment, describeInventoryItem, describeSpell } from '../data/itemDetails';
import type { EquipSlot } from '../engine/types';

type TooltipProps =
  | { kind: 'equipment'; name: string; slot: EquipSlot }
  | { kind: 'inventory'; name: string; quantity: number }
  | { kind: 'spell'; name: string; level: number };

export const ItemTooltip: React.FC<TooltipProps> = (props) => {
  const tooltipId = useId();
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);
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

  const tooltip = open ? createPortal(
    <span
      className="item-tooltip item-tooltip-visible"
      id={tooltipId}
      ref={tooltipRef}
      role="tooltip"
      style={{ left: position.left, top: position.top }}
    >
      <strong>{props.name || 'Empty slot'}</strong>
      <span>{details.description}</span>
      <span className="tooltip-effect">{details.effect}</span>
    </span>,
    document.body,
  ) : null;

  return (
    <>
      <span
      className="tooltip-trigger"
      ref={triggerRef}
      tabIndex={0}
      aria-describedby={open ? tooltipId : undefined}
      title={details.description}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {props.name}
      </span>
      {tooltip}
    </>
  );
};
