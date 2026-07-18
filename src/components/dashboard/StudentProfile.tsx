import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  User, Edit, Save, X, Camera, FileText, Users, Heart, MessageCircle, 
  Trophy, Flame, BookOpen, Sparkles, Plus, Search, UserPlus, Check, 
  Clock, UserCheck, UserX, Settings, Send, Calendar, Star, GraduationCap
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ProfileView } from "@/components/community/ProfileView";
import BadgeCabinet from "@/components/rewards/BadgeCabinet";
import ReadingStreakCalendar from "@/components/dashboard/ReadingStreakCalendar";
import * as Icons from "lucide-react";

interface StudentProfileProps {
  user: any;
  onProfileUpdate?: () => void;
}

const StudentProfile = ({ user, onProfileUpdate }: StudentProfileProps) => {
  const [profileTab, setProfileTab] = useState<string>("posts");
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [social, setSocial] = useState<any>({ posts_count: 0, followers_count: 0, following_count: 0, friends_count: 0 });
  const [myPosts, setMyPosts] = useState<any[]>([]);
  const [levelInfo, setLevelInfo] = useState<any | null>(null);
  
  const [formData, setFormData] = useState({
    first_name: '', last_name: '', email: '', phone: '',
    student_class: '', roll_number: '', admission_number: '',
    username: '', bio: ''
  });
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Social Network State
  const [friendshipsMap, setFriendshipsMap] = useState<Record<string, any>>({});
  const [friendsProfiles, setFriendsProfiles] = useState<Record<string, any>>({});
  const [profileDialogUser, setProfileDialogUser] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showNewPost, setShowNewPost] = useState(false);
  const [newPostDraft, setNewPostDraft] = useState({ title: "", content: "" });
  const [friendsActiveSubTab, setFriendsActiveSubTab] = useState("list");

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
    loadFriendshipsMap();
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
    if (!user?.points) return;
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
      const [{ data: full }, { data: extra }, { data: posts }] = await Promise.all([
        supabase.rpc("get_public_profile_full", { _id: user.id }),
        supabase.rpc("get_public_profile_stats", { _id: user.id }),
        supabase.rpc("get_public_posts_by_user", { _id: user.id, _limit: 10 }),
      ]);
      setSocial({ ...(full?.[0] || {}), ...(extra?.[0] || {}) });
      setMyPosts(posts || []);
    } catch (e) {
      console.error("Error loading social profile info:", e);
    }
  };

  const loadFriendshipsMap = async () => {
    if (!user?.id) return;
    try {
      const { data } = await supabase
        .from("friendships")
        .select("*")
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);
      
      const m: Record<string, any> = {};
      (data || []).forEach((f: any) => {
        const other = f.requester_id === user.id ? f.addressee_id : f.requester_id;
        m[other] = f;
      });
      setFriendshipsMap(m);

      const ids = Object.keys(m);
      if (ids.length > 0) {
        const { data: profs } = await supabase.rpc("get_public_profiles", { _ids: ids });
        const pMap: Record<string, any> = {};
        (profs || []).forEach((p: any) => {
          pMap[p.id] = p;
        });
        setFriendsProfiles(pMap);
      } else {
        setFriendsProfiles({});
      }
    } catch (e) {
      console.error("Error loading friendships map:", e);
    }
  };

  const sendFriendRequest = async (targetId: string) => {
    if (!user?.id) return;
    const { error, data } = await supabase
      .from("friendships")
      .insert({ requester_id: user.id, addressee_id: targetId })
      .select()
      .single();
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setFriendshipsMap((m) => ({ ...m, [targetId]: data }));
    toast({ title: "Friend request sent!" });
    await loadFriendshipsMap();
    await loadSocial();
  };

  const respondFriendRequest = async (targetId: string, status: string) => {
    const f = friendshipsMap[targetId];
    if (!f) return;
    const { error } = await supabase
      .from("friendships")
      .update({ status })
      .eq("id", f.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setFriendshipsMap((m) => ({ ...m, [targetId]: { ...f, status } }));
    toast({ title: status === "accepted" ? "Friend request accepted 🎉" : "Friend request declined" });
    await loadFriendshipsMap();
    await loadSocial();
  };

  const removeFriend = async (targetId: string) => {
    const f = friendshipsMap[targetId];
    if (!f) return;
    const { error } = await supabase
      .from("friendships")
      .delete()
      .eq("id", f.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setFriendshipsMap((m) => {
      const c = { ...m };
      delete c[targetId];
      return c;
    });
    toast({ title: "Friend removed" });
    await loadFriendshipsMap();
    await loadSocial();
  };

  const createPost = async () => {
    if (!newPostDraft.title.trim() || !newPostDraft.content.trim() || !user?.id) {
      toast({ title: "Fill both fields", variant: "destructive" });
      return;
    }
    const { error } = await supabase
      .from("posts")
      .insert({ user_id: user.id, title: newPostDraft.title, content: newPostDraft.content });
    if (error) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
      return;
    }
    setNewPostDraft({ title: "", content: "" });
    setShowNewPost(false);
    toast({ title: "Posted successfully!" });
    await loadSocial();
  };

  const searchFriends = async () => {
    if (!searchQuery.trim() || !user?.id) {
      setSearchResults([]);
      return;
    }
    const { data, error } = await supabase.rpc("search_public_profiles", {
      _q: searchQuery.trim(),
      _exclude: user.id
    });
    if (error) {
      toast({ title: "Search failed", description: error.message, variant: "destructive" });
    } else {
      setSearchResults(data || []);
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

  // Profile completeness helper
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
  const LevelIcon = levelInfo ? (Icons[levelInfo.icon_name as keyof typeof Icons] as React.ComponentType<any>) : Star;

  return (
    <div className="space-y-6">
      <style>{`
        .gradient-mesh {
          background-color: #6366f1;
          background-image: 
            radial-gradient(at 10% 20%, rgba(99, 102, 241, 0.3) 0px, transparent 50%),
            radial-gradient(at 90% 10%, rgba(168, 85, 247, 0.3) 0px, transparent 50%),
            radial-gradient(at 50% 80%, rgba(236, 72, 153, 0.2) 0px, transparent 50%);
          background-size: 200% 200%;
          animation: meshShimmer 15s ease infinite;
        }
        @keyframes meshShimmer {
          0% { background-position: 0% 50% }
          50% { background-position: 100% 50% }
          100% { background-position: 0% 50% }
        }
        .avatar-pulsing::after {
          content: '';
          position: absolute;
          inset: -4px;
          border-radius: 9999px;
          background: linear-gradient(135deg, #a855f7, #6366f1, #ec4899);
          z-index: -1;
          opacity: 0.7;
          filter: blur(4px);
          animation: spin 6s linear infinite;
        }
      `}</style>

      {/* Profile Cover & Header */}
      <Card className="overflow-hidden border-border/40 shadow-md bg-card/75 backdrop-blur-md">
        <div className="h-32 gradient-mesh relative" />
        <CardContent className="px-6 pb-6 -mt-16 relative">
          <div className="flex flex-col lg:flex-row items-center lg:items-end gap-6 mb-6">
            <div className="relative shrink-0">
              <Avatar className="h-28 w-28 ring-4 ring-background shadow-xl avatar-pulsing">
                {avatarUrl && <AvatarImage src={avatarUrl} className="object-cover" />}
                <AvatarFallback className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white font-extrabold text-3xl">{initials}</AvatarFallback>
              </Avatar>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-1 right-1 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground p-2 shadow-lg hover:scale-110 active:scale-95 transition-all"
                title="Change Avatar"
              >
                <Camera className="h-4 w-4" />
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])}
              />
            </div>

            <div className="flex-1 text-center lg:text-left space-y-2">
              <div className="flex flex-wrap justify-center lg:justify-start items-center gap-2">
                <h2 className="text-2xl font-extrabold tracking-tight">{user?.first_name} {user?.last_name}</h2>
                {user?.username && <span className="text-sm font-semibold text-muted-foreground/80">@{user.username}</span>}
                {user?.student_class && <Badge variant="outline" className="bg-indigo-500/10 text-indigo-500 border-indigo-500/30 font-bold">Class {user.student_class}</Badge>}
              </div>

              {user?.bio ? (
                <p className="text-sm text-foreground/80 font-medium max-w-lg leading-relaxed">{user.bio}</p>
              ) : (
                <p className="text-xs text-muted-foreground italic">No bio written yet. Click Settings to add one!</p>
              )}

              {/* Level Progress Gauge */}
              {levelInfo && (
                <div className="pt-2 max-w-md">
                  <div className="flex justify-between items-center text-xs font-bold text-muted-foreground mb-1">
                    <span className="flex items-center gap-1"><LevelIcon className="h-3.5 w-3.5" style={{ color: levelInfo.color }} /> Level {levelInfo.level_number}: {levelInfo.name}</span>
                    <span>{user.points || 0} XP</span>
                  </div>
                  <Progress value={levelInfo.progress_to_next || 0} className="h-2" style={{ "--progress-foreground": levelInfo.color } as React.CSSProperties} />
                  {levelInfo.points_to_next > 0 ? (
                    <p className="text-[10px] text-muted-foreground mt-1 font-medium">{levelInfo.points_to_next} XP to next level</p>
                  ) : (
                    <p className="text-[10px] text-emerald-500 mt-1 font-semibold">Max level achieved! 🎖️</p>
                  )}
                </div>
              )}
            </div>

            {/* Profile Statistics Block */}
            <div className="w-full lg:w-auto shrink-0 bg-muted/30 border border-border/30 rounded-xl p-3 grid grid-cols-3 gap-6 text-center">
              <button onClick={() => setProfileTab("posts")} className="focus:outline-none group">
                <p className="text-xl font-black text-foreground group-hover:scale-105 transition-transform">{social.posts_count}</p>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">Posts</p>
              </button>
              <button onClick={() => { setProfileTab("friends"); setFriendsActiveSubTab("list"); }} className="focus:outline-none group">
                <p className="text-xl font-black text-foreground group-hover:scale-105 transition-transform">{social.followers_count}</p>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">Followers</p>
              </button>
              <button onClick={() => { setProfileTab("friends"); setFriendsActiveSubTab("list"); }} className="focus:outline-none group">
                <p className="text-xl font-black text-foreground group-hover:scale-105 transition-transform">{social.following_count}</p>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">Following</p>
              </button>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 border-t border-border/30 pt-4">
            <button onClick={() => setProfileTab("badges")} className="flex items-center gap-3 p-3 bg-muted/20 hover:bg-muted/40 border border-border/30 rounded-xl transition-all">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0"><Trophy className="h-5 w-5" /></div>
              <div className="text-left"><p className="text-xs font-bold text-muted-foreground">Points</p><p className="text-base font-black leading-none">{user?.points || 0}</p></div>
            </button>
            <button onClick={() => setProfileTab("streak")} className="flex items-center gap-3 p-3 bg-muted/20 hover:bg-muted/40 border border-border/30 rounded-xl transition-all">
              <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500 shrink-0"><Flame className="h-5 w-5" /></div>
              <div className="text-left"><p className="text-xs font-bold text-muted-foreground">Streak</p><p className="text-base font-black leading-none">{social?.current_streak || 0} Days</p></div>
            </button>
            <div className="flex items-center gap-3 p-3 bg-muted/10 border border-border/20 rounded-xl pointer-events-none select-none">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0"><BookOpen className="h-5 w-5" /></div>
              <div className="text-left"><p className="text-xs font-bold text-muted-foreground">Read</p><p className="text-base font-black leading-none">{social?.books_read || 0}</p></div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-muted/10 border border-border/20 rounded-xl pointer-events-none select-none">
              <div className="w-10 h-10 rounded-lg bg-pink-500/10 flex items-center justify-center text-pink-500 shrink-0"><Sparkles className="h-5 w-5" /></div>
              <div className="text-left"><p className="text-xs font-bold text-muted-foreground">Quizzes</p><p className="text-base font-black leading-none">{social?.quizzes || 0}</p></div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs Layout */}
      <Tabs value={profileTab} onValueChange={setProfileTab} className="w-full space-y-4">
        <TabsList className="grid w-full grid-cols-5 p-1 bg-muted/40 border border-border/30 rounded-xl backdrop-blur-sm">
          <TabsTrigger value="posts" className="rounded-lg text-xs font-bold py-2 flex items-center gap-1.5"><FileText className="h-4 w-4" /> Posts</TabsTrigger>
          <TabsTrigger value="streak" className="rounded-lg text-xs font-bold py-2 flex items-center gap-1.5"><Flame className="h-4 w-4" /> Streak</TabsTrigger>
          <TabsTrigger value="badges" className="rounded-lg text-xs font-bold py-2 flex items-center gap-1.5"><Trophy className="h-4 w-4" /> Badges</TabsTrigger>
          <TabsTrigger value="friends" className="rounded-lg text-xs font-bold py-2 flex items-center gap-1.5"><Users className="h-4 w-4" /> Network</TabsTrigger>
          <TabsTrigger value="details" className="rounded-lg text-xs font-bold py-2 flex items-center gap-1.5"><Settings className="h-4 w-4" /> Settings</TabsTrigger>
        </TabsList>

        {/* Tab 1: Posts */}
        <TabsContent value="posts" className="space-y-4 outline-none">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold tracking-tight flex items-center gap-2 text-foreground">
              <FileText className="h-5 w-5 text-indigo-500" /> Share & Read
            </h3>
            <Button size="sm" onClick={() => setShowNewPost(!showNewPost)} className="rounded-lg bg-indigo-600 hover:bg-indigo-700 shadow-md">
              <Plus className="h-4 w-4 mr-1.5" /> New Post
            </Button>
          </div>

          {showNewPost && (
            <Card className="border-indigo-500/20 shadow-lg bg-card/80 backdrop-blur-sm">
              <CardContent className="p-4 space-y-3">
                <h4 className="text-sm font-bold text-foreground">Write a New Post</h4>
                <Input 
                  placeholder="Catchy title for your post..." 
                  value={newPostDraft.title} 
                  onChange={(e) => setNewPostDraft({ ...newPostDraft, title: e.target.value })} 
                  maxLength={150} 
                  className="rounded-lg border-border/60"
                />
                <Textarea 
                  placeholder="What book have you been reading lately? What are your learning goals?" 
                  rows={4} 
                  value={newPostDraft.content} 
                  onChange={(e) => setNewPostDraft({ ...newPostDraft, content: e.target.value })} 
                  maxLength={2000} 
                  className="rounded-lg border-border/60"
                />
                <div className="flex justify-end gap-2 pt-1">
                  <Button size="sm" variant="outline" onClick={() => setShowNewPost(false)} className="rounded-lg">Cancel</Button>
                  <Button size="sm" onClick={createPost} className="rounded-lg bg-indigo-600 hover:bg-indigo-700"><Send className="h-3.5 w-3.5 mr-1.5" /> Publish</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {myPosts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myPosts.map((p: any) => (
                <Card key={p.id} className="border-border/40 bg-card/60 hover:shadow-md hover:border-border/80 hover:translate-y-[-2px] transition-all duration-300">
                  <CardContent className="p-5 flex flex-col justify-between h-full">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline" className="bg-indigo-500/5 text-indigo-500/80 border-indigo-500/20 font-bold">Thought</Badge>
                        <span className="text-[10px] text-muted-foreground font-semibold">{new Date(p.created_at).toLocaleDateString(undefined, { dateStyle: "medium" })}</span>
                      </div>
                      <h4 className="font-extrabold text-foreground text-base tracking-tight mb-2">{p.title}</h4>
                      <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap line-clamp-4 mb-4">{p.content}</p>
                    </div>
                    <div className="flex items-center gap-4 mt-auto pt-3 border-t border-border/30 text-xs font-bold text-muted-foreground/80">
                      <span className="flex items-center gap-1.5 hover:text-pink-500 cursor-pointer transition-colors"><Heart className="h-4 w-4" /> {p.likes_count}</span>
                      <span className="flex items-center gap-1.5 hover:text-indigo-500 cursor-pointer transition-colors"><MessageCircle className="h-4 w-4" /> {p.comments_count}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-border/40 py-12 bg-card/40">
              <CardContent className="text-center text-muted-foreground flex flex-col items-center">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500/80 mb-3"><FileText className="h-6 w-6" /></div>
                <p className="font-bold text-foreground/90 text-sm">No posts yet</p>
                <p className="text-xs text-muted-foreground/80 mt-1 max-w-xs">Share review notes, quizzes completed, or thoughts about your reading journeys!</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab 2: Streak */}
        <TabsContent value="streak" className="space-y-4 outline-none">
          <ReadingStreakCalendar userId={user.id} />
        </TabsContent>

        {/* Tab 3: Badges */}
        <TabsContent value="badges" className="space-y-4 outline-none">
          <BadgeCabinet userId={user.id} />
        </TabsContent>

        {/* Tab 4: Network */}
        <TabsContent value="friends" className="space-y-4 outline-none">
          <Card className="border-border/40 bg-card/75 backdrop-blur-md shadow-md">
            <CardContent className="p-4">
              <Tabs value={friendsActiveSubTab} onValueChange={setFriendsActiveSubTab} className="space-y-4">
                <TabsList className="grid w-full grid-cols-3 p-0.5 bg-muted/30 border border-border/30 rounded-lg">
                  <TabsTrigger value="list" className="text-xs font-bold py-1.5">Classmate Friends</TabsTrigger>
                  <TabsTrigger value="requests" className="text-xs font-bold py-1.5">
                    Requests 
                    {Object.entries(friendshipsMap).filter(([_, f]) => f.status === "pending" && f.addressee_id === user.id).length > 0 && (
                      <span className="ml-1 w-2 h-2 bg-rose-500 rounded-full inline-block animate-pulse" />
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="discover" className="text-xs font-bold py-1.5">Discover Profiles</TabsTrigger>
                </TabsList>

                {/* Sub-tab: Friends List */}
                <TabsContent value="list" className="space-y-3 pt-1 outline-none">
                  {Object.entries(friendshipsMap).filter(([_, f]) => f.status === "accepted").length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500 mx-auto mb-3"><Users className="h-6 w-6" /></div>
                      <p className="font-bold text-foreground/90 text-sm">No classmate links yet</p>
                      <p className="text-xs text-muted-foreground/80 mt-1 mb-4">Link up with classmates to compare badges, read books and quiz streaks!</p>
                      <Button size="sm" onClick={() => setFriendsActiveSubTab("discover")} className="rounded-lg bg-purple-600 hover:bg-purple-700 shadow-md">Discover Classmates</Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {Object.entries(friendshipsMap)
                        .filter(([_, f]) => f.status === "accepted")
                        .map(([uid, f]) => {
                          const p = friendsProfiles[uid] || {};
                          const initials = `${(p.first_name?.[0] || "").toUpperCase()}${(p.last_name?.[0] || "").toUpperCase()}`;
                          return (
                            <div key={uid} className="flex items-center justify-between p-3.5 bg-muted/20 hover:bg-muted/40 border border-border/30 rounded-xl transition-all">
                              <div className="flex items-center gap-3 cursor-pointer min-w-0" onClick={() => setProfileDialogUser(uid)}>
                                <Avatar className="h-10 w-10 ring-2 ring-indigo-500/10">
                                  <AvatarFallback className="bg-gradient-to-br from-indigo-500/80 to-purple-500/80 text-white font-bold text-xs">{initials || "U"}</AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <p className="text-sm font-bold text-foreground hover:underline truncate">{p.first_name} {p.last_name}</p>
                                  <p className="text-xs text-muted-foreground truncate">@{p.username || "username"} · Class {p.student_class || "—"}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => removeFriend(uid)} title="Remove classmate">
                                  <UserX className="h-4 w-4 text-muted-foreground/60 hover:text-rose-500 transition-colors" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </TabsContent>

                {/* Sub-tab: Requests */}
                <TabsContent value="requests" className="space-y-4 pt-1 outline-none">
                  {/* Incoming */}
                  <div>
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-500" /> Incoming Requests</h4>
                    {Object.entries(friendshipsMap).filter(([_, f]) => f.status === "pending" && f.addressee_id === user.id).length === 0 ? (
                      <p className="text-xs text-muted-foreground italic py-3 bg-muted/10 border border-border/10 rounded-lg text-center">No incoming requests</p>
                    ) : (
                      <div className="space-y-2">
                        {Object.entries(friendshipsMap)
                          .filter(([_, f]) => f.status === "pending" && f.addressee_id === user.id)
                          .map(([uid, f]) => {
                            const p = friendsProfiles[uid] || {};
                            const initials = `${(p.first_name?.[0] || "").toUpperCase()}${(p.last_name?.[0] || "").toUpperCase()}`;
                            return (
                              <div key={uid} className="flex items-center justify-between p-3 bg-card border border-border/40 rounded-xl shadow-sm">
                                <div className="flex items-center gap-3 cursor-pointer" onClick={() => setProfileDialogUser(uid)}>
                                  <Avatar className="h-8 w-8">
                                    <AvatarFallback className="bg-indigo-500/10 text-indigo-500 font-bold text-xs">{initials}</AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="text-xs font-bold text-foreground hover:underline">{p.first_name} {p.last_name}</p>
                                    <p className="text-[10px] text-muted-foreground">@{p.username || "—"}</p>
                                  </div>
                                </div>
                                <div className="flex gap-1.5">
                                  <Button size="sm" className="h-8 px-3 text-xs bg-emerald-600 hover:bg-emerald-700" onClick={() => respondFriendRequest(uid, "accepted")}><Check className="h-3.5 w-3.5 mr-1" />Accept</Button>
                                  <Button size="sm" variant="outline" className="h-8 px-2 text-xs text-rose-500 hover:bg-rose-500/10 border-rose-500/20" onClick={() => respondFriendRequest(uid, "rejected")}><X className="h-3.5 w-3.5" /></Button>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>

                  {/* Outgoing */}
                  <div className="pt-3 border-t border-border/30">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-amber-500" /> Sent Requests</h4>
                    {Object.entries(friendshipsMap).filter(([_, f]) => f.status === "pending" && f.requester_id === user.id).length === 0 ? (
                      <p className="text-xs text-muted-foreground italic py-3 bg-muted/10 border border-border/10 rounded-lg text-center">No outgoing requests pending</p>
                    ) : (
                      <div className="space-y-2">
                        {Object.entries(friendshipsMap)
                          .filter(([_, f]) => f.status === "pending" && f.requester_id === user.id)
                          .map(([uid, f]) => {
                            const p = friendsProfiles[uid] || {};
                            const initials = `${(p.first_name?.[0] || "").toUpperCase()}${(p.last_name?.[0] || "").toUpperCase()}`;
                            return (
                              <div key={uid} className="flex items-center justify-between p-3 bg-card border border-border/30 rounded-xl shadow-xs">
                                <div className="flex items-center gap-3 cursor-pointer" onClick={() => setProfileDialogUser(uid)}>
                                  <Avatar className="h-8 w-8">
                                    <AvatarFallback className="bg-indigo-500/10 text-indigo-500 font-bold text-xs">{initials}</AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="text-xs font-bold text-foreground hover:underline">{p.first_name} {p.last_name}</p>
                                    <p className="text-[10px] text-muted-foreground">@{p.username || "—"}</p>
                                  </div>
                                </div>
                                <Button size="sm" variant="ghost" className="h-8 px-3 text-xs text-rose-500 hover:bg-rose-500/10" onClick={() => removeFriend(uid)}>Cancel</Button>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* Sub-tab: Discover */}
                <TabsContent value="discover" className="space-y-3 pt-1 outline-none">
                  <div className="flex gap-2">
                    <Input 
                      placeholder="Search classmates by name or username..." 
                      value={searchQuery} 
                      onChange={(e) => setSearchQuery(e.target.value)} 
                      onKeyDown={(e) => e.key === "Enter" && searchFriends()} 
                      className="rounded-lg border-border/60"
                    />
                    <Button size="sm" onClick={searchFriends} className="rounded-lg bg-indigo-600 hover:bg-indigo-700 shadow-md px-3"><Search className="h-4 w-4" /></Button>
                  </div>
                  
                  {searchResults.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                      {searchResults.map((r) => {
                        const existing = friendshipsMap[r.id];
                        const initials = `${(r.first_name?.[0] || "").toUpperCase()}${(r.last_name?.[0] || "").toUpperCase()}`;
                        return (
                          <div key={r.id} className="flex items-center justify-between p-3 bg-muted/20 border border-border/30 rounded-xl">
                            <div className="flex items-center gap-3 cursor-pointer min-w-0" onClick={() => setProfileDialogUser(r.id)}>
                              <Avatar className="h-9 w-9">
                                <AvatarFallback className="bg-indigo-500/10 text-indigo-500 font-bold text-xs">{initials}</AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-foreground hover:underline truncate">{r.first_name} {r.last_name}</p>
                                <p className="text-xs text-muted-foreground truncate">@{r.username || "—"} · Class {r.student_class || "—"}</p>
                              </div>
                            </div>
                            {!existing ? (
                              <Button size="sm" onClick={() => sendFriendRequest(r.id)} className="h-8 bg-indigo-600 hover:bg-indigo-700 rounded-lg"><UserPlus className="h-4 w-4" /></Button>
                            ) : existing.status === "accepted" ? (
                              <Badge className="bg-emerald-600">Friends</Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 border-amber-500/20 font-bold">Pending</Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : searchQuery.trim() ? (
                    <p className="text-xs text-muted-foreground text-center py-6">No matching profiles found for "{searchQuery}"</p>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground border border-dashed border-border/30 rounded-xl">
                      <Search className="h-8 w-8 mx-auto mb-2 opacity-30 text-indigo-500" />
                      <p className="text-xs font-semibold">Enter a name or username above to find classmates and link up!</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 5: Settings / Details */}
        <TabsContent value="details" className="space-y-4 outline-none">
          <Card className="border-border/40 bg-card/75 backdrop-blur-md shadow-md">
            <CardHeader className="pb-3 border-b border-border/20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-bold flex items-center gap-2 text-foreground"><Settings className="h-5 w-5 text-indigo-500" /> Edit Profile</CardTitle>
                  <CardDescription className="text-xs mt-0.5">Manage your public bio, student details, and info card</CardDescription>
                </div>
                {!isEditing ? (
                  <Button onClick={() => setIsEditing(true)} variant="outline" className="rounded-lg border-border/60 hover:bg-muted/40 font-bold text-xs"><Edit className="h-4 w-4 mr-1.5" />Edit Profile</Button>
                ) : (
                  <div className="flex gap-2">
                    <Button onClick={handleSave} disabled={loading} className="rounded-lg bg-indigo-600 hover:bg-indigo-700 shadow-md font-bold text-xs"><Save className="h-4 w-4 mr-1.5" />{loading ? 'Saving…' : 'Save Details'}</Button>
                    <Button onClick={() => setIsEditing(false)} variant="outline" disabled={loading} className="rounded-lg border-border/60 font-bold text-xs"><X className="h-4 w-4 mr-1.5" />Cancel</Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-5 pt-5">
              {/* Profile completeness progress */}
              <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-foreground">Profile Completeness</p>
                  <p className="text-[10px] text-muted-foreground font-medium mt-0.5">Fill academic and contact info to reach 100%</p>
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
                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1"><GraduationCap className="h-3.5 w-3.5 text-muted-foreground" /> Student Class</Label>
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
        </TabsContent>
      </Tabs>

      {/* Friend Profile Dialog Modal */}
      <Dialog open={!!profileDialogUser} onOpenChange={(o) => !o && setProfileDialogUser(null)}>
        <DialogContent className="max-w-lg p-0 overflow-hidden bg-background rounded-xl border border-border/40 shadow-xl">
          {profileDialogUser && (
            <ProfileView
              userId={profileDialogUser}
              currentUserId={user.id}
              friendship={friendshipsMap[profileDialogUser]}
              onSend={sendFriendRequest}
              onRespond={respondFriendRequest}
              onRemove={removeFriend}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StudentProfile;
