import React, { useState, useEffect, useCallback, useRef } from 'react';

// --- מנוע סאונד פרוצדורלי (Web Audio API) ---
// מייצר צלילים ללא קבצים חיצוניים כדי להבטיח טעינה מיידית
let audioCtx = null;

const initAudio = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
};

const playTone = (freq, type, duration, vol, slideTo = null) => {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  
  osc.type = type;
  osc.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
  if (slideTo) {
    osc.frequency.exponentialRampToValueAtTime(slideTo, audioCtx.currentTime + duration);
  }
  
  gainNode.gain.setValueAtTime(vol, audioCtx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
  
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
};

const playMoveSound = () => {
  // צליל "ווש" נמוך וקצר להחלקה
  playTone(120, 'sine', 0.15, 0.1, 40);
};

const playMergeSound = (mergedValue) => {
  // חישוב הרמה הפסיכולוגית לפי גובה המספר (log2)
  // 4 = רמה 2, 8 = רמה 3, 2048 = רמה 11
  const level = Math.log2(mergedValue); 
  
  // תדר בסיס שעולה ככל שהמספר גדל
  const baseFreq = 220 * Math.pow(1.1, level); 
  
  // צליל הבסיס הראשי (קריסטלי ונעים)
  playTone(baseFreq, 'triangle', 0.3, 0.15);
  
  // ככל שהמספר גבוה יותר, אנחנו מוסיפים הרמוניות (אקורדים) כדי ליצור תחושת אופוריה
  if (level >= 4) { // 16 ומעלה
    playTone(baseFreq * 1.5, 'sine', 0.4, 0.1); // קווינטה
  }
  if (level >= 7) { // 128 ומעלה - אקורד ניצחון
    playTone(baseFreq * 2, 'sine', 0.5, 0.08); // אוקטבה
    playTone(baseFreq * 1.25, 'triangle', 0.4, 0.05); // טרצה גדולה
  }
  if (level >= 10) { // 1024 ומעלה - חגיגה סינפטית מוחלטת
    playTone(baseFreq * 2.5, 'square', 0.6, 0.03); 
  }
};


// --- הגדרות עיצוב וצבעים ---
const TILE_COLORS = {
  0: 'bg-slate-800/50 shadow-inner',
  2: 'bg-slate-800 text-cyan-400 border border-cyan-500/30 shadow-[0_0_15px_rgba(34,211,238,0.15)]',
  4: 'bg-slate-800 text-blue-400 border border-blue-500/40 shadow-[0_0_20px_rgba(96,165,250,0.2)]',
  8: 'bg-slate-800 text-indigo-400 border border-indigo-500/50 shadow-[0_0_25px_rgba(129,140,248,0.25)]',
  16: 'bg-slate-800 text-violet-400 border border-violet-500/60 shadow-[0_0_30px_rgba(167,139,250,0.3)]',
  32: 'bg-slate-800 text-fuchsia-400 border border-fuchsia-500/70 shadow-[0_0_35px_rgba(232,121,249,0.35)]',
  64: 'bg-slate-800 text-pink-400 border border-pink-500/80 shadow-[0_0_40px_rgba(244,114,182,0.4)]',
  128: 'bg-slate-800 text-rose-400 border border-rose-500/90 shadow-[0_0_45px_rgba(251,113,133,0.5)]',
  256: 'bg-slate-800 text-red-500 border border-red-500 shadow-[0_0_50px_rgba(239,68,68,0.6)]',
  512: 'bg-slate-800 text-orange-400 border border-orange-400 shadow-[0_0_60px_rgba(251,146,60,0.7)]',
  1024: 'bg-slate-800 text-yellow-400 border border-yellow-400 shadow-[0_0_70px_rgba(250,204,21,0.8)]',
  2048: 'bg-white text-black border border-white shadow-[0_0_100px_rgba(255,255,255,1)] animate-pulse',
};

const FEEDBACK_MESSAGES = [
  "גל דופמין!", "סינפסה פועמת!", "חיבור מושלם!",
  "גאונות!", "המוח מתרחב!", "אין עליך!",
  "התמכרות...", "זרימה מוחלטת!"
];

// --- מנוע המשחק ---
const getEmptyCoordinates = (board) => {
  const emptyCoords = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (board[r][c] === 0) emptyCoords.push({ r, c });
    }
  }
  return emptyCoords;
};

