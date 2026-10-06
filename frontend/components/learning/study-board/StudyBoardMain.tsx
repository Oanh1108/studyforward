import { useState, useEffect } from 'react';
import { StudyBoardManagerView } from './StudyBoardManagerView';
import { StudyBoardCanvasView } from './StudyBoardCanvasView';

export function StudyBoardMain() {
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);

  useEffect(() => {
    const saved = sessionStorage.getItem('activeBoardId');
    if (saved) setActiveBoardId(saved);
  }, []);

  const handleOpenBoard = (id: string | null) => {
    setActiveBoardId(id);
    if (id) {
      sessionStorage.setItem('activeBoardId', id);
    } else {
      sessionStorage.removeItem('activeBoardId');
    }
  };

  if (activeBoardId) {
    return (
      <StudyBoardCanvasView 
        boardId={activeBoardId} 
        onBack={() => handleOpenBoard(null)} 
      />
    );
  }

  return <StudyBoardManagerView onOpenBoard={handleOpenBoard} />;
}
