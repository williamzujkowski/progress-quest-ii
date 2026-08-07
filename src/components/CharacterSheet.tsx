import {
  Bandage, Footprints, Grab, Hand, HardHat, PersonStanding, Ruler, Shield, Shirt, Sparkles, Sword, Watch,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import React from 'react';
import { EQUIP_SLOTS } from '../data/traits';
import type { EquipSlot } from '../engine/types';

/**
 * A glyph per slot, because the words did not fit.
 *
 * This column is ~145px at the desktop breakpoint, and the slot name was taking 34-43px of it —
 * enough that every one of the eleven labels clipped, "Helm" included, while the item name got the
 * remainder and clipped too. The names are the joke, so the label is what gives way.
 *
 * The glyphs are distinguishable rather than illustrative, and only some are literal: a hard hat
 * for the helm and a wristwatch for the vambraces suit the register better than heraldry would,
 * and no icon set has a brassairt. They identify a row; the slot name still reaches assistive
 * technology through the adjacent sr-only text, and sighted readers get it from the title.
 */
const SLOT_ICONS: Record<EquipSlot, LucideIcon> = {
  Weapon: Sword,
  Shield,
  Helm: HardHat,
  Hauberk: Shirt,
  Brassairts: Grab,
  Vambraces: Watch,
  Gauntlets: Hand,
  Gambeson: Bandage,
  Cuisses: PersonStanding,
  Greaves: Ruler,
  Sollerets: Footprints,
};
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '../state/gameStore';
import { GameNumber } from './GameNumber';
import { ItemTooltip } from './ItemTooltip';
import { Commendations } from './Commendations';
import { Caseload } from './Caseload';
import { isEmpty as caseloadIsEmpty } from '../state/caseload';
import { isEmpty as commendationsIsEmpty } from '../state/commendations';

export const CharacterSheetView: React.FC = () => {
  // Equip and Spells changed identity 3 times across a measured 400 ticks; the character
  // reference changed 400 times, because Task advances every tick.
  const { Equip, Spells } = useGameStore(useShallow((state) => ({
    Equip: state.character.Equip,
    Spells: state.character.Spells,
  })));
  const character = { Equip, Spells };
  // The disclosure follows the same rule its contents do: absent until there is something to
  // file. An empty "Records" heading is a promise of nothing, and takes up the vertical room the
  // one-screen desktop layout is measured against.
  const hasRecords = useGameStore(
    (state) => !commendationsIsEmpty(state.commendations) || !caseloadIsEmpty(state.caseload),
  );

  return (
    <section className="card character-card" aria-labelledby="loadout-heading" tabIndex={0}>
      <div className="card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Shield size={18} />
          <h2 id="loadout-heading">Character Loadout</h2>
        </div>
      </div>

      <div className="section-label">
        <Shield size={14} /> Equipment Slots
      </div>
      <div className="equip-list equipment-list" role="region" tabIndex={0} aria-label="Equipment List">
        {EQUIP_SLOTS.map((slot: EquipSlot) => {
          const equipName = character.Equip[slot] || '—';
          return (
            <div className="equip-item" key={slot}>
              <span className="equip-slot-icon" title={slot}>
                {React.createElement(SLOT_ICONS[slot], { size: 13, 'aria-hidden': true })}
                <span className="sr-only">{slot}</span>
              </span>
              <ItemTooltip kind="equipment" name={equipName} slot={slot} />
            </div>
          );
        })}
      </div>

      <div className="section-label">
        <Sparkles size={14} /> Spell Book ({character.Spells.length})
      </div>
      <div className="equip-list spell-list" role="region" tabIndex={0} aria-label="Spell Book">
        {character.Spells.length === 0 ? (
          <div className="empty-state">
            No spells have been learned. They arrive automatically at level-up and may also be awarded for completed quests; the curriculum remains aggressively theoretical.
          </div>
        ) : (
          character.Spells.map((spell) => (
            <div className="equip-item" key={spell.name}>
              <ItemTooltip kind="spell" name={spell.name} level={spell.level} />
              <span className="badge">Lvl{' '}<GameNumber value={spell.level} /></span>
            </div>
          ))
        )}
      </div>

      {/*
        Records fold away by default. They change on a level, a sale, or a closed quest — not on
        the tick — while everything above them moves constantly, and on a phone they were three
        stacked sections standing between the loadout and the rest of the page.

        A native disclosure rather than tabs, a drawer, or a separate screen. It is keyboard
        operable and announced without a line of ARIA, it cannot strand anyone away from the live
        numbers the way a route could, and each future record type becomes one more block in here
        rather than one more panel to place.
      */}
      {hasRecords && (
        <details className="records-details">
          <summary>Records</summary>
          <Commendations />
          <Caseload />
        </details>
      )}
    </section>
  );
};