const getRandomEmptyCoordinate = (board) => {
  const emptyCoords = getEmptyCoordinates(board);
  if (emptyCoords.length === 0) return null;
  return emptyCoords[Math.floor(Math.random() * emptyCoords.length)];
};

const addRandomTile = (board) => {
  const newBoard = [...board.map(row => [...row])];
  const coord = getRandomEmptyCoordinate(newBoard);
  if (coord) {
    newBoard[coord.r][coord.c] = Math.random() < 0.9 ? 2 : 4;
  }
  return newBoard;
};

const initializeBoard = () => {
  let board = Array(4).fill().map(() => Array(4).fill(0));
  board = addRandomTile(board);
  board = addRandomTile(board);
  return board;
};

const rotateRight = (matrix) => {
  const result = [];
  for (let i = 0; i < 4; i++) {
    result.push([]);
    for (let j = 0; j < 4; j++) {
      result[i][j] = matrix[3 - j][i];
    }
  }
  return result;
};

const slideLeft = (board) => {
  let newBoard = [];
  let scoreGain = 0;
  let moved = false;
  let maxMerged = 0; // מעקב אחר החיבור הגבוה ביותר בצעד הנוכחי

  for (let i = 0; i < 4; i++) {
    let row = board[i].filter(val => val !== 0);
    for (let j = 0; j < row.length - 1; j++) {
      if (row[j] !== 0 && row[j] === row[j + 1]) {
        row[j] *= 2;
        scoreGain += row[j];
        if (row[j] > maxMerged) maxMerged = row[j]; // עדכון המקסימום שחובר
        row.splice(j + 1, 1);
        moved = true;
      }
    }
    while (row.length < 4) row.push(0);
    if (row.join(',') !== board[i].join(',')) moved = true;
    newBoard.push(row);
  }
  return { newBoard, scoreGain, moved, maxMerged };
};

