import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MessageSquare,
  ArrowLeft,
  Send,
  Loader2,
  CheckCircle2,
  Star,
  Sparkles,
  AlertTriangle,
  Paperclip,
  X,
  Lightbulb,
  Bug,
  Heart,
  BookOpen,
  Palette,
  HelpCircle,
  Frown,
  Meh,
  Smile,
  SmilePlus,
  HeartHandshake,
  Clock,
  LifeBuoy,
  Copy,
  Check,
  History,
  User,
  ShieldCheck,
  EyeOff,
  Tag,
  RefreshCw,
  FileCheck,
  ChevronRight,
  UploadCloud,
  FileText
} from "lucide-react";

interface FeedbackItem {
  id: string;
  reference_id: string | null;
  category: string;
  subject: string;
  description?: string | null;
  feedback_text?: string | null;
  message?: string | null;
  rating: number;
  area: string | null;
  urgency: string;
  created_at: string;
}

export default function Feedback({ isEmbedded }: { isEmbedded?: boolean }) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState("");
  const [copiedRef, setCopiedRef] = useState(false);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState<"submit" | "history">("submit");

  // User feedback history
  const [historyItems, setHistoryItems] = useState<FeedbackItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Wizard steps: 1 = Category & Tags, 2 = Experience Rating & Area, 3 = Message Details
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [rating, setRating] = useState(5);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isAnonymous, setIsAnonymous] = useState(false);

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    category: "suggestion",
    urgency: "low",
    area: "Books & Catalog",
    subject: "",
    description: "",
    allowFollowUp: true,
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        supabase
          .from("profiles")
          .select("first_name, last_name, email")
          .eq("id", session.user.id)
          .single()
          .then(({ data }) => {
            if (data) {
              const name = `${data.first_name || ""} ${data.last_name || ""}`.trim();
              const mail = data.email || session.user.email || "";
              setForm((f) => ({
                ...f,
                fullName: name || session.user.email?.split("@")[0] || "Student",
                email: mail,
              }));
            }
          });
      }
    });
  }, []);

  // Fetch past user feedback for the history tab
  const fetchMyHistory = async () => {
    if (!user?.id) return;
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from("user_feedback")
        .select("id, reference_id, category, subject, description, feedback_text, message, rating, area, urgency, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setHistoryItems(data as FeedbackItem[]);
      }
    } catch (err) {
      console.warn("Could not load feedback history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === "history" && user?.id) {
      fetchMyHistory();
    }
  }, [activeTab, user?.id]);

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const copyRefToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedRef(true);
    toast({ title: "Copied!", description: `Reference code ${code} copied to clipboard.` });
    setTimeout(() => setCopiedRef(false), 2500);
  };

  const handleSubmit = async () => {
    const finalFullName = isAnonymous ? "Anonymous Student" : form.fullName.trim();
    if (!finalFullName || !form.subject.trim() || !form.description.trim()) {
      toast({
        title: "Required fields missing",
        description: "Please provide a subject and details before sending.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const refId = `FB-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
      let filePublicUrl = "";

      // Step 1: Upload attachment if provided
      if (attachmentFile) {
        try {
          const fileExt = attachmentFile.name.split(".").pop();
          const filePath = `feedback/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
          const { error: uploadErr } = await supabase.storage
            .from("feedback_attachments")
            .upload(filePath, attachmentFile);
          if (!uploadErr) {
            const { data } = supabase.storage.from("feedback_attachments").getPublicUrl(filePath);
            filePublicUrl = data.publicUrl;
          }
        } catch (e) {
          console.warn("Attachment upload fallback:", e);
        }
      }

      // Step 2: Assemble description text including tags and attachment
      const tagsHeader = selectedTags.length > 0 ? `[Tags: ${selectedTags.join(", ")}]\n` : "";
      const attachmentFooter = filePublicUrl ? `\n\n[Attachment: ${filePublicUrl}]` : "";
      const fullText = `${tagsHeader}${form.description.trim()}${attachmentFooter}`;

      // Map UI category to valid DB enum/check constraint ('suggestion', 'bug', 'compliment', 'other')
      let dbCategory = "suggestion";
      if (form.category === "bug") dbCategory = "bug";
      else if (form.category === "compliment") dbCategory = "compliment";
      else if (form.category === "other" || form.category === "content") dbCategory = "other";
      else dbCategory = "suggestion";

      // Area specification
      const derivedArea = form.category === "content" ? "Books & Content" : form.category === "experience" ? "UI & Experience" : form.area || "Other";

      // Step 3: Insert with adaptive column resilience
      // Strategy 1: Remote table contains 'description' column (primary verified schema)
      const primaryPayload = {
        user_id: isAnonymous ? null : (user?.id || null),
        full_name: finalFullName,
        email: isAnonymous ? null : (form.email.trim() || null),
        category: dbCategory,
        area: derivedArea,
        urgency: form.urgency || "low",
        reference_id: refId,
        allow_follow_up: isAnonymous ? false : form.allowFollowUp,
        rating,
        subject: form.subject.trim(),
        description: fullText,
      };

      let insertError: any = null;
      const { error: err1 } = await supabase.from("user_feedback").insert(primaryPayload as any);

      if (err1) {
        insertError = err1;
        // Strategy 2: If description column is absent, try feedback_text
        const { error: err2 } = await supabase.from("user_feedback").insert({
          ...primaryPayload,
          description: undefined,
          feedback_text: fullText,
        } as any);

        if (!err2) {
          insertError = null;
        } else {
          // Strategy 3: Try minimal core columns
          const { error: err3 } = await supabase.from("user_feedback").insert({
            user_id: isAnonymous ? null : (user?.id || null),
            full_name: finalFullName,
            category: dbCategory,
            rating,
            subject: form.subject.trim(),
            description: fullText,
          } as any);

          if (!err3) insertError = null;
        }
      }

      if (insertError) {
        throw insertError;
      }

      // Step 4: If category is suggestion and user is signed in, optionally post to community suggestions
      if (form.category === "suggestion" && user?.id && !isAnonymous) {
        try {
          await supabase.from("posts").insert({
            title: form.subject.trim(),
            content: `[STATUS:voting] ${fullText}`,
            post_type: "suggestion_feature",
            user_id: user.id,
          });
        } catch (postErr) {
          console.warn("Community board auto-suggestion optional step skipped:", postErr);
        }
      }

      setReferenceNumber(refId);
      setSubmitted(true);
      toast({
        title: "Feedback Submitted",
        description: `Thank you! Your reference code is ${refId}.`,
      });
    } catch (err: any) {
      toast({
        title: "Submission Error",
        description: err.message || "Failed to submit feedback. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const ratingsConfig = [
    {
      score: 1,
      label: "Needs Attention",
      icon: Frown,
      color: "text-rose-600 dark:text-rose-400",
      bg: "border-rose-200 dark:border-rose-900/40 hover:bg-rose-50/50 dark:hover:bg-rose-950/20",
      activeBg: "bg-rose-50 dark:bg-rose-950/50 border-rose-500 shadow-sm ring-2 ring-rose-500/20",
    },
    {
      score: 2,
      label: "Room for Growth",
      icon: Meh,
      color: "text-amber-600 dark:text-amber-400",
      bg: "border-amber-200 dark:border-amber-900/40 hover:bg-amber-50/50 dark:hover:bg-amber-950/20",
      activeBg: "bg-amber-50 dark:bg-amber-950/50 border-amber-500 shadow-sm ring-2 ring-amber-500/20",
    },
    {
      score: 3,
      label: "Met Expectations",
      icon: Smile,
      color: "text-sky-600 dark:text-sky-400",
      bg: "border-sky-200 dark:border-sky-900/40 hover:bg-sky-50/50 dark:hover:bg-sky-950/20",
      activeBg: "bg-sky-50 dark:bg-sky-950/50 border-sky-500 shadow-sm ring-2 ring-sky-500/20",
    },
    {
      score: 4,
      label: "Great Experience",
      icon: SmilePlus,
      color: "text-teal-600 dark:text-teal-400",
      bg: "border-teal-200 dark:border-teal-900/40 hover:bg-teal-50/50 dark:hover:bg-teal-950/20",
      activeBg: "bg-teal-50 dark:bg-teal-950/50 border-teal-500 shadow-sm ring-2 ring-teal-500/20",
    },
    {
      score: 5,
      label: "Exceptional!",
      icon: HeartHandshake,
      color: "text-indigo-600 dark:text-indigo-400",
      bg: "border-indigo-200 dark:border-indigo-900/40 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20",
      activeBg: "bg-indigo-50 dark:bg-indigo-950/50 border-indigo-500 shadow-sm ring-2 ring-indigo-500/20",
    },
  ];

  const categories = [
    {
      id: "suggestion",
      label: "Idea & Suggestion",
      icon: Lightbulb,
      iconColor: "text-amber-500 bg-amber-500/10",
      desc: "Propose new tools, reading features, or ideas for our library",
      placeholder: "Describe your idea... How would it help students or teachers during library or self-study hours?",
    },
    {
      id: "bug",
      label: "Report a Glitch / Bug",
      icon: Bug,
      iconColor: "text-rose-500 bg-rose-500/10",
      desc: "Tell us about a technical error, broken button, or crash",
      placeholder: "What went wrong? Steps to reproduce (e.g. clicked on Class 10 NCERT PDF and saw a blank screen)...",
    },
    {
      id: "compliment",
      label: "Appreciation & Kudos",
      icon: Heart,
      iconColor: "text-pink-500 bg-pink-500/10",
      desc: "Share encouraging words or praise for something you loved",
      placeholder: "What made your day? Give a shoutout to a feature, team, or student project...",
    },
    {
      id: "content",
      label: "Book & Guide Request",
      icon: BookOpen,
      iconColor: "text-blue-500 bg-blue-500/10",
      desc: "Request missing NCERT books, question banks, or notes",
      placeholder: "Book title, author, class/subject, or specific edition you need for your studies...",
    },
    {
      id: "experience",
      label: "UI & Visual Design",
      icon: Palette,
      iconColor: "text-violet-500 bg-violet-500/10",
      desc: "Ideas to make pages cleaner, faster, or easier to read",
      placeholder: "Which screen, button, or layout could look cleaner or be easier to use on your phone/tablet?...",
    },
    {
      id: "other",
      label: "General Inquiry",
      icon: HelpCircle,
      iconColor: "text-slate-500 bg-slate-500/10",
      desc: "Any other questions, library thoughts, or general communication",
      placeholder: "What would you like to ask or share with the library team?...",
    },
  ];

  const popularTags = [
    "Book Catalog",
    "NCERT Guides",
    "Quiz Games",
    "Study Notes",
    "Mobile View",
    "Dark Mode",
    "PDF Viewer",
    "App Speed",
    "Leaderboard",
  ];

  const areas = [
    "Books & Catalog",
    "Quizzes & Challenges",
    "NCERT & CBSE Material",
    "Study Guides & Notes",
    "AI Study Assistant",
    "Games & Activities",
    "Account & Profile",
    "Other",
  ];

  const currentCategoryObj = categories.find((c) => c.id === form.category) || categories[0];
  const currentRatingConfig = ratingsConfig.find((r) => r.score === rating) || ratingsConfig[4];
  const CurrentRatingIcon = currentRatingConfig.icon;

  return (
    <main className={`${isEmbedded ? "" : "min-h-screen bg-background"} animate-in fade-in duration-300`}>
      <div className={`mx-auto w-full max-w-2xl ${isEmbedded ? "pb-24 sm:pb-8" : "px-3 sm:px-4 py-4 sm:py-10 pb-28 sm:pb-12"}`}>
        {!isEmbedded && (
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground hover:text-foreground mb-4 sm:mb-6 group transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4 transition-transform group-hover:-translate-x-1" /> Back to Dashboard
          </Link>
        )}

        {/* Human Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-primary/10 border border-primary/20 mx-auto flex items-center justify-center mb-3 shadow-xs">
            <MessageSquare className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
          </div>
          <h1 className="text-xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            Share Your Feedback
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 max-w-md mx-auto leading-relaxed px-2">
            Every submission is read by school librarians and student leads to build a better learning platform for PM SHRI KV Sulur.
          </p>

          {/* Sincere response commitment banner */}
          <div className="mt-3.5 p-2.5 sm:p-3 bg-card border border-border/70 rounded-xl max-w-lg mx-auto flex items-center justify-between gap-2.5 text-left shadow-xs">
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] sm:text-xs font-semibold text-foreground truncate">Staff & Lead Review Guarantee</p>
                <p className="text-[10px] sm:text-[11px] text-muted-foreground truncate">Reviewed within 24–48 hours on school days.</p>
              </div>
            </div>
            <Link
              to="/support"
              className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-medium text-primary hover:underline shrink-0 pl-1"
            >
              <LifeBuoy className="h-3.5 w-3.5" /> Help Desk
            </Link>
          </div>
        </div>

        {/* Tabs for Submit vs My History */}
        {user && (
          <div className="flex justify-center mb-5">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full max-w-xs sm:max-w-sm">
              <TabsList className="grid w-full grid-cols-2 h-9 p-1">
                <TabsTrigger value="submit" className="text-xs gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5" /> Share Thoughts
                </TabsTrigger>
                <TabsTrigger value="history" className="text-xs gap-1.5">
                  <History className="h-3.5 w-3.5" /> My History
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        )}

        {/* TAB 2: MY SUBMISSIONS HISTORY */}
        {activeTab === "history" && user && (
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="p-4 sm:p-5 pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm sm:text-base font-bold">My Submitted Feedback</CardTitle>
                <CardDescription className="text-xs">
                  Track your previous submissions and copy reference codes.
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={fetchMyHistory} disabled={loadingHistory} className="h-8 px-2.5 text-xs">
                <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loadingHistory ? "animate-spin" : ""}`} /> Refresh
              </Button>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 pt-0">
              {loadingHistory ? (
                <div className="flex items-center justify-center p-8 text-muted-foreground gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="text-xs sm:text-sm">Loading your submissions...</span>
                </div>
              ) : historyItems.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground space-y-2">
                  <MessageSquare className="h-9 w-9 mx-auto opacity-30" />
                  <p className="text-xs sm:text-sm font-semibold">No feedback records found</p>
                  <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                    Your suggestions, reports, and questions will appear here once submitted.
                  </p>
                  <Button variant="outline" size="sm" onClick={() => setActiveTab("submit")} className="mt-2 text-xs">
                    Write New Feedback
                  </Button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {historyItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 sm:p-3.5 rounded-xl border border-border/60 bg-card hover:bg-muted/20 transition-colors space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge variant="secondary" className="capitalize text-[10px] sm:text-xs font-semibold px-2 py-0.5">
                            {item.category}
                          </Badge>
                          {item.area && (
                            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                              {item.area}
                            </span>
                          )}
                          <div className="flex items-center gap-0.5 ml-1">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                className={`h-2.5 w-2.5 sm:h-3 sm:w-3 ${
                                  s <= item.rating
                                    ? "text-amber-500 fill-amber-500"
                                    : "text-muted-foreground/30"
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        <span className="text-[10px] sm:text-[11px] text-muted-foreground shrink-0 font-medium">
                          {new Date(item.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="font-semibold text-xs sm:text-sm text-foreground">{item.subject}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {item.description || item.feedback_text || item.message}
                      </p>
                      {item.reference_id && (
                        <div className="pt-1.5 border-t border-border/40 flex items-center justify-between text-[11px]">
                          <span className="font-mono text-muted-foreground text-[10px] sm:text-xs">
                            Ref: <strong className="text-foreground font-semibold">{item.reference_id}</strong>
                          </span>
                          <button
                            type="button"
                            onClick={() => copyRefToClipboard(item.reference_id!)}
                            className="inline-flex items-center gap-1 text-primary hover:underline font-medium text-[10px] sm:text-xs p-1"
                          >
                            <Copy className="h-3 w-3" /> Copy Ref
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* TAB 1: SUBMISSION FLOW */}
        {activeTab === "submit" && (
          <>
            {submitted ? (
              <Card className="border-emerald-500/40 bg-card shadow-md animate-in fade-in zoom-in-95 duration-200">
                <CardContent className="p-5 sm:p-8 text-center space-y-4 sm:space-y-5">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
                    <CheckCircle2 className="h-8 w-8 sm:h-9 sm:w-9" />
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-foreground">Feedback Received</h2>
                    <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto mt-1 leading-relaxed">
                      Thank you for taking the time to share your insight. You are directly making our digital library better!
                    </p>
                  </div>

                  {referenceNumber && (
                    <div className="p-3 bg-muted/60 border border-border/70 rounded-xl inline-flex flex-col sm:flex-row items-center gap-2 sm:gap-3 text-xs w-full max-w-md">
                      <span className="text-muted-foreground text-center sm:text-left">Your Reference Tracking Code:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-foreground text-xs sm:text-sm tracking-wider px-2 py-0.5 bg-background rounded border border-border">
                          {referenceNumber}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => copyRefToClipboard(referenceNumber)}
                        >
                          {copiedRef ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                          <span className="ml-1">{copiedRef ? "Copied" : "Copy"}</span>
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="p-3.5 sm:p-4 bg-muted/30 border border-border/50 rounded-xl text-left text-xs space-y-1.5 max-w-md mx-auto text-muted-foreground">
                    <p className="font-semibold text-foreground flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-primary" /> What happens next?
                    </p>
                    <p>• Your feedback is logged in the KV Sulur DLMS review queue.</p>
                    <p>• High-priority issues are routed to technical moderators immediately.</p>
                    <p>• You can check your submission history anytime using the tab above.</p>
                  </div>

                  <div className="flex flex-col sm:flex-row justify-center gap-2 sm:gap-3 pt-2">
                    {!isEmbedded && (
                      <Button onClick={() => navigate("/dashboard")} variant="outline" className="h-10 text-xs sm:text-sm w-full sm:w-auto">
                        Return to Dashboard
                      </Button>
                    )}
                    <Button
                      onClick={() => {
                        setSubmitted(false);
                        setStep(1);
                        setForm((f) => ({ ...f, subject: "", description: "" }));
                        setSelectedTags([]);
                        setAttachmentFile(null);
                      }}
                      className="h-10 text-xs sm:text-sm w-full sm:w-auto font-semibold"
                    >
                      Submit Another Response
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-border/60 overflow-hidden shadow-sm">
                {/* Mobile-Friendly Interactive Step Header */}
                <div className="bg-muted/40 border-b border-border/50 px-3 sm:px-5 py-3">
                  <div className="grid grid-cols-3 gap-1 sm:gap-2">
                    {[
                      { num: 1, title: "1. Type", active: step === 1, done: step > 1 },
                      { num: 2, title: "2. Rating", active: step === 2, done: step > 2 },
                      { num: 3, title: "3. Details", active: step === 3, done: false },
                    ].map((s) => (
                      <button
                        key={s.num}
                        type="button"
                        onClick={() => {
                          if (s.done || s.num === step) setStep(s.num as any);
                        }}
                        className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                          s.active
                            ? "bg-primary text-primary-foreground shadow-xs"
                            : s.done
                            ? "bg-muted text-foreground hover:bg-muted/80 cursor-pointer"
                            : "text-muted-foreground/60 cursor-default"
                        }`}
                      >
                        {s.done ? <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" /> : null}
                        <span className="truncate">{s.title}</span>
                      </button>
                    ))}
                  </div>

                  {/* Progress bar */}
                  <div className="h-1 bg-muted rounded-full w-full mt-2.5 overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300 rounded-full"
                      style={{ width: `${(step / 3) * 100}%` }}
                    />
                  </div>
                </div>

                <CardContent className="p-4 sm:p-6 space-y-5">
                  {/* STEP 1: CATEGORY & QUICK TAGS */}
                  {step === 1 && (
                    <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-200">
                      <div>
                        <h3 className="text-xs sm:text-sm font-bold text-foreground">What would you like to share?</h3>
                        <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
                          Tap the category that best fits your submission.
                        </p>
                      </div>

                      {/* 1-column on mobile, 2-column on tablet/desktop */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
                        {categories.map((c) => {
                          const Icon = c.icon;
                          const isSelected = form.category === c.id;
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                setForm({ ...form, category: c.id });
                              }}
                              className={`flex items-start gap-3 p-3 sm:p-3.5 rounded-xl border text-left transition-all active:scale-[0.99] ${
                                isSelected
                                  ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs"
                                  : "border-border/70 hover:border-border hover:bg-muted/30"
                              }`}
                            >
                              <div className={`p-2 rounded-xl shrink-0 ${c.iconColor}`}>
                                <Icon className="h-5 w-5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-1">
                                  <p className="font-semibold text-xs sm:text-sm text-foreground">{c.label}</p>
                                  {isSelected && (
                                    <div className="h-4 w-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                                      <Check className="h-2.5 w-2.5" />
                                    </div>
                                  )}
                                </div>
                                <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug line-clamp-2">
                                  {c.desc}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {/* Quick Topic Tags */}
                      <div className="pt-1">
                        <Label className="text-xs font-semibold flex items-center gap-1.5 text-foreground mb-2">
                          <Tag className="h-3.5 w-3.5 text-primary" /> Quick Topic Tags (Optional)
                        </Label>
                        <div className="flex flex-wrap gap-1.5">
                          {popularTags.map((tag) => {
                            const active = selectedTags.includes(tag);
                            return (
                              <button
                                key={tag}
                                type="button"
                                onClick={() => toggleTag(tag)}
                                className={`px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-medium transition-colors border active:scale-95 ${
                                  active
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "bg-muted/50 text-muted-foreground border-border/60 hover:bg-muted"
                                }`}
                              >
                                {tag}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="pt-2">
                        <Button
                          type="button"
                          className="w-full h-11 text-xs sm:text-sm font-semibold gap-1.5"
                          onClick={() => setStep(2)}
                        >
                          Continue to Experience Rating <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* STEP 2: RATING & PRIORITY */}
                  {step === 2 && (
                    <div className="space-y-5 sm:space-y-6 animate-in fade-in duration-200">
                      {/* Responsive Solid Icon Rating Scale */}
                      <div className="space-y-2.5 text-center">
                        <div>
                          <Label className="text-xs sm:text-sm font-bold text-foreground block">
                            How has your experience been with the digital library?
                          </Label>
                          <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
                            Your honest rating guides what we build and fix next.
                          </p>
                        </div>

                        {/* 5 Rating buttons: responsive touch targets */}
                        <div className="grid grid-cols-5 gap-1.5 sm:gap-3 py-1 sm:py-2">
                          {ratingsConfig.map((r) => {
                            const Icon = r.icon;
                            const isSelected = rating === r.score;
                            return (
                              <button
                                key={r.score}
                                type="button"
                                onClick={() => setRating(r.score)}
                                className={`flex flex-col items-center justify-center p-2 sm:p-3 rounded-xl border transition-all active:scale-95 ${
                                  isSelected ? r.activeBg : r.bg
                                }`}
                              >
                                <Icon
                                  className={`h-6 w-6 sm:h-7 sm:w-7 ${r.color} transition-transform ${
                                    isSelected ? "scale-110" : "scale-100 opacity-60"
                                  }`}
                                />
                                <span className={`text-[11px] sm:text-xs font-bold mt-1 ${isSelected ? "text-foreground" : "text-muted-foreground"}`}>
                                  {r.score}
                                </span>
                              </button>
                            );
                          })}
                        </div>

                        {/* Selected sentiment pill */}
                        <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 rounded-full bg-muted/60 border border-border/70 text-xs font-semibold text-foreground">
                          <CurrentRatingIcon className={`h-4 w-4 ${currentRatingConfig.color}`} />
                          <span>{currentRatingConfig.label}</span>
                          <div className="flex items-center gap-0.5 ml-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`h-3 w-3 ${
                                  star <= rating
                                    ? "text-amber-500 fill-amber-500"
                                    : "text-muted-foreground/30"
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Mobile-Friendly Segmented Priority Selector */}
                      <div className="space-y-2 pt-2 border-t border-border/50">
                        <Label className="text-xs font-semibold text-foreground block">
                          Priority / Urgency Level
                        </Label>
                        <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                          {[
                            {
                              id: "low",
                              label: "Low",
                              sub: "Casual note",
                              icon: CheckCircle2,
                              color: "text-emerald-500",
                              activeBg: "bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-500 ring-1 ring-emerald-500/20",
                            },
                            {
                              id: "medium",
                              label: "Medium",
                              sub: "Nice to fix",
                              icon: Clock,
                              color: "text-amber-500",
                              activeBg: "bg-amber-50/70 dark:bg-amber-950/40 border-amber-500 ring-1 ring-amber-500/20",
                            },
                            {
                              id: "high",
                              label: "High",
                              sub: "Blocks study",
                              icon: AlertTriangle,
                              color: "text-rose-500",
                              activeBg: "bg-rose-50/70 dark:bg-rose-950/40 border-rose-500 ring-1 ring-rose-500/20",
                            },
                          ].map((p) => {
                            const Icon = p.icon;
                            const isSelected = form.urgency === p.id;
                            return (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => setForm({ ...form, urgency: p.id })}
                                className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border text-center transition-all active:scale-95 ${
                                  isSelected
                                    ? p.activeBg
                                    : "border-border/70 hover:bg-muted/30"
                                }`}
                              >
                                <Icon className={`h-4 w-4 ${p.color}`} />
                                <span className="font-semibold text-xs text-foreground mt-1">{p.label}</span>
                                <span className="text-[10px] text-muted-foreground hidden sm:block">{p.sub}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Area Selection */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-foreground block">Which Feature or Section?</Label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                          {areas.map((a) => {
                            const isSelected = form.area === a;
                            return (
                              <button
                                key={a}
                                type="button"
                                onClick={() => setForm({ ...form, area: a })}
                                className={`p-2 rounded-xl text-xs font-medium border text-center transition-all truncate active:scale-95 ${
                                  isSelected
                                    ? "bg-primary text-primary-foreground border-primary shadow-xs font-semibold"
                                    : "border-border/60 hover:bg-muted/40 text-muted-foreground"
                                }`}
                              >
                                {a}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex gap-2.5 pt-2">
                        <Button type="button" variant="outline" className="flex-1 h-11 text-xs sm:text-sm" onClick={() => setStep(1)}>
                          Back
                        </Button>
                        <Button type="button" className="flex-1 h-11 text-xs sm:text-sm font-semibold gap-1.5" onClick={() => setStep(3)}>
                          Continue to Details <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* STEP 3: DETAILS & SUBMISSION */}
                  {step === 3 && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                      {/* Context Summary Strip */}
                      <div className="p-3 bg-muted/30 border border-border/60 rounded-xl flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0">
                          <span className="font-semibold text-foreground">{currentCategoryObj.label}</span>
                          <span className="text-muted-foreground">•</span>
                          <span className="text-muted-foreground">{form.area}</span>
                          <span className="text-muted-foreground">•</span>
                          <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {rating}/5
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setStep(1)}
                          className="text-[11px] font-semibold text-primary hover:underline shrink-0 pl-2"
                        >
                          Change
                        </button>
                      </div>

                      {/* Identity & Anonymous Toggle */}
                      <div className="p-2.5 sm:p-3 bg-card border border-border/60 rounded-xl flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          {isAnonymous ? (
                            <div className="p-1.5 rounded-lg bg-muted text-muted-foreground shrink-0">
                              <EyeOff className="h-4 w-4" />
                            </div>
                          ) : (
                            <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
                              <User className="h-4 w-4" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground truncate text-xs">
                              {isAnonymous ? "Submitting Anonymously" : form.fullName || "Student / Staff"}
                            </p>
                            <p className="text-[10px] sm:text-[11px] text-muted-foreground truncate">
                              {isAnonymous ? "Your personal profile will not be attached." : form.email || "No email on record"}
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 sm:h-8 text-[11px] sm:text-xs shrink-0 px-2"
                          onClick={() => setIsAnonymous(!isAnonymous)}
                        >
                          {isAnonymous ? "Attach Name" : "Submit Anonymously"}
                        </Button>
                      </div>

                      {/* Name & Email inputs if not anonymous */}
                      {!isAnonymous && (
                        <div className="grid gap-2.5 sm:grid-cols-2">
                          <div className="space-y-1">
                            <Label className="text-xs font-semibold text-foreground">Your Name *</Label>
                            <Input
                              value={form.fullName}
                              maxLength={100}
                              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                              className="h-10 text-sm"
                              placeholder="Full name"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs font-semibold text-foreground">Email (For Updates)</Label>
                            <Input
                              type="email"
                              value={form.email}
                              maxLength={255}
                              onChange={(e) => setForm({ ...form, email: e.target.value })}
                              className="h-10 text-sm"
                              placeholder="student@kvsulur.in (optional)"
                            />
                          </div>
                        </div>
                      )}

                      {/* Subject */}
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold text-foreground">Subject / Headline *</Label>
                        <Input
                          value={form.subject}
                          maxLength={150}
                          onChange={(e) => setForm({ ...form, subject: e.target.value })}
                          className="h-10 text-sm"
                          placeholder="e.g. Add dark mode to the PDF reader, or Book search filter typo"
                        />
                      </div>

                      {/* Description */}
                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <Label className="text-xs font-semibold text-foreground">
                            Details & Explanation *
                          </Label>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {form.description.length}/2000
                          </span>
                        </div>
                        <Textarea
                          value={form.description}
                          maxLength={2000}
                          rows={4}
                          onChange={(e) => setForm({ ...form, description: e.target.value })}
                          className="text-sm leading-relaxed resize-y min-h-[90px]"
                          placeholder={currentCategoryObj.placeholder}
                        />
                      </div>

                      {/* Mobile Screenshot or Document Attachment Dropzone */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold flex items-center justify-between text-foreground">
                          <span className="flex items-center gap-1.5">
                            <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                            Screenshot or Document (Optional)
                          </span>
                          <span className="text-[10px] text-muted-foreground">Max 10 MB</span>
                        </Label>

                        {!attachmentFile ? (
                          <label className="border-2 border-dashed border-border/80 rounded-xl p-3 flex flex-col items-center justify-center text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors">
                            <UploadCloud className="h-6 w-6 text-muted-foreground mb-1" />
                            <span className="text-xs font-semibold text-foreground">Tap to attach screenshot or file</span>
                            <span className="text-[10px] text-muted-foreground mt-0.5">PNG, JPG, PDF, or DOC</span>
                            <input
                              type="file"
                              accept="image/*,.pdf,.doc,.docx,.txt"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  if (file.size > 10 * 1024 * 1024) {
                                    toast({
                                      title: "File too large",
                                      description: "Please attach a file smaller than 10MB.",
                                      variant: "destructive",
                                    });
                                    return;
                                  }
                                  setAttachmentFile(file);
                                }
                              }}
                            />
                          </label>
                        ) : (
                          <div className="p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2 min-w-0">
                              <FileCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              <div className="min-w-0">
                                <p className="font-semibold text-foreground truncate">{attachmentFile.name}</p>
                                <p className="text-[10px] text-muted-foreground">{(attachmentFile.size / 1024).toFixed(1)} KB</p>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive shrink-0"
                              onClick={() => setAttachmentFile(null)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Contact consent toggle if not anonymous */}
                      {!isAnonymous && (
                        <div className="flex items-start gap-2 pt-1">
                          <input
                            id="allowFollowUp"
                            type="checkbox"
                            checked={form.allowFollowUp}
                            onChange={(e) => setForm({ ...form, allowFollowUp: e.target.checked })}
                            className="mt-0.5 rounded border-border text-primary focus:ring-primary h-4 w-4"
                          />
                          <label
                            htmlFor="allowFollowUp"
                            className="text-[11px] sm:text-xs text-muted-foreground cursor-pointer select-none leading-tight"
                          >
                            Allow the school library coordinator to email me for follow-up details on this feedback.
                          </label>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex gap-2.5 pt-2">
                        <Button type="button" variant="outline" className="h-11 px-4 text-xs sm:text-sm" onClick={() => setStep(2)}>
                          Back
                        </Button>
                        <Button
                          className="flex-1 h-11 text-xs sm:text-sm font-semibold"
                          onClick={handleSubmit}
                          disabled={saving}
                        >
                          {saving ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              Submitting...
                            </>
                          ) : (
                            <>
                              <Send className="h-4 w-4 mr-2" />
                              Submit Feedback
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </main>
  );
}
