import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { CheckCircle2, RotateCcw, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { parseChapterPracticeSet } from "@/lib/chapterPractice";

export default function ChapterPracticeSet({ resourceId, content }: { resourceId: string; content: string | null }) {
  const parsed = useMemo(() => parseChapterPracticeSet(content), [content]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [checked, setChecked] = useState<Record<number, boolean>>({});

  if (parsed.error) return <Card className="border-destructive/30"><CardContent className="p-4"><p role="alert" className="text-sm text-destructive">This practice set is unavailable. Please ask a teacher to review it.</p></CardContent></Card>;

  const { questions, instructions } = parsed.data;
  const answeredCount = Object.values(checked).filter(Boolean).length;
  const correctCount = questions.reduce((count, question, index) => count + (checked[index] && answers[index] === question.correct_index ? 1 : 0), 0);
  const checkAnswer = (index: number) => setChecked((current) => ({ ...current, [index]: true }));
  const selectAnswer = (questionIndex: number, optionIndex: number) => {
    setAnswers((current) => ({ ...current, [questionIndex]: optionIndex }));
    setChecked((current) => ({ ...current, [questionIndex]: false }));
  };
  const reset = () => { setAnswers({}); setChecked({}); };
  const markdown = (text: string) => <div className="prose prose-sm max-w-none dark:prose-invert"><ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{text}</ReactMarkdown></div>;
  const inlineMarkdown = (text: string) => <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]} components={{ p: ({ children }) => <span>{children}</span> }}>{text}</ReactMarkdown>;

  return <div className="space-y-3 rounded-xl border bg-muted/20 p-3 sm:p-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-sm font-semibold">Practice · {answeredCount} of {questions.length} checked</p>
      {answeredCount > 0 && <Badge variant="secondary">{correctCount} correct</Badge>}
    </div>
    {instructions && <p className="text-sm text-muted-foreground">{instructions}</p>}
    {questions.map((question, questionIndex) => {
      const isChecked = checked[questionIndex];
      const isCorrect = answers[questionIndex] === question.correct_index;
      return <Card key={questionIndex} className="bg-background">
        <CardContent className="space-y-3 p-4">
          <h4 className="text-sm font-semibold">Question {questionIndex + 1} of {questions.length}</h4>
          {markdown(question.prompt)}
          <fieldset className="space-y-2">
            <legend className="sr-only">Choose an answer for question {questionIndex + 1}</legend>
            {question.options.map((option, optionIndex) => {
              const selected = answers[questionIndex] === optionIndex;
              const isCorrectOption = isChecked && question.correct_index === optionIndex;
              const isWrongSelection = isChecked && selected && !isCorrect;
              return <label key={optionIndex} className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${isCorrectOption ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/30" : isWrongSelection ? "border-destructive bg-destructive/5" : selected ? "border-primary bg-primary/5" : "hover:bg-muted/40"}`}>
                <input type="radio" className="mt-1 accent-primary" name={`practice-${resourceId}-${questionIndex}`} checked={selected} onChange={() => selectAnswer(questionIndex, optionIndex)} />
                <span className="min-w-0 flex-1">{inlineMarkdown(option)}</span>
                {isCorrectOption && <CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />}
                {isWrongSelection && <XCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />}
              </label>;
            })}
          </fieldset>
          {!isChecked ? <Button type="button" size="sm" disabled={answers[questionIndex] === undefined} onClick={() => checkAnswer(questionIndex)}>Check answer</Button> : <div aria-live="polite" className={`rounded-lg p-3 text-sm ${isCorrect ? "bg-emerald-50 text-emerald-950 dark:bg-emerald-950/30 dark:text-emerald-100" : "bg-amber-50 text-amber-950 dark:bg-amber-950/30 dark:text-amber-100"}`}>
            <p className="font-semibold">{isCorrect ? "Correct" : "Not quite"}</p>
            {!isCorrect && <div className="mt-1"><span className="font-medium">Correct answer: </span>{inlineMarkdown(question.options[question.correct_index])}</div>}
            <div className="mt-1">{markdown(question.explanation)}</div>
          </div>}
        </CardContent>
      </Card>;
    })}
    {answeredCount > 0 && <Button type="button" variant="ghost" size="sm" className="gap-2" onClick={reset}><RotateCcw className="h-4 w-4" /> Try again</Button>}
    <p className="text-xs text-muted-foreground">Practice answers are not graded or added to points.</p>
  </div>;
}
