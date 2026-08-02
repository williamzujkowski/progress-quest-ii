import React from 'react';
import { useId } from 'react';
import { describeEquipment, describeInventoryItem, describeSpell } from '../data/itemDetails';
import type { EquipSlot } from '../engine/types';

type TooltipProps =
  | { kind: 'equipment'; name: string; slot: EquipSlot }
  | { kind: 'inventory'; name: string; quantity: number }
  | { kind: 'spell'; name: string; level: number };

export const ItemTooltip: React.FC<TooltipProps> = (props) => {
  const tooltipId = useId();
  const details = props.kind === 'equipment'
    ? describeEquipment(props.name, props.slot)
    : props.kind === 'spell'
      ? describeSpell(props.name, props.level)
      : describeInventoryItem(props.name, props.quantity);

  return (
    <span className="tooltip-trigger" tabIndex={0} aria-describedby={tooltipId} title={details.description}>
      {props.name}
      <span className="item-tooltip" id={tooltipId} role="tooltip">
        <strong>{props.name || 'Empty slot'}</strong>
        <span>{details.description}</span>
        <span className="tooltip-effect">{details.effect}</span>
      </span>
    </span>
  );
};
