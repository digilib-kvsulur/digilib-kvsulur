import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  BookOpen, Brain, Sparkles, CheckCircle, Target, Lightbulb,
  HelpCircle, ChevronDown, ChevronRight, Loader2, RefreshCw
} from "lucide-react";
import { toast } from "sonner";

const CLASSES = ["1","2","3","4","5","6","7","8","9","10","11","12"];

const SUBJECTS_BY_CLASS: Record<string, string[]> = {
  "1": ["English","Hindi","Mathematics","EVS"],
  "2": ["English","Hindi","Mathematics","EVS"],
  "3": ["English","Hindi","Mathematics","EVS"],
  "4": ["English","Hindi","Mathematics","EVS"],
  "5": ["English","Hindi","Mathematics","EVS"],
  "6": ["English","Hindi","Mathematics","Science","Social Science","Sanskrit"],
  "7": ["English","Hindi","Mathematics","Science","Social Science","Sanskrit"],
  "8": ["English","Hindi","Mathematics","Science","Social Science","Sanskrit"],
  "9": ["English","Hindi","Mathematics","Science","History","Geography","Civics","Economics"],
  "10": ["English","Hindi","Mathematics","Science","History","Geography","Civics","Economics"],
  "11": ["English","Physics","Chemistry","Mathematics","Biology","Economics","History","Geography","Political Science","Accountancy","Business Studies"],
  "12": ["English","Physics","Chemistry","Mathematics","Biology","Economics","History","Geography","Political Science","Accountancy","Business Studies"],
};

// Common NCERT chapter lists per class/subject
const CHAPTER_SUGGESTIONS: Record<string, string[]> = {
  "9_Mathematics": ["Number Systems","Polynomials","Coordinate Geometry","Linear Equations","Triangles","Quadrilaterals","Circles","Heron's Formula","Statistics","Probability"],
  "10_Mathematics": ["Real Numbers","Polynomials","Linear Equations","Quadratic Equations","Arithmetic Progressions","Triangles","Coordinate Geometry","Trigonometry","Circles","Statistics","Probability"],
  "9_Science": ["Matter in Our Surroundings","Is Matter Pure?","Atoms and Molecules","Structure of Atom","Cell - Fundamental Unit","Tissues","Motion","Force and Laws of Motion","Gravitation","Work and Energy","Sound"],
  "10_Science": ["Chemical Reactions","Acids, Bases and Salts","Metals and Non-metals","Carbon Compounds","Life Processes","Electricity","Magnetic Effects","Light - Reflection","Human Eye","Heredity and Evolution"],
  "11_Physics": ["Physical World","Units and Measurements","Motion in a Straight Line","Motion in a Plane","Laws of Motion","Work, Energy and Power","Gravitation","Mechanical Properties of Solids","Thermodynamics","Oscillations","Waves"],
  "12_Physics": ["Electric Charges","Electrostatic Potential","Current Electricity","Moving Charges","Magnetism","Electromagnetic Induction","Alternating Current","Electromagnetic Waves","Ray Optics","Wave Optics","Dual Nature","Atoms","Nuclei","Semiconductor Devices"],
  "11_Chemistry": ["Some Basic Concepts","Structure of Atom","Classification of Elements","Chemical Bonding","States of Matter","Equilibrium","Organic Chemistry","Hydrocarbons","Environmental Chemistry"],
  "12_Chemistry": ["Solid State","Solutions","Electrochemistry","Chemical Kinetics","Surface Chemistry","Coordination Compounds","Haloalkanes","Alcohols","Carbonyl Compounds","Amines","Biomolecules","Polymers"],
};

interface StudySection {
  heading: string;
  content: string;
  icon: React.ComponentType<any>;
}

interface StudyGuideData {
  summary: string;
  keyTopics: string[];
  importantConcepts: string[];
  mcqs: { q: string; options: string[]; answer: number }[];
  studyTips: string[];
  formulasOrFacts: string[];
}

