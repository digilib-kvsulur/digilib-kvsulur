import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { UserCog, X, Save, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
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
  onProfileUpdated
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
      <div className="p-3.5 bg-card border border-primary/25 rounded-2xl shadow-md text-xs space-y-2">
        <div className="flex items-center justify-between border-b pb-2">
          <span className="font-bold flex items-center gap-1.5"><UserCog className="h-4 w-4 text-primary" /> Profile Editor</span>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 rounded-full" onClick={onClose}><X className="h-3.5 w-3.5" /></Button>
        </div>
        <p className="text-muted-foreground">🔒 Please sign in to your library account to edit your profile details.</p>
      </div>
    );
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    // Basic validation
    const cleanUsername = username.trim().toLowerCase().replace(/\s+/g, "_");
    if (phone && phone.trim().length > 15) {
      setErrorMsg("Phone number cannot exceed 15 digits.");
      return;
    }

    setSaving(true);
    try {
      const updatePayload: Record<string, any> = {
        bio: bio.trim(),
        phone: phone.trim(),
        roll_number: rollNumber.trim(),
        student_class: studentClass.trim().toUpperCase(),
        updated_at: new Date().toISOString()
      };

      if (cleanUsername) {
        updatePayload.username = cleanUsername;
      }

      const { error } = await supabase
        .from("profiles")
        .update(updatePayload)
        .eq("id", currentUser.id);

      if (error) throw error;

      const updated = {
        ...currentUser,
        ...updatePayload
      };

      toast({
        title: "Profile Updated ✨",
        description: "Your library profile details have been saved."
      });

      onProfileUpdated(updated);
    } catch (err: any) {
      console.error("In-chat profile update error:", err);
      setErrorMsg(err.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-3 bg-card border border-primary/30 rounded-2xl shadow-lg space-y-2.5 animate-in fade-in slide-in-from-bottom-2 text-xs">
      <div className="flex items-center justify-between border-b border-border/60 pb-2">
        <div className="flex items-center gap-1.5 font-bold text-foreground">
          <UserCog className="h-4 w-4 text-primary" />
          <span>Quick Profile Editor</span>
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

      <form onSubmit={handleSave} className="space-y-2">
        <div>
          <label className="text-[10px] font-semibold text-muted-foreground uppercase">Bio / Reading Interests</label>
          <Textarea
            placeholder="e.g. Science fiction lover, Class 11 CS"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="text-xs min-h-[45px] p-2 rounded-lg border border-border bg-background focus:ring-1 focus:ring-primary outline-hidden resize-none"
            maxLength={180}
          />
          <div className="text-[9px] text-right text-muted-foreground">{bio.length}/180</div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase">Class & Section</label>
            <Input
              placeholder="e.g. 11A or 10B"
              value={studentClass}
              onChange={(e) => setStudentClass(e.target.value)}
              className="h-7.5 text-xs rounded-lg"
            />
          </div>

          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase">Roll No.</label>
            <Input
              placeholder="e.g. 24"
              value={rollNumber}
              onChange={(e) => setRollNumber(e.target.value)}
              className="h-7.5 text-xs rounded-lg"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase">Phone Number</label>
            <Input
              placeholder="e.g. 9876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-7.5 text-xs font-mono rounded-lg"
            />
          </div>

          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase">Username</label>
            <Input
              placeholder="e.g. aryan_kv"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="h-7.5 text-xs font-mono rounded-lg"
            />
          </div>
        </div>

        {errorMsg && (
          <p className="text-[11px] text-destructive flex items-center gap-1 font-medium">
            <AlertCircle className="h-3 w-3 shrink-0" /> {errorMsg}
          </p>
        )}

        <div className="flex gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="h-7 text-xs flex-1 rounded-lg"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={saving}
            className="h-7 text-xs flex-1 rounded-lg bg-primary text-primary-foreground font-semibold"
          >
            {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
};
