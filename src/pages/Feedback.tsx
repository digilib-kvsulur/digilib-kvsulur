import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, ArrowLeft, Send, Loader2, CheckCircle2, Star, Sparkles, AlertTriangle, ShieldQuestion } from "lucide-react";

export default function Feedback({ isEmbedded }: { isEmbedded?: boolean }) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState("");
  
  // Wizard steps: 1 = Category, 2 = Rating & Area, 3 = Details
  const [step, setStep] = useState(1);
  const [rating, setRating] = useState(5);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    category: "suggestion",
    urgency: "low",
    area: "Other",
    subject: "",
    description: "",
    allowFollowUp: true
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
              setForm((f) => ({
                ...f,
                fullName: `${data.first_name || ""} ${data.last_name || ""}`.trim(),
                email: data.email || session.user.email || "",
              }));
            }
          });
      }
    });
  }, []);

  const handleSubmit = async () => {
    if (!form.fullName.trim() || !form.subject.trim() || !form.description.trim()) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const refId = `FB-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
      
      const { error } = await supabase.from("user_feedback").insert({
        user_id: user?.id || null,
        full_name: form.fullName.trim(),
        email: form.email.trim() || null,
        category: `${form.category} (${form.area})`,
        rating,
        subject: `[Urgency: ${form.urgency.toUpperCase()}] ${form.subject.trim()}`,
        description: `${form.description.trim()}${form.allowFollowUp ? '\n\n(Follow-up allowed)' : ''}`,
      });

      if (error) throw error;
      
      setReferenceNumber(refId);
      setSubmitted(true);
      toast({ title: "Thank you! 🎉", description: "Your feedback has been submitted successfully." });
    } catch (err: any) {
      toast({ title: "Submission failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const getEmoji = (score: number) => {
    switch (score) {
      case 1: return "😞";
      case 2: return "😐";
      case 3: return "🙂";
      case 4: return "😄";
      case 5: return "🤩";
      default: return "🙂";
    }
  };

  const getEmojiLabel = (score: number) => {
    switch (score) {
      case 1: return "Disappointed";
      case 2: return "Neutral";
      case 3: return "Satisfied";
      case 4: return "Very Happy";
      case 5: return "Loved it!";
      default: return "";
    }
  };

  const categories = [
    { id: "suggestion", label: "Suggestion / Idea", icon: "💡", desc: "Share your thoughts on how to improve the library" },
    { id: "bug", label: "Bug Report", icon: "🐛", desc: "Report technical glitches or malfunctions" },
    { id: "compliment", label: "Compliment", icon: "❤️", desc: "Give kudos or positive feedback to our system" },
    { id: "crash", label: "App Crash", icon: "💥", desc: "Let us know if the app froze or quit unexpectedly" },
    { id: "content", label: "Content Issue", icon: "📄", desc: "Report issues with PDF, study guides, or book details" },
    { id: "other", label: "Other / General", icon: "❓", desc: "Any other questions or feedback" }
  ];

  const areas = ["Books", "Quizzes", "AI Bot", "Study Materials", "Games", "Other"];

  return (
    <main className={isEmbedded ? "" : "min-h-screen bg-background"}>
      <div className={`mx-auto w-full max-w-2xl ${isEmbedded ? 'pb-8' : 'px-4 py-8 sm:py-14'}`}>
        {!isEmbedded && (
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-5">
            <ArrowLeft className="h-4 w-4" /> Back to home
          </Link>
        )}

        <div className="text-center mb-7">
          <div className="w-14 h-14 rounded-2xl gradient-primary mx-auto flex items-center justify-center mb-3">
            <MessageSquare className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground font-sans">Share Your Feedback</h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Help us improve PM SHRI KV AFS Sulur Digital Library. We appreciate your suggestions!
          </p>
          <div className="mt-3 p-2 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 rounded-lg max-w-md mx-auto text-xs text-indigo-600 dark:text-indigo-400">
            ℹ️ Have a specific support issue or request? Track it by submitting a ticket on our <Link to="/support" className="underline font-bold hover:text-indigo-800">Support Page</Link> instead.
          </div>
        </div>

        {submitted ? (
          <Card className="border-emerald-500/30">
            <CardContent className="p-8 text-center space-y-4">
              <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto" />
              <h2 className="text-lg font-bold">Feedback Sent!</h2>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Thank you for taking the time to share your feedback. Your submission helps us build a better library experience.
              </p>
              {referenceNumber && (
                <div className="bg-muted p-2 rounded-lg text-xs font-mono inline-block">
                  Reference ID: <strong className="text-foreground">{referenceNumber}</strong>
                </div>
              )}
              <div className="flex justify-center gap-3 pt-3">
                <Button onClick={() => navigate("/")} variant="outline">
                  Go to Home
                </Button>
                <Button
                  onClick={() => {
                    setSubmitted(false);
                    setStep(1);
                    setForm((f) => ({ ...f, subject: "", description: "" }));
                  }}
                >
                  Submit More Feedback
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border/50 overflow-hidden shadow-md">
            {/* Step progress bar */}
            <div className="h-1.5 bg-slate-100 w-full relative">
              <div 
                className="h-full bg-indigo-600 transition-all duration-300" 
                style={{ width: `${(step / 3) * 100}%` }} 
              />
            </div>

            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg font-bold">
                  Step {step} of 3: {step === 1 ? "Select Category" : step === 2 ? "How was your experience?" : "Feedback Details"}
                </CardTitle>
                <Badge variant="secondary" className="text-xs">Step {step}/3</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              
              {/* STEP 1: Select Category */}
              {step === 1 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {categories.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setForm({ ...form, category: c.id });
                        setStep(2);
                      }}
                      className={`text-left p-4 rounded-xl border transition-all hover:border-indigo-400 hover:shadow-sm ${form.category === c.id ? 'border-indigo-600 bg-indigo-50/20' : 'border-slate-200'}`}
                    >
                      <div className="text-2xl mb-1.5">{c.icon}</div>
                      <p className="font-bold text-sm text-foreground">{c.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{c.desc}</p>
                    </button>
                  ))}
                </div>
              )}

              {/* STEP 2: Rating, Urgency & Area Selection */}
              {step === 2 && (
                <div className="space-y-6 pt-2">
                  {/* Emoji Scale */}
                  <div className="space-y-2 text-center">
                    <Label className="text-sm font-bold text-slate-700 block">Overall Experience Rating</Label>
                    <div className="flex justify-center items-center gap-3 sm:gap-4 py-2">
                      {[1, 2, 3, 4, 5].map((score) => (
                        <button
                          key={score}
                          type="button"
                          onClick={() => setRating(score)}
                          className="flex flex-col items-center gap-1 group"
                        >
                          <span className={`text-4xl transition-transform duration-200 ${rating === score ? 'scale-125 filter-none' : 'scale-100 opacity-60 filter grayscale group-hover:opacity-100 group-hover:scale-110'}`}>
                            {getEmoji(score)}
                          </span>
                          <span className={`text-[10px] font-bold mt-1 ${rating === score ? 'text-indigo-600' : 'text-slate-400'}`}>
                            {score}
                          </span>
                        </button>
                      ))}
                    </div>
                    {rating > 0 && (
                      <p className="text-xs font-black text-indigo-600 uppercase tracking-widest">{getEmojiLabel(rating)}</p>
                    )}
                  </div>

                  {/* Urgency & Area */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Priority / Urgency</Label>
                      <Select value={form.urgency} onValueChange={(v) => setForm({ ...form, urgency: v })}>
                        <SelectTrigger className="h-11">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">🟢 Low (Just sharing / General feedback)</SelectItem>
                          <SelectItem value="medium">🟡 Medium (Could be improved / Minor bug)</SelectItem>
                          <SelectItem value="high">🔴 High (Major bug / System blocked)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Which Area / Feature?</Label>
                      <Select value={form.area} onValueChange={(v) => setForm({ ...form, area: v })}>
                        <SelectTrigger className="h-11">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {areas.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button type="button" variant="outline" className="flex-1 h-11" onClick={() => setStep(1)}>
                      Back
                    </Button>
                    <Button type="button" className="flex-1 h-11" onClick={() => setStep(3)}>
                      Continue
                    </Button>
                  </div>
                </div>
              )}

              {/* STEP 3: Details & Text Input */}
              {step === 3 && (
                <div className="space-y-4 pt-1">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Your Name *</Label>
                      <Input
                        value={form.fullName}
                        maxLength={100}
                        onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                        className="h-11"
                        placeholder="Enter your name"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Email</Label>
                      <Input
                        type="email"
                        value={form.email}
                        maxLength={255}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        className="h-11"
                        placeholder="you@example.com (optional)"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Subject *</Label>
                    <Input
                      value={form.subject}
                      maxLength={150}
                      onChange={(e) => setForm({ ...form, subject: e.target.value })}
                      className="h-11"
                      placeholder="Summarize your feedback"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <Label className="text-xs font-semibold">Description *</Label>
                      <span className="text-[10px] text-muted-foreground font-mono">{form.description.length}/2000 chars</span>
                    </div>
                    <Textarea
                      value={form.description}
                      maxLength={2000}
                      rows={5}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="Describe your suggestion, idea, or issue in detail..."
                    />
                  </div>

                  <div className="flex items-center gap-2 py-2">
                    <input
                      id="allowFollowUp"
                      type="checkbox"
                      checked={form.allowFollowUp}
                      onChange={(e) => setForm({ ...form, allowFollowUp: e.target.checked })}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <label htmlFor="allowFollowUp" className="text-xs text-muted-foreground cursor-pointer select-none">
                      Allow admin to contact me for follow-up details on this feedback.
                    </label>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button type="button" variant="outline" className="h-11" onClick={() => setStep(2)}>
                      Back
                    </Button>
                    <Button className="flex-1 h-11" onClick={handleSubmit} disabled={saving}>
                      {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                      Submit Feedback
                    </Button>
                  </div>
                </div>
              )}

            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
