import { useState } from 'react';
import { StudyBoardManagerView } from './StudyBoardManagerView.js';
import { StudyBoardCanvasView } from './StudyBoardCanvasView.js';

export function StudyBoardMain() {
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);

  if (activeBoardId) {
    return (
      <StudyBoardCanvasView 
        boardId={activeBoardId} 
        onBack={() => setActiveBoardId(null)} 
      />
    );
  }

  return <StudyBoardManagerView onOpenBoard={setActiveBoardId} />;
}
