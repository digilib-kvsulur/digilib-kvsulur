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
import { MessageSquare, ArrowLeft, Send, Loader2, CheckCircle2, Star } from "lucide-react";

export default function Feedback() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [rating, setRating] = useState(5);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    category: "suggestion",
    subject: "",
    description: "",
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
      const { error } = await supabase.from("user_feedback").insert({
        user_id: user?.id || null,
        full_name: form.fullName.trim(),
        email: form.email.trim() || null,
        category: form.category,
        rating,
        subject: form.subject.trim(),
        description: form.description.trim(),
      });

      if (error) throw error;
      setSubmitted(true);
      toast({ title: "Thank you! 🎉", description: "Your feedback has been submitted successfully." });
    } catch (err: any) {
      toast({ title: "Submission failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-14">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-5">
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>

        <div className="text-center mb-7">
          <div className="w-14 h-14 rounded-2xl gradient-primary mx-auto flex items-center justify-center mb-3">
            <MessageSquare className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground font-sans">Share Your Feedback</h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Help us improve PM SHRI KV AFS Sulur Digital Library. We appreciate your suggestions!
          </p>
        </div>

        {submitted ? (
          <Card className="border-emerald-500/30">
            <CardContent className="p-8 text-center space-y-4">
              <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto" />
              <h2 className="text-lg font-bold">Feedback Sent!</h2>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Thank you for taking the time to share your feedback. Your submission helps us create a better library experience.
              </p>
              <div className="flex justify-center gap-3">
                <Button onClick={() => navigate("/")} variant="outline">
                  Go to Home
                </Button>
                <Button
                  onClick={() => {
                    setSubmitted(false);
                    setForm((f) => ({ ...f, subject: "", description: "" }));
                  }}
                >
                  Submit More Feedback
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border/50 overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-primary via-accent to-primary" />
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-bold">Feedback Details</CardTitle>
              <CardDescription className="text-xs">
                Fill in the form below. You can submit anonymously or log in to link it to your account.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Feedback Type</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="suggestion">💡 Suggestion / Idea</SelectItem>
                      <SelectItem value="bug">🐛 Bug Report</SelectItem>
                      <SelectItem value="compliment">❤️ Compliment</SelectItem>
                      <SelectItem value="other">❓ Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Overall Rating</Label>
                  <div className="flex items-center gap-1.5 h-11">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className="p-1 transition-transform hover:scale-110"
                      >
                        <Star
                          className={`w-6 h-6 ${star <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`}
                        />
                      </button>
                    ))}
                  </div>
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
                <Label className="text-xs font-semibold">Description *</Label>
                <Textarea
                  value={form.description}
                  maxLength={2000}
                  rows={5}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Provide detailed comments, ideas, or describe a bug you encountered..."
                />
              </div>

              <Button className="w-full h-11" onClick={handleSubmit} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                Submit Feedback
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
