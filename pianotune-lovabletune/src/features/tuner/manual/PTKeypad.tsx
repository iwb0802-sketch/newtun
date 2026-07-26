/**
 * PTKeypad.tsx — PT-100/PT-A1 다이얼식 키패드 재현
 *
 * 숫자 버튼에 음이름이 매핑된 구조:
 *  1=C 2=D 3=E
 *  4=F 5=G 6=A
 *  7=B 8=STEP(#) 9=REVERSE(b)
 *  0=OCT  AUTO  RES
 *
 * 사용 흐름: 음이름 선택 → (옵션)#/b → 옥타브 선택 → 자동으로 해당 건반 점프
 */

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";

const NOTE_LETTERS = ["C", "D", "E", "F", "G", "A", "B"];

interface PTKeypadProps {
  onJumpToNote: (noteBase: string, octave: number, semitoneShift: number) => void;
  onAutoToggle: (enabled: boolean) => void;
  onReset: () => void;
  onNudge: (deltaCents: number) => void;
  autoMode: boolean;
}

export default function PTKeypad({ onJumpToNote, onAutoToggle, onReset, onNudge, autoMode }: PTKeypadProps) {
  const [pendingNote, setPendingNote] = useState<string | null>(null);
  const [shift, setShift] = useState<0 | 1 | -1>(0); // 0=natural, 1=#, -1=b
  const [octaveMode, setOctaveMode] = useState(false);

  const handleNoteKey = useCallback((letter: string) => {
    setPendingNote(letter);
    setShift(0);
    setOctaveMode(true); // 음이름 고르면 옥타브 선택 단계로 전환
  }, []);

  const handleShift = useCallback((s: 1 | -1) => {
    if (!pendingNote) return;
    setShift(prev => (prev === s ? 0 : s));
  }, [pendingNote]);

  const handleOctave = useCallback((oct: number) => {
    if (!pendingNote) return;
    onJumpToNote(pendingNote, oct, shift);
    setOctaveMode(false);
    setPendingNote(null);
    setShift(0);
  }, [pendingNote, shift, onJumpToNote]);

  const handleCancelOctave = useCallback(() => {
    setOctaveMode(false);
    setPendingNote(null);
    setShift(0);
  }, []);

  const noteLabel = pendingNote ? `${pendingNote}${shift === 1 ? "#" : shift === -1 ? "b" : ""}` : null;

  return (
    <div className="bg-card border border-border rounded-xl p-3 shadow-sm">
      {/* 상태 표시줄 */}
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-xs font-semibold text-muted-foreground">
          {octaveMode
            ? <>음 <span className="text-primary font-bold">{noteLabel}</span> → 옥타브 선택</>
            : "건반 선택"}
        </span>
        {octaveMode && (
          <button onClick={handleCancelOctave} className="text-xs text-muted-foreground/70 hover:text-off">취소</button>
        )}
      </div>

      {!octaveMode ? (
        <>
          {/* 1~9 : 음이름 + STEP/REVERSE */}
          <div className="grid grid-cols-3 gap-1.5 mb-1.5">
            {NOTE_LETTERS.slice(0, 6).map((letter, i) => (
              <button
                key={letter}
                onClick={() => handleNoteKey(letter)}
                className="aspect-square rounded-lg bg-muted hover:bg-primary/10 active:scale-95 transition-all flex flex-col items-center justify-center border border-border/60"
              >
                <span className="text-[10px] text-muted-foreground/60">{i + 1}</span>
                <span className="text-lg font-bold text-foreground">{letter}</span>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-1.5 mb-1.5">
            <button
              onClick={() => handleNoteKey("B")}
              className="aspect-square rounded-lg bg-muted hover:bg-primary/10 active:scale-95 transition-all flex flex-col items-center justify-center border border-border/60"
            >
              <span className="text-[10px] text-muted-foreground/60">7</span>
              <span className="text-lg font-bold text-foreground">B</span>
            </button>
            <button
              disabled={!pendingNote}
              onClick={() => handleShift(1)}
              className={cn(
                "aspect-square rounded-lg active:scale-95 transition-all flex flex-col items-center justify-center border",
                shift === 1 ? "bg-primary text-white border-primary" : "bg-muted border-border/60 hover:bg-primary/10",
                !pendingNote && "opacity-40 cursor-not-allowed"
              )}
            >
              <span className="text-[10px] opacity-60">8</span>
              <span className="text-lg font-bold">STEP ♯</span>
            </button>
            <button
              disabled={!pendingNote}
              onClick={() => handleShift(-1)}
              className={cn(
                "aspect-square rounded-lg active:scale-95 transition-all flex flex-col items-center justify-center border",
                shift === -1 ? "bg-primary text-white border-primary" : "bg-muted border-border/60 hover:bg-primary/10",
                !pendingNote && "opacity-40 cursor-not-allowed"
              )}
            >
              <span className="text-[10px] opacity-60">9</span>
              <span className="text-lg font-bold">REV ♭</span>
            </button>
          </div>
          {/* 0=OCT / AUTO / RES */}
          <div className="grid grid-cols-3 gap-1.5">
            <button
              onClick={() => pendingNote && setOctaveMode(true)}
              disabled={!pendingNote}
              className={cn(
                "aspect-square rounded-lg bg-muted hover:bg-primary/10 active:scale-95 transition-all flex flex-col items-center justify-center border border-border/60",
                !pendingNote && "opacity-40 cursor-not-allowed"
              )}
            >
              <span className="text-[10px] text-muted-foreground/60">0</span>
              <span className="text-sm font-bold text-foreground">OCT</span>
            </button>
            <button
              onClick={() => onAutoToggle(!autoMode)}
              className={cn(
                "aspect-square rounded-lg active:scale-95 transition-all flex items-center justify-center border font-bold text-sm",
                autoMode ? "bg-in-tune text-white border-in-tune" : "bg-muted border-border/60 hover:bg-in-tune/10 text-foreground"
              )}
            >
              AUTO
            </button>
            <button
              onClick={onReset}
              className="aspect-square rounded-lg bg-muted hover:bg-off/10 active:scale-95 transition-all flex items-center justify-center border border-border/60 font-bold text-sm text-foreground"
            >
              RES
            </button>
          </div>
        </>
      ) : (
        /* 옥타브 선택 (0~8) */
        <div className="grid grid-cols-3 gap-1.5">
          {Array.from({ length: 9 }, (_, oct) => (
            <button
              key={oct}
              onClick={() => handleOctave(oct)}
              className="aspect-square rounded-lg bg-muted hover:bg-primary/10 active:scale-95 transition-all flex flex-col items-center justify-center border border-border/60"
            >
              <span className="text-[10px] text-muted-foreground/60">옥타브</span>
              <span className="text-xl font-bold text-primary">{oct}</span>
            </button>
          ))}
        </div>
      )}

      {/* 미세조정 */}
      {!octaveMode && (
        <div className="grid grid-cols-4 gap-1.5 mt-1.5">
          <button onClick={() => onNudge(-10)} className="py-2 rounded-lg bg-muted hover:bg-muted/70 text-xs font-bold text-foreground/80 border border-border/60 active:scale-95 transition-all">-10</button>
          <button onClick={() => onNudge(-1)} className="py-2 rounded-lg bg-muted hover:bg-muted/70 text-xs font-bold text-foreground/80 border border-border/60 active:scale-95 transition-all">-1</button>
          <button onClick={() => onNudge(1)} className="py-2 rounded-lg bg-muted hover:bg-muted/70 text-xs font-bold text-foreground/80 border border-border/60 active:scale-95 transition-all">+1</button>
          <button onClick={() => onNudge(10)} className="py-2 rounded-lg bg-muted hover:bg-muted/70 text-xs font-bold text-foreground/80 border border-border/60 active:scale-95 transition-all">+10</button>
        </div>
      )}
    </div>
  );
}
