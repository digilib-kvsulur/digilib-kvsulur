import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, ArrowRight, Award, BookOpen, Brain, Briefcase, CheckCircle2,
  Compass, GraduationCap, Layers, Lightbulb, RotateCcw, Sparkles, Target, TrendingUp,
} from "lucide-react";
import {
  Bar, BarChart, PolarAngleAxis, PolarGrid, Radar, RadarChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const STEPS = [
  "Details",
  "Interests",
  "Skills",
  "Personality",
  "Marks",
  "Exams",
  "Preferences",
] as const;

const STREAMS = ["Science (PCM)", "Science (PCB)", "Commerce", "Humanities / Arts"] as const;
const BOARDS = ["CBSE", "ICSE", "State Board"] as const;
const TARGETS = ["India", "Abroad", "Both"] as const;

const INTEREST_ITEMS = [
  { id: "tech", text: "I enjoy building apps, solving coding puzzles, or working with technology.", domain: "tech" },
  { id: "math", text: "I like working with numbers, logic, and mathematical problem solving.", domain: "math" },
  { id: "bio", text: "I am curious about biology, medicine, and how living systems work.", domain: "bio" },
  { id: "design", text: "I enjoy visual design, storytelling, media, or creative expression.", domain: "design" },
  { id: "biz", text: "I like business, finance, entrepreneurship, or managing projects.", domain: "biz" },
  { id: "law", text: "I enjoy debating, reading about society, law, or public policy.", domain: "law" },
  { id: "research", text: "I love deep research, experiments, and discovering how things work.", domain: "research" },
  { id: "people", text: "I feel energized when helping, teaching, or leading people.", domain: "people" },
] as const;

const SKILL_ITEMS = [
  { id: "math", label: "Mathematics", color: "#6366f1" },
  { id: "science", label: "Science", color: "#10b981" },
  { id: "comm", label: "Communication", color: "#ec4899" },
  { id: "creative", label: "Creativity", color: "#f59e0b" },
  { id: "logic", label: "Logical Reasoning", color: "#0ea5e9" },
  { id: "leader", label: "Leadership", color: "#8b5cf6" },
  { id: "tech", label: "Technical Interest", color: "#06b6d4" },
  { id: "analysis", label: "Analytical Thinking", color: "#14b8a6" },
] as const;

const PERSONALITY_ITEMS = [
  { id: "p1", text: "I prefer structured, step-by-step analysis over guessing.", trait: "Analytical" },
  { id: "p2", text: "I enjoy coming up with original ideas and trying new approaches.", trait: "Creative" },
  { id: "p3", text: "I stay calm under exam or deadline pressure.", trait: "Resilient" },
  { id: "p4", text: "I like collaborating in teams and coordinating tasks.", trait: "Collaborative" },
  { id: "p5", text: "I prefer understanding the 'why' behind every concept.", trait: "Investigative" },
  { id: "p6", text: "I like taking initiative when a group needs direction.", trait: "Leadership" },
] as const;

const COMPETITIVE_EXAMS = [
  "JEE (Main/Advanced)",
  "NEET",
  "CLAT",
  "CUET",
  "NDA",
  "BITSAT / VITEEE",
  "State Entrance",
] as const;

const PREFERENCES = [
  "High Salary",
  "Job Security",
  "Follow Passion",
  "Government Job",
  "Startup / Business",
  "Research",
  "Work-Life Balance",
] as const;

const LIKERT_OPTIONS = [
  { value: 1, label: "Strongly Disagree", short: "1", cls: "border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-900/60 dark:text-rose-300" },
  { value: 2, label: "Disagree", short: "2", cls: "border-orange-200 text-orange-700 hover:bg-orange-50 dark:border-orange-900/60 dark:text-orange-300" },
  { value: 3, label: "Neutral", short: "3", cls: "border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300" },
  { value: 4, label: "Agree", short: "4", cls: "border-teal-200 text-teal-700 hover:bg-teal-50 dark:border-teal-900/60 dark:text-teal-300" },
  { value: 5, label: "Strongly Agree", short: "5", cls: "border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-900/60 dark:text-indigo-300" },
] as const;

const SKILL_LEVEL_LABELS: Record<number, string> = {
  1: "Beginner",
  2: "Basic",
  3: "Good",
  4: "Strong",
  5: "Expert",
};

interface AssessmentState {
  fullName: string;
  studentClass: string;
  board: string;
  stream: string;
  target: string;
  interests: Record<string, number>;
  skills: Record<string, number>;
  personality: Record<string, number>;
  marks: Record<string, number>;
  preparingExams: boolean;
  selectedExams: string[];
  otherExam: string;
  preferences: string[];
}

function defaultMarksFor(studentClass: string, stream: string): string[] {
  const cls = Number(studentClass);
  if (cls <= 10) return ["Mathematics", "Science", "English", "Social Science"];
  if (stream === "Science (PCM)") return ["Physics", "Chemistry", "Mathematics", "English"];
  if (stream === "Science (PCB)") return ["Physics", "Chemistry", "Biology", "English"];
  if (stream === "Commerce") return ["Accountancy", "Business Studies", "Economics", "English"];
  return ["History", "Political Science", "Economics", "English"];
}

function storageKey(userId?: string) {
  return `dlms-careerpath-v1:${userId || "guest"}`;
}

function computeReport(state: AssessmentState) {
  const s = state.skills;
  const i = state.interests;
  const avgMark = (() => {
    const vals = Object.values(state.marks);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 75;
  })();

  const engScore = Math.min(98, Math.round(45 + ((i.tech || 3) * 4 + (i.math || 3) * 3 + (s.math || 3) * 3 + (s.tech || 3) * 3 + (s.logic || 3) * 2) * 0.65 + (avgMark - 65) * 0.15));
  const medScore = Math.min(97, Math.round(38 + ((i.bio || 3) * 5 + (i.research || 3) * 2 + (s.science || 3) * 4 + (s.analysis || 3) * 2) * 0.72 + (avgMark - 65) * 0.15));
  const comScore = Math.min(96, Math.round(40 + ((i.biz || 3) * 5 + (s.math || 3) * 2.5 + (s.comm || 3) * 3 + (s.leader || 3) * 2.5) * 0.7));
  const lawScore = Math.min(95, Math.round(38 + ((i.law || 3) * 5 + (i.people || 3) * 2.5 + (s.comm || 3) * 4 + (s.analysis || 3) * 2) * 0.68));
  const desScore = Math.min(95, Math.round(38 + ((i.design || 3) * 5.5 + (s.creative || 3) * 4.5 + (s.comm || 3) * 2) * 0.72));
  const resScore = Math.min(96, Math.round(40 + ((i.research || 3) * 5 + (s.science || 3) * 3 + (s.analysis || 3) * 3.5) * 0.72));

  const streamBoost = (name: string) => {
    if (Number(state.studentClass) <= 10) return 0;
    if (state.stream === "Science (PCM)" && name === "Engineering & Tech") return 8;
    if (state.stream === "Science (PCB)" && name === "Medical & Life Sciences") return 8;
    if (state.stream === "Commerce" && name === "Commerce, Finance & Management") return 8;
    if (state.stream === "Humanities / Arts" && (name === "Law, Policy & Civil Services" || name === "Design & Media")) return 6;
    return 0;
  };

  const paths = [
    {
      name: "Engineering & Tech",
      score: Math.min(99, engScore + streamBoost("Engineering & Tech")),
      roles: [
        { title: "Software Engineer", match: Math.min(98, engScore + 2), note: "Build apps, systems, and cloud platforms." },
        { title: "AI / ML Engineer", match: Math.min(96, Math.round((engScore + resScore) / 2)), note: "Train models and intelligent systems." },
        { title: "Data Scientist", match: Math.min(95, Math.round((engScore + (s.analysis || 3) * 14) / 2)), note: "Turn data into product and science decisions." },
      ],
      exams: ["JEE Main", "JEE Advanced", "BITSAT", "VITEEE", "CUET"],
      branches: [
        { name: "Computer Science (CSE)", match: Math.min(99, engScore + 3), desc: "Algorithms, software systems, AI, and cybersecurity." },
        { name: "Electronics & Comm. (ECE)", match: Math.min(94, engScore - 4), desc: "Embedded systems, chips, telecom, and robotics." },
        { name: "Data Science & AI", match: Math.min(93, engScore - 5), desc: "Applied statistics, machine learning, and big data." },
      ],
    },
    {
      name: "Medical & Life Sciences",
      score: Math.min(99, medScore + streamBoost("Medical & Life Sciences")),
      roles: [
        { title: "Doctor / Clinician (MBBS)", match: Math.min(97, medScore + 2), note: "Diagnose and treat patients across specialties." },
        { title: "Biotech Researcher", match: Math.min(95, Math.round((medScore + resScore) / 2)), note: "Genetics, pharmaceuticals, and lab innovation." },
        { title: "Public Health Specialist", match: Math.min(90, medScore - 4), note: "Epidemiology and healthcare systems." },
      ],
      exams: ["NEET UG", "IAT (IISER)", "CUET", "AIIMS Paramedical"],
      branches: [
        { name: "MBBS / Clinical Medicine", match: Math.min(98, medScore + 2), desc: "Core medical degree and hospital residency." },
        { name: "Biotechnology & Genetics", match: Math.min(94, medScore - 3), desc: "Molecular biology, bioinformatics, and R&D." },
        { name: "Pharmacy (B.Pharm)", match: Math.min(89, medScore - 7), desc: "Drug formulation and clinical pharmacology." },
      ],
    },
    {
      name: "Commerce, Finance & Management",
      score: Math.min(99, comScore + streamBoost("Commerce, Finance & Management")),
      roles: [
        { title: "Chartered Accountant / CFA", match: Math.min(96, comScore + 2), note: "Auditing, taxation, and corporate finance." },
        { title: "Product / Business Analyst", match: Math.min(94, Math.round((comScore + engScore) / 2)), note: "Strategy, metrics, and growth operations." },
        { title: "Investment & FinTech Specialist", match: Math.min(91, comScore - 3), note: "Capital markets and financial technology." },
      ],
      exams: ["CUET", "IPMAT", "CA Foundation", "SET / NPAT"],
      branches: [
        { name: "B.Com (Hons) / Economics", match: Math.min(97, comScore + 2), desc: "Accounting, macroeconomics, and quantitative finance." },
        { name: "BBA / Integrated MBA", match: Math.min(94, comScore - 2), desc: "Management, marketing, and business leadership." },
        { name: "FinTech & Analytics", match: Math.min(90, comScore - 5), desc: "Financial modeling with data tools." },
      ],
    },
    {
      name: "Law, Policy & Civil Services",
      score: Math.min(99, lawScore + streamBoost("Law, Policy & Civil Services")),
      roles: [
        { title: "Corporate / Constitutional Lawyer", match: Math.min(96, lawScore + 2), note: "Legal advisory, litigation, and policy." },
        { title: "Civil Services (UPSC)", match: Math.min(93, Math.round((lawScore + resScore) / 2)), note: "Public administration and governance." },
        { title: "Policy & International Relations", match: Math.min(90, lawScore - 4), note: "Think tanks, diplomacy, and social impact." },
      ],
      exams: ["CLAT", "AILET", "CUET", "UPSC CSE (post-grad)"],
      branches: [
        { name: "BA LL.B (Hons)", match: Math.min(97, lawScore + 2), desc: "5-year integrated law degree at NLUs." },
        { name: "Political Science & Policy", match: Math.min(93, lawScore - 3), desc: "Governance, economics, and public law." },
        { name: "Journalism & Public Affairs", match: Math.min(88, lawScore - 6), desc: "Investigative media and civic communication." },
      ],
    },
    {
      name: "Design & Media",
      score: Math.min(99, desScore + streamBoost("Design & Media")),
      roles: [
        { title: "UI/UX & Product Designer", match: Math.min(97, desScore + 2), note: "Human-centered digital products and interfaces." },
        { title: "Industrial / Architecture Designer", match: Math.min(93, Math.round((desScore + engScore) / 2)), note: "Physical products, spaces, and 3D systems." },
        { title: "Digital Media & Animation Lead", match: Math.min(90, desScore - 4), note: "Visual storytelling and interactive media." },
      ],
      exams: ["UCEED", "NID DAT", "NIFT", "NATA / JEE Paper 2"],
      branches: [
        { name: "B.Des (Interaction / Product)", match: Math.min(98, desScore + 2), desc: "Design thinking, prototyping, and user research." },
        { name: "Architecture (B.Arch)", match: Math.min(92, desScore - 4), desc: "Spatial design, sustainability, and structures." },
        { name: "Communication Design", match: Math.min(90, desScore - 5), desc: "Brand systems, typography, and motion." },
      ],
    },
    {
      name: "Pure Science & Research",
      score: Math.min(99, resScore),
      roles: [
        { title: "Research Scientist (ISRO / DRDO / CSIR)", match: Math.min(97, resScore + 2), note: "Fundamental physics, chemistry, or space R&D." },
        { title: "Quantitative Analyst", match: Math.min(93, Math.round((resScore + engScore) / 2)), note: "Mathematical modeling and simulation." },
        { title: "Academic Professor / Fellow", match: Math.min(90, resScore - 3), note: "Teaching and publishing original research." },
      ],
      exams: ["IAT (IISER)", "NEST (NISER)", "CUET", "KVPY / INSPIRE"],
      branches: [
        { name: "BS-MS Dual Degree (IISER)", match: Math.min(98, resScore + 2), desc: "Interdisciplinary science and lab research." },
        { name: "B.Sc (Hons) Physics / Maths", match: Math.min(94, resScore - 2), desc: "Deep theoretical and experimental foundations." },
        { name: "Computational Science", match: Math.min(91, resScore - 4), desc: "Scientific computing and simulations." },
      ],
    },
  ].sort((a, b) => b.score - a.score);

  const primary = paths[0];
  const backup = paths.slice(1, 4);

  const personalityCounts = PERSONALITY_ITEMS.map((item) => ({
    trait: item.trait,
    score: state.personality[item.id] || 3,
  })).sort((a, b) => b.score - a.score);

  const topPersonality = personalityCounts[0]?.trait || "Analytical";
  const confidence = Math.min(98, Math.max(76, Math.round(primary.score - (primary.score - paths[1].score) * 0.2 + 8)));

  const passionPrefs = state.preferences.filter((p) => ["Follow Passion", "Research", "Work-Life Balance"].includes(p)).length;
  const moneyPrefs = state.preferences.filter((p) => ["High Salary", "Job Security", "Startup / Business"].includes(p)).length;
  const totalPref = passionPrefs + moneyPrefs;
  const passionPct = totalPref ? Math.round((passionPrefs / totalPref) * 100) : 50;
  const moneyPct = 100 - passionPct;

  const skillRadar = SKILL_ITEMS.map((sk) => ({
    skill: sk.label.split(" ")[0],
    value: (state.skills[sk.id] || 3) * 20,
  }));

  const interestBars = INTEREST_ITEMS.map((it) => ({
    area: it.domain.toUpperCase(),
    score: (state.interests[it.id] || 3) * 20,
  }));

  const microSkills = [
    { name: "Algorithmic & Logical Thinking", level: (s.logic || 3) >= 4 ? "Strong" : "Developing", detail: "Pattern recognition and structured problem solving." },
    { name: "Scientific & Analytical Inquiry", level: (s.analysis || 3) >= 4 ? "Strong" : "Growing", detail: "Breaking complex questions into testable steps." },
    { name: "Communication & Leadership", level: ((s.comm || 3) + (s.leader || 3)) / 2 >= 4 ? "Strong" : "Emerging", detail: "Explaining ideas clearly and guiding group work." },
  ];

  const isClass10OrBelow = Number(state.studentClass) <= 10;
  const recommendedStream =
    primary.name === "Engineering & Tech" || primary.name === "Pure Science & Research"
      ? "Science (PCM)"
      : primary.name === "Medical & Life Sciences"
      ? "Science (PCB)"
      : primary.name === "Commerce, Finance & Management"
      ? "Commerce"
      : "Humanities / Arts";

  return {
    paths,
    primary,
    backup,
    topPersonality,
    personalityTraits: personalityCounts.slice(0, 3).map((p) => p.trait),
    confidence,
    passionPct,
    moneyPct,
    skillRadar,
    interestBars,
    microSkills,
    isClass10OrBelow,
    recommendedStream,
  };
}

export default function CareerPathFinder({
  studentClass,
  userId,
}: {
  studentClass: string;
  userId?: string;
}) {
  const defaultClass = String(Math.min(12, Math.max(6, Number(String(studentClass || "").match(/\d+/)?.[0] || 11))));
  const [step, setStep] = useState(0);
  const [showResults, setShowResults] = useState(false);

  const [state, setState] = useState<AssessmentState>(() => {
    try {
      const saved = localStorage.getItem(storageKey(userId));
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.state) return parsed.state as AssessmentState;
      }
    } catch {
      // ignore storage errors
    }
    return {
      fullName: "",
      studentClass: defaultClass,
      board: "CBSE",
      stream: "Science (PCM)",
      target: "India",
      interests: Object.fromEntries(INTEREST_ITEMS.map((it) => [it.id, 3])),
      skills: Object.fromEntries(SKILL_ITEMS.map((sk) => [sk.id, 3])),
      personality: Object.fromEntries(PERSONALITY_ITEMS.map((p) => [p.id, 3])),
      marks: Object.fromEntries(defaultMarksFor(defaultClass, "Science (PCM)").map((m) => [m, 80])),
      preparingExams: false,
      selectedExams: [],
      otherExam: "",
      preferences: ["Follow Passion", "High Salary"],
    };
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey(userId));
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.showResults) setShowResults(true);
      }
    } catch {
      // ignore
    }
  }, [userId]);

  const markSubjects = useMemo(
    () => defaultMarksFor(state.studentClass, state.stream),
    [state.studentClass, state.stream],
  );

  const report = useMemo(() => computeReport(state), [state]);

  const saveAndShowResults = () => {
    setShowResults(true);
    try {
      localStorage.setItem(storageKey(userId), JSON.stringify({ state, showResults: true }));
    } catch {
      // ignore
    }
  };

  const resetAssessment = () => {
    setShowResults(false);
    setStep(0);
    try {
      localStorage.removeItem(storageKey(userId));
    } catch {
      // ignore
    }
  };

  if (showResults) {
    const displayName = state.fullName.trim() || "Student";
    return (
      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <Card className="overflow-hidden rounded-2xl border-0 bg-gradient-to-br from-indigo-600 via-violet-600 to-teal-500 text-white shadow-lg">
          <CardContent className="p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Badge className="bg-white/20 text-white hover:bg-white/25 border-0 text-[11px] font-semibold">
                  CareerPath AI Blueprint
                </Badge>
                <h2 className="mt-2 text-xl sm:text-2xl font-black tracking-tight">
                  {displayName}&apos;s Career Report
                </h2>
                <p className="mt-1 text-xs sm:text-sm text-indigo-100 max-w-2xl">
                  {report.isClass10OrBelow
                    ? `Recommended stream after Class 10: ${report.recommendedStream}, aligned with ${report.primary.name}.`
                    : `Strongest alignment with ${report.primary.name} based on your ${state.stream} profile, skills, and preferences.`}
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={resetAssessment}
                className="rounded-xl bg-white/15 text-white hover:bg-white/25 border border-white/20"
              >
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Retake Assessment
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              <div className="rounded-xl bg-white/15 px-3 py-1.5 text-xs font-semibold backdrop-blur-sm">
                Primary Path: {report.primary.name}
              </div>
              <div className="rounded-xl bg-white/15 px-3 py-1.5 text-xs font-semibold backdrop-blur-sm">
                Personality: {report.topPersonality}
              </div>
              <div className="rounded-xl bg-white/15 px-3 py-1.5 text-xs font-semibold backdrop-blur-sm">
                Confidence: {report.confidence}%
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="flex w-full overflow-x-auto justify-start bg-muted/50 p-1 rounded-xl no-scrollbar">
            <TabsTrigger value="overview" className="rounded-lg text-xs sm:text-sm">Overview</TabsTrigger>
            <TabsTrigger value="analysis" className="rounded-lg text-xs sm:text-sm">Deep Analysis</TabsTrigger>
            <TabsTrigger value="insights" className="rounded-lg text-xs sm:text-sm">AI Insights</TabsTrigger>
            <TabsTrigger value="roadmap" className="rounded-lg text-xs sm:text-sm">Roadmap & Plan</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="rounded-2xl shadow-none">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" /> Career Probability Scores
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {report.paths.map((p) => (
                    <div key={p.name} className="space-y-1">
                      <div className="flex items-center justify-between text-xs sm:text-sm font-medium">
                        <span>{p.name}</span>
                        <span className="font-bold text-primary tabular-nums">{p.score}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-teal-500 transition-all duration-500"
                          style={{ width: `${p.score}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="rounded-2xl shadow-none">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-primary" /> Top Career Paths
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5">
                  {report.primary.roles.map((role) => (
                    <div key={role.title} className="flex items-center justify-between gap-3 rounded-xl border p-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">{role.title}</p>
                        <p className="text-xs text-muted-foreground">{role.note}</p>
                      </div>
                      <Badge variant="secondary" className="shrink-0 rounded-full font-bold text-primary">
                        {role.match}%
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="rounded-2xl shadow-none">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-primary" /> Recommended Degrees & Branches
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5">
                  {report.primary.branches.map((b) => (
                    <div key={b.name} className="rounded-xl border p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold">{b.name}</p>
                        <Badge variant="outline" className="rounded-full text-xs">{b.match}% match</Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{b.desc}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="rounded-2xl shadow-none">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Award className="h-4 w-4 text-primary" /> Recommended Entrance Exams & Profile
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {report.primary.exams.map((exam) => (
                      <Badge key={exam} variant="secondary" className="rounded-full px-3 py-1 text-xs font-semibold">
                        {exam}
                      </Badge>
                    ))}
                    {state.preparingExams && state.selectedExams.map((exam) => (
                      <Badge key={`sel-${exam}`} className="rounded-full px-3 py-1 text-xs font-semibold">
                        Preparing: {exam}
                      </Badge>
                    ))}
                  </div>
                  <div className="rounded-xl bg-muted/40 p-3 space-y-1.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Personality Profile: {report.topPersonality}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {report.personalityTraits.map((t) => (
                        <Badge key={t} variant="outline" className="rounded-full text-xs">{t}</Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="analysis" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="rounded-2xl shadow-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Skill Radar</CardTitle>
                </CardHeader>
                <CardContent className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={report.skillRadar}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="skill" tick={{ fontSize: 11 }} />
                      <Radar name="Skill" dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.35} />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="rounded-2xl shadow-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Interest Analysis</CardTitle>
                </CardHeader>
                <CardContent className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={report.interestBars} layout="vertical" margin={{ left: 10, right: 16 }}>
                      <XAxis type="number" domain={[0, 100]} hide />
                      <YAxis type="category" dataKey="area" width={72} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="score" fill="#14b8a6" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="insights" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="rounded-2xl shadow-none">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Brain className="h-4 w-4 text-primary" /> Decision Confidence Score
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-primary tabular-nums">{report.confidence}%</span>
                    <Badge className="rounded-full">Strong Recommendation</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Reflects how consistently your interests, self-rated skills, marks, and career preferences align with {report.primary.name}.
                  </p>
                </CardContent>
              </Card>

              <Card className="rounded-2xl shadow-none">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Compass className="h-4 w-4 text-primary" /> Passion vs Money Balance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span>Passion & Purpose ({report.passionPct}%)</span>
                    <span>Stability & Pay ({report.moneyPct}%)</span>
                  </div>
                  <div className="flex h-3 overflow-hidden rounded-full bg-muted">
                    <div className="bg-indigo-500 transition-all" style={{ width: `${report.passionPct}%` }} />
                    <div className="bg-teal-500 transition-all" style={{ width: `${report.moneyPct}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Balanced career choices help you stay motivated through long exam prep and college years.
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card className="rounded-2xl shadow-none">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-primary" /> Micro-Skill Detection
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-3">
                {report.microSkills.map((ms) => (
                  <div key={ms.name} className="rounded-xl border p-3 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold">{ms.name}</p>
                      <Badge variant="secondary" className="rounded-full text-[11px]">{ms.level}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{ms.detail}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="roadmap" className="space-y-4">
            <Card className="rounded-2xl shadow-none">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" /> Your Career Roadmap
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border p-3.5 space-y-1.5">
                  <Badge variant="outline" className="rounded-full">0–2 Months · Foundation</Badge>
                  <p className="text-sm font-semibold">Lock core NCERT concepts</p>
                  <p className="text-xs text-muted-foreground">Complete chapter notes, formula sheets, and weekly practice in Study Hub.</p>
                </div>
                <div className="rounded-xl border p-3.5 space-y-1.5">
                  <Badge variant="outline" className="rounded-full">2–6 Months · Exam Prep</Badge>
                  <p className="text-sm font-semibold">Target {report.primary.exams[0]}</p>
                  <p className="text-xs text-muted-foreground">Solve timed PYQs and mock tests; review weak chapters with flashcards.</p>
                </div>
                <div className="rounded-xl border p-3.5 space-y-1.5">
                  <Badge variant="outline" className="rounded-full">6–12 Months · Portfolio</Badge>
                  <p className="text-sm font-semibold">Build real proof of skill</p>
                  <p className="text-xs text-muted-foreground">Complete Skills Lab projects and verify official exam/counselling dates.</p>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl shadow-none">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Backup Career Paths</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2.5 sm:grid-cols-3">
                {report.backup.map((b, idx) => (
                  <div key={b.name} className="rounded-xl border p-3">
                    <p className="text-xs font-bold text-muted-foreground">Backup #{idx + 1}</p>
                    <p className="mt-0.5 text-sm font-semibold">{b.name}</p>
                    <p className="mt-1 text-xs text-primary font-semibold">{b.score}% alignment</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  const progressPct = Math.round(((step + 1) / STEPS.length) * 100);

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <Card className="overflow-hidden rounded-2xl border-primary/20 bg-gradient-to-br from-indigo-600/10 via-card to-teal-500/10 shadow-none">
        <CardContent className="p-4 sm:p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-indigo-600 to-teal-500 text-white shadow-sm">
                <Sparkles className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm sm:text-base font-bold">CareerPath AI Assessment</p>
                <p className="text-xs text-muted-foreground">Step {step + 1} of {STEPS.length} · {STEPS[step]}</p>
              </div>
            </div>
            <Badge variant="secondary" className="rounded-full font-semibold tabular-nums">{progressPct}%</Badge>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-teal-500 transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {STEPS.map((label, idx) => (
              <button
                key={label}
                type="button"
                onClick={() => setStep(idx)}
                className={`inline-flex min-h-8 shrink-0 items-center gap-1 rounded-full px-3 text-xs font-semibold transition-all ${
                  idx === step
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : idx < step
                    ? "bg-primary/10 text-primary"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted"
                }`}
              >
                {idx < step && <CheckCircle2 className="h-3 w-3" />}
                {label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-none">
        <CardContent className="p-4 sm:p-6 space-y-4">
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold">Tell us about you</h3>
                <p className="text-xs text-muted-foreground">We tailor stream, exam, and career recommendations to your class.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="cp-name" className="text-xs">Full Name</Label>
                  <Input
                    id="cp-name"
                    value={state.fullName}
                    onChange={(e) => setState((s) => ({ ...s, fullName: e.target.value }))}
                    placeholder="Your name"
                    className="h-10 rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Class</Label>
                  <Select
                    value={state.studentClass}
                    onValueChange={(v) => setState((s) => ({ ...s, studentClass: v }))}
                  >
                    <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["6", "7", "8", "9", "10", "11", "12"].map((c) => (
                        <SelectItem key={c} value={c}>Class {c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Board</Label>
                  <Select value={state.board} onValueChange={(v) => setState((s) => ({ ...s, board: v }))}>
                    <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {BOARDS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Study Destination</Label>
                  <Select value={state.target} onValueChange={(v) => setState((s) => ({ ...s, target: v }))}>
                    <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TARGETS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {Number(state.studentClass) >= 11 && (
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs">Your Current Stream</Label>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {STREAMS.map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setState((s) => ({ ...s, stream: st }))}
                          className={`min-h-10 rounded-xl border px-3 text-xs font-semibold transition-all ${
                            state.stream === st ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted/50"
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3">
              <div>
                <h3 className="text-lg font-bold">Your Interests</h3>
                <p className="text-xs text-muted-foreground">Rate each statement from 1 (Strongly Disagree) to 5 (Strongly Agree).</p>
              </div>
              <div className="space-y-2.5">
                {INTEREST_ITEMS.map((item, idx) => (
                  <div key={item.id} className="rounded-xl border p-3 space-y-2">
                    <p className="text-sm font-medium">{idx + 1}. {item.text}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {LIKERT_OPTIONS.map((opt) => {
                        const active = state.interests[item.id] === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setState((s) => ({ ...s, interests: { ...s.interests, [item.id]: opt.value } }))}
                            className={`min-h-8 rounded-full border px-3 text-xs font-medium transition-all ${
                              active ? "border-primary bg-primary text-primary-foreground shadow-sm" : opt.cls
                            }`}
                          >
                            {opt.short} · {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <div>
                <h3 className="text-lg font-bold">Self-Rated Skills</h3>
                <p className="text-xs text-muted-foreground">Rate your comfort in each skill from 1 (Beginner) to 5 (Expert).</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {SKILL_ITEMS.map((sk) => {
                  const val = state.skills[sk.id] || 3;
                  return (
                    <div key={sk.id} className="rounded-xl border p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold">{sk.label}</span>
                        <Badge variant="secondary" className="rounded-full text-xs">{val} · {SKILL_LEVEL_LABELS[val]}</Badge>
                      </div>
                      <div className="grid grid-cols-5 gap-1.5">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setState((s) => ({ ...s, skills: { ...s.skills, [sk.id]: n } }))}
                            className={`h-9 rounded-lg border text-xs font-bold transition-all ${
                              val === n ? "border-primary bg-primary text-primary-foreground shadow-sm" : "hover:bg-muted/60"
                            }`}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <div>
                <h3 className="text-lg font-bold">Personality & Work Style</h3>
                <p className="text-xs text-muted-foreground">How do you naturally approach learning and challenges?</p>
              </div>
              <div className="space-y-2.5">
                {PERSONALITY_ITEMS.map((item, idx) => (
                  <div key={item.id} className="rounded-xl border p-3 space-y-2">
                    <p className="text-sm font-medium">{idx + 1}. {item.text}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {LIKERT_OPTIONS.map((opt) => {
                        const active = state.personality[item.id] === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setState((s) => ({ ...s, personality: { ...s.personality, [item.id]: opt.value } }))}
                            className={`min-h-8 rounded-full border px-3 text-xs font-medium transition-all ${
                              active ? "border-teal-600 bg-teal-600 text-white shadow-sm" : opt.cls
                            }`}
                          >
                            {opt.short} · {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-3">
              <div>
                <h3 className="text-lg font-bold">Academic Marks</h3>
                <p className="text-xs text-muted-foreground">Enter your recent scores out of 100.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {markSubjects.map((subj) => (
                  <div key={subj} className="rounded-xl border p-3.5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor={`mark-${subj}`} className="text-sm font-semibold">{subj}</Label>
                      <span className="text-xs text-muted-foreground">/ 100</span>
                    </div>
                    <Input
                      id={`mark-${subj}`}
                      type="number"
                      min={0}
                      max={100}
                      value={state.marks[subj] ?? 80}
                      onChange={(e) => {
                        const n = Math.min(100, Math.max(0, Number(e.target.value) || 0));
                        setState((s) => ({ ...s, marks: { ...s.marks, [subj]: n } }));
                      }}
                      className="h-10 rounded-xl"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold">Competitive Exams</h3>
                <p className="text-xs text-muted-foreground">Tell us about your exam preparation and scores.</p>
              </div>

              <div className="flex items-center justify-between gap-4 rounded-2xl border p-4 shadow-xs">
                <div>
                  <p className="text-sm font-semibold">Are you preparing for competitive exams?</p>
                  <p className="text-xs text-muted-foreground">JEE, NEET, CLAT, CUET, etc.</p>
                </div>
                <Switch
                  checked={state.preparingExams}
                  onCheckedChange={(checked) => setState((s) => ({ ...s, preparingExams: checked }))}
                  aria-label="Are you preparing for competitive exams"
                />
              </div>

              {state.preparingExams && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex flex-wrap gap-2">
                    {COMPETITIVE_EXAMS.map((exam) => {
                      const active = state.selectedExams.includes(exam);
                      return (
                        <button
                          key={exam}
                          type="button"
                          onClick={() =>
                            setState((s) => ({
                              ...s,
                              selectedExams: active
                                ? s.selectedExams.filter((x) => x !== exam)
                                : [...s.selectedExams, exam],
                            }))
                          }
                          className={`min-h-9 rounded-full border px-3.5 text-xs font-semibold transition-all ${
                            active ? "border-primary bg-primary text-primary-foreground shadow-sm" : "hover:bg-muted/60"
                          }`}
                        >
                          {exam}
                        </button>
                      );
                    })}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="cp-other-exam" className="text-xs">Other Exam (optional)</Label>
                    <Input
                      id="cp-other-exam"
                      value={state.otherExam}
                      onChange={(e) => setState((s) => ({ ...s, otherExam: e.target.value }))}
                      placeholder="e.g. Olympiads, IISER IAT, NATA…"
                      className="h-10 rounded-xl"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 6 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-lg font-bold">Career Preferences</h3>
                  <p className="text-xs text-muted-foreground">Pick what matters most to your future.</p>
                </div>
                <Badge variant="secondary" className="rounded-full">{state.preferences.length} selected</Badge>
              </div>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {PREFERENCES.map((pref) => {
                  const active = state.preferences.includes(pref);
                  return (
                    <button
                      key={pref}
                      type="button"
                      onClick={() =>
                        setState((s) => ({
                          ...s,
                          preferences: active
                            ? s.preferences.filter((p) => p !== pref)
                            : [...s.preferences, pref],
                        }))
                      }
                      className={`flex min-h-12 items-center justify-between rounded-xl border px-3.5 text-sm font-medium transition-all ${
                        active ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted/50"
                      }`}
                    >
                      <span>{pref}</span>
                      {active && <CheckCircle2 className="h-4 w-4 text-primary" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              disabled={step === 0}
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              className="min-h-10 rounded-xl"
            >
              <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
            </Button>

            {step < STEPS.length - 1 ? (
              <Button
                type="button"
                onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
                className="min-h-10 rounded-xl"
              >
                Next <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={saveAndShowResults}
                className="min-h-10 rounded-xl bg-gradient-to-r from-indigo-600 to-teal-500 text-white font-semibold shadow-sm hover:opacity-95"
              >
                <Sparkles className="mr-1.5 h-4 w-4" /> Get AI Results
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
