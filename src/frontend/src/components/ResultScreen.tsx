import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  Keyboard,
  RefreshCw,
  RotateCcw,
  Target,
  Trophy,
} from "lucide-react";
import { type Variants, motion } from "motion/react";
import type { Passage } from "../backend.d.ts";

interface ExamResult {
  wpm: number;
  accuracy: number;
  mistakes: number;
  typedText: string;
  passage: Passage;
}

interface Props {
  result: ExamResult;
  onRestart: () => void;
  onNewPassage: () => void;
}

interface WordResult {
  word: string;
  correct: boolean;
  typed: string;
}

function analyzeWords(passage: Passage, typedText: string): WordResult[] {
  const passageWords = passage.content.trim().split(/\s+/);
  const typedWords = typedText.trim() ? typedText.trim().split(/\s+/) : [];

  return passageWords.map((word, i) => ({
    word,
    typed: typedWords[i] ?? "",
    correct: typedWords[i] === word,
  }));
}

const statVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.12,
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  }),
};

export function ResultScreen({ result, onRestart, onNewPassage }: Props) {
  const wordAnalysis = analyzeWords(result.passage, result.typedText);

  const stats = [
    {
      label: "Net WPM",
      value: result.wpm,
      icon: Trophy,
      colorClass: "text-primary",
      bgClass: "bg-primary/10",
      borderClass: "border-primary/20",
    },
    {
      label: "Accuracy",
      value: `${result.accuracy}%`,
      icon: Target,
      colorClass: "text-success",
      bgClass: "bg-success/10",
      borderClass: "border-success/20",
    },
    {
      label: "Mistakes",
      value: result.mistakes,
      icon: AlertTriangle,
      colorClass: "text-destructive",
      bgClass: "bg-destructive/10",
      borderClass: "border-destructive/20",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4 flex items-center gap-3">
        <Keyboard className="w-5 h-5 text-primary" />
        <h1 className="font-display font-bold text-foreground">
          Typing Exam Pro
        </h1>
        <span className="ml-2 text-sm text-muted-foreground">
          — Exam Complete
        </span>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Result heading */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 mb-3">
            <Trophy className="w-7 h-7 text-primary" />
          </div>
          <h2 className="font-display text-2xl font-bold text-foreground">
            Exam Results
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            {result.passage.title}
          </p>
        </motion.div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              custom={i}
              variants={statVariants}
              initial="hidden"
              animate="visible"
              className={`bg-card border ${stat.borderClass} rounded-xl p-5 text-center shadow-exam`}
            >
              <div
                className={`inline-flex items-center justify-center w-10 h-10 rounded-lg ${stat.bgClass} mb-3`}
              >
                <stat.icon className={`w-5 h-5 ${stat.colorClass}`} />
              </div>
              <div
                className={`font-display text-3xl font-bold ${stat.colorClass}`}
              >
                {stat.value}
              </div>
              <div className="text-xs text-muted-foreground mt-1 font-medium uppercase tracking-wider">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex gap-3 justify-center mb-8"
        >
          <Button variant="outline" onClick={onRestart} className="gap-2">
            <RotateCcw className="w-4 h-4" />
            Restart Same
          </Button>
          <Button onClick={onNewPassage} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            New Passage
          </Button>
        </motion.div>

        {/* Word-by-word Analysis */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-card border border-border rounded-xl shadow-exam overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <h3 className="font-display font-semibold text-foreground text-sm">
              Word-by-Word Analysis
            </h3>
            <div className="ml-auto flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded-sm bg-success/20 border border-success/40" />
                <span className="text-muted-foreground">Correct</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded-sm bg-destructive/20 border border-destructive/40" />
                <span className="text-muted-foreground">Incorrect</span>
              </span>
            </div>
          </div>
          <div className="p-5">
            <div className="font-mono text-sm leading-loose flex flex-wrap gap-y-1">
              {wordAnalysis.map((w, i) => (
                <span
                  key={`word-${i}-${w.word}`}
                  className={`mr-1.5 px-0.5 rounded ${
                    w.correct
                      ? "text-success"
                      : "text-destructive underline decoration-destructive"
                  }`}
                  title={
                    w.correct
                      ? "Correct"
                      : `You typed: "${w.typed || "(nothing)"}"`
                  }
                >
                  {w.word}
                </span>
              ))}
            </div>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-muted-foreground py-6">
        © {new Date().getFullYear()}. Built with love using{" "}
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-foreground transition-colors"
        >
          caffeine.ai
        </a>
      </footer>
    </div>
  );
}
