import React from 'react';
import { SpeakingSessionLayout } from '@/components/learning/speaking/SpeakingSessionLayout';

// In this Next.js version route params arrive as a Promise; reading `params.id`
// directly gives `undefined` and the session request fails.
export default async function SpeakingSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SpeakingSessionLayout sessionId={id} />;
}
