import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Sparkles, KeyRound, Mail, Phone, GraduationCap, Hash, UserCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ProfileCompletionDialogProps {
  open: boolean;
  user: any;
  onComplete: () => void;
}

export default function ProfileCompletionDialog({ open, user, onComplete }: ProfileCompletionDialogProps) {
  const [firstName, setFirstName] = useState(user?.first_name || "");
  const [lastName, setLastName] = useState(user?.last_name || "");
  const [studentClass, setStudentClass] = useState(user?.student_class || "");
  const [rollNumber, setRollNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const { toast } = useToast();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!firstName.trim() || !lastName.trim() || !studentClass.trim() || !rollNumber.trim() || !phone.trim() || !email.trim() || !password.trim()) {
      setErrorMsg("Please fill in all fields.");
      return;
    }

    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters long.");
      return;
    }

    if (password === "Welcome@123") {
      setErrorMsg("You must choose a new password different from the default one.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      // 1) Update auth password first (non-fatal for email validation issues)
      const { error: passwordError } = await supabase.auth.updateUser({
        password: password
      });

      if (passwordError) throw passwordError;

      // 2) Try updating auth email address (non-fatal if old dummy domain is rejected by Supabase)
      try {
        const { error: emailError } = await supabase.auth.updateUser({
          email: email.trim()
        });
        if (emailError) {
          console.warn("Auth email update warning (proceeding with profile update):", emailError.message);
        }
      } catch (emailEx) {
        console.warn("Auth email update exception:", emailEx);
      }

      // 3) Update public profiles table with real student email and profile info
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          student_class: studentClass.trim(),
          roll_number: rollNumber.trim(),
          phone: phone.trim(),
          email: email.trim(),
          updated_at: new Date().toISOString()
        })
        .eq("id", user.id);

      if (profileError) throw profileError;

      // 4) Clear the needs_profile_update flag in auth metadata
      await supabase.auth.updateUser({
        data: { needs_profile_update: false }
      });

      // 5) Force the local session to refresh so checkAuth() reads the new metadata.
      //    Without this, getSession() returns the stale cached session and the dialog stays open.
      await supabase.auth.refreshSession();

      toast({
        title: "Profile Setup Complete!",
        description: "Your account is now fully set up. Welcome to the library!",
      });

      onComplete();
    } catch (error: any) {
      console.error("Error setting up profile:", error);
      setErrorMsg(error.message || "An error occurred while updating your profile.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto border-border/40 bg-card/95 backdrop-blur-xl shadow-2xl p-6 rounded-2xl select-none [&>button]:hidden">
        <DialogHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-2">
            <Sparkles className="h-6 w-6 animate-pulse" />
          </div>
          <DialogTitle className="text-2xl font-black tracking-tight text-foreground">
            Complete Your Profile
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Welcome to PM SHRI KV AFS SULUR Digital Library! Let's complete your registration to get started.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4 mt-2">
          {errorMsg && (
            <Alert variant="destructive" className="rounded-xl border-destructive/20 bg-destructive/5 py-2">
              <AlertDescription className="text-xs">{errorMsg}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                First Name
              </Label>
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="e.g. Aarav"
                className="rounded-xl border-border/60"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                Last Name
              </Label>
              <Input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="e.g. Sharma"
                className="rounded-xl border-border/60"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <GraduationCap className="h-3 w-3 text-muted-foreground" /> Class
              </Label>
              <Input
                value={studentClass}
                onChange={(e) => setStudentClass(e.target.value)}
                placeholder="e.g. 8"
                className="rounded-xl border-border/60"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Hash className="h-3 w-3 text-muted-foreground" /> Roll Number
              </Label>
              <Input
                value={rollNumber}
                onChange={(e) => setRollNumber(e.target.value)}
                placeholder="e.g. 12"
                className="rounded-xl border-border/60"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Mail className="h-3 w-3 text-muted-foreground" /> Real Email Address
            </Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. aarav@example.com"
              className="rounded-xl border-border/60"
              required
            />
            <p className="text-[10px] text-muted-foreground leading-normal">
              Used for account recovery and notifications.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Phone className="h-3 w-3 text-muted-foreground" /> Phone Contact
            </Label>
            <Input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 9876543210"
              className="rounded-xl border-border/60"
              required
            />
          </div>

          <div className="border-t border-border/30 pt-3 space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <KeyRound className="h-3 w-3 text-muted-foreground" /> Choose New Password
              </Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="rounded-xl border-border/60"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                Confirm Password
              </Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="rounded-xl border-border/60"
                required
              />
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full h-11 mt-2 rounded-xl gradient-primary border-0 text-base font-bold shadow-lg hover:shadow-xl transition-all">
            {loading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving Details...</>
            ) : (
              <><UserCheck className="h-4 w-4 mr-2" />Save and Unlock Dashboard</>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
