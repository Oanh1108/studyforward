"use client";

import React, { Suspense } from 'react';
import { StudySessionView } from '@/components/learning/my-vocabulary/StudySessionView';
import { useRouter, useSearchParams } from 'next/navigation';
import { TopHeader } from '@/components/learning/TopHeader';

function StudySessionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const initialFolderId = searchParams.get('folderId') 
    ? parseInt(searchParams.get('folderId') as string, 10) 
    : null;
    
  const resume = searchParams.get('resume') === 'true';
  const sessionId = searchParams.get('sessionId') || undefined;

  return (
    <div className="flex flex-col h-screen bg-[var(--bg-main)]">
      <div className="flex-1 overflow-y-auto px-2">
        <StudySessionView 
          initialFolderId={initialFolderId} 
          onResumeRequested={resume}
          initialSessionId={sessionId}
          onClose={() => router.push('/vocabulary')}
        />
      </div>
    </div>
  );
}

export default function StudyPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center">Đang tải...</div>}>
      <StudySessionContent />
    </Suspense>
  );
}
