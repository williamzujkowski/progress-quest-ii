import React, { useId, useLayoutEffect, useRef, useState } from 'react';
import { useGameStore } from '../state/gameStore';
import type { SocialChannel } from '../state/socialProjection';

type ChannelFilter = 'all' | SocialChannel;

const CHANNELS: readonly ChannelFilter[] = ['all', 'guild', 'world', 'party', 'raid', 'whisper', 'system', 'hero'];
const label = (channel: ChannelFilter): string => channel === 'all' ? 'All' : channel[0]?.toUpperCase() + channel.slice(1);

export const ChatterFeed: React.FC<{ readonly active?: boolean }> = ({ active = true }) => {
  const entries = useGameStore((state) => state.socialEntries);
  const [channel, setChannel] = useState<ChannelFilter>('all');
  const [muted, setMuted] = useState(false);
  const [showJump, setShowJump] = useState(false);
  const messagesRef = useRef<HTMLDivElement>(null);
  const followingLatest = useRef(true);
  const messagesId = useId();
  const disclosureId = useId();
  const visibleEntries = entries.toReversed().filter((entry) => channel === 'all' || entry.channel === channel);
  const latestVisibleId = visibleEntries.at(-1)?.id;

  const jumpToLatest = () => {
    const messages = messagesRef.current;
    if (messages) {
      messages.scrollTop = messages.scrollHeight;
      messages.focus();
    }
    followingLatest.current = true;
    setShowJump(false);
  };

  useLayoutEffect(() => {
    if (!latestVisibleId) {
      followingLatest.current = true;
      setShowJump(false);
      return;
    }
    if (!active || muted) return;
    if (followingLatest.current) {
      if (messagesRef.current) messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
      setShowJump(false);
    }
    else if (latestVisibleId) setShowJump(true);
  }, [active, channel, latestVisibleId, muted]);

  const chooseChannel = (next: ChannelFilter) => {
    setChannel(next);
    followingLatest.current = true;
    setShowJump(false);
  };

  return (
    <section className="chatter-panel" role="region" aria-label="Simulated chatter">
      <div className="chatter-header">
        <div className="chatter-heading-copy">
          <h3>Simulated chatter</h3>
          <p id={disclosureId}>No people are online. Every message is fictional, generated locally, and sent nowhere.</p>
        </div>
        <label className="chatter-control">
          <span>Channel</span>
          <select aria-label="Chatter channel" value={channel} onChange={(event) => chooseChannel(event.target.value as ChannelFilter)}>
            {CHANNELS.map((option) => <option key={option} value={option}>{label(option)}</option>)}
          </select>
        </label>
        <button
          type="button"
          className="btn btn-compact chatter-mute"
          aria-controls={messagesId}
          onClick={() => setMuted((current) => !current)}
        >
          {/*
            The label names the action, so aria-pressed cannot also name the state — carrying both
            inverted the meaning. Muted announced as "Unmute fictional chatter, pressed", which
            reads as "unmute is on" while chatter is off.

            The label is the signal kept, because it is the unambiguous one. A fixed label with
            aria-pressed would give "Fictional chatter, pressed" and leave the listener to guess
            whether pressed means muted or playing.
          */}
          {muted ? 'Unmute fictional chatter' : 'Mute fictional chatter'}
        </button>
      </div>

      <div
        id={messagesId}
        ref={messagesRef}
        className="chatter-messages"
        role="region"
        tabIndex={0}
        aria-label="Fictional chatter messages"
        aria-describedby={disclosureId}
        aria-live="off"
        onScroll={(event) => {
          if (!active) return;
          const messages = event.currentTarget;
          followingLatest.current = messages.scrollHeight - messages.scrollTop - messages.clientHeight <= 2;
          setShowJump(!followingLatest.current);
        }}
      >
        {muted
          ? <p className="chatter-empty">Fictional chatter is muted. The imaginary people remain industrious.</p>
          : visibleEntries.length > 0
            ? <ol className="chatter-list">
                {visibleEntries.map((entry) => (
                  <li key={entry.id} data-social-id={entry.id}>
                    <div className="chatter-meta">
                      <span className="chatter-channel">{label(entry.channel)}</span>
                      <bdi data-speaker-name dir="auto">{entry.speaker.displayName}</bdi>
                      <span>{entry.speaker.role}</span>
                    </div>
                    <p>{entry.text}</p>
                  </li>
                ))}
              </ol>
            : <p className="chatter-empty">No fictional messages on this channel. Even the silence is simulated.</p>}
      </div>
      {showJump && !muted ? <button type="button" className="btn btn-compact chatter-jump" onClick={jumpToLatest}>Jump to latest chatter</button> : null}
    </section>
  );
};
