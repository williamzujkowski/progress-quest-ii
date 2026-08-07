import { SOCIAL_PERSONAS, type SocialPersona, type SocialSeat } from '../data/socialCatalog';
import { boundCodePoints, MAX_TEXT_CODE_POINTS, formatGameNumber, stableIndex, stableChoice } from '../engine/text';
import { projectWorld, type IdentifiedGameTransitionRecord } from './worldContext';

export type SocialChannel = 'guild' | 'world' | 'party' | 'raid' | 'whisper' | 'system' | 'hero';
export type SocialSceneKind = 'level' | 'quest' | 'equipment' | 'loot' | 'market' | 'zone' | 'milestone' | 'catch_up';

export interface SocialSpeaker {
  readonly id: string;
  readonly kind: 'cast' | 'hero' | 'system';
  readonly displayName: string;
  readonly role: string;
  readonly fictional: true;
  readonly automaticHero: boolean;
}

export interface SocialEntry {
  readonly id: string;
  readonly sceneId: string;
  readonly sceneKind: SocialSceneKind;
  readonly sourceActivityId: number;
  readonly channel: SocialChannel;
  readonly speaker: SocialSpeaker;
  readonly text: string;
}

interface SceneCandidate {
  readonly kind: Exclude<SocialSceneKind, 'catch_up'>;
  readonly priority: number;
  readonly source: IdentifiedGameTransitionRecord;
}

interface SceneLine {
  readonly speaker: SocialSeat | 'hero' | 'system';
  readonly channel: SocialChannel;
  readonly text: string;
}

const MAX_DETAILED_SCENES = 3;

const HERO_SPEAKER: SocialSpeaker = {
  id: 'hero', kind: 'hero', displayName: 'Hero', role: 'Automatic hero reply', fictional: true, automaticHero: true,
};
const SYSTEM_SPEAKER: SocialSpeaker = {
  id: 'simulated-system', kind: 'system', displayName: 'System', role: 'Fictional system notice', fictional: true, automaticHero: false,
};

const bound = (text: string): string => boundCodePoints(text, MAX_TEXT_CODE_POINTS);

function castFor(source: IdentifiedGameTransitionRecord): Readonly<Record<SocialSeat, SocialPersona>> {
  const { hero } = source.record.post;
  const heroKey = `${hero.name}:${hero.race}:${hero.className}`;
  const choosePersona = (seat: SocialSeat): SocialPersona => {
    const options = SOCIAL_PERSONAS.filter((persona) => persona.seat === seat);
    // stableChoice rather than stableIndex: with two options per seat the latter decides on the
    // parity of the key's character sum, so all four seats resolved together and every hero drew
    // one of two fixed troupes instead of one of sixteen combinations.
    const persona = options[stableChoice(`${heroKey}:${seat}`, options.length)];
    if (!persona) throw new Error(`Social catalog has no persona for the ${seat} seat`);
    return persona;
  };
  return {
    official: choosePersona('official'),
    logistics: choosePersona('logistics'),
    field: choosePersona('field'),
    support: choosePersona('support'),
  };
}

function speakerFor(line: SceneLine, cast: Readonly<Record<SocialSeat, SocialPersona>>): SocialSpeaker {
  if (line.speaker === 'hero') return HERO_SPEAKER;
  if (line.speaker === 'system') return SYSTEM_SPEAKER;
  const persona = cast[line.speaker];
  return {
    id: persona.id,
    kind: 'cast',
    displayName: persona.displayName,
    role: persona.role,
    fictional: true,
    automaticHero: false,
  };
}

function candidateFor(source: IdentifiedGameTransitionRecord): SceneCandidate | undefined {
  const { event, post } = source.record;
  if (event.type === 'task_started' && event.task.type === 'cinematic' && post.interplotRole === 'nemesis') return { kind: 'milestone', priority: 100, source };
  if (event.type === 'act_completed') return { kind: 'milestone', priority: 95, source };
  if (event.type === 'level_gained') return { kind: 'level', priority: 90, source };
  if (event.type === 'quest_completed' || event.type === 'quest_started') return { kind: 'quest', priority: event.type === 'quest_completed' ? 85 : 80, source };
  if (event.type === 'equipment_purchased' || event.type === 'equipment_gained') return { kind: 'equipment', priority: event.type === 'equipment_purchased' ? 75 : 70, source };
  if (event.type === 'item_gained') return { kind: 'loot', priority: 65, source };
  if (event.type === 'inventory_sold') return { kind: 'market', priority: 60, source };
  if (event.type === 'task_started') {
    const isBoundary = event.task.type === 'heading_to_market'
      || (event.task.type === 'selling' && post.completedTask === 'heading_to_market')
      || (event.task.type === 'heading' && (post.completedTask === 'selling' || post.completedTask === 'buying'))
      || (event.task.type === 'kill' && post.completedTask === 'heading');
    if (isBoundary) return { kind: 'zone', priority: 50, source };
  }
  return undefined;
}

