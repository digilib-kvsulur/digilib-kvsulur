import { useState } from "react";
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
import { getCuratedCurriculumGuide, listCurriculumGuides } from "@/data/curriculumGuides";

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
  "10_History": ["Nationalism in India","The Rise of Nationalism in Europe","The Making of a Global World","The Age of Industrialisation","Print Culture and the Modern World"],
  "9_History": ["The French Revolution","Socialism in Europe and the Russian Revolution","Nazism and the Rise of Hitler","Forest Society and Colonialism","Pastoralists in the Modern World"],
  "10_Geography": ["Resources and Development","Forest and Wildlife Resources","Water Resources","Agriculture","Minerals and Energy Resources","Manufacturing Industries","Lifelines of National Economy"],
  "10_Civics": ["Power Sharing","Federalism","Gender, Religion and Caste","Political Parties","Outcomes of Democracy"],
  "10_Economics": ["Development","Sectors of the Indian Economy","Money and Credit","Globalisation and the Indian Economy","Consumer Rights"],
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

  const guidesForClass = listCurriculumGuides(selectedClass);
  const subjects = Array.from(new Set(guidesForClass.map((item) => item.subject)));
  const chapters = guidesForClass.filter((item) => item.subject === selectedSubject);
  const chapterToUse = selectedChapter;

  const generateGuide = async () => {
    if (!selectedSubject || !chapterToUse) {
      toast.error("Please select a subject and chapter first");
      return;
    }
    const curatedGuide = getCuratedCurriculumGuide(selectedClass, selectedSubject, chapterToUse);
    if (!curatedGuide) {
      toast.info("This chapter does not have a DLMS guide yet. Choose a chapter marked as available.");
      return;
    }
    setLoading(true);
    setGuideData(null);
    setExpandedMcq(null);
    setRevealedAnswers([]);

    setGuideData(curatedGuide);
    setLoading(false);
    toast.success("DLMS chapter guide opened.");
  };

  const toggleAnswer = (idx: number) => {
    setRevealedAnswers(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-1 animate-in fade-in duration-200">
      {/* Hero Header */}
      <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-cyan-600 p-5 text-white shadow-lg sm:p-7">
        <div className="absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold tracking-wide text-indigo-50 backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5" /> CHAPTER STUDY GUIDE
            </div>
            <h2 className="mt-2.5 text-2xl font-black tracking-tight sm:text-3xl">
              Master every chapter faster
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-indigo-100 max-w-xl">
              Structured chapter summaries, key concepts, formulas, and quick self-check MCQs tailored to your class.
            </p>
          </div>
          {selectedClass && (
            <Badge className="w-fit shrink-0 bg-white/20 text-white hover:bg-white/25 border-0 rounded-full px-3.5 py-1 text-xs font-bold">
              Class {selectedClass}
            </Badge>
          )}
        </div>
      </header>

      {/* Selector Card */}
      <Card className="rounded-2xl border-border/70 bg-card/90 shadow-sm">
        <CardContent className="p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Class</Label>
              <Select value={selectedClass} onValueChange={v => { setSelectedClass(v); setSelectedSubject(""); setSelectedChapter(""); setCustomChapter(""); }}>
                <SelectTrigger className="h-10 rounded-xl bg-background">
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {CLASSES.map(c => <SelectItem key={c} value={c}>Class {c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Subject</Label>
              <Select value={selectedSubject} onValueChange={v => { setSelectedSubject(v); setSelectedChapter(""); setCustomChapter(""); }}>
                <SelectTrigger className="h-10 rounded-xl bg-background">
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Chapter</Label>
              {chapters.length > 0 ? (
                <Select value={selectedChapter} onValueChange={setSelectedChapter}>
                  <SelectTrigger className="h-10 rounded-xl bg-background">
                    <SelectValue placeholder="Select chapter" />
                  </SelectTrigger>
                  <SelectContent>
                    {chapters.map((item) => <SelectItem key={item.chapter} value={item.chapter}>{item.chapter}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <div className="rounded-xl border border-dashed p-2.5 text-xs text-muted-foreground">No authored chapter guides are available for this class and subject yet.</div>
              )}
            </div>
          </div>
          {chapters.length > 0 && <p className="text-xs text-muted-foreground">Showing chapters with guide content currently available in DLMS.</p>}
          <Button
            onClick={generateGuide}
            disabled={loading || !selectedSubject || !chapterToUse}
            className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:opacity-95 text-white gap-2 font-bold shadow-sm transition-all active:scale-[0.99]"
            size="lg"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Generating Guide...</>
            ) : (
              <><BookOpen className="w-4 h-4" /> Open Chapter Guide</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Guide Output */}
      {loading && (
        <Card className="border-border/50">
          <CardContent className="py-16 text-center">
            <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mx-auto mb-3" />
            <p className="text-slate-600 dark:text-slate-400 font-medium">Opening chapter guide...</p>
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
