import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { User, Edit, Save, X, Camera, FileText, Users, Heart, MessageCircle, Trophy, Flame, BookOpen, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface StudentProfileProps {
  user: any;
  onProfileUpdate?: () => void;
}

const StudentProfile = ({ user, onProfileUpdate }: StudentProfileProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [social, setSocial] = useState<any>({ posts_count: 0, followers_count: 0, following_count: 0, friends_count: 0 });
  const [myPosts, setMyPosts] = useState<any[]>([]);
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
  }, [user]);

  const loadAvatar = async (path?: string | null) => {
    if (!path) { setAvatarUrl(null); return; }
    const { data } = await supabase.storage.from("avatars").createSignedUrl(path, 3600);
    setAvatarUrl(data?.signedUrl || null);
  };

  const loadSocial = async () => {
    if (!user?.id) return;
    const [{ data: full }, { data: extra }, { data: posts }] = await Promise.all([
      supabase.rpc("get_public_profile_full", { _id: user.id }),
      supabase.rpc("get_public_profile_stats", { _id: user.id }),
      supabase.rpc("get_public_posts_by_user", { _id: user.id, _limit: 10 }),
    ]);
    setSocial({ ...(full?.[0] || {}), ...(extra?.[0] || {}) });
    setMyPosts(posts || []);
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
      toast({ title: "Profile picture updated" });
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

  const initials = `${(user?.first_name?.[0] || '').toUpperCase()}${(user?.last_name?.[0] || '').toUpperCase()}`;

  return (
    <div className="space-y-4">
      {/* Instagram-style header */}
      <Card className="overflow-hidden border-border/50">
        <div className="h-24 gradient-primary" />
        <CardContent className="px-6 pb-6 -mt-14">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 mb-4">
            <div className="relative">
              <Avatar className="h-24 w-24 ring-4 ring-background shadow-lg">
                {avatarUrl && <AvatarImage src={avatarUrl} />}
                <AvatarFallback className="gradient-primary text-primary-foreground font-bold text-2xl">{initials}</AvatarFallback>
              </Avatar>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-0 right-0 rounded-full bg-primary text-primary-foreground p-1.5 shadow-md hover:scale-110 transition-transform"
                title="Change picture"
              >
                <Camera className="h-3.5 w-3.5" />
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])}
              />
            </div>
            <div className="flex-1 grid grid-cols-3 gap-2 text-center w-full">
              <StatBlock icon={<FileText className="h-4 w-4" />} value={social.posts_count} label="Posts" />
              <StatBlock icon={<Users className="h-4 w-4" />} value={social.followers_count} label="Followers" />
              <StatBlock icon={<Users className="h-4 w-4" />} value={social.following_count} label="Following" />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold">{user?.first_name} {user?.last_name}</h2>
              {user?.username && <span className="text-sm text-muted-foreground">@{user.username}</span>}
              {user?.role && <Badge variant="secondary" className="capitalize">{user.role}</Badge>}
              {user?.student_class && <Badge variant="outline">Class {user.student_class}</Badge>}
            </div>
            {user?.bio && !isEditing && <p className="text-sm text-foreground/80">{user.bio}</p>}
          </div>

          <div className="grid grid-cols-4 gap-2 mt-4">
            <MiniStat icon={<Trophy className="h-4 w-4 text-yellow-500" />} value={user?.points || 0} label="Points" />
            <MiniStat icon={<Flame className="h-4 w-4 text-orange-500" />} value={social?.current_streak || 0} label="Streak" />
            <MiniStat icon={<BookOpen className="h-4 w-4 text-blue-500" />} value={social?.books_read || 0} label="Books" />
            <MiniStat icon={<Sparkles className="h-4 w-4 text-purple-500" />} value={social?.quizzes || 0} label="Quiz" />
          </div>
        </CardContent>
      </Card>

      {/* My Posts */}
      {myPosts.length > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" />My Posts</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {myPosts.map((p: any) => (
              <div key={p.id} className="p-3 rounded-lg border border-border/60 bg-muted/20">
                <p className="text-sm font-semibold">{p.title}</p>
                <p className="text-xs text-foreground/80 mt-1 line-clamp-3 whitespace-pre-wrap">{p.content}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Heart className="h-3 w-3" />{p.likes_count}</span>
                  <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" />{p.comments_count}</span>
                  <span className="ml-auto">{new Date(p.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Editable details */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><User className="h-5 w-5" />Account Details</CardTitle>
              <CardDescription>Manage your personal info and login credentials</CardDescription>
            </div>
            {!isEditing ? (
              <Button onClick={() => setIsEditing(true)} variant="outline"><Edit className="h-4 w-4 mr-2" />Edit</Button>
            ) : (
              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={loading}><Save className="h-4 w-4 mr-2" />{loading ? 'Saving…' : 'Save'}</Button>
                <Button onClick={() => setIsEditing(false)} variant="outline" disabled={loading}><X className="h-4 w-4 mr-2" />Cancel</Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Bio</Label>
            <Textarea value={formData.bio} onChange={(e) => setFormData(f => ({ ...f, bio: e.target.value }))} disabled={!isEditing} placeholder="Say something about yourself…" maxLength={200} rows={2} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>First Name *</Label><Input value={formData.first_name} onChange={e => setFormData(f => ({ ...f, first_name: e.target.value }))} disabled={!isEditing} /></div>
            <div><Label>Last Name *</Label><Input value={formData.last_name} onChange={e => setFormData(f => ({ ...f, last_name: e.target.value }))} disabled={!isEditing} /></div>
          </div>
          <div><Label>Email</Label><Input value={formData.email} disabled className="bg-muted/40" /></div>
          <div><Label>Username</Label><Input value={formData.username} onChange={e => setFormData(f => ({ ...f, username: e.target.value }))} disabled={!isEditing} /></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><Label>Class</Label><Input value={formData.student_class} onChange={e => setFormData(f => ({ ...f, student_class: e.target.value }))} disabled={!isEditing} /></div>
            <div><Label>Roll Number</Label><Input value={formData.roll_number} onChange={e => setFormData(f => ({ ...f, roll_number: e.target.value }))} disabled={!isEditing} /></div>
            <div><Label>Admission Number</Label><Input value={formData.admission_number} onChange={e => setFormData(f => ({ ...f, admission_number: e.target.value }))} disabled={!isEditing} /></div>
          </div>
          <div><Label>Phone</Label><Input value={formData.phone} onChange={e => setFormData(f => ({ ...f, phone: e.target.value }))} disabled={!isEditing} /></div>
        </CardContent>
      </Card>
    </div>
  );
};

const StatBlock = ({ icon, value, label }: any) => (
  <div className="rounded-lg py-2 hover:bg-muted/40 transition-colors">
    <p className="text-xl font-bold leading-none">{value ?? 0}</p>
    <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wide">{label}</p>
  </div>
);
const MiniStat = ({ icon, value, label }: any) => (
  <div className="rounded-lg bg-muted/40 p-2 text-center">
    <div className="flex justify-center mb-1">{icon}</div>
    <p className="text-base font-bold leading-none">{value}</p>
    <p className="text-[9px] text-muted-foreground mt-1">{label}</p>
  </div>
);

export default StudentProfile;