function splitTaskEnvelopes(sources: readonly IdentifiedGameTransitionRecord[]): IdentifiedGameTransitionRecord[][] {
  const envelopes: IdentifiedGameTransitionRecord[][] = [];
  let pending: IdentifiedGameTransitionRecord[] = [];
  let completedTasks = sources[0]?.record.post.completedTasks;
  for (const source of sources) {
    if (pending.length > 0 && source.record.post.completedTasks !== completedTasks) {
      envelopes.push(pending);
      pending = [];
    }
    completedTasks = source.record.post.completedTasks;
    pending.push(source);
    if (source.record.event.type === 'task_started') {
      envelopes.push(pending);
      pending = [];
      completedTasks = undefined;
    }
  }
  if (pending.length > 0) envelopes.push(pending);
  return envelopes;
}

function chooseCandidate(envelope: readonly IdentifiedGameTransitionRecord[]): SceneCandidate | undefined {
  return envelope.reduce<SceneCandidate | undefined>((selected, source) => {
    const candidate = candidateFor(source);
    if (!candidate) return selected;
    if (!selected || candidate.priority > selected.priority) return candidate;
    if (candidate.priority === selected.priority && candidate.source.activityId > selected.source.activityId) return candidate;
    return selected;
  }, undefined);
}

function variant(values: readonly [readonly SceneLine[], ...Array<readonly SceneLine[]>], candidate: SceneCandidate): readonly SceneLine[] {
  const { hero, completedTasks } = candidate.source.record.post;
  const selected = values[stableIndex(`${hero.name}:${hero.race}:${hero.className}:${candidate.kind}:${candidate.source.activityId}:${completedTasks}`, values.length)];
  if (selected === undefined) throw new Error('Social scene requires at least one reviewed variant');
  return selected;
}

