import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Sparkles, KeyRound, Mail, Phone, UserCheck, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TeacherProfileCompletionDialogProps {
  open: boolean;
  user: any;
  onComplete: () => void;
}

export default function TeacherProfileCompletionDialog({ open, user, onComplete }: TeacherProfileCompletionDialogProps) {
  const [firstName, setFirstName] = useState(user?.first_name || "");
  const [lastName, setLastName] = useState(user?.last_name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [email, setEmail] = useState(user?.email || "");
  const [username, setUsername] = useState(user?.username || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const { toast } = useToast();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!firstName.trim() || !lastName.trim() || !phone.trim() || !email.trim() || !username.trim() || !password.trim()) {
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
      const { error: passwordError } = await supabase.auth.updateUser({
        password: password
      });
      if (passwordError) throw passwordError;

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim(),
          email: email.trim(),
          username: username.trim().toLowerCase(),
          needs_profile_update: false,
          updated_at: new Date().toISOString()
        })
        .eq("id", user.id);

      if (profileError) {
        if (profileError.message?.toLowerCase().includes("unique") || profileError.message?.toLowerCase().includes("username")) {
          throw new Error("This username is already taken. Please choose another username.");
        }
        throw profileError;
      }

      await supabase.auth.updateUser({
        data: { needs_profile_update: false }
      });

      await supabase.auth.refreshSession();

      toast({
        title: "Profile Setup Complete!",
        description: "Your account is now fully set up. Welcome to the Teacher Dashboard!",
      });
      onComplete();
    } catch (error: any) {
      console.error("Profile setup error:", error);
      setErrorMsg(error.message || "Failed to update profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl text-[#0f1b3d]">
            <Sparkles className="h-6 w-6 text-amber-500" /> Complete Teacher Profile
          </DialogTitle>
          <DialogDescription className="text-sm">
            Welcome! Please complete your profile and set a secure password to continue.
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <Alert variant="destructive" className="py-2">
            <AlertDescription>{errorMsg}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSave} className="space-y-4 py-2">
          {/* Section: Personal Info */}
          <div className="bg-slate-50 p-4 rounded-xl space-y-4 border border-slate-100">
            <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5"><UserCheck className="h-4 w-4" /> Personal Information</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs">First Name *</Label>
                <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First Name" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Last Name *</Label>
                <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last Name" />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs flex items-center gap-1"><Mail className="h-3 w-3" /> Email *</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your.email@example.com" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs flex items-center gap-1"><Phone className="h-3 w-3" /> Phone Number *</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit number" />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1"><User className="h-3 w-3" /> Choose a Username *</Label>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g. jsmith2024" />
              <p className="text-[10px] text-muted-foreground mt-1">This will be your unique handle for logging in.</p>
            </div>
          </div>

          {/* Section: Security */}
          <div className="bg-amber-50/50 p-4 rounded-xl space-y-4 border border-amber-100">
            <h4 className="text-sm font-semibold text-amber-800 flex items-center gap-1.5"><KeyRound className="h-4 w-4" /> Account Security</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs text-amber-900 flex items-center gap-1">
                  <KeyRound className="h-3 w-3 text-muted-foreground" /> Choose New Password *
                </Label>
                <Input 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  placeholder="Min 6 characters"
                  className="bg-white border-amber-200 focus-visible:ring-amber-500"
                />
              </div>
              
              <div className="space-y-1">
                <Label className="text-xs text-amber-900">
                  Confirm Password *
                </Label>
                <Input 
                  type="password" 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)} 
                  placeholder="Re-type password"
                  className="bg-white border-amber-200 focus-visible:ring-amber-500"
                />
              </div>
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full h-12 text-base font-semibold gradient-primary">
            {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving Profile...</> : "Complete Profile & Login"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
