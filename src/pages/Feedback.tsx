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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  ExternalLink,
  Tag,
  RefreshCw
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
  const [profileName, setProfileName] = useState<string>("");
  const [profileEmail, setProfileEmail] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState("");
  const [copiedRef, setCopiedRef] = useState(false);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState<"submit" | "history">("submit");

  // User feedback history
  const [historyItems, setHistoryItems] = useState<FeedbackItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Wizard steps: 1 = Category & Tags, 2 = Experience Rating, 3 = Message Details
  const [step, setStep] = useState(1);
  const [rating, setRating] = useState(5);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isAnonymous, setIsAnonymous] = useState(false);

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    category: "suggestion",
    urgency: "low",
    area: "Other",
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
              setProfileName(name);
              setProfileEmail(mail);
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
    toast({ title: "Copied!", description: `Reference ID ${code} copied to clipboard.` });
    setTimeout(() => setCopiedRef(false), 2500);
  };

  const handleSubmit = async () => {
    const finalFullName = isAnonymous ? "Anonymous Student" : form.fullName.trim();
    if (!finalFullName || !form.subject.trim() || !form.description.trim()) {
      toast({ title: "Please fill in all required fields", description: "Name, subject, and description are needed.", variant: "destructive" });
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
        // Strategy 2: If description column does not exist on another schema variant, try feedback_text
        const { error: err2 } = await supabase.from("user_feedback").insert({
          ...primaryPayload,
          description: undefined,
          feedback_text: fullText,
        } as any);

        if (!err2) {
          insertError = null;
        } else {
          // Strategy 3: Try minimal core fields
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
        title: "Feedback Submitted Successfully",
        description: `Thank you for helping us improve KV Sulur DLMS. Reference ID: ${refId}`,
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
      bg: "hover:bg-rose-50 dark:hover:bg-rose-950/30 border-rose-200 dark:border-rose-900/40",
      activeBg: "bg-rose-50 dark:bg-rose-950/40 border-rose-500 ring-2 ring-rose-500/20",
    },
    {
      score: 2,
      label: "Room for Growth",
      icon: Meh,
      color: "text-amber-600 dark:text-amber-400",
      bg: "hover:bg-amber-50 dark:hover:bg-amber-950/30 border-amber-200 dark:border-amber-900/40",
      activeBg: "bg-amber-50 dark:bg-amber-950/40 border-amber-500 ring-2 ring-amber-500/20",
    },
    {
      score: 3,
      label: "Met Expectations",
      icon: Smile,
      color: "text-sky-600 dark:text-sky-400",
      bg: "hover:bg-sky-50 dark:hover:bg-sky-950/30 border-sky-200 dark:border-sky-900/40",
      activeBg: "bg-sky-50 dark:bg-sky-950/40 border-sky-500 ring-2 ring-sky-500/20",
    },
    {
      score: 4,
      label: "Great Experience",
      icon: SmilePlus,
      color: "text-teal-600 dark:text-teal-400",
      bg: "hover:bg-teal-50 dark:hover:bg-teal-950/30 border-teal-200 dark:border-teal-900/40",
      activeBg: "bg-teal-50 dark:bg-teal-950/40 border-teal-500 ring-2 ring-teal-500/20",
    },
    {
      score: 5,
      label: "Exceptional!",
      icon: HeartHandshake,
      color: "text-indigo-600 dark:text-indigo-400",
      bg: "hover:bg-indigo-50 dark:hover:bg-indigo-950/30 border-indigo-200 dark:border-indigo-900/40",
      activeBg: "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500/20",
    },
  ];

  const categories = [
    {
      id: "suggestion",
      label: "Idea & Suggestion",
      icon: Lightbulb,
      iconColor: "text-amber-500 bg-amber-500/10",
      desc: "Propose new features, study tools, or improvements for our library",
    },
    {
      id: "bug",
      label: "Report an Issue",
      icon: Bug,
      iconColor: "text-rose-500 bg-rose-500/10",
      desc: "Tell us about a technical glitch, broken button, or error you encountered",
    },
    {
      id: "compliment",
      label: "Appreciation & Kudos",
      icon: Heart,
      iconColor: "text-pink-500 bg-pink-500/10",
      desc: "Share encouraging words or praise for something that worked wonderfully",
    },
    {
      id: "content",
      label: "Book & Resource Request",
      icon: BookOpen,
      iconColor: "text-blue-500 bg-blue-500/10",
      desc: "Request missing NCERT books, question papers, or digital study guides",
    },
    {
      id: "experience",
      label: "UI & Visual Design",
      icon: Palette,
      iconColor: "text-violet-500 bg-violet-500/10",
      desc: "Ideas to make the interface cleaner, faster, or easier to read",
    },
    {
      id: "other",
      label: "General Inquiry",
      icon: HelpCircle,
      iconColor: "text-slate-500 bg-slate-500/10",
      desc: "Any other questions, library thoughts, or general communication",
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
    "Badges & Points",
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

  const currentRatingConfig = ratingsConfig.find((r) => r.score === rating) || ratingsConfig[4];
  const CurrentRatingIcon = currentRatingConfig.icon;

  return (
    <main className={`${isEmbedded ? "" : "min-h-screen bg-background"} animate-in fade-in duration-300`}>
      <div className={`mx-auto w-full max-w-2xl ${isEmbedded ? "pb-8" : "px-4 py-8 sm:py-12"}`}>
        {!isEmbedded && (
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 group transition-colors"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" /> Back to Dashboard
          </Link>
        )}

        {/* Human Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 mx-auto flex items-center justify-center mb-3.5 shadow-sm">
            <MessageSquare className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            Share Your Feedback
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto leading-relaxed">
            Real librarians and student leads review every submission to make PM SHRI KV Sulur Digital Library better for everyone.
          </p>

          {/* Sincere response commitment banner */}
          <div className="mt-4 p-3 bg-card border border-border/70 rounded-xl max-w-lg mx-auto flex items-center justify-between gap-3 text-left shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">Review Guarantee</p>
                <p className="text-[11px] text-muted-foreground">Reviewed within 24–48 hours on school days.</p>
              </div>
            </div>
            <Link
              to="/support"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline shrink-0"
            >
              <LifeBuoy className="h-3.5 w-3.5" /> Need Support?
            </Link>
          </div>
        </div>

        {/* Tabs for Submit vs My History */}
        {user && (
          <div className="flex justify-center mb-6">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full max-w-md">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="submit" className="gap-2">
                  <MessageSquare className="h-4 w-4" /> Share Thoughts
                </TabsTrigger>
                <TabsTrigger value="history" className="gap-2">
                  <History className="h-4 w-4" /> My Submissions
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        )}

        {/* TAB 2: MY SUBMISSIONS HISTORY */}
        {activeTab === "history" && user && (
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold">My Submitted Feedback</CardTitle>
                <CardDescription className="text-xs">
                  Track suggestions and issues you shared with the library team.
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={fetchMyHistory} disabled={loadingHistory}>
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loadingHistory ? "animate-spin" : ""}`} /> Refresh
              </Button>
            </CardHeader>
            <CardContent>
              {loadingHistory ? (
                <div className="flex items-center justify-center p-8 text-muted-foreground gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="text-sm">Loading your submissions...</span>
                </div>
              ) : historyItems.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground space-y-2">
                  <MessageSquare className="h-10 w-10 mx-auto opacity-30" />
                  <p className="text-sm font-medium">No feedback submitted yet</p>
                  <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                    When you submit suggestions or bug reports, they will be tracked right here with your reference IDs.
                  </p>
                  <Button variant="outline" size="sm" onClick={() => setActiveTab("submit")} className="mt-2">
                    Create First Submission
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {historyItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-xl border border-border/60 bg-card hover:bg-muted/30 transition-colors space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="capitalize text-xs font-semibold">
                            {item.category}
                          </Badge>
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                className={`h-3 w-3 ${
                                  s <= item.rating
                                    ? "text-amber-500 fill-amber-500"
                                    : "text-muted-foreground/30"
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        <span className="text-[11px] text-muted-foreground font-medium">
                          {new Date(item.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="font-semibold text-sm text-foreground">{item.subject}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {item.description || item.feedback_text || item.message}
                      </p>
                      {item.reference_id && (
                        <div className="pt-1 flex items-center justify-between text-[11px]">
                          <span className="font-mono text-muted-foreground">
                            Ref: <strong className="text-foreground font-semibold">{item.reference_id}</strong>
                          </span>
                          <button
                            type="button"
                            onClick={() => copyRefToClipboard(item.reference_id!)}
                            className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
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
                <CardContent className="p-8 text-center space-y-5">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
                    <CheckCircle2 className="h-9 w-9" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground">Feedback Received</h2>
                    <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-1 leading-relaxed">
                      Thank you for taking the time to share your perspective. Your insight directly helps us enhance the digital library.
                    </p>
                  </div>

                  {referenceNumber && (
                    <div className="p-3.5 bg-muted/60 border border-border/70 rounded-xl inline-flex flex-col sm:flex-row items-center gap-3 text-xs">
                      <span className="text-muted-foreground">Your Reference Tracking Code:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-foreground text-sm tracking-wider px-2 py-0.5 bg-background rounded border border-border">
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

                  <div className="p-4 bg-muted/30 border border-border/50 rounded-xl text-left text-xs space-y-1.5 max-w-md mx-auto text-muted-foreground">
                    <p className="font-semibold text-foreground flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-primary" /> What happens next?
                    </p>
                    <p>• Your feedback has been recorded in the KV Sulur DLMS review queue.</p>
                    <p>• Ideas and book suggestions are categorized for our next update cycle.</p>
                    <p>• You can check your submission history anytime using the tab above.</p>
                  </div>

                  <div className="flex flex-wrap justify-center gap-3 pt-2">
                    {!isEmbedded && (
                      <Button onClick={() => navigate("/dashboard")} variant="outline" className="h-10 px-4">
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
                      className="h-10 px-4"
                    >
                      Submit Another Response
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-border/60 overflow-hidden shadow-sm">
                {/* Step indicator */}
                <div className="bg-muted/40 border-b border-border/50 px-5 py-3">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                        {step}
                      </span>
                      <span className="font-semibold text-foreground">
                        {step === 1 && "Step 1: Choose Feedback Type"}
                        {step === 2 && "Step 2: Experience & Priority"}
                        {step === 3 && "Step 3: Tell Us More"}
                      </span>
                    </div>
                    <span className="text-muted-foreground font-medium">Step {step} of 3</span>
                  </div>

                  {/* Progress bar */}
                  <div className="h-1.5 bg-muted rounded-full w-full mt-2.5 overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300 rounded-full"
                      style={{ width: `${(step / 3) * 100}%` }}
                    />
                  </div>
                </div>

                <CardContent className="p-5 sm:p-6 space-y-5">
                  {/* STEP 1: CATEGORY & QUICK TAGS */}
                  {step === 1 && (
                    <div className="space-y-5 animate-in fade-in duration-200">
                      <div>
                        <h3 className="text-sm font-bold text-foreground">What would you like to share?</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Select the area that best matches your message.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
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
                              className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all ${
                                isSelected
                                  ? "border-primary bg-primary/5 ring-1 ring-primary/20 shadow-xs"
                                  : "border-border/70 hover:border-border hover:bg-muted/30"
                              }`}
                            >
                              <div className={`p-2 rounded-lg shrink-0 ${c.iconColor}`}>
                                <Icon className="h-5 w-5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-xs text-foreground">{c.label}</p>
                                <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug line-clamp-2">
                                  {c.desc}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {/* Quick Tags */}
                      <div className="pt-1">
                        <Label className="text-xs font-semibold flex items-center gap-1.5 text-foreground mb-2">
                          <Tag className="h-3.5 w-3.5 text-primary" /> Optional Topics / Tags
                        </Label>
                        <div className="flex flex-wrap gap-1.5">
                          {popularTags.map((tag) => {
                            const active = selectedTags.includes(tag);
                            return (
                              <button
                                key={tag}
                                type="button"
                                onClick={() => toggleTag(tag)}
                                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors border ${
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
                          className="w-full h-10 font-semibold"
                          onClick={() => setStep(2)}
                        >
                          Continue to Experience Rating
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* STEP 2: RATING & PRIORITY */}
                  {step === 2 && (
                    <div className="space-y-6 animate-in fade-in duration-200">
                      {/* Solid Icon Rating Scale */}
                      <div className="space-y-3 text-center">
                        <div>
                          <Label className="text-sm font-bold text-foreground block">
                            How has your experience been with the digital library?
                          </Label>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Be honest — your feedback directly shapes our roadmap.
                          </p>
                        </div>

                        <div className="grid grid-cols-5 gap-2 sm:gap-3 py-2">
                          {ratingsConfig.map((r) => {
                            const Icon = r.icon;
                            const isSelected = rating === r.score;
                            return (
                              <button
                                key={r.score}
                                type="button"
                                onClick={() => setRating(r.score)}
                                className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                                  isSelected ? r.activeBg : r.bg
                                }`}
                              >
                                <Icon className={`h-6 w-6 sm:h-7 sm:w-7 ${r.color} transition-transform ${isSelected ? "scale-115" : "scale-100 opacity-70"}`} />
                                <span className={`text-[11px] font-bold mt-1.5 ${isSelected ? "text-foreground" : "text-muted-foreground"}`}>
                                  {r.score}
                                </span>
                              </button>
                            );
                          })}
                        </div>

                        {/* Selected sentiment pill */}
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/60 border border-border/70 text-xs font-semibold text-foreground">
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

                      {/* Urgency & Specific Area */}
                      <div className="grid gap-4 sm:grid-cols-2 pt-1 border-t border-border/50">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-foreground">Priority Level</Label>
                          <Select value={form.urgency} onValueChange={(v) => setForm({ ...form, urgency: v })}>
                            <SelectTrigger className="h-10 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">
                                <span className="flex items-center gap-2 text-xs">
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                  Low (Casual suggestion / When you have time)
                                </span>
                              </SelectItem>
                              <SelectItem value="medium">
                                <span className="flex items-center gap-2 text-xs">
                                  <Clock className="h-3.5 w-3.5 text-amber-500" />
                                  Medium (Noticeable issue / Nice improvement)
                                </span>
                              </SelectItem>
                              <SelectItem value="high">
                                <span className="flex items-center gap-2 text-xs">
                                  <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
                                  High (Blocking studies / Broken feature)
                                </span>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-foreground">Which Feature / Area?</Label>
                          <Select value={form.area} onValueChange={(v) => setForm({ ...form, area: v })}>
                            <SelectTrigger className="h-10 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {areas.map((a) => (
                                <SelectItem key={a} value={a} className="text-xs">
                                  {a}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="flex gap-2.5 pt-2">
                        <Button type="button" variant="outline" className="flex-1 h-10" onClick={() => setStep(1)}>
                          Back
                        </Button>
                        <Button type="button" className="flex-1 h-10 font-semibold" onClick={() => setStep(3)}>
                          Continue to Details
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* STEP 3: DETAILS & SUBMISSION */}
                  {step === 3 && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                      {/* Identity preview & Anonymous toggle */}
                      <div className="p-3 bg-muted/40 border border-border/60 rounded-xl flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          {isAnonymous ? (
                            <div className="p-1.5 rounded-lg bg-muted text-muted-foreground">
                              <EyeOff className="h-4 w-4" />
                            </div>
                          ) : (
                            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                              <User className="h-4 w-4" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground truncate">
                              {isAnonymous ? "Submitting Anonymously" : form.fullName || "Student / Staff"}
                            </p>
                            <p className="text-[11px] text-muted-foreground truncate">
                              {isAnonymous ? "Your identity will not be attached." : form.email || "No email provided"}
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs shrink-0"
                          onClick={() => setIsAnonymous(!isAnonymous)}
                        >
                          {isAnonymous ? "Submit with Profile" : "Submit Anonymously"}
                        </Button>
                      </div>

                      {/* Name & Email inputs if not anonymous */}
                      {!isAnonymous && (
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-foreground">Your Name *</Label>
                            <Input
                              value={form.fullName}
                              maxLength={100}
                              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                              className="h-10 text-xs"
                              placeholder="Your full name"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-foreground">Email (For Updates)</Label>
                            <Input
                              type="email"
                              value={form.email}
                              maxLength={255}
                              onChange={(e) => setForm({ ...form, email: e.target.value })}
                              className="h-10 text-xs"
                              placeholder="student@kvsulur.in (optional)"
                            />
                          </div>
                        </div>
                      )}

                      {/* Subject */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-foreground">Subject / Headline *</Label>
                        <Input
                          value={form.subject}
                          maxLength={150}
                          onChange={(e) => setForm({ ...form, subject: e.target.value })}
                          className="h-10 text-xs"
                          placeholder="e.g. Add dark mode to the PDF reader, or Book search filter typo"
                        />
                      </div>

                      {/* Description */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <Label className="text-xs font-semibold text-foreground">
                            Details & Suggestions *
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
                          className="text-xs leading-relaxed resize-y min-h-[90px]"
                          placeholder="Please describe what happened, what could be better, or how this feature would help your learning..."
                        />
                      </div>

                      {/* Screenshot or Document Attachment */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold flex items-center justify-between text-foreground">
                          <span className="flex items-center gap-1.5">
                            <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                            Screenshot or Document (Optional)
                          </span>
                          <span className="text-[10px] text-muted-foreground">Max 10 MB</span>
                        </Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="file"
                            accept="image/*,.pdf,.doc,.docx,.txt"
                            className="text-xs cursor-pointer h-10 file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
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
                          {attachmentFile && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 text-destructive shrink-0"
                              onClick={() => setAttachmentFile(null)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        {attachmentFile && (
                          <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium pt-0.5">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>
                              Attached: {attachmentFile.name} ({(attachmentFile.size / 1024).toFixed(1)} KB)
                            </span>
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
                            className="mt-0.5 rounded border-border text-primary focus:ring-primary"
                          />
                          <label
                            htmlFor="allowFollowUp"
                            className="text-xs text-muted-foreground cursor-pointer select-none leading-tight"
                          >
                            Allow the school library coordinator to email me if they need additional details about this feedback.
                          </label>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex gap-2.5 pt-2">
                        <Button type="button" variant="outline" className="h-10 px-4" onClick={() => setStep(2)}>
                          Back
                        </Button>
                        <Button
                          className="flex-1 h-10 font-semibold"
                          onClick={handleSubmit}
                          disabled={saving}
                        >
                          {saving ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              Submitting Feedback...
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
