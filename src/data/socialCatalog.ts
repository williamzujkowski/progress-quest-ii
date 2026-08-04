export type SocialSeat = 'official' | 'logistics' | 'field' | 'support';

export interface SocialPersona {
  readonly id: string;
  readonly displayName: string;
  readonly seat: SocialSeat;
  readonly role: string;
  readonly temperament: string;
  readonly competence: string;
  readonly preoccupation: string;
  readonly voice: {
    readonly register: string;
    readonly maxWords: number;
  };
}

// Project-original cast. Each operational seat has two stable alternatives so a
// hero gets a recurring ensemble without adding mutable social state.
export const SOCIAL_PERSONAS: readonly SocialPersona[] = [
  { id: 'sable-quoin', displayName: 'Sable Quoin', seat: 'official', role: 'Guild registrar', temperament: 'officious', competence: 'procedurally exact', preoccupation: 'attendance', voice: { register: 'formal filing note', maxWords: 30 } },
  { id: 'nix-revision', displayName: 'Nix Revision', seat: 'official', role: 'Quest clerk', temperament: 'earnest', competence: 'improvisational', preoccupation: 'quest scope', voice: { register: 'helpful procedural aside', maxWords: 30 } },
  { id: 'brin-parcel', displayName: 'Brin Parcel', seat: 'logistics', role: 'Quartermaster', temperament: 'suspicious', competence: 'field practical', preoccupation: 'loot provenance', voice: { register: 'dry inventory verdict', maxWords: 30 } },
  { id: 'pell-due', displayName: 'Pell Due', seat: 'logistics', role: 'Market broker', temperament: 'suspicious', competence: 'procedurally exact', preoccupation: 'prices', voice: { register: 'skeptical market brief', maxWords: 30 } },
  { id: 'odo-margin', displayName: 'Odo Margin', seat: 'field', role: 'Raid coordinator', temperament: 'overprepared', competence: 'adequately certified', preoccupation: 'quorum', voice: { register: 'compressed readiness order', maxWords: 30 } },
  { id: 'fen-already', displayName: 'Fen Already', seat: 'field', role: 'Scout', temperament: 'optimistic', competence: 'field practical', preoccupation: 'routes', voice: { register: 'confident route report', maxWords: 30 } },
  { id: 'mira-triage', displayName: 'Mira Triage', seat: 'support', role: 'Healer auditor', temperament: 'fatalistic', competence: 'accidentally efficient', preoccupation: 'morale forms', voice: { register: 'clinical morale audit', maxWords: 30 } },
  { id: 'tamsin-brace', displayName: 'Tamsin Brace', seat: 'support', role: 'Tank liaison', temperament: 'fatalistic', competence: 'adequately certified', preoccupation: 'blame allocation', voice: { register: 'stoic liability note', maxWords: 30 } },
] as const;