function linesFor(candidate: SceneCandidate): readonly SceneLine[] {
  const { event, post } = candidate.source.record;
  const world = projectWorld({ kind: 'transition', source: candidate.source });
  if (candidate.kind === 'level' && event.type === 'level_gained') {
    return variant([
      [
        { speaker: 'official', channel: 'guild', text: `Promotion to level ${formatGameNumber(event.level)} has entered the ledger. Congratulations are now procedurally valid.` },
        { speaker: 'support', channel: 'guild', text: 'Morale has been adjusted upward by the minimum reportable amount.' },
        { speaker: 'hero', channel: 'hero', text: 'I accept the increased responsibility in its most decorative sense.' },
      ],
      [
        { speaker: 'official', channel: 'guild', text: `Level ${formatGameNumber(event.level)} is official, subject to the usual absence of witnesses.` },
        { speaker: 'support', channel: 'guild', text: 'The promotion survived review because nobody opened the attachment.' },
        { speaker: 'hero', channel: 'hero', text: 'Please forward my authority to someone less available.' },
      ],
      [
        { speaker: 'official', channel: 'world', text: `The hero is now level ${formatGameNumber(event.level)}. Seniority has outpaced supervision again.` },
        { speaker: 'support', channel: 'world', text: 'I have certified the emotional consequences as somebody else’s department.' },
        { speaker: 'hero', channel: 'hero', text: 'At last, a larger number with the same management structure.' },
      ],
    ] as const, candidate);
  }
  if (candidate.kind === 'quest' && (event.type === 'quest_started' || event.type === 'quest_completed')) {
    const scope = world.context.assignmentScope ?? 'local';
    const status = event.type === 'quest_completed' ? 'completed' : 'approved';
    return variant([
      [
        { speaker: 'official', channel: 'whisper', text: `A ${scope} assignment has been ${status}. Its objectives remain somebody else’s handwriting.` },
        { speaker: 'field', channel: 'party', text: 'Route confidence is high because the route has declined to comment.' },
        { speaker: 'hero', channel: 'hero', text: 'Acknowledged by the only participant contractually available.' },
      ],
      [
        { speaker: 'official', channel: 'guild', text: `Quest paperwork says ${scope} and ${status}. Adventure has been notified.` },
        { speaker: 'field', channel: 'party', text: 'I have marked every uncertain direction as scenic.' },
        { speaker: 'hero', channel: 'hero', text: 'Proceed until the objective becomes retrospectively obvious.' },
      ],
      [
        { speaker: 'official', channel: 'whisper', text: `The ${scope} brief is ${status}; interpretation remains an unpaid specialization.` },
        { speaker: 'field', channel: 'party', text: 'The map agrees in principle and objects to specifics.' },
        { speaker: 'hero', channel: 'hero', text: 'Excellent. Ambiguity is lighter than provisions.' },
      ],
    ] as const, candidate);
  }
  if (candidate.kind === 'equipment' && (event.type === 'equipment_gained' || event.type === 'equipment_purchased')) {
    const filing = world.equipment?.label ?? 'serviceable';
    const source = event.type === 'equipment_purchased' ? 'purchase' : 'receipt';
    return variant([
      [
        { speaker: 'logistics', channel: 'guild', text: `${filing} equipment ${source} confirmed. Provenance is now somebody else’s problem.` },
        { speaker: 'support', channel: 'guild', text: 'Combat contribution remains none; confidence contribution has been overfunded.' },
        { speaker: 'hero', channel: 'hero', text: 'I accept it in my capacity as everyone present.' },
      ],
      [
        { speaker: 'logistics', channel: 'party', text: `${filing} equipment entered by ${source}. Eligibility was unanimous among the absent.` },
        { speaker: 'support', channel: 'party', text: 'No combat effect is modeled, which greatly simplifies the warranty.' },
        { speaker: 'hero', channel: 'hero', text: 'Equip the paperwork somewhere load-bearing.' },
      ],
      [
        { speaker: 'logistics', channel: 'guild', text: `${source} filed as ${filing}. The item has declined further examination.` },
        { speaker: 'support', channel: 'guild', text: 'Its tactical effect is none, presented with unusual confidence.' },
        { speaker: 'hero', channel: 'hero', text: 'Then it perfectly matches our strategic doctrine.' },
      ],
    ] as const, candidate);
  }
  if (candidate.kind === 'loot' && event.type === 'item_gained') {
    return variant([
      [
        { speaker: 'logistics', channel: 'guild', text: `${formatGameNumber(event.quantity)} inventory unit${event.quantity === 1 ? '' : 's'} received. Source remains professionally unspecified.` },
        { speaker: 'support', channel: 'guild', text: 'No rarity, competition, or combat value has been inferred from the receipt.' },
        { speaker: 'hero', channel: 'hero', text: 'File it under possessions acquired without conversational consent.' },
      ],
      [
        { speaker: 'logistics', channel: 'party', text: `Receipt confirmed for ${formatGameNumber(event.quantity)} inventory unit${event.quantity === 1 ? '' : 's'}. Provenance has taken personal leave.` },
        { speaker: 'support', channel: 'party', text: 'The carrying burden is real; all heroic interpretation remains optional.' },
        { speaker: 'hero', channel: 'hero', text: 'Retain first. Develop standards during the next fiscal dungeon.' },
      ],
      [
        { speaker: 'logistics', channel: 'guild', text: `${formatGameNumber(event.quantity)} inventory unit${event.quantity === 1 ? '' : 's'} entered the manifest without making eye contact.` },
        { speaker: 'support', channel: 'guild', text: 'Acquisition is confirmed. Glory has not submitted supporting evidence.' },
        { speaker: 'hero', channel: 'hero', text: 'Then the paperwork and I are equally equipped.' },
      ],
      [
        { speaker: 'logistics', channel: 'party', text: `Intake of ${formatGameNumber(event.quantity)} unit${event.quantity === 1 ? '' : 's'} logged. The previous owner has not been located and is not being sought.` },
        { speaker: 'support', channel: 'party', text: 'Sentimental value has been assessed at the usual figure.' },
        { speaker: 'hero', channel: 'hero', text: 'Record it as found, which is nearly true.' },
      ],
      [
        { speaker: 'logistics', channel: 'guild', text: `Manifest amended by ${formatGameNumber(event.quantity)}. The amendment is longer than the item.` },
        { speaker: 'support', channel: 'guild', text: 'Storage has been notified and has responded with a form.' },
        { speaker: 'hero', channel: 'hero', text: 'I shall carry it until carrying it becomes the story.' },
      ],
      [
        { speaker: 'logistics', channel: 'guild', text: `${formatGameNumber(event.quantity)} unit${event.quantity === 1 ? '' : 's'} accessioned. The catalogue has been asked to make room and has declined.` },
        { speaker: 'support', channel: 'guild', text: 'No ceremony is scheduled. None was requested.' },
        { speaker: 'hero', channel: 'hero', text: 'Good. Ceremony weighs the same as everything else.' },
      ],
    ] as const, candidate);
  }
  if (candidate.kind === 'market' && event.type === 'inventory_sold') {
    const sale = post.marketSale;
    const facts = sale ? `${formatGameNumber(sale.quantity)} units became ${formatGameNumber(sale.gold)} gold` : `${formatGameNumber(event.gold)} gold was received`;
    return variant([
      [
        { speaker: 'logistics', channel: 'world', text: `${facts}. The market has declined to explain itself.` },
        { speaker: 'support', channel: 'world', text: 'The disposal receipt is emotionally complete and legally decorative.' },
        { speaker: 'hero', channel: 'hero', text: 'Classify the empty carrying capacity as a strategic gain.' },
      ],
      [
        { speaker: 'logistics', channel: 'guild', text: `${facts}; valuation was performed by a hat near the counter.` },
        { speaker: 'support', channel: 'guild', text: 'I find the transaction fiscally plausible and spiritually damp.' },
        { speaker: 'hero', channel: 'hero', text: 'Record my bargaining posture as stationary.' },
      ],
      [
        { speaker: 'logistics', channel: 'world', text: `${facts}. Commerce continues despite the evidence.` },
        { speaker: 'support', channel: 'world', text: 'Vendor confidence rose sharply after we stopped asking questions.' },
        { speaker: 'hero', channel: 'hero', text: 'A triumph for inventory reduction and selective arithmetic.' },
      ],
    ] as const, candidate);
  }
  if (candidate.kind === 'zone' && event.type === 'task_started') {
    if (world.context.venue === 'road') {
      return variant([
        [
          { speaker: 'field', channel: 'party', text: `Route opened through ${world.context.spokenLocation}. Direction is now officially forward.` },
          { speaker: 'logistics', channel: 'party', text: 'The travel manifest has recognized motion and withdrawn its objection.' },
          { speaker: 'hero', channel: 'hero', text: 'Proceed until the road becomes somebody else’s jurisdiction.' },
        ],
        [
          { speaker: 'field', channel: 'party', text: `Travel now proceeds along ${world.context.spokenLocation}, with confidence traveling separately.` },
          { speaker: 'logistics', channel: 'party', text: 'Departure was approved shortly after it became irreversible.' },
          { speaker: 'hero', channel: 'hero', text: 'Keep the horizon occupied while I supervise the distance.' },
        ],
        [
          { speaker: 'field', channel: 'guild', text: `Road assignment confirmed: ${world.context.spokenLocation}. The map appears cautiously involved.` },
          { speaker: 'logistics', channel: 'guild', text: 'Travel expenses remain zero and therefore beyond audit.' },
          { speaker: 'hero', channel: 'hero', text: 'Declare the detour intentional and resume competence.' },
        ],
        [
          { speaker: 'field', channel: 'party', text: `${world.context.spokenLocation} has been entered on the strength of a previous assurance.` },
          { speaker: 'logistics', channel: 'party', text: 'The assurance was verbal and is no longer available for comment.' },
          { speaker: 'hero', channel: 'hero', text: 'Then we are making excellent unverified progress.' },
        ],
        [
          { speaker: 'field', channel: 'guild', text: `Passage through ${world.context.spokenLocation} is under way and has not been contested.` },
          { speaker: 'logistics', channel: 'guild', text: 'Nobody is positioned to contest it, which the file records as agreement.' },
          { speaker: 'hero', channel: 'hero', text: 'Unanimity is easier with a smaller quorum.' },
        ],
      ] as const, candidate);
    }
    return variant([
      [
        { speaker: 'field', channel: 'party', text: `Scouting confirms ${world.context.spokenLocation} is where we have just arrived.` },
        { speaker: 'logistics', channel: 'party', text: 'The route manifest predicted this after being corrected.' },
        { speaker: 'hero', channel: 'hero', text: 'Continue discovering it immediately behind me.' },
      ],
      [
        { speaker: 'field', channel: 'party', text: `We have reached ${world.context.spokenLocation}, according to the sign facing the other way.` },
        { speaker: 'logistics', channel: 'party', text: 'Travel expenses remain zero and therefore beyond audit.' },
        { speaker: 'hero', channel: 'hero', text: 'Declare the detour intentional and resume competence.' },
      ],
      [
        { speaker: 'field', channel: 'guild', text: `${world.context.spokenLocation} located. It was under Location in the index.` },
        { speaker: 'logistics', channel: 'guild', text: 'Arrival has been backdated to the moment it became undeniable.' },
        { speaker: 'hero', channel: 'hero', text: 'Splendid. Begin being expected here.' },
      ],
    ] as const, candidate);
  }
  const raid = post.interplotRole === 'nemesis' && post.act >= 10;
  const milestone = event.type === 'act_completed'
    ? `Act ${formatGameNumber(event.act)} has closed`
    : `${raid ? 'A raid-class' : 'A dungeon'} boss milestone has opened`;
  return variant([
    [
      { speaker: 'field', channel: raid ? 'raid' : 'party', text: `${milestone}. Quorum is zero external attendees.` },
      { speaker: 'support', channel: raid ? 'raid' : 'party', text: 'No party, wipe, lockout, or combat reward was created.' },
      { speaker: 'hero', channel: 'hero', text: 'I volunteer to be both ready check and exception.' },
    ],
    [
      { speaker: 'field', channel: raid ? 'raid' : 'world', text: `${milestone}; attendance remains impressively theoretical.` },
      { speaker: 'support', channel: raid ? 'raid' : 'world', text: 'The danger is narrative and the liability is tastefully unsigned.' },
      { speaker: 'hero', channel: 'hero', text: 'Commence the ceremony of appearing prepared.' },
    ],
    [
      { speaker: 'field', channel: raid ? 'raid' : 'party', text: `${milestone}. Formation is one person wide and indefinitely deep.` },
      { speaker: 'support', channel: raid ? 'raid' : 'party', text: 'Mechanics remain unchanged; apprehension has received the expansion pack.' },
      { speaker: 'hero', channel: 'hero', text: 'Mark me present, inevitable, and poorly supervised.' },
    ],
  ] as const, candidate);
}