export default function StudyGuide({ userId, studentClass }: { userId?: string; studentClass?: string }) {
  const baseClass = (studentClass || "").replace(/[^0-9]/g, "");
  
  const [selectedClass, setSelectedClass] = useState(baseClass || "9");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedChapter, setSelectedChapter] = useState("");
  const [customChapter, setCustomChapter] = useState("");
  const [loading, setLoading] = useState(false);
  const [guideData, setGuideData] = useState<StudyGuideData | null>(null);
  const [expandedMcq, setExpandedMcq] = useState<number | null>(null);
  const [revealedAnswers, setRevealedAnswers] = useState<number[]>([]);

  const subjects = SUBJECTS_BY_CLASS[selectedClass] || [];
  const chapterKey = `${selectedClass}_${selectedSubject}`;
  const chapters = CHAPTER_SUGGESTIONS[chapterKey] || [];

  const chapterToUse = customChapter.trim() || selectedChapter;

  const generateGuide = async () => {
    if (!selectedSubject || !chapterToUse) {
      toast.error("Please select a subject and chapter first");
      return;
    }
    setLoading(true);
    setGuideData(null);
    setExpandedMcq(null);
    setRevealedAnswers([]);

    const prompt = `You are an expert NCERT/CBSE tutor for Class ${selectedClass} students in India.

Generate a comprehensive study guide for the following:
- Class: ${selectedClass}
- Subject: ${selectedSubject}  
- Chapter/Topic: ${chapterToUse}

Respond ONLY with a valid JSON object in this exact format (no extra text, no markdown):
{
  "summary": "2-3 sentence overview of the chapter",
  "keyTopics": ["topic 1", "topic 2", "topic 3", "topic 4", "topic 5"],
  "importantConcepts": ["concept with brief explanation 1", "concept 2", "concept 3"],
  "formulasOrFacts": ["formula or key fact 1", "formula 2", "formula 3"],
  "studyTips": ["actionable study tip 1", "tip 2", "tip 3"],
  "mcqs": [
    {"q": "question text", "options": ["option A", "option B", "option C", "option D"], "answer": 0},
    {"q": "question text", "options": ["option A", "option B", "option C", "option D"], "answer": 2},
    {"q": "question text", "options": ["option A", "option B", "option C", "option D"], "answer": 1},
    {"q": "question text", "options": ["option A", "option B", "option C", "option D"], "answer": 3},
    {"q": "question text", "options": ["option A", "option B", "option C", "option D"], "answer": 0}
  ]
}

The "answer" field should be the 0-based index of the correct option. Focus on NCERT curriculum.`;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/library-bot`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ messages: [{ role: "user", content: prompt }] })
      });

      if (!res.ok) throw new Error("API error");
      const result = await res.json();
      const text: string = result.reply || result.content || result.message || "";

      // Extract JSON from the reply
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Invalid response format");

      const parsed: StudyGuideData = JSON.parse(jsonMatch[0]);
      setGuideData(parsed);
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate guide. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const toggleAnswer = (idx: number) => {
    setRevealedAnswers(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]);
  };

  return (
    <div className="space-y-5 p-1">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-indigo-500" />
            AI Study Guide
          </h2>
          <p className="text-sm text-muted-foreground">Get AI-powered chapter summaries, key concepts, MCQs &amp; tips.</p>
        </div>
      </div>

      {/* Selector Card */}
      <Card className="border-indigo-200 dark:border-indigo-800/40 bg-indigo-50/50 dark:bg-indigo-950/20">
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 uppercase tracking-wide">Class</Label>
              <Select value={selectedClass} onValueChange={v => { setSelectedClass(v); setSelectedSubject(""); setSelectedChapter(""); }}>
                <SelectTrigger className="bg-white dark:bg-slate-900">
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {CLASSES.map(c => <SelectItem key={c} value={c}>Class {c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 uppercase tracking-wide">Subject</Label>
              <Select value={selectedSubject} onValueChange={v => { setSelectedSubject(v); setSelectedChapter(""); }}>
                <SelectTrigger className="bg-white dark:bg-slate-900">
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 uppercase tracking-wide">Chapter</Label>
              {chapters.length > 0 ? (
                <Select value={selectedChapter} onValueChange={setSelectedChapter}>
                  <SelectTrigger className="bg-white dark:bg-slate-900">
                    <SelectValue placeholder="Select chapter" />
                  </SelectTrigger>
                  <SelectContent>
                    {chapters.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    <SelectItem value="__custom__">✏️ Type custom chapter...</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  placeholder="e.g., Chapter 3 - Cell Structure"
                  value={customChapter}
                  onChange={e => setCustomChapter(e.target.value)}
                  className="bg-white dark:bg-slate-900"
                />
              )}
            </div>
          </div>
          {selectedChapter === "__custom__" && (
            <div className="space-y-1.5">
              <Label>Custom Chapter Name</Label>
              <Input placeholder="Enter chapter name..." value={customChapter} onChange={e => setCustomChapter(e.target.value)} />
            </div>
          )}
          <Button
            onClick={generateGuide}
            disabled={loading || !selectedSubject || !chapterToUse}
            className="w-full bg-indigo-600 hover:bg-indigo-700 gap-2 font-bold"
            size="lg"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Generating Guide...</>
            ) : (
              <><Sparkles className="w-4 h-4" /> Generate Study Guide</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Guide Output */}
      {loading && (
        <Card className="border-border/50">
          <CardContent className="py-16 text-center">
            <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mx-auto mb-3" />
            <p className="text-slate-600 dark:text-slate-400 font-medium">AI is preparing your study guide...</p>
            <p className="text-xs text-muted-foreground mt-1">This may take 10–15 seconds</p>
          </CardContent>
        </Card>
      )}

      {guideData && !loading && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Chapter Summary */}
          <Card className="border-blue-200 dark:border-blue-800/40 bg-blue-50/50 dark:bg-blue-950/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-blue-800 dark:text-blue-300">
                <BookOpen className="w-4 h-4" /> Chapter Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{guideData.summary}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {guideData.keyTopics.map((t, i) => (
                  <Badge key={i} variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 text-xs">{t}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Important Concepts */}
          <Card className="border-violet-200 dark:border-violet-800/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-violet-800 dark:text-violet-300">
                <Brain className="w-4 h-4" /> Important Concepts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {guideData.importantConcepts.map((c, i) => (
                  <li key={i} className="flex gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-violet-500 shrink-0 mt-0.5" />
                    <span className="text-slate-700 dark:text-slate-300">{c}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Formulas / Key Facts */}
          {guideData.formulasOrFacts?.length > 0 && (
            <Card className="border-amber-200 dark:border-amber-800/40 bg-amber-50/50 dark:bg-amber-950/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 text-amber-800 dark:text-amber-300">
                  <Target className="w-4 h-4" /> Formulas &amp; Key Facts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {guideData.formulasOrFacts.map((f, i) => (
                    <li key={i} className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-700/50 rounded-lg px-3 py-2 text-sm font-mono text-amber-900 dark:text-amber-200">
                      {f}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* MCQ Practice */}
          <Card className="border-emerald-200 dark:border-emerald-800/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
                <HelpCircle className="w-4 h-4" /> Practice MCQs
              </CardTitle>
              <CardDescription className="text-xs">Tap on a question to expand, then tap "Reveal Answer".</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {guideData.mcqs.map((mcq, qi) => (
                <div key={qi} className="border border-emerald-200 dark:border-emerald-700/50 rounded-xl overflow-hidden">
                  <button
                    className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
                    onClick={() => setExpandedMcq(expandedMcq === qi ? null : qi)}
                  >
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                      <span className="text-emerald-600 font-bold mr-2">Q{qi + 1}.</span>{mcq.q}
                    </span>
                    {expandedMcq === qi ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
                  </button>
                  {expandedMcq === qi && (
                    <div className="px-4 pb-4 space-y-2">
                      {mcq.options.map((opt, oi) => (
                        <div
                          key={oi}
                          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm border transition-colors ${
                            revealedAnswers.includes(qi) && oi === mcq.answer
                              ? "bg-emerald-100 border-emerald-400 text-emerald-800 dark:bg-emerald-900/30 dark:border-emerald-600 dark:text-emerald-200 font-semibold"
                              : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          <span className="font-bold text-xs w-5 shrink-0">{String.fromCharCode(65 + oi)}.</span>
                          {opt}
                          {revealedAnswers.includes(qi) && oi === mcq.answer && (
                            <CheckCircle className="w-4 h-4 ml-auto text-emerald-600" />
                          )}
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-1 text-xs"
                        onClick={() => toggleAnswer(qi)}
                      >
                        {revealedAnswers.includes(qi) ? "Hide Answer" : "Reveal Answer"}
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Study Tips */}
          <Card className="border-pink-200 dark:border-pink-800/40 bg-pink-50/50 dark:bg-pink-950/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-pink-800 dark:text-pink-300">
                <Lightbulb className="w-4 h-4" /> Study Tips
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {guideData.studyTips.map((tip, i) => (
                  <li key={i} className="flex gap-2 text-sm">
                    <span className="text-pink-500 font-black shrink-0">→</span>
                    <span className="text-slate-700 dark:text-slate-300">{tip}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Regenerate */}
          <div className="flex justify-center">
            <Button variant="outline" size="sm" onClick={generateGuide} className="gap-2">
              <RefreshCw className="w-4 h-4" /> Regenerate Guide
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
