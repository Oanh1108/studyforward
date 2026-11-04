"use client";

import React, { useState } from 'react';
import type { CommunicationStatus, ConvMessage, ConvSession, SessionResult as Result } from '@/lib/communicationApi';
import { SetupPanel } from './SetupPanel';
import { ConversationSession } from './ConversationSession';
import { SessionResult } from './SessionResult';

type Screen =
  | { kind: 'setup' }
  | { kind: 'session'; session: ConvSession; messages: ConvMessage[]; status: CommunicationStatus }
  | { kind: 'result'; result: Result };

/**
 * AI English conversation partner: choose a mode / topic / level, talk (typed or spoken) with the AI teacher,
 * then see a recap. All conversation state lives on the server; this component only switches screens.
 */
export function CommunicationView() {
  const [screen, setScreen] = useState<Screen>({ kind: 'setup' });

  if (screen.kind === 'session') {
    return (
      <ConversationSession
        key={screen.session.id}
        session={screen.session}
        initialMessages={screen.messages}
        status={screen.status}
        onExit={() => setScreen({ kind: 'setup' })}
        onComplete={(result) => setScreen({ kind: 'result', result })}
      />
    );
  }
  if (screen.kind === 'result') return <SessionResult result={screen.result} onNew={() => setScreen({ kind: 'setup' })} />;
  return <SetupPanel onStart={(session, messages, status) => setScreen({ kind: 'session', session, messages, status })} />;
}
