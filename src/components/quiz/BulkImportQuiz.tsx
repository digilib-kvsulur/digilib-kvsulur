import { useState, useRef } from "react";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Upload, FileText, CheckCircle2, XCircle, AlertTriangle, Download,
  ChevronRight, ChevronDown, Loader2, RefreshCw, BookOpen, HelpCircle,
  Layers, Sparkles, Check, FileJson
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Question } from "@/types/quiz";

// ─── SAMPLE TEMPLATES ────────────────────────────────────────────────────────

const SAMPLE_MULTI_QUIZ_CSV = `quiz_title,subject,difficulty,time_limit,points_reward,question,option_a,option_b,option_c,option_d,correct_answer,explanation,question_points
General Science Quiz,Science,easy,15,50,What is the chemical symbol for Gold?,Au,Ag,Fe,Pb,A,Au comes from the Latin word aurum.,5
General Science Quiz,Science,easy,15,50,Which gas do plants absorb during photosynthesis?,Oxygen,Carbon Dioxide,Nitrogen,Hydrogen,B,Plants take in CO2 and release oxygen.,5
General Science Quiz,Science,easy,15,50,What is the hardest natural substance on Earth?,Iron,Diamond,Gold,Granite,B,Diamond is the hardest known natural material.,5
World Geography,Social Science,medium,20,100,Which is the longest river in the world?,Amazon River,Nile River,Yangtze River,Mississippi River,B,The Nile River is approximately 6650 km long.,5
World Geography,Social Science,medium,20,100,Which continent has the most countries?,Asia,Europe,Africa,South America,C,Africa has 54 recognized sovereign countries.,5
World Geography,Social Science,medium,20,100,What is the capital of Australia?,Sydney,Melbourne,Canberra,Brisbane,C,Canberra is the federal capital of Australia.,5
Computer Science Basics,Computers,medium,15,75,What does CPU stand for?,Central Processing Unit,Computer Personal Unit,Central Processor Utility,Control Power Unit,A,CPU executes instructions in a computer.,5
Computer Science Basics,Computers,medium,15,75,Which binary number represents decimal 5?,100,101,110,111,B,101 in binary is 4 + 0 + 1 = 5.,5
Computer Science Basics,Computers,medium,15,75,What is the primary brain of the computer?,RAM,Hard Drive,CPU,Motherboard,C,The CPU carries out most computations.,5`;

const SAMPLE_SINGLE_QUIZ_CSV = `question,option_a,option_b,option_c,option_d,correct_answer,explanation,points
What is the capital of India?,Mumbai,New Delhi,Chennai,Kolkata,B,New Delhi has been India's capital since 1911.,5
Which planet is closest to the Sun?,Venus,Earth,Mercury,Mars,C,Mercury is the innermost planet in the Solar System.,5
Who wrote the national anthem of India?,Rabindranath Tagore,Mahatma Gandhi,Jawaharlal Nehru,Subhas Chandra Bose,A,Jana Gana Mana was composed by Rabindranath Tagore.,5
What is the formula for water?,H2SO4,NaCl,H2O,CO2,C,Water is composed of two hydrogen atoms and one oxygen atom.,5`;

const SAMPLE_MULTI_QUIZ_JSON = JSON.stringify([
  {
    title: "General Science Exploration",
    subject: "Science",
    description: "Introductory science trivia for school students",
    difficulty: "easy",
    timeLimit: 15,
    pointsReward: 50,
    questions: [
      {
        question: "What is the chemical symbol for Gold?",
        options: ["Au", "Ag", "Fe", "Pb"],
        correctAnswer: 0,
        explanation: "Au comes from aurum.",
        points: 5
      },
      {
        question: "Which gas do plants absorb during photosynthesis?",
        options: ["Oxygen", "Carbon Dioxide", "Nitrogen", "Hydrogen"],
        correctAnswer: 1,
        explanation: "Plants take in CO2 and release oxygen.",
        points: 5
      }
    ]
  },
  {
    title: "World Geography Challenge",
    subject: "Social Science",
    description: "Test knowledge of capitals, rivers, and continents",
    difficulty: "medium",
    timeLimit: 20,
    pointsReward: 100,
    questions: [
      {
        question: "Which is the longest river in the world?",
        options: ["Amazon River", "Nile River", "Yangtze River", "Mississippi River"],
        correctAnswer: 1,
        explanation: "The Nile River is approximately 6650 km long.",
        points: 5
      },
      {
        question: "What is the capital of Australia?",
        options: ["Sydney", "Melbourne", "Canberra", "Brisbane"],
        correctAnswer: 2,
        explanation: "Canberra is the capital city.",
        points: 5
      }
    ]
  }
], null, 2);

// ─── TYPES & HELPERS ────────────────────────────────────────────────────────

const ANSWER_MAP: Record<string, number> = {
  a: 0, b: 1, c: 2, d: 3,
  "1": 0, "2": 1, "3": 2, "4": 3,
  "0": 0
};