function projectScene(candidate: SceneCandidate): readonly SocialEntry[] {
  const cast = castFor(candidate.source);
  const sceneId = `social:${candidate.source.activityId}:${candidate.kind}`;
  return linesFor(candidate).map((line, index) => ({
    id: `${sceneId}:${index}`,
    sceneId,
    sceneKind: candidate.kind,
    sourceActivityId: candidate.source.activityId,
    channel: line.channel,
    speaker: speakerFor(line, cast),
    text: bound(line.text),
  }));
}

export function projectSocialBatch(sources: readonly IdentifiedGameTransitionRecord[]): readonly SocialEntry[] {
  const scenes = splitTaskEnvelopes(sources).map(chooseCandidate).filter((candidate): candidate is SceneCandidate => candidate !== undefined);
  const retained = scenes.slice(-MAX_DETAILED_SCENES);
  const detailed = retained.flatMap(projectScene);
  const suppressed = scenes.length - retained.length;
  if (suppressed === 0 || retained.length === 0) return detailed;
  const first = retained[0] as SceneCandidate;
  const sceneId = `social:${first.source.activityId}:catch-up`;
  return [{
    id: `${sceneId}:0`,
    sceneId,
    sceneKind: 'catch_up',
    sourceActivityId: first.source.activityId,
    channel: 'system',
    speaker: SYSTEM_SPEAKER,
    text: `${suppressed} routine social scene${suppressed === 1 ? ' was' : 's were'} consolidated during accelerated progress.`,
  }, ...detailed];
}
