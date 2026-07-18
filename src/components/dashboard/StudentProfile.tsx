import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  User, Edit, Save, X, Camera, Settings, Star, GraduationCap, BookOpen, Sparkles, Trophy, Flame
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import * as Icons from "lucide-react";

interface StudentProfileProps {
  user: any;
  onProfileUpdate?: () => void;
}

const StudentProfile = ({ user, onProfileUpdate }: StudentProfileProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [social, setSocial] = useState<any>({ posts_count: 0, followers_count: 0, following_count: 0, books_read: 0, quizzes: 0, current_streak: 0 });
  const [levelInfo, setLevelInfo] = useState<any | null>(null);

  const [formData, setFormData] = useState({
    first_name: '', last_name: '', email: '', phone: '',
    student_class: '', roll_number: '', admission_number: '',
    username: '', bio: ''
  });
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;
    setFormData({
      first_name: user.first_name || '', last_name: user.last_name || '',
      email: user.email || '', phone: user.phone || '',
      student_class: user.student_class || '', roll_number: user.roll_number || '',
      admission_number: user.admission_number || '', username: user.username || '',
      bio: user.bio || ''
    });
    loadAvatar(user.avatar_url);
    loadSocial();
    loadUserLevel();
  }, [user]);

  const loadAvatar = async (path?: string | null) => {
    if (!path) { setAvatarUrl(null); return; }
    try {
      const { data } = await supabase.storage.from("avatars").createSignedUrl(path, 3600);
      setAvatarUrl(data?.signedUrl || null);
    } catch (e) {
      console.error("Error loading avatar:", e);
    }
  };

  const loadUserLevel = async () => {
    if (!user?.points && user?.points !== 0) return;
    try {
      const { data } = await supabase.rpc('get_user_level', { user_points: user.points });
      if (data && data.length > 0) setLevelInfo(data[0]);
    } catch (e) {
      console.error('Error fetching level in profile:', e);
    }
  };

  const loadSocial = async () => {
    if (!user?.id) return;
    try {
      const [{ data: full }, { data: extra }] = await Promise.all([
        supabase.rpc("get_public_profile_full", { _id: user.id }),
        supabase.rpc("get_public_profile_stats", { _id: user.id }),
      ]);
      setSocial({ ...(full?.[0] || {}), ...(extra?.[0] || {}) });
    } catch (e) {
      console.error("Error loading social profile info:", e);
    }
  };

  const uploadAvatar = async (file: File) => {
    if (!file || !user?.id) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/avatar.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { error: dbErr } = await supabase.from("profiles").update({ avatar_url: path }).eq("id", user.id);
      if (dbErr) throw dbErr;
      await loadAvatar(path);
      toast({ title: "Profile picture updated successfully!" });
      onProfileUpdate?.();
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.first_name.trim() || !formData.last_name.trim()) {
      toast({ title: "Validation Error", description: "First name and last name are required", variant: "destructive" });
      return;
    }
    try {
      setLoading(true);
      const { error } = await supabase.from('profiles').update({
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        phone: formData.phone.trim(),
        student_class: formData.student_class.trim(),
        roll_number: formData.roll_number.trim(),
        admission_number: formData.admission_number.trim(),
        username: formData.username.trim(),
        bio: formData.bio.trim(),
        updated_at: new Date().toISOString()
      }).eq('id', user.id);
      if (error) throw error;
      toast({ title: "Profile updated" });
      setIsEditing(false);
      onProfileUpdate?.();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to update", variant: "destructive" });
    } finally { setLoading(false); }
  };

  const calculateCompleteness = () => {
    const fields = [
      formData.first_name, formData.last_name, formData.username,
      formData.bio, formData.phone, formData.student_class,
      formData.roll_number, formData.admission_number, user.avatar_url
    ];
    const filled = fields.filter(f => !!f).length;
    return Math.round((filled / fields.length) * 100);
  };

  const initials = `${(user?.first_name?.[0] || '').toUpperCase()}${(user?.last_name?.[0] || '').toUpperCase()}`;
  const completeness = calculateCompleteness();
  // Safely resolve the level icon — fall back to Star if the DB icon name doesn't match a Lucide export
  const resolvedIcon = levelInfo?.icon_name ? (Icons as any)[levelInfo.icon_name] : null;
  const LevelIcon: React.ComponentType<any> = typeof resolvedIcon === 'function' ? resolvedIcon : Star;

  return (
    <div className="space-y-6">
      <style>{`
        .profile-gradient-mesh {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 40%, #ec4899 100%);
          background-size: 200% 200%;
          animation: profileMeshShimmer 12s ease infinite;
        }
        @keyframes profileMeshShimmer {
          0%   { background-position: 0% 50% }
          50%  { background-position: 100% 50% }
          100% { background-position: 0% 50% }
        }
        .avatar-glow::after {
          content: '';
          position: absolute;
          inset: -4px;
          border-radius: 9999px;
          background: linear-gradient(135deg, #a855f7, #6366f1, #ec4899);
          z-index: -1;
          opacity: 0.6;
          filter: blur(6px);
        }
      `}</style>

      {/* ── Profile Header Card ── */}
      <Card className="overflow-hidden border-border/40 shadow-lg bg-card">
        {/* Banner */}
        <div className="h-40 profile-gradient-mesh relative" />

        {/* Avatar + Name block — pushed below banner with negative margin */}
        <CardContent className="px-6 pb-6 pt-0">
          <div className="flex flex-col sm:flex-row gap-5 -mt-14 items-end sm:items-end">
            {/* Avatar */}
            <div className="relative shrink-0 z-10">
              <Avatar className="h-28 w-28 ring-4 ring-card shadow-2xl avatar-glow">
                {avatarUrl && <AvatarImage src={avatarUrl} className="object-cover" />}
                <AvatarFallback className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white font-extrabold text-3xl">{initials}</AvatarFallback>
              </Avatar>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-1 right-1 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground p-2 shadow-lg hover:scale-110 active:scale-95 transition-all z-20"
                title="Change Avatar"
              >
                <Camera className="h-4 w-4" />
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])} />
            </div>

            {/* Name & bio — white-card-background section */}
            <div className="flex-1 pt-2 min-w-0 bg-card rounded-xl px-4 py-3 border border-border/20 shadow-sm z-10">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h2 className="text-xl font-extrabold tracking-tight text-foreground">
                  {user?.first_name} {user?.last_name}
                </h2>
                {user?.username && (
                  <span className="text-sm font-semibold text-muted-foreground">@{user.username}</span>
                )}
                {user?.student_class && (
                  <Badge variant="outline" className="bg-indigo-500/10 text-indigo-500 border-indigo-500/30 font-bold">
                    Class {user.student_class}
                  </Badge>
                )}
              </div>

              {user?.bio ? (
                <p className="text-sm text-foreground/80 leading-relaxed">{user.bio}</p>
              ) : (
                <p className="text-xs text-muted-foreground italic">No bio yet. Click Edit Profile below to add one!</p>
              )}

              {/* XP Progress */}
              {levelInfo && (
                <div className="mt-3 max-w-sm">
                  <div className="flex justify-between items-center text-xs font-bold text-muted-foreground mb-1">
                    <span className="flex items-center gap-1">
                      <LevelIcon className="h-3.5 w-3.5" style={{ color: levelInfo.color }} />
                      Level {levelInfo.level_number}: {levelInfo.name}
                    </span>
                    <span>{user.points || 0} XP</span>
                  </div>
                  <Progress value={levelInfo.progress_to_next || 0} className="h-2" />
                  {levelInfo.points_to_next > 0 ? (
                    <p className="text-[10px] text-muted-foreground mt-0.5">{levelInfo.points_to_next} XP to next level</p>
                  ) : (
                    <p className="text-[10px] text-emerald-500 mt-0.5 font-semibold">Max level achieved! 🎖️</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Stats Row */}
          <div className="mt-5 grid grid-cols-3 sm:grid-cols-6 gap-3 pt-4 border-t border-border/20">
            {[
              { icon: <Trophy className="h-4 w-4 text-amber-500" />, label: "Points", value: user?.points || 0, bg: "bg-amber-500/10" },
              { icon: <Flame className="h-4 w-4 text-orange-500" />, label: "Streak", value: `${social?.current_streak || 0}d`, bg: "bg-orange-500/10" },
              { icon: <BookOpen className="h-4 w-4 text-blue-500" />, label: "Read", value: social?.books_read || 0, bg: "bg-blue-500/10" },
              { icon: <Sparkles className="h-4 w-4 text-pink-500" />, label: "Quizzes", value: social?.quizzes || 0, bg: "bg-pink-500/10" },
              { icon: <User className="h-4 w-4 text-indigo-500" />, label: "Followers", value: social?.followers_count || 0, bg: "bg-indigo-500/10" },
              { icon: <User className="h-4 w-4 text-purple-500" />, label: "Following", value: social?.following_count || 0, bg: "bg-purple-500/10" },
            ].map((s, i) => (
              <div key={i} className={`flex flex-col items-center gap-1 p-3 ${s.bg} rounded-xl border border-border/10`}>
                {s.icon}
                <span className="text-base font-black text-foreground leading-none">{s.value}</span>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{s.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Edit Profile Card ── */}
      <Card className="border-border/40 bg-card/80 backdrop-blur-md shadow-md">
        <CardHeader className="pb-3 border-b border-border/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
                <Settings className="h-5 w-5 text-indigo-500" /> Edit Profile
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">Manage your bio, student details, and contact info</CardDescription>
            </div>
            {!isEditing ? (
              <Button onClick={() => setIsEditing(true)} variant="outline" className="rounded-lg border-border/60 hover:bg-muted/40 font-bold text-xs">
                <Edit className="h-4 w-4 mr-1.5" />Edit Profile
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={loading} className="rounded-lg bg-indigo-600 hover:bg-indigo-700 shadow-md font-bold text-xs">
                  <Save className="h-4 w-4 mr-1.5" />{loading ? 'Saving…' : 'Save Details'}
                </Button>
                <Button onClick={() => setIsEditing(false)} variant="outline" disabled={loading} className="rounded-lg font-bold text-xs">
                  <X className="h-4 w-4 mr-1.5" />Cancel
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-5 pt-5">
          {/* Profile completeness */}
          <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-xl p-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-foreground">Profile Completeness</p>
              <p className="text-[10px] text-muted-foreground font-medium mt-0.5">Fill all fields to reach 100%</p>
            </div>
            <div className="flex items-center gap-3">
              <Progress value={completeness} className="w-24 h-2 bg-border/40" />
              <span className="text-xs font-black text-indigo-500">{completeness}%</span>
            </div>
          </div>

          <div>
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Bio Description</Label>
            <Textarea
              value={formData.bio}
              onChange={(e) => setFormData(f => ({ ...f, bio: e.target.value }))}
              disabled={!isEditing}
              placeholder="Tell your classmates about your favorite book genres, interests or reading goals…"
              maxLength={200}
              rows={3}
              className="rounded-lg mt-1 border-border/60"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">First Name</Label>
              <Input value={formData.first_name} onChange={e => setFormData(f => ({ ...f, first_name: e.target.value }))} disabled={!isEditing} className="rounded-lg mt-1 border-border/60" />
            </div>
            <div>
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Last Name</Label>
              <Input value={formData.last_name} onChange={e => setFormData(f => ({ ...f, last_name: e.target.value }))} disabled={!isEditing} className="rounded-lg mt-1 border-border/60" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Email Address</Label>
              <Input value={formData.email} disabled className="rounded-lg mt-1 bg-muted/40 border-border/40 text-muted-foreground" />
            </div>
            <div>
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Unique Username</Label>
              <Input value={formData.username} onChange={e => setFormData(f => ({ ...f, username: e.target.value }))} disabled={!isEditing} className="rounded-lg mt-1 border-border/60" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" /> Student Class
              </Label>
              <Input value={formData.student_class} onChange={e => setFormData(f => ({ ...f, student_class: e.target.value }))} disabled={!isEditing} className="rounded-lg mt-1 border-border/60" />
            </div>
            <div>
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Roll Number</Label>
              <Input value={formData.roll_number} onChange={e => setFormData(f => ({ ...f, roll_number: e.target.value }))} disabled={!isEditing} className="rounded-lg mt-1 border-border/60" />
            </div>
            <div>
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Admission Number</Label>
              <Input value={formData.admission_number} onChange={e => setFormData(f => ({ ...f, admission_number: e.target.value }))} disabled={!isEditing} className="rounded-lg mt-1 border-border/60" />
            </div>
          </div>

          <div>
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Phone Contact</Label>
            <Input value={formData.phone} onChange={e => setFormData(f => ({ ...f, phone: e.target.value }))} disabled={!isEditing} className="rounded-lg mt-1 border-border/60" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentProfile;
