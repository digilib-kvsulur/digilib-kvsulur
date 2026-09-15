import { useEffect, useState } from "react";
import { Mail, ShieldCheck, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";

interface NotificationEmailDialogProps {
  open: boolean;
  userId: string;
  currentEmail?: string | null;
  onComplete: () => void;
}

const isPlaceholderEmail = (email = "") => /@(kvschool\.in|internal|dummy|example\.com)$/i.test(email.trim());

export default function NotificationEmailDialog({ open, userId, currentEmail, onComplete }: NotificationEmailDialogProps) {
  const [email, setEmail] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setEmail(currentEmail && !isPlaceholderEmail(currentEmail) ? currentEmail : "");
      setConfirmed(false);
      setError("");
    }
  }, [open, currentEmail]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      setError("Enter a valid email address.");
      return;
    }
    if (!confirmed) {
      setError("Please confirm that this is the right address for you.");
      return;
    }

    setLoading(true);
    setError("");
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        email: normalizedEmail,
        notification_email: normalizedEmail,
        notification_email_confirmed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    setLoading(false);
    if (updateError) {
      setError("We could not save your email. Please try again.");
      return;
    }
    sendEmailVerifiedEmail(userId, normalizedEmail);
    onComplete();
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-md rounded-2xl [&>button]:hidden" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader className="space-y-2 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Mail className="h-6 w-6" /></div>
          <DialogTitle>Confirm your update email</DialogTitle>
          <DialogDescription>
            Please confirm the email address where you would like to receive library news, notices, and important account updates.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={save} className="space-y-4 pt-2">
          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
          <div className="space-y-2">
            <Label htmlFor="notification-email">Email address</Label>
            <Input id="notification-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required />
          </div>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
            <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-0.5 h-4 w-4 accent-primary" />
            <span><ShieldCheck className="mr-1 inline h-4 w-4 text-primary" />I confirm that I can receive updates at this email address.</span>
          </label>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : "Confirm and continue"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
