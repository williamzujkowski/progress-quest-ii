import React from 'react';
import { describeGameNumber, formatGameNumber } from '../engine/text';

export const GameNumber: React.FC<{ value: number }> = ({ value }) => {
  const display = formatGameNumber(value);
  const spoken = describeGameNumber(value);
  if (display === spoken) return <span className="game-number">{display}</span>;
  return (
    <span className="game-number" title={`${spoken}. Ordinary notation has been retired for administrative reasons.`}>
      <span aria-hidden="true">{display}</span>
      <span className="sr-only">{spoken}</span>
    </span>
  );
};

export const ActLabel: React.FC<{ act: number }> = ({ act }) => act === 0
  ? <>Prologue</>
  : <>Act{' '}<GameNumber value={act} /></>;
