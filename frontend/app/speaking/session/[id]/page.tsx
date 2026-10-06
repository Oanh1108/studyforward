import React from 'react';
import { SpeakingSessionLayout } from '@/components/learning/speaking/SpeakingSessionLayout';

export default function SpeakingSessionPage({ params }: { params: { id: string } }) {
  return <SpeakingSessionLayout sessionId={params.id} />;
}
