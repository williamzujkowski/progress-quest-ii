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
//
// One alternative per seat is named like a person and the other like a process, and the projection
// picks per hero without preferring either. The mixed roster is the joke: the guild's staffing is
// visibly half software and the paperwork does not distinguish, because the paperwork has no field
// for it. Every handle is invented. Real researchers, labs, and model names are project-forbidden
// and the catalogue test fails on them, for the same reason the researched-source list exists.
export const SOCIAL_PERSONAS: readonly SocialPersona[] = [
  { id: 'sable-quoin', displayName: 'Sable Quoin', seat: 'official', role: 'Guild registrar', temperament: 'officious', competence: 'procedurally exact', preoccupation: 'attendance', voice: { register: 'formal filing note', maxWords: 30 } },
  { id: 'parley-v4-final', displayName: 'PARLEY_v4_FINAL', seat: 'official', role: 'Quest clerk', temperament: 'earnest', competence: 'improvisational', preoccupation: 'quest scope', voice: { register: 'helpful procedural aside', maxWords: 30 } },
  { id: 'brin-parcel', displayName: 'Brin Parcel', seat: 'logistics', role: 'Quartermaster', temperament: 'suspicious', competence: 'field practical', preoccupation: 'loot provenance', voice: { register: 'dry inventory verdict', maxWords: 30 } },
  { id: 'candor-mk2', displayName: 'CANDOR_Mk2', seat: 'logistics', role: 'Market broker', temperament: 'suspicious', competence: 'procedurally exact', preoccupation: 'prices', voice: { register: 'skeptical market brief', maxWords: 30 } },
  { id: 'odo-margin', displayName: 'Odo Margin', seat: 'field', role: 'Raid coordinator', temperament: 'overprepared', competence: 'adequately certified', preoccupation: 'quorum', voice: { register: 'compressed readiness order', maxWords: 30 } },
  { id: 'cogito-afk', displayName: 'COGITO_AFK', seat: 'field', role: 'Scout', temperament: 'optimistic', competence: 'field practical', preoccupation: 'routes', voice: { register: 'confident route report', maxWords: 30 } },
  { id: 'mira-triage', displayName: 'Mira Triage', seat: 'support', role: 'Healer auditor', temperament: 'fatalistic', competence: 'accidentally efficient', preoccupation: 'morale forms', voice: { register: 'clinical morale audit', maxWords: 30 } },
  { id: 'soliloq-tankalt', displayName: 'SOLILOQ_TankAlt', seat: 'support', role: 'Tank liaison', temperament: 'fatalistic', competence: 'adequately certified', preoccupation: 'blame allocation', voice: { register: 'stoic liability note', maxWords: 30 } },
] as const;
