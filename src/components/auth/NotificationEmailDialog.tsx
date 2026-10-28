import { useEffect, useState } from "react";
import { Mail, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { sendEmailVerifiedEmail } from "@/lib/autoEmail";
import { ALLOWED_EMAIL_HINT, isAllowedEmail, normalizeEmail } from "@/lib/emailValidation";

interface NotificationEmailDialogProps {
  open: boolean;
  userId: string;
  currentEmail?: string | null;
  onComplete: () => void;
}

const isPlaceholderEmail = (email = "") => !isAllowedEmail(email);

export default function NotificationEmailDialog({ open, userId, currentEmail, onComplete }: NotificationEmailDialogProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setEmail(currentEmail && !isPlaceholderEmail(currentEmail) ? currentEmail : "");
      setError("");
    }
  }, [open, currentEmail]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedEmail = normalizeEmail(email);
    if (!isAllowedEmail(normalizedEmail)) {
      setError(ALLOWED_EMAIL_HINT);
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
          <DialogTitle>Update your email</DialogTitle>
          <DialogDescription>
            Enter the email address where you would like to receive library news, notices, and account updates.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={save} className="space-y-4 pt-2">
          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
          <div className="space-y-2">
            <Label htmlFor="notification-email">Email address</Label>
            <Input id="notification-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@gmail.com" autoComplete="email" required />
          </div>
          <p className="text-xs text-muted-foreground">{ALLOWED_EMAIL_HINT}</p>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : "Confirm and continue"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
