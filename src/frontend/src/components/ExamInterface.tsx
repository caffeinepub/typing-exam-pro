import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronDown,
  Clock,
  FileDown,
  FileText,
  Keyboard,
  LogOut,
  Monitor,
  Send,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { Passage } from "../backend.d.ts";
import { useAuth } from "../context/AuthContext";
import { useActor } from "../hooks/useActor";
import {
  useCheckSession,
  usePassages,
  useSubmitTestResult,
} from "../hooks/useQueries";
import { ResultScreen } from "./ResultScreen";

interface ExamResult {
  wpm: number;
  accuracy: number;
  mistakes: number;
  typedText: string;
  passage: Passage;
}

export function ExamInterface() {
  const { session, logout } = useAuth();
  const { actor } = useActor();
  const { data: passages = [], isLoading: passagesLoading } = usePassages();

  const [selectedPassageId, setSelectedPassageId] = useState<string>("");
  const [mode, setMode] = useState<"screen" | "hardcopy">("screen");
  const [backspaceEnabled, setBackspaceEnabled] = useState(true);
  const [typedText, setTypedText] = useState("");
  const [timerStarted, setTimerStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [totalTime, setTotalTime] = useState<number>(0);
  const [examResult, setExamResult] = useState<ExamResult | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Stable refs for use inside timer interval
  const typedTextRef = useRef(typedText);
  const submittedRef = useRef(submitted);
  const selectedPassageRef = useRef<Passage | null>(null);
  const sessionRef = useRef(session);
  const timeLeftRef = useRef(timeLeft);
  const totalTimeRef = useRef(totalTime);

  const submitMutation = useSubmitTestResult();

  // Keep refs in sync
  useEffect(() => {
    typedTextRef.current = typedText;
  }, [typedText]);
  useEffect(() => {
    submittedRef.current = submitted;
  }, [submitted]);
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);
  useEffect(() => {
    timeLeftRef.current = timeLeft;
  }, [timeLeft]);
  useEffect(() => {
    totalTimeRef.current = totalTime;
  }, [totalTime]);

  // Session polling
  const sessionCheckEnabled =
    !!session && !!session.sessionId && !submitted && !examResult;
  const { data: sessionValid } = useCheckSession(
    session?.mobile ?? "",
    session?.sessionId ?? "",
    sessionCheckEnabled,
  );

  useEffect(() => {
    if (sessionCheckEnabled && sessionValid === false) {
      alert("Session Expired: You have been logged in on another device.");
      window.location.reload();
    }
  }, [sessionValid, sessionCheckEnabled]);

  // Auto-select first passage
  useEffect(() => {
    if (passages.length > 0 && !selectedPassageId) {
      setSelectedPassageId(passages[0].id);
    }
  }, [passages, selectedPassageId]);

  const selectedPassage =
    passages.find((p) => p.id === selectedPassageId) ?? null;

  useEffect(() => {
    selectedPassageRef.current = selectedPassage;
  }, [selectedPassage]);

  // Update total time when passage changes (and exam not started)
  useEffect(() => {
    if (selectedPassage && !timerStarted) {
      const secs = Number(selectedPassage.timeMinutes) * 60;
      setTimeLeft(secs);
      setTotalTime(secs);
    }
  }, [selectedPassage, timerStarted]);

  const doSubmit = useCallback(
    async (text: string) => {
      const passage = selectedPassageRef.current;
      const sess = sessionRef.current;
      const tLeft = timeLeftRef.current;
      const tTotal = totalTimeRef.current;

      if (!passage || !sess || submittedRef.current) return;
      if (timerRef.current) clearInterval(timerRef.current);

      const passageWords = passage.content.trim().split(/\s+/);
      const typedWords = text.trim() ? text.trim().split(/\s+/) : [];
      const timeUsedMinutes = (tTotal - tLeft) / 60 || tTotal / 60;

      let mistakes = 0;
      for (let i = 0; i < typedWords.length; i++) {
        if (typedWords[i] !== passageWords[i]) mistakes++;
      }

      const wpm = Math.round(text.length / 5 / Math.max(timeUsedMinutes, 0.01));
      const accuracy =
        typedWords.length > 0
          ? Math.round(
              ((typedWords.length - mistakes) / typedWords.length) * 100,
            )
          : 0;

      const result: ExamResult = {
        wpm: Math.max(wpm, 0),
        accuracy: Math.max(Math.min(accuracy, 100), 0),
        mistakes,
        typedText: text,
        passage,
      };

      setExamResult(result);
      setSubmitted(true);

      try {
        await submitMutation.mutateAsync({
          userName: sess.name,
          userMobile: sess.mobile,
          passageTitle: passage.title,
          wpm: BigInt(result.wpm),
          accuracy: BigInt(result.accuracy),
          mistakes: BigInt(mistakes),
        });
      } catch (err) {
        console.error("Failed to submit result:", err);
        toast.error("Could not save result to server, but exam completed.");
      }
    },
    [submitMutation],
  );

  // Timer countdown — uses refs to avoid stale closures
  useEffect(() => {
    if (!timerStarted) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          clearInterval(timerRef.current!);
          doSubmit(typedTextRef.current);
          return 0;
        }
        return next;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerStarted, doSubmit]);

  function resetExam() {
    if (timerRef.current) clearInterval(timerRef.current);
    setTypedText("");
    setTimerStarted(false);
    setExamResult(null);
    setSubmitted(false);
    const p = selectedPassageRef.current;
    if (p) {
      const secs = Number(p.timeMinutes) * 60;
      setTimeLeft(secs);
      setTotalTime(secs);
    }
  }

  function handleTextareaChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const newText = e.target.value;
    if (!timerStarted && newText.length > 0) {
      setTimerStarted(true);
    }
    setTypedText(newText);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!backspaceEnabled && e.key === "Backspace") {
      e.preventDefault();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
  }

  function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  const isTimerDanger = timeLeft > 0 && timeLeft <= 30;
  const timerPercent = totalTime > 0 ? (timeLeft / totalTime) * 100 : 0;

  async function handleGetPDF() {
    if (!selectedPassage) return;
    try {
      await new Promise<void>((resolve, reject) => {
        if ((window as unknown as Record<string, unknown>).jspdf) {
          resolve();
          return;
        }
        const script = document.createElement("script");
        script.src =
          "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Failed to load jsPDF"));
        document.head.appendChild(script);
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { jsPDF } = (window as unknown as { jspdf: { jsPDF: any } }).jspdf;
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text(selectedPassage.title, 20, 20);
      doc.setFontSize(10);
      doc.text(
        `Time Allowed: ${selectedPassage.timeMinutes} minute(s)`,
        20,
        30,
      );
      doc.setFontSize(12);
      const lines = doc.splitTextToSize(selectedPassage.content, 170);
      doc.text(lines, 20, 45);
      doc.save(`${selectedPassage.title}.pdf`);
    } catch {
      toast.error("Could not generate PDF at this time.");
    }
  }

  async function handleLogout() {
    if (actor && session) {
      try {
        await actor.logout(session.mobile);
      } catch {
        // ignore
      }
    }
    logout();
  }

  if (examResult) {
    return (
      <ResultScreen
        result={examResult}
        onRestart={() => {
          resetExam();
          setTimeout(() => textareaRef.current?.focus(), 100);
        }}
        onNewPassage={() => window.location.reload()}
      />
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Toolbar */}
      <header className="bg-card border-b border-border shadow-xs flex-shrink-0">
        <div className="flex items-center gap-2 px-3 py-2 flex-wrap">
          {/* Brand */}
          <div className="flex items-center gap-2 mr-2">
            <Keyboard className="w-5 h-5 text-primary flex-shrink-0" />
            <span className="font-display font-bold text-sm text-foreground hidden sm:block">
              Typing Exam Pro
            </span>
          </div>

          <div className="h-5 w-px bg-border hidden sm:block" />

          {/* Logged in as */}
          <span className="text-xs text-muted-foreground hidden md:block">
            {session?.name}
          </span>

          {/* Logout */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="gap-1.5 text-xs h-8"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden xs:block">Logout</span>
          </Button>

          <div className="h-5 w-px bg-border" />

          {/* Passage Selector */}
          <Select
            value={selectedPassageId}
            onValueChange={(v) => {
              setSelectedPassageId(v);
              resetExam();
            }}
            disabled={passagesLoading || timerStarted}
          >
            <SelectTrigger className="h-8 text-xs w-44 sm:w-52">
              <SelectValue
                placeholder={passagesLoading ? "Loading..." : "Select passage"}
              />
            </SelectTrigger>
            <SelectContent>
              {passages.map((p) => (
                <SelectItem key={p.id} value={p.id} className="text-xs">
                  {p.title} ({String(p.timeMinutes)} min)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="h-5 w-px bg-border" />

          {/* Mode Toggle */}
          <div className="flex items-center gap-1 bg-muted rounded-md p-0.5">
            <button
              type="button"
              onClick={() => setMode("screen")}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all ${
                mode === "screen"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Monitor className="w-3 h-3" />
              Screen
            </button>
            <button
              type="button"
              onClick={() => setMode("hardcopy")}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all ${
                mode === "hardcopy"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <FileText className="w-3 h-3" />
              Hardcopy
            </button>
          </div>

          {/* Backspace toggle */}
          <div className="flex items-center gap-1.5">
            <Checkbox
              id="backspace-toggle"
              checked={backspaceEnabled}
              onCheckedChange={(v) => setBackspaceEnabled(Boolean(v))}
              className="h-4 w-4"
            />
            <Label
              htmlFor="backspace-toggle"
              className="text-xs cursor-pointer select-none whitespace-nowrap"
            >
              Backspace
            </Label>
          </div>

          <div className="flex-1" />

          {/* Timer */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-mono text-sm font-bold min-w-[70px] justify-center transition-all ${
              isTimerDanger
                ? "bg-destructive/10 text-destructive animate-pulse-danger border border-destructive/30"
                : timerStarted
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "bg-muted text-muted-foreground border border-border"
            }`}
          >
            <Clock className="w-3.5 h-3.5 flex-shrink-0" />
            {formatTime(timeLeft)}
          </div>

          {/* Get PDF */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleGetPDF}
            disabled={!selectedPassage}
            className="gap-1.5 text-xs h-8 hidden sm:flex"
          >
            <FileDown className="w-3.5 h-3.5" />
            Get PDF
          </Button>

          {/* Submit */}
          <Button
            size="sm"
            onClick={() => doSubmit(typedText)}
            disabled={!typedText || submitted}
            className="gap-1.5 text-xs h-8 bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            <Send className="w-3.5 h-3.5" />
            Submit Test
          </Button>
        </div>

        {/* Timer progress bar */}
        {timerStarted && totalTime > 0 && (
          <div className="h-0.5 bg-border">
            <motion.div
              className={`h-full transition-colors ${
                isTimerDanger ? "bg-destructive" : "bg-primary"
              }`}
              style={{ width: `${timerPercent}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        )}
      </header>

      {/* Exam Panes */}
      <main className="flex-1 flex overflow-hidden">
        <AnimatePresence mode="wait">
          {mode === "screen" && selectedPassage && (
            <motion.div
              key="passage-pane"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="w-1/2 border-r border-border overflow-auto p-6 bg-card"
            >
              <div className="max-w-prose mx-auto">
                <div className="flex items-center gap-2 mb-4 pb-4 border-b border-border">
                  <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                  <h2 className="font-display font-semibold text-foreground text-base">
                    {selectedPassage.title}
                  </h2>
                  <span className="ml-auto text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {String(selectedPassage.timeMinutes)} min
                  </span>
                </div>
                <p className="font-mono text-sm leading-relaxed text-foreground whitespace-pre-wrap select-none">
                  {selectedPassage.content}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Typing pane */}
        <motion.div
          layout
          className={`flex flex-col overflow-hidden bg-background ${
            mode === "hardcopy" ? "w-full" : "w-1/2"
          }`}
        >
          {!selectedPassage ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <ChevronDown className="w-8 h-8 opacity-40" />
              <p className="text-sm">Select a passage to begin the exam</p>
            </div>
          ) : (
            <>
              <div className="px-4 pt-4 pb-2 flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Your Answer
                </span>
                {timerStarted && (
                  <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    Exam in progress
                  </span>
                )}
                {!timerStarted && (
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    Start typing to begin timer
                  </span>
                )}
              </div>
              <div className="flex-1 px-4 pb-4">
                <textarea
                  ref={textareaRef}
                  value={typedText}
                  onChange={handleTextareaChange}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  placeholder="Start typing here... The timer will begin when you type your first character."
                  className="w-full h-full resize-none rounded-lg border border-border bg-card p-4 font-mono text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                  style={{ minHeight: "200px" }}
                  spellCheck={false}
                  autoCorrect="off"
                  autoCapitalize="off"
                  autoComplete="off"
                />
              </div>
            </>
          )}
        </motion.div>
      </main>
    </div>
  );
}