export default function App() {
  const [board, setBoard] = useState(initializeBoard());
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [moveDirection, setMoveDirection] = useState(null); 
  const [soundEnabled, setSoundEnabled] = useState(true); // מצב שמע מופעל כברירת מחדל
  
  const touchStartRef = useRef(null);
  const glowTimeoutRef = useRef(null);

  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@400;700;900&display=swap');
      
      body {
        font-family: 'Heebo', sans-serif;
        background-color: #0f172a;
        margin: 0;
        overflow: hidden;
        overscroll-behavior: none;
      }

      @keyframes popIn {
        0% { transform: scale(0.5); opacity: 0; }
        70% { transform: scale(1.1); }
        100% { transform: scale(1); opacity: 1; }
      }

      @keyframes feedbackFloat {
        0% { transform: translateY(0) scale(0.8); opacity: 0; }
        20% { transform: translateY(-20px) scale(1.1); opacity: 1; }
        80% { transform: translateY(-40px) scale(1); opacity: 1; }
        100% { transform: translateY(-50px) scale(0.9); opacity: 0; }
      }

      @keyframes waveLEFT {
        0% { transform: translateX(100%); opacity: 0.8; }
        100% { transform: translateX(-100%); opacity: 0; }
      }
      @keyframes waveRIGHT {
        0% { transform: translateX(-100%); opacity: 0.8; }
        100% { transform: translateX(100%); opacity: 0; }
      }
      @keyframes waveUP {
        0% { transform: translateY(100%); opacity: 0.8; }
        100% { transform: translateY(-100%); opacity: 0; }
      }
      @keyframes waveDOWN {
        0% { transform: translateY(-100%); opacity: 0.8; }
        100% { transform: translateY(100%); opacity: 0; }
      }

      .tile-new { animation: popIn 0.2s ease-out forwards; }
      .feedback-anim { animation: feedbackFloat 1.2s cubic-bezier(0.25, 1, 0.5, 1) forwards; }
      
      .wave-LEFT { animation: waveLEFT 0.3s ease-out forwards; background: linear-gradient(to right, rgba(34,211,238,0.5), transparent); }
      .wave-RIGHT { animation: waveRIGHT 0.3s ease-out forwards; background: linear-gradient(to left, rgba(34,211,238,0.5), transparent); }
      .wave-UP { animation: waveUP 0.3s ease-out forwards; background: linear-gradient(to bottom, rgba(34,211,238,0.5), transparent); }
      .wave-DOWN { animation: waveDOWN 0.3s ease-out forwards; background: linear-gradient(to top, rgba(34,211,238,0.5), transparent); }
    `;
    document.head.appendChild(style);
    
    const savedBest = localStorage.getItem('synapseBestScore');
    if (savedBest) setBestScore(parseInt(savedBest, 10));

    return () => document.head.removeChild(style);
  }, []);

  const triggerVisualFeedback = (direction) => {
    setMoveDirection(direction);
    if (glowTimeoutRef.current) clearTimeout(glowTimeoutRef.current);
    glowTimeoutRef.current = setTimeout(() => {
      setMoveDirection(null);
    }, 300);
  };

  const checkGameOver = (currentBoard) => {
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (currentBoard[r][c] === 0) return false;
        if (c < 3 && currentBoard[r][c] === currentBoard[r][c + 1]) return false;
        if (r < 3 && currentBoard[r][c] === currentBoard[r + 1][c]) return false;
      }
    }
    return true;
  };

  const handleMove = useCallback((direction) => {
    if (gameOver) return;

    // הפעלת האודיו קונטקסט בלחיצה/החלקה הראשונה
    if (soundEnabled) initAudio();

    triggerVisualFeedback(direction);

    let resultBoard = [...board];
    let totalScoreGain = 0;
    let hasMoved = false;
    let moveMaxMerged = 0;

    if (direction === 'LEFT') {
      const res = slideLeft(resultBoard);
      resultBoard = res.newBoard;
      totalScoreGain = res.scoreGain;
      hasMoved = res.moved;
      moveMaxMerged = res.maxMerged;
    } else if (direction === 'RIGHT') {
      let temp = rotateRight(rotateRight(resultBoard));
      const res = slideLeft(temp);
      resultBoard = rotateRight(rotateRight(res.newBoard));
      totalScoreGain = res.scoreGain;
      hasMoved = res.moved;
      moveMaxMerged = res.maxMerged;
    } else if (direction === 'UP') {
      let temp = rotateRight(rotateRight(rotateRight(resultBoard)));
      const res = slideLeft(temp);
      resultBoard = rotateRight(res.newBoard);
      totalScoreGain = res.scoreGain;
      hasMoved = res.moved;
      moveMaxMerged = res.maxMerged;
    } else if (direction === 'DOWN') {
      let temp = rotateRight(resultBoard);
      const res = slideLeft(temp);
      resultBoard = rotateRight(rotateRight(rotateRight(res.newBoard)));
      totalScoreGain = res.scoreGain;
      hasMoved = res.moved;
      moveMaxMerged = res.maxMerged;
    }

    if (hasMoved) {
      // מערכת השמע מופעלת כאן בהתאם לתוצאות
      if (soundEnabled) {
        if (moveMaxMerged > 0) {
          playMergeSound(moveMaxMerged); // סאונד מותאם לגובה המספר שחובר
        } else {
          playMoveSound(); // סאונד החלקה פשוט
        }
      }

      resultBoard = addRandomTile(resultBoard);
      setBoard(resultBoard);
      
      const newScore = score + totalScoreGain;
      setScore(newScore);
      
      if (newScore > bestScore) {
        setBestScore(newScore);
        localStorage.setItem('synapseBestScore', newScore);
      }

      if (totalScoreGain >= 32) {
        setFeedback(FEEDBACK_MESSAGES[Math.floor(Math.random() * FEEDBACK_MESSAGES.length)]);
        setTimeout(() => setFeedback(""), 1200); 
      }

      if (checkGameOver(resultBoard)) {
        setGameOver(true);
      }
    }
  }, [board, score, bestScore, gameOver, soundEnabled]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].indexOf(e.code) > -1) {
          e.preventDefault();
      }
      switch (e.key) {
        case 'ArrowLeft': handleMove('LEFT'); break;
        case 'ArrowRight': handleMove('RIGHT'); break;
        case 'ArrowUp': handleMove('UP'); break;
        case 'ArrowDown': handleMove('DOWN'); break;
        default: break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleMove]);

  const handleTouchStart = (e) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    };
  };

  const handleTouchEnd = (e) => {
    if (!touchStartRef.current) return;
    
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    
    const dx = touchEndX - touchStartRef.current.x;
    const dy = touchEndY - touchStartRef.current.y;
    
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    
    if (Math.max(absDx, absDy) > 40) {
      if (absDx > absDy) {
        handleMove(dx > 0 ? 'RIGHT' : 'LEFT');
      } else {
        handleMove(dy > 0 ? 'DOWN' : 'UP');
      }
    }
    touchStartRef.current = null;
  };

  const restartGame = () => {
    setBoard(initializeBoard());
    setScore(0);
    setGameOver(false);
    setFeedback("");
    setMoveDirection(null);
  };

  const toggleSound = () => {
    if (!soundEnabled) {
      initAudio(); // מוודא הפעלה אם המשתמש לוחץ 'הפעל שמע'
    }
    setSoundEnabled(!soundEnabled);
  };

  return (
    <div 
      className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center relative overflow-hidden select-none"
      dir="rtl"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-black opacity-80 z-0"></div>

      <div className="relative z-10 w-full max-w-md p-4 flex flex-col items-center">
        
        {/* כפתור שמע גלובלי (צד שמאל עליון) */}
        <div className="w-full flex justify-end mb-2">
          <button 
            onClick={toggleSound}
            className="text-slate-400 hover:text-cyan-400 transition-colors p-2 rounded-full hover:bg-slate-800 focus:outline-none"
            title={soundEnabled ? "השתק שמע" : "הפעל שמע"}
          >
            {soundEnabled ? (
              // איקון רמקול פועל
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path></svg>
            ) : (
              // איקון רמקול מושתק
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>
            )}
          </button>
        </div>

        {/* כותרת */}
        <div className="w-full flex justify-between items-center mb-6">
          <div>
            <h1 className="text-5xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-fuchsia-500 drop-shadow-[0_0_15px_rgba(34,211,238,0.5)]">
              סינפסה
            </h1>
          </div>
          <div className="flex gap-3">
            <div className="bg-slate-800/80 backdrop-blur-md rounded-xl p-3 flex flex-col items-center justify-center border border-slate-700/50 shadow-lg">
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">ניקוד</span>
              <span className="text-2xl font-black text-white">{score}</span>
            </div>
          </div>
        </div>

        {/* משוב פסיכולוגי מרחף */}
        <div className="h-12 w-full flex justify-center items-center pointer-events-none absolute top-36 z-50">
          {feedback && (
            <div key={Date.now()} className="feedback-anim text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-orange-500 drop-shadow-[0_0_15px_rgba(250,204,21,0.8)]">
              {feedback}
            </div>
          )}
        </div>

        {/* לוח המשחק */}
        <div 
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="bg-slate-800/40 backdrop-blur-xl p-3 sm:p-4 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-slate-700/30 relative overflow-hidden"
        >
          {moveDirection && (
            <div className={`absolute inset-0 pointer-events-none z-0 wave-${moveDirection}`}></div>
          )}

          {gameOver && (
            <div className="absolute inset-0 z-50 bg-slate-900/90 backdrop-blur-md rounded-3xl flex flex-col items-center justify-center">
              <h2 className="text-4xl font-black text-red-500 mb-2 drop-shadow-[0_0_20px_rgba(239,68,68,0.8)]">הלוח התמלא</h2>
              <button 
                onClick={restartGame}
                className="mt-6 px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full font-bold text-lg hover:scale-105 transition-transform shadow-[0_0_20px_rgba(34,211,238,0.4)] active:scale-95"
              >
                התחל מחדש
              </button>
            </div>
          )}

          <div className="grid grid-cols-4 gap-3 sm:gap-4 bg-slate-900/50 p-3 sm:p-4 rounded-2xl relative z-10" dir="ltr">
            {board.map((row, rIndex) => 
              row.map((cell, cIndex) => {
                const isNew = cell !== 0; 
                return (
                  <div 
                    key={`${rIndex}-${cIndex}`}
                    className={`
                      w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center rounded-xl sm:rounded-2xl 
                      text-2xl sm:text-3xl font-black transition-all duration-150 ease-in-out
                      ${TILE_COLORS[cell] || TILE_COLORS[2048]}
                      ${isNew ? 'tile-new' : ''}
                    `}
                  >
                    {cell !== 0 ? cell : ''}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* כפתור איפוס */}
        <div className="mt-8">
          <button 
            onClick={restartGame}
            className="text-slate-400 hover:text-white transition-colors text-sm font-bold uppercase tracking-wider flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            אפס לוח
          </button>
        </div>

      </div>
    </div>
  );
}
