import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { UserCog, X, Save, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface InChatProfileEditorProps {
  currentUser: any;
  onClose: () => void;
  onProfileUpdated: (updatedUser: any) => void;
}

export const InChatProfileEditor = ({
  currentUser,
  onClose,
  onProfileUpdated,
}: InChatProfileEditorProps) => {
  const { toast } = useToast();
  const [bio, setBio] = useState(currentUser?.bio || "");
  const [phone, setPhone] = useState(currentUser?.phone || "");
  const [rollNumber, setRollNumber] = useState(currentUser?.roll_number || "");
  const [studentClass, setStudentClass] = useState(currentUser?.student_class || "");
  const [username, setUsername] = useState(currentUser?.username || "");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!currentUser?.id) {
    return (
      <div className="bg-card border border-border/60 rounded-2xl shadow-lg overflow-hidden animate-in fade-in text-xs">
        <div className="bg-gradient-to-r from-violet-500/15 via-primary/10 to-transparent border-b border-border/50 px-3 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/15">
              <UserCog className="h-3.5 w-3.5 text-primary" />
            </div>
            <p className="font-bold text-[11px] text-foreground">Profile Editor</p>
          </div>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 rounded-full" onClick={onClose}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
        <p className="p-3 text-muted-foreground">
          🔒 Sign in to edit your bio, phone, class, or username.
        </p>
      </div>
    );
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    if (phone && phone.trim().length > 15) {
      setErrorMsg("Phone number cannot exceed 15 digits.");
      return;
    }
    setSaving(true);
    try {
      const cleanUsername = username.trim().toLowerCase().replace(/\s+/g, "_");
      const updatePayload: Record<string, any> = {
        bio: bio.trim(),
        phone: phone.trim(),
        roll_number: rollNumber.trim(),
        student_class: studentClass.trim().toUpperCase(),
        updated_at: new Date().toISOString(),
      };
      if (cleanUsername) updatePayload.username = cleanUsername;

      const { error } = await supabase
        .from("profiles")
        .update(updatePayload)
        .eq("id", currentUser.id);
      if (error) throw error;

      toast({ title: "Profile updated ✨", description: "Your changes have been saved." });
      onProfileUpdated({ ...currentUser, ...updatePayload });
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-card border border-border/60 rounded-2xl shadow-lg overflow-hidden animate-in fade-in slide-in-from-bottom-3 text-xs">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-500/15 via-primary/10 to-transparent border-b border-border/50 px-3 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/15">
            <UserCog className="h-3.5 w-3.5 text-primary" />
          </div>
          <div>
            <p className="font-bold text-[11px] text-foreground">Quick Profile Editor</p>
            <p className="text-[9px] text-muted-foreground">Only you can edit these fields</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 rounded-full text-muted-foreground hover:text-foreground"
          onClick={onClose}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <form onSubmit={handleSave} className="p-3 space-y-2.5">
        {/* Bio */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-medium text-muted-foreground">Bio & interests</p>
            <span className="text-[9px] text-muted-foreground/60">{bio.length}/180</span>
          </div>
          <Textarea
            placeholder="e.g. Science fiction lover, aspiring coder, Class 11 CS..."
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, 180))}
            className="text-xs min-h-[48px] p-2 rounded-xl border-border/60 focus-visible:ring-primary/30 resize-none"
          />
        </div>

        {/* Class + Roll */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-[10px] font-medium text-muted-foreground mb-1">Class & section</p>
            <Input
              placeholder="e.g. 11A"
              value={studentClass}
              onChange={(e) => setStudentClass(e.target.value)}
              className="h-8 text-xs rounded-xl border-border/60 focus-visible:ring-primary/30"
            />
          </div>
          <div>
            <p className="text-[10px] font-medium text-muted-foreground mb-1">Roll number</p>
            <Input
              placeholder="e.g. 24"
              value={rollNumber}
              onChange={(e) => setRollNumber(e.target.value)}
              className="h-8 text-xs rounded-xl border-border/60 focus-visible:ring-primary/30"
            />
          </div>
        </div>

        {/* Phone + Username */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-[10px] font-medium text-muted-foreground mb-1">Phone number</p>
            <Input
              placeholder="9876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-8 text-xs font-mono rounded-xl border-border/60 focus-visible:ring-primary/30"
            />
          </div>
          <div>
            <p className="text-[10px] font-medium text-muted-foreground mb-1">Username</p>
            <div className="relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground/60 text-[11px]">@</span>
              <Input
                placeholder="aryan_kv"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="h-8 text-xs font-mono rounded-xl border-border/60 focus-visible:ring-primary/30 pl-5"
              />
            </div>
          </div>
        </div>

        {errorMsg && (
          <p className="text-[11px] text-destructive flex items-center gap-1.5 bg-destructive/5 border border-destructive/20 rounded-lg px-2 py-1.5">
            <AlertCircle className="h-3 w-3 shrink-0" /> {errorMsg}
          </p>
        )}

        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 text-xs flex-none px-3 rounded-xl text-muted-foreground"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={saving}
            className="h-8 text-xs flex-1 rounded-xl font-semibold bg-gradient-to-r from-primary to-primary/80 shadow-xs"
          >
            {saving ? (
              <><Loader2 className="h-3 w-3 animate-spin mr-1.5" /> Saving...</>
            ) : (
              <><Save className="h-3 w-3 mr-1.5" /> Save Changes</>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};