export interface ParsedQuizItem {
  id: string;
  title: string;
  description: string;
  subject: string;
  difficulty: "easy" | "medium" | "hard";
  timeLimit: number;
  pointsReward: number;
  questions: Question[];
  warnings: string[];
  selected: boolean;
}

interface SingleQuizMeta {
  title: string;
  description: string;
  subject: string;
  difficulty: "easy" | "medium" | "hard";
  timeLimit: number;
  pointsReward: number;
  isActive: boolean;
}

interface ImportReport {
  total: number;
  succeeded: number;
  failed: number;
  quizTitles: string[];
}

interface Props {
  onDone?: () => void;
  onNavigateToQuizzes?: () => void;
}

function normalizeKey(str: string): string {
  return str.trim().toLowerCase().replace(/[\s\-_]+/g, "_");
}

function resolveCorrectAnswer(raw: any, options: string[]): number | null {
  if (raw === undefined || raw === null) return null;
  const str = String(raw).trim().toLowerCase();
  if (ANSWER_MAP[str] !== undefined) return ANSWER_MAP[str];

  // Try matching against options text
  const matchIdx = options.findIndex((opt) => opt.trim().toLowerCase() === str);
  if (matchIdx >= 0) return matchIdx;

  return null;
}

export default function BulkImportQuiz({ onDone, onNavigateToQuizzes }: Props) {
  const [importMode, setImportMode] = useState<"multi" | "single">("multi");

  // Multi-quiz import state
  const [multiQuizzes, setMultiQuizzes] = useState<ParsedQuizItem[]>([]);
  const [multiRawInput, setMultiRawInput] = useState("");
  const [multiFileName, setMultiFileName] = useState("");
  const [multiFileError, setMultiFileError] = useState<string | null>(null);
  const [setActiveOnImport, setSetActiveOnImport] = useState(false);
  const [expandedQuizId, setExpandedQuizId] = useState<string | null>(null);

  // Single quiz import state
  const [singleMeta, setSingleMeta] = useState<SingleQuizMeta>({
    title: "",
    description: "",
    subject: "",
    difficulty: "medium",
    timeLimit: 30,
    pointsReward: 100,
    isActive: false,
  });
  const [singleCsvText, setSingleCsvText] = useState("");
  const [singleFileName, setSingleFileName] = useState("");
  const [singleParsedQuestions, setSingleParsedQuestions] = useState<{
    rowIndex: number;
    question: Question | null;
    errors: string[];
  }[]>([]);

  // Execution states
  const [isProcessing, setIsProcessing] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importProgressText, setImportProgressText] = useState("");
  const [importReport, setImportReport] = useState<ImportReport | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const singleFileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // ─── PARSERS ─────────────────────────────────────────────────────────────

  const parseMultiQuizData = (rawText: string) => {
    setMultiRawInput(rawText);
    setMultiFileError(null);
    if (!rawText.trim()) {
      setMultiQuizzes([]);
      return;
    }

    // Attempt JSON parse first
    const trimmed = rawText.trim();
    if (trimmed.startsWith("[") || (trimmed.startsWith("{") && trimmed.includes("questions"))) {
      try {
        const json = JSON.parse(trimmed);
        const list = Array.isArray(json) ? json : json.quizzes || [json];
        const parsedList: ParsedQuizItem[] = [];

        list.forEach((item: any, idx: number) => {
          const title = String(item.title || item.name || `Imported Quiz ${idx + 1}`).trim();
          const subject = String(item.subject || item.topic || "General").trim();
          const difficultyRaw = String(item.difficulty || "medium").toLowerCase();
          const difficulty = (["easy", "medium", "hard"].includes(difficultyRaw) ? difficultyRaw : "medium") as any;
          const timeLimit = Math.max(1, parseInt(item.timeLimit || item.time_limit || "15", 10) || 15);
          const pointsReward = Math.max(1, parseInt(item.pointsReward || item.points_reward || "100", 10) || 100);
          const description = String(item.description || item.desc || "").trim();

          const questions: Question[] = [];
          const warnings: string[] = [];

          if (Array.isArray(item.questions)) {
            item.questions.forEach((q: any, qIdx: number) => {
              const qText = String(q.question || q.text || "").trim();
              if (!qText) {
                warnings.push(`Question #${qIdx + 1}: Missing question text`);
                return;
              }

              let options: string[] = [];
              if (Array.isArray(q.options)) {
                options = q.options.map((o: any) => String(o || "").trim());
              } else if (q.option_a !== undefined) {
                options = [
                  String(q.option_a || "").trim(),
                  String(q.option_b || "").trim(),
                  String(q.option_c || "").trim(),
                  String(q.option_d || "").trim(),
                ];
              }

              if (options.length < 2) {
                warnings.push(`Question "${qText.slice(0, 30)}...": Must have at least 2 options`);
                return;
              }

              // Pad to 4 options if fewer, or leave clean
              while (options.length < 4) {
                options.push(`Option ${String.fromCharCode(65 + options.length)}`);
              }

              const corr = resolveCorrectAnswer(q.correctAnswer ?? q.correct_answer ?? q.answer, options);
              if (corr === null || corr < 0 || corr >= options.length) {
                warnings.push(`Question "${qText.slice(0, 30)}...": Invalid correct answer "${q.correctAnswer ?? q.correct_answer}"`);
                return;
              }

              questions.push({
                id: `${Date.now()}_${idx}_${qIdx}`,
                question: qText,
                options,
                correctAnswer: corr,
                explanation: q.explanation ? String(q.explanation).trim() : undefined,
                points: Math.max(1, parseInt(q.points || "5", 10) || 5),
              });
            });
          }

          if (questions.length === 0) {
            warnings.push("No valid questions found for this quiz");
          }

          parsedList.push({
            id: `quiz_${idx}_${Date.now()}`,
            title,
            description,
            subject,
            difficulty,
            timeLimit,
            pointsReward,
            questions,
            warnings,
            selected: questions.length > 0,
          });
        });

        setMultiQuizzes(parsedList);
        return;
      } catch (err: any) {
        // Fall back to CSV parsing if JSON parse failed
      }
    }

    // Parse as CSV using PapaParse
    Papa.parse(rawText, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: normalizeKey,
      complete: (results) => {
        const rows = results.data as Record<string, any>[];
        if (!rows || rows.length === 0) {
          setMultiQuizzes([]);
          setMultiFileError("The uploaded CSV is empty.");
          return;
        }

        // Group rows by quiz title
        const quizGroups = new Map<string, Record<string, any>[]>();

        rows.forEach((row, i) => {
          const rawTitle = row.quiz_title || row.quiz || row.title || row.quiz_name || "";
          const quizTitle = String(rawTitle).trim() || "Default Imported Quiz";
          if (!quizGroups.has(quizTitle)) {
            quizGroups.set(quizTitle, []);
          }
          quizGroups.get(quizTitle)!.push({ ...row, __originalRowIndex: i + 2 });
        });

        const parsedQuizzes: ParsedQuizItem[] = [];

        quizGroups.forEach((groupRows, quizTitle) => {
          const first = groupRows[0];
          const subject = String(first.subject || first.topic || first.category || "General").trim();
          const diffRaw = String(first.difficulty || first.level || "medium").trim().toLowerCase();
          const difficulty = (["easy", "medium", "hard"].includes(diffRaw) ? diffRaw : "medium") as any;
          const timeLimit = Math.max(1, parseInt(first.time_limit || first.duration || first.time || "15", 10) || 15);
          const pointsReward = Math.max(1, parseInt(first.points_reward || first.reward_points || "100", 10) || 100);
          const description = String(first.description || first.desc || "").trim();

          const questions: Question[] = [];
          const warnings: string[] = [];

          groupRows.forEach((r) => {
            const rowNum = r.__originalRowIndex;
            const qText = String(r.question || r.q || r.question_text || "").trim();
            if (!qText) {
              warnings.push(`Row ${rowNum}: Empty question text`);
              return;
            }

            const optA = String(r.option_a ?? r.option_1 ?? r.opt_a ?? r.a ?? "").trim();
            const optB = String(r.option_b ?? r.option_2 ?? r.opt_b ?? r.b ?? "").trim();
            const optC = String(r.option_c ?? r.option_3 ?? r.opt_c ?? r.c ?? "").trim();
            const optD = String(r.option_d ?? r.option_4 ?? r.opt_d ?? r.d ?? "").trim();
            const options = [optA, optB, optC, optD];

            const emptyOpts: string[] = [];
            if (!optA) emptyOpts.push("A");
            if (!optB) emptyOpts.push("B");
            if (!optC) emptyOpts.push("C");
            if (!optD) emptyOpts.push("D");

            if (emptyOpts.length > 2) {
              warnings.push(`Row ${rowNum}: Missing options (${emptyOpts.join(", ")})`);
              return;
            }

            const rawAns = r.correct_answer ?? r.correct ?? r.answer;
            const corr = resolveCorrectAnswer(rawAns, options);
            if (corr === null || corr < 0 || corr >= options.length) {
              warnings.push(`Row ${rowNum}: Invalid correct_answer "${rawAns || ""}" (must be A, B, C, or D)`);
              return;
            }

            const qPts = parseInt(r.question_points || r.q_points || r.points || "5", 10);

            questions.push({
              id: `${Date.now()}_${rowNum}_${Math.random().toString(36).substring(7)}`,
              question: qText,
              options,
              correctAnswer: corr,
              explanation: r.explanation ? String(r.explanation).trim() : undefined,
              points: isNaN(qPts) || qPts < 1 ? 5 : qPts,
            });
          });

          if (questions.length === 0) {
            warnings.push("No valid questions found for this quiz");
          }

          parsedQuizzes.push({
            id: `csv_quiz_${Math.random().toString(36).substring(7)}`,
            title: quizTitle,
            description,
            subject,
            difficulty,
            timeLimit,
            pointsReward,
            questions,
            warnings,
            selected: questions.length > 0,
          });
        });

        setMultiQuizzes(parsedQuizzes);
      },
      error: (err) => {
        setMultiFileError(`Failed to parse file: ${err.message}`);
        setMultiQuizzes([]);
      },
    });
  };

  const parseSingleQuestions = (csvText: string) => {
    setSingleCsvText(csvText);
    if (!csvText.trim()) {
      setSingleParsedQuestions([]);
      return;
    }

    Papa.parse(csvText, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: normalizeKey,
      complete: (results) => {
        const rows = results.data as Record<string, any>[];
        if (!rows || rows.length === 0) {
          setSingleParsedQuestions([]);
          return;
        }

        const parsed = rows.map((row, idx) => {
          const rowIndex = idx + 2;
          const errors: string[] = [];

          const qText = String(row.question || row.question_text || "").trim();
          if (!qText) errors.push("Question text is empty");

          const optA = String(row.option_a || row.option_1 || row.a || "").trim();
          const optB = String(row.option_b || row.option_2 || row.b || "").trim();
          const optC = String(row.option_c || row.option_3 || row.c || "").trim();
          const optD = String(row.option_d || row.option_4 || row.d || "").trim();
          const options = [optA, optB, optC, optD];

          options.forEach((opt, oi) => {
            if (!opt) errors.push(`Option ${["A", "B", "C", "D"][oi]} is empty`);
          });

          const rawAns = row.correct_answer ?? row.correct ?? row.answer;
          const corr = resolveCorrectAnswer(rawAns, options);
          if (corr === null) {
            errors.push(`correct_answer "${rawAns || ""}" must be A, B, C, or D`);
          }

          const qPts = parseInt(row.points || row.question_points || "5", 10);
          if (isNaN(qPts) || qPts < 1) errors.push("points must be a positive number");

          if (errors.length > 0) {
            return { rowIndex, question: null, errors };
          }

          const q: Question = {
            id: `${Date.now()}_${rowIndex}`,
            question: qText,
            options,
            correctAnswer: corr!,
            explanation: row.explanation ? String(row.explanation).trim() : undefined,
            points: isNaN(qPts) ? 5 : qPts,
          };
          return { rowIndex, question: q, errors: [] };
        });

        setSingleParsedQuestions(parsed);
      },
    });
  };

  // ─── FILE UPLOAD HANDLERS ─────────────────────────────────────────────────

  const handleMultiFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMultiFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      parseMultiQuizData(text);
    };
    reader.readAsText(file);
  };

  const handleSingleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSingleFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      parseSingleQuestions(text);
    };
    reader.readAsText(file);
  };

  // ─── ACTIONS ─────────────────────────────────────────────────────────────

  const handleToggleQuizSelect = (id: string) => {
    setMultiQuizzes((prev) =>
      prev.map((q) => (q.id === id ? { ...q, selected: !q.selected } : q))
    );
  };

  const handleSelectAll = (select: boolean) => {
    setMultiQuizzes((prev) =>
      prev.map((q) => (q.questions.length > 0 ? { ...q, selected: select } : q))
    );
  };

  const downloadFile = (content: string, fileName: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleMultiImportSubmit = async () => {
    const selected = multiQuizzes.filter((q) => q.selected && q.questions.length > 0);
    if (selected.length === 0) {
      toast({ title: "No quizzes selected", description: "Select at least one valid quiz to import.", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    setImportProgress(0);
    let succeeded = 0;
    let failed = 0;
    const importedTitles: string[] = [];

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Authentication required to import quizzes.");

      for (let i = 0; i < selected.length; i++) {
        const item = selected[i];
        setImportProgressText(`Importing "${item.title}" (${i + 1} of ${selected.length})...`);
        setImportProgress(Math.round(((i + 1) / selected.length) * 100));

        const { error } = await supabase.from("quizzes").insert({
          title: item.title,
          description: item.description || null,
          subject: item.subject,
          difficulty: item.difficulty,
          time_limit: item.timeLimit,
          points_reward: item.pointsReward,
          questions: item.questions as any,
          is_active: setActiveOnImport,
          created_by: user.id,
        });

        if (error) {
          console.error(`Failed to insert quiz ${item.title}:`, error);
          failed++;
        } else {
          succeeded++;
          importedTitles.push(item.title);
        }
      }

      setImportReport({
        total: selected.length,
        succeeded,
        failed,
        quizTitles: importedTitles,
      });

      if (succeeded > 0) {
        toast({
          title: "🎉 Quizzes Imported Successfully!",
          description: `Imported ${succeeded} quizzes into DLMS database.`,
        });
        if (onDone) onDone();
      } else {
        toast({
          title: "Import Failed",
          description: "Could not import the selected quizzes. Check your network or permissions.",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({ title: "Import Error", description: err.message, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSingleImportSubmit = async () => {
    const validQuestions = singleParsedQuestions.filter((p) => p.question !== null).map((p) => p.question!);
    if (!singleMeta.title.trim()) {
      toast({ title: "Quiz title required", variant: "destructive" });
      return;
    }
    if (!singleMeta.subject.trim()) {
      toast({ title: "Subject required", variant: "destructive" });
      return;
    }
    if (validQuestions.length === 0) {
      toast({ title: "No valid questions found", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Authentication required");

      const { error } = await supabase.from("quizzes").insert({
        title: singleMeta.title.trim(),
        description: singleMeta.description.trim() || null,
        subject: singleMeta.subject.trim(),
        difficulty: singleMeta.difficulty,
        time_limit: singleMeta.timeLimit,
        points_reward: singleMeta.pointsReward,
        questions: validQuestions as any,
        is_active: singleMeta.isActive,
        created_by: user.id,
      });

      if (error) throw error;

      setImportReport({
        total: 1,
        succeeded: 1,
        failed: 0,
        quizTitles: [singleMeta.title.trim()],
      });

      toast({
        title: "Quiz created!",
        description: `"${singleMeta.title}" with ${validQuestions.length} questions saved successfully.`,
      });
      if (onDone) onDone();
    } catch (err: any) {
      toast({ title: "Import failed", description: err.message, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setMultiQuizzes([]);
    setMultiRawInput("");
    setMultiFileName("");
    setMultiFileError(null);
    setSingleMeta({
      title: "",
      description: "",
      subject: "",
      difficulty: "medium",
      timeLimit: 30,
      pointsReward: 100,
      isActive: false,
    });
    setSingleCsvText("");
    setSingleFileName("");
    setSingleParsedQuestions([]);
    setImportReport(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (singleFileInputRef.current) singleFileInputRef.current.value = "";
  };

  // ─── SUCCESS REPORT VIEW ──────────────────────────────────────────────────

  if (importReport) {
    return (
      <Card className="border-emerald-500/30 bg-emerald-500/5">
        <CardContent className="pt-8 pb-8 text-center space-y-5">
          <div className="h-16 w-16 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto ring-8 ring-emerald-500/10">
            <CheckCircle2 className="h-10 w-10" />
          </div>

          <div className="space-y-1">
            <h3 className="text-2xl font-black text-foreground">
              Bulk Import Completed!
            </h3>
            <p className="text-sm text-muted-foreground">
              Successfully created <strong className="text-emerald-600 dark:text-emerald-400">{importReport.succeeded}</strong> of {importReport.total} quizzes.
            </p>
          </div>

          {importReport.quizTitles.length > 0 && (
            <div className="flex flex-wrap justify-center gap-1.5 max-w-xl mx-auto py-2">
              {importReport.quizTitles.map((t, idx) => (
                <Badge key={idx} variant="secondary" className="px-3 py-1 font-semibold text-xs border border-emerald-500/30 bg-card">
                  <Check className="h-3 w-3 mr-1 text-emerald-600" />
                  {t}
                </Badge>
              ))}
            </div>
          )}

          {importReport.failed > 0 && (
            <p className="text-xs text-rose-500 font-semibold">
              ⚠️ {importReport.failed} quizzes could not be imported. Check console logs for details.
            </p>
          )}

          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Button onClick={handleReset} variant="outline" className="font-bold">
              <RefreshCw className="h-4 w-4 mr-2" /> Import Another Batch
            </Button>
            {onNavigateToQuizzes && (
              <Button onClick={onNavigateToQuizzes} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-600/20">
                <ChevronRight className="h-4 w-4 mr-1.5" /> View All Quizzes
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // ─── MAIN FORM VIEW ───────────────────────────────────────────────────────

  const totalQuestionsParsed = multiQuizzes.reduce((sum, q) => sum + q.questions.length, 0);
  const selectedQuizzesCount = multiQuizzes.filter((q) => q.selected).length;

  return (
    <div className="space-y-6">
      {/* Header & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2 text-foreground">
            <Upload className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            Bulk Quizzes Import
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Import multiple quizzes with questions simultaneously via CSV or JSON, or create a quiz from CSV questions.
          </p>
        </div>

        {/* Mode selector pills */}
        <div className="flex items-center gap-1 bg-muted p-1 rounded-xl self-start sm:self-auto border">
          <button
            type="button"
            onClick={() => setImportMode("multi")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              importMode === "multi"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Layers className="h-3.5 w-3.5 text-indigo-500" />
            Multiple Quizzes (Batch)
          </button>
          <button
            type="button"
            onClick={() => setImportMode("single")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              importMode === "single"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <BookOpen className="h-3.5 w-3.5 text-emerald-500" />
            Single Quiz
          </button>
        </div>
      </div>

      {/* MULTI-QUIZ IMPORT MODE */}
      {importMode === "multi" && (
        <div className="space-y-5">
          {/* Quick Guide & Sample Templates */}
          <Card className="border-indigo-500/20 bg-indigo-500/5">
            <CardHeader className="pb-2.5 pt-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <CardTitle className="text-sm font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-2">
                  <Sparkles className="h-4 w-4" /> Multi-Quiz Format Guide
                </CardTitle>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs font-semibold bg-background hover:bg-muted"
                    onClick={() => downloadFile(SAMPLE_MULTI_QUIZ_CSV, "sample_bulk_quizzes.csv", "text/csv")}
                  >
                    <Download className="h-3.5 w-3.5 mr-1 text-indigo-500" />
                    Download Sample CSV
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs font-semibold bg-background hover:bg-muted"
                    onClick={() => downloadFile(SAMPLE_MULTI_QUIZ_JSON, "sample_bulk_quizzes.json", "application/json")}
                  >
                    <FileJson className="h-3.5 w-3.5 mr-1 text-amber-500" />
                    Download Sample JSON
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-muted-foreground pt-0">
              <p>
                In your CSV, provide rows where each row represents a question. Rows sharing the same <code className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">quiz_title</code> are grouped into that quiz!
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  { col: "quiz_title", req: true },
                  { col: "subject", req: false },
                  { col: "difficulty", req: false },
                  { col: "time_limit", req: false },
                  { col: "points_reward", req: false },
                  { col: "question", req: true },
                  { col: "option_a", req: true },
                  { col: "option_b", req: true },
                  { col: "option_c", req: true },
                  { col: "option_d", req: true },
                  { col: "correct_answer", req: true },
                  { col: "explanation", req: false },
                  { col: "question_points", req: false },
                ].map(({ col, req }) => (
                  <Badge
                    key={col}
                    variant={req ? "default" : "secondary"}
                    className={`text-[10px] font-mono ${req ? "bg-indigo-600 text-white" : ""}`}
                  >
                    {col}{!req && " (opt)"}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Upload / Paste Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <FileText className="h-4 w-4 text-indigo-500" />
                Upload CSV or JSON File
              </CardTitle>
              <CardDescription>
                Select a CSV or JSON file containing your quizzes, or paste the text directly.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                className="border-2 border-dashed border-border/80 hover:border-indigo-500/60 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-muted/20 hover:bg-indigo-500/5 group"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="h-12 w-12 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                  <Upload className="h-6 w-6" />
                </div>
                <p className="font-bold text-sm text-foreground">
                  {multiFileName ? multiFileName : "Click or drag & drop CSV / JSON file"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Supports .csv and .json exports from Google Forms, Kahoot, Quizizz, or DLMS
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.json,text/csv,application/json"
                  className="hidden"
                  onChange={handleMultiFileUpload}
                />
              </div>

              {multiFileError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-600 font-medium flex items-center gap-2">
                  <XCircle className="h-4 w-4 shrink-0" />
                  {multiFileError}
                </div>
              )}

              <div className="relative">
                <div className="text-center text-[11px] text-muted-foreground font-bold uppercase tracking-wider mb-2">
                  — Or paste CSV / JSON raw data —
                </div>
                <Textarea
                  placeholder={`quiz_title,subject,difficulty,time_limit,points_reward,question,option_a,option_b,option_c,option_d,correct_answer\nScience 1,Science,easy,15,50,What is H2O?,Water,Air,Salt,Iron,A`}
                  rows={5}
                  value={multiRawInput}
                  onChange={(e) => parseMultiQuizData(e.target.value)}
                  className="font-mono text-xs"
                />
              </div>
            </CardContent>
          </Card>

          {/* Parsed Quizzes Preview */}
          {multiQuizzes.length > 0 && (
            <Card className="border-indigo-500/30">
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      Parsed Quizzes ({multiQuizzes.length})
                    </CardTitle>
                    <CardDescription>
                      Found {totalQuestionsParsed} total questions across {multiQuizzes.length} unique quizzes.
                    </CardDescription>
                  </div>

                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSelectAll(selectedQuizzesCount !== multiQuizzes.length)}
                      className="text-xs font-bold"
                    >
                      {selectedQuizzesCount === multiQuizzes.length ? "Deselect All" : "Select All"}
                    </Button>
                    <Badge className="bg-indigo-600 text-white font-bold">
                      {selectedQuizzesCount} Selected
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Options row */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border">
                  <div className="space-y-0.5">
                    <Label htmlFor="active-toggle" className="text-xs font-bold cursor-pointer">
                      Activate Quizzes Immediately
                    </Label>
                    <p className="text-[11px] text-muted-foreground">
                      If turned off, quizzes are saved as Inactive/Drafts so you can review them first.
                    </p>
                  </div>
                  <Switch
                    id="active-toggle"
                    checked={setActiveOnImport}
                    onCheckedChange={setSetActiveOnImport}
                  />
                </div>

                {/* Quizzes List */}
                <div className="space-y-3">
                  {multiQuizzes.map((quiz, qIdx) => {
                    const isExpanded = expandedQuizId === quiz.id;
                    const hasWarnings = quiz.warnings.length > 0;

                    return (
                      <div
                        key={quiz.id}
                        className={`rounded-xl border transition-all ${
                          quiz.selected
                            ? "bg-card border-indigo-500/40 shadow-sm"
                            : "bg-muted/20 border-border/50 opacity-70"
                        }`}
                      >
                        <div className="p-3.5 flex items-start sm:items-center justify-between gap-3">
                          <div className="flex items-start sm:items-center gap-3 min-w-0">
                            <Checkbox
                              checked={quiz.selected}
                              onCheckedChange={() => handleToggleQuizSelect(quiz.id)}
                              disabled={quiz.questions.length === 0}
                              className="mt-1 sm:mt-0"
                            />
                            <div className="min-w-0 space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-bold text-sm text-foreground truncate">
                                  {qIdx + 1}. {quiz.title}
                                </span>
                                <Badge variant="outline" className="text-[10px] font-semibold">
                                  {quiz.subject}
                                </Badge>
                                <Badge
                                  className={`text-[10px] font-bold ${
                                    quiz.difficulty === "easy"
                                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                      : quiz.difficulty === "medium"
                                      ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                                      : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                                  }`}
                                >
                                  {quiz.difficulty}
                                </Badge>
                              </div>
                              <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-0.5">
                                <span>{quiz.questions.length} Questions</span>
                                <span>•</span>
                                <span>{quiz.timeLimit} Min limit</span>
                                <span>•</span>
                                <span>{quiz.pointsReward} Reward Pts</span>
                                {hasWarnings && (
                                  <>
                                    <span>•</span>
                                    <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                                      <AlertTriangle className="h-3 w-3" />
                                      {quiz.warnings.length} issues
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpandedQuizId(isExpanded ? null : quiz.id)}
                            className="h-8 text-xs shrink-0"
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        </div>

                        {/* Collapsible Questions Preview */}
                        {isExpanded && (
                          <div className="border-t p-3.5 bg-muted/10 space-y-3">
                            {hasWarnings && (
                              <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-2 text-xs text-amber-700 dark:text-amber-400 space-y-1">
                                {quiz.warnings.map((w, wi) => (
                                  <div key={wi}>⚠️ {w}</div>
                                ))}
                              </div>
                            )}

                            <div className="space-y-2">
                              {quiz.questions.map((q, qi) => (
                                <div key={q.id} className="p-2.5 rounded-lg border bg-card text-xs space-y-1.5">
                                  <div className="font-semibold text-foreground flex items-center justify-between">
                                    <span>Q{qi + 1}. {q.question}</span>
                                    <Badge variant="secondary" className="text-[10px]">{q.points} pts</Badge>
                                  </div>
                                  <div className="grid grid-cols-2 gap-1.5 text-muted-foreground">
                                    {q.options.map((opt, oi) => (
                                      <div
                                        key={oi}
                                        className={`px-2 py-1 rounded text-[11px] flex items-center gap-1.5 ${
                                          oi === q.correctAnswer
                                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/30"
                                            : "bg-muted/40"
                                        }`}
                                      >
                                        <span className="opacity-60">{String.fromCharCode(65 + oi)}.</span>
                                        <span className="truncate">{opt}</span>
                                        {oi === q.correctAnswer && <Check className="h-3 w-3 ml-auto text-emerald-600 shrink-0" />}
                                      </div>
                                    ))}
                                  </div>
                                  {q.explanation && (
                                    <p className="text-[10px] text-muted-foreground italic">💡 {q.explanation}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Progress display */}
          {isProcessing && (
            <div className="p-4 rounded-xl border bg-card space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                  {importProgressText}
                </span>
                <span>{importProgress}%</span>
              </div>
              <Progress value={importProgress} className="h-2" />
            </div>
          )}

          {/* Action Footer */}
          <div className="flex items-center justify-between pt-2">
            <Button variant="outline" onClick={handleReset} disabled={isProcessing}>
              <RefreshCw className="h-4 w-4 mr-2" /> Reset
            </Button>
            <Button
              onClick={handleMultiImportSubmit}
              disabled={isProcessing || selectedQuizzesCount === 0}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 shadow-md shadow-indigo-600/20"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Import {selectedQuizzesCount} Quizzes ({totalQuestionsParsed} Qs)
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* SINGLE QUIZ IMPORT MODE */}
      {importMode === "single" && (
        <div className="space-y-5">
          {/* Sample CSV Download banner */}
          <div className="flex items-center justify-between p-3 rounded-xl border bg-muted/30">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <HelpCircle className="h-4 w-4 text-emerald-500" />
              <span>Questions CSV requires columns: <code>question, option_a, option_b, option_c, option_d, correct_answer</code></span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadFile(SAMPLE_SINGLE_QUIZ_CSV, "sample_quiz_questions.csv", "text/csv")}
              className="h-8 text-xs font-bold"
            >
              <Download className="h-3.5 w-3.5 mr-1" /> Sample CSV
            </Button>
          </div>

          {/* Quiz Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-emerald-500" /> Quiz Details
              </CardTitle>
              <CardDescription>Configure the quiz metadata before uploading questions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="sq-title">Quiz Title <span className="text-red-500">*</span></Label>
                  <Input
                    id="sq-title"
                    placeholder="e.g. Science Chapter 5: Periodic Table"
                    value={singleMeta.title}
                    onChange={(e) => setSingleMeta((p) => ({ ...p, title: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sq-subject">Subject <span className="text-red-500">*</span></Label>
                  <Input
                    id="sq-subject"
                    placeholder="e.g. Science, Mathematics, English"
                    value={singleMeta.subject}
                    onChange={(e) => setSingleMeta((p) => ({ ...p, subject: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="sq-desc">Description</Label>
                <Textarea
                  id="sq-desc"
                  placeholder="Brief overview of the quiz topics"
                  rows={2}
                  value={singleMeta.description}
                  onChange={(e) => setSingleMeta((p) => ({ ...p, description: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label>Difficulty</Label>
                  <Select
                    value={singleMeta.difficulty}
                    onValueChange={(v) => setSingleMeta((p) => ({ ...p, difficulty: v as any }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sq-time">Time Limit (mins)</Label>
                  <Input
                    id="sq-time"
                    type="number"
                    min={1}
                    max={180}
                    value={singleMeta.timeLimit}
                    onChange={(e) => setSingleMeta((p) => ({ ...p, timeLimit: parseInt(e.target.value, 10) || 15 }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sq-pts">Points Reward</Label>
                  <Input
                    id="sq-pts"
                    type="number"
                    min={1}
                    value={singleMeta.pointsReward}
                    onChange={(e) => setSingleMeta((p) => ({ ...p, pointsReward: parseInt(e.target.value, 10) || 100 }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Initial Status</Label>
                  <div className="flex items-center gap-2 h-10">
                    <Switch
                      id="sq-active"
                      checked={singleMeta.isActive}
                      onCheckedChange={(v) => setSingleMeta((p) => ({ ...p, isActive: v }))}
                    />
                    <Label htmlFor="sq-active" className="text-xs font-semibold cursor-pointer">
                      {singleMeta.isActive ? "Active" : "Inactive (Draft)"}
                    </Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Upload Questions File */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <FileText className="h-4 w-4 text-emerald-500" /> Upload Questions CSV
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                className="border-2 border-dashed border-border/80 hover:border-emerald-500/60 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-muted/20 hover:bg-emerald-500/5 group"
                onClick={() => singleFileInputRef.current?.click()}
              >
                <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2 group-hover:scale-110 transition-transform" />
                <p className="font-bold text-sm text-foreground">
                  {singleFileName ? singleFileName : "Click or drag & drop questions CSV"}
                </p>
                <input
                  ref={singleFileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={handleSingleFileUpload}
                />
              </div>

              <div className="relative">
                <div className="text-center text-[11px] text-muted-foreground font-bold uppercase tracking-wider mb-2">
                  — Or paste questions CSV text —
                </div>
                <Textarea
                  placeholder={`question,option_a,option_b,option_c,option_d,correct_answer\nWhat is 2+2?,1,2,3,4,D`}
                  rows={4}
                  value={singleCsvText}
                  onChange={(e) => parseSingleQuestions(e.target.value)}
                  className="font-mono text-xs"
                />
              </div>
            </CardContent>
          </Card>

          {/* Single Quiz Questions Preview */}
          {singleParsedQuestions.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Preview: {singleParsedQuestions.filter((p) => p.question !== null).length} valid of {singleParsedQuestions.length} rows parsed
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {singleParsedQuestions.map((item, idx) => (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-lg border text-xs space-y-1 ${
                        item.question
                          ? "bg-card"
                          : "bg-rose-500/10 border-rose-500/30 text-rose-600"
                      }`}
                    >
                      {item.question ? (
                        <>
                          <div className="font-semibold text-foreground flex justify-between">
                            <span>Q{idx + 1}. {item.question.question}</span>
                            <Badge variant="secondary" className="text-[10px]">{item.question.points} pts</Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-1 text-[11px]">
                            {item.question.options.map((opt, oi) => (
                              <span
                                key={oi}
                                className={oi === item.question!.correctAnswer ? "text-emerald-600 font-bold" : "text-muted-foreground"}
                              >
                                {String.fromCharCode(65 + oi)}. {opt}
                              </span>
                            ))}
                          </div>
                        </>
                      ) : (
                        <div>
                          <strong>Row {item.rowIndex}:</strong> {item.errors.join(", ")}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-2">
            <Button variant="outline" onClick={handleReset} disabled={isProcessing}>
              <RefreshCw className="h-4 w-4 mr-2" /> Reset
            </Button>
            <Button
              onClick={handleSingleImportSubmit}
              disabled={
                isProcessing ||
                !singleMeta.title.trim() ||
                !singleMeta.subject.trim() ||
                singleParsedQuestions.filter((p) => p.question !== null).length === 0
              }
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 shadow-md shadow-emerald-600/20"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" /> Create Quiz with Questions
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
