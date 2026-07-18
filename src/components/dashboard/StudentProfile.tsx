import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  User, Edit, Save, X, Camera, FileText, Users, Heart, MessageCircle, 
  Trophy, Flame, BookOpen, Sparkles, Plus, Search, UserPlus, Check, 
  Clock, UserCheck, UserX 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ProfileView } from "@/components/community/ProfileView";
import BadgeCabinet from "@/components/rewards/BadgeCabinet";
import ReadingStreakCalendar from "@/components/dashboard/ReadingStreakCalendar";

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

  const loadFriendshipsMap = async () => {
    if (!user?.id) return;
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

    // Fetch public profiles for these users
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
    toast({ title: "Friend request sent" });
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
    toast({ title: status === "accepted" ? "Friend request accepted" : "Friend request declined" });
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
              <button onClick={() => setProfileTab("posts")} className="focus:outline-none hover:bg-muted/40 rounded-lg transition-colors">
                <StatBlock icon={<FileText className="h-4 w-4" />} value={social.posts_count} label="Posts" />
              </button>
              <button onClick={() => { setProfileTab("friends"); setFriendsActiveSubTab("list"); }} className="focus:outline-none hover:bg-muted/40 rounded-lg transition-colors">
                <StatBlock icon={<Users className="h-4 w-4" />} value={social.followers_count} label="Followers" />
              </button>
              <button onClick={() => { setProfileTab("friends"); setFriendsActiveSubTab("list"); }} className="focus:outline-none hover:bg-muted/40 rounded-lg transition-colors">
                <StatBlock icon={<Users className="h-4 w-4" />} value={social.following_count} label="Following" />
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold">{user?.first_name} {user?.last_name}</h2>
              {user?.username && <span className="text-sm text-muted-foreground">@{user.username}</span>}
              {user?.role && <Badge variant="secondary" className="capitalize">{user.role}</Badge>}
              {user?.student_class && <Badge variant="outline">Class {user.student_class}</Badge>}
            </div>
            {user?.bio && <p className="text-sm text-foreground/80">{user.bio}</p>}
          </div>

          <div className="grid grid-cols-4 gap-2 mt-4">
            <button onClick={() => setProfileTab("badges")} className="focus:outline-none text-left w-full">
              <MiniStat icon={<Trophy className="h-4 w-4 text-yellow-500" />} value={user?.points || 0} label="Points" />
            </button>
            <button onClick={() => setProfileTab("streak")} className="focus:outline-none text-left w-full">
              <MiniStat icon={<Flame className="h-4 w-4 text-orange-500" />} value={social?.current_streak || 0} label="Streak" />
            </button>
            <div className="pointer-events-none">
              <MiniStat icon={<BookOpen className="h-4 w-4 text-blue-500" />} value={social?.books_read || 0} label="Books" />
            </div>
            <div className="pointer-events-none">
              <MiniStat icon={<Sparkles className="h-4 w-4 text-purple-500" />} value={social?.quizzes || 0} label="Quiz" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modern Tabs Section */}
      <Tabs value={profileTab} onValueChange={setProfileTab} className="w-full space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="posts" className="text-xs sm:text-sm">Posts</TabsTrigger>
          <TabsTrigger value="streak" className="text-xs sm:text-sm">Streak</TabsTrigger>
          <TabsTrigger value="badges" className="text-xs sm:text-sm">Badges</TabsTrigger>
          <TabsTrigger value="friends" className="text-xs sm:text-sm">Network</TabsTrigger>
          <TabsTrigger value="details" className="text-xs sm:text-sm">Settings</TabsTrigger>
        </TabsList>

        {/* Posts Tab */}
        <TabsContent value="posts" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" /> My Posts
            </h3>
            <Button size="sm" onClick={() => setShowNewPost(!showNewPost)}>
              <Plus className="h-4 w-4 mr-1.5" /> New Post
            </Button>
          </div>

          {showNewPost && (
            <Card className="border-primary/30">
              <CardContent className="p-4 space-y-3">
                <Input 
                  placeholder="Post title..." 
                  value={newPostDraft.title} 
                  onChange={(e) => setNewPostDraft({ ...newPostDraft, title: e.target.value })} 
                  maxLength={150} 
                />
                <Textarea 
                  placeholder="What's on your mind?" 
                  rows={3} 
                  value={newPostDraft.content} 
                  onChange={(e) => setNewPostDraft({ ...newPostDraft, content: e.target.value })} 
                  maxLength={2000} 
                />
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setShowNewPost(false)}>Cancel</Button>
                  <Button size="sm" onClick={createPost}>Post</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {myPosts.length > 0 ? (
            <div className="grid grid-cols-1 gap-3">
              {myPosts.map((p: any) => (
                <Card key={p.id} className="border-border/60 hover:shadow-sm transition-shadow">
                  <CardContent className="p-4">
                    <p className="text-sm font-semibold text-foreground">{p.title}</p>
                    <p className="text-xs text-foreground/80 mt-1.5 whitespace-pre-wrap line-clamp-3">{p.content}</p>
                    <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground pt-3 border-t border-border/30">
                      <span className="flex items-center gap-1"><Heart className="h-3.5 w-3.5" />{p.likes_count}</span>
                      <span className="flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" />{p.comments_count}</span>
                      <span className="ml-auto">{new Date(p.created_at).toLocaleDateString()}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No posts yet. Share your first thought!</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Streak Tab */}
        <TabsContent value="streak" className="space-y-4">
          <ReadingStreakCalendar userId={user.id} />
        </TabsContent>

        {/* Badges Tab */}
        <TabsContent value="badges" className="space-y-4">
          <BadgeCabinet userId={user.id} />
        </TabsContent>

        {/* Friends/Network Tab */}
        <TabsContent value="friends" className="space-y-4">
          <Card className="border-border/50">
            <CardContent className="p-4">
              <Tabs value={friendsActiveSubTab} onValueChange={setFriendsActiveSubTab} className="space-y-3">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="list" className="text-xs">Friends List</TabsTrigger>
                  <TabsTrigger value="requests" className="text-xs">Requests</TabsTrigger>
                  <TabsTrigger value="discover" className="text-xs">Discover</TabsTrigger>
                </TabsList>

                {/* Sub-tab: Friends List */}
                <TabsContent value="list" className="space-y-2">
                  {Object.entries(friendshipsMap).filter(([_, f]) => f.status === "accepted").length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">You haven't added any friends yet.</p>
                      <Button size="sm" variant="link" onClick={() => setFriendsActiveSubTab("discover")}>Find classmates</Button>
                    </div>
                  ) : (
                    <div className="divide-y divide-border/40">
                      {Object.entries(friendshipsMap)
                        .filter(([_, f]) => f.status === "accepted")
                        .map(([uid, f]) => {
                          const p = friendsProfiles[uid] || {};
                          const initials = `${(p.first_name?.[0] || "").toUpperCase()}${(p.last_name?.[0] || "").toUpperCase()}`;
                          return (
                            <div key={uid} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                              <div className="flex items-center gap-3 cursor-pointer" onClick={() => setProfileDialogUser(uid)}>
                                <Avatar className="h-9 w-9">
                                  <AvatarFallback className="gradient-primary text-primary-foreground font-bold text-xs">{initials || "U"}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="text-sm font-semibold hover:underline">{p.first_name} {p.last_name}</p>
                                  <p className="text-xs text-muted-foreground">@{p.username || "username"} · Class {p.student_class || "—"}</p>
                                </div>
                              </div>
                              <Button size="sm" variant="ghost" onClick={() => removeFriend(uid)}>
                                <UserX className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                              </Button>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </TabsContent>

                {/* Sub-tab: Requests */}
                <TabsContent value="requests" className="space-y-4">
                  {/* Incoming */}
                  <div>
                    <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2">Incoming Requests</h4>
                    {Object.entries(friendshipsMap).filter(([_, f]) => f.status === "pending" && f.addressee_id === user.id).length === 0 ? (
                      <p className="text-xs text-muted-foreground py-2">No incoming friend requests.</p>
                    ) : (
                      <div className="space-y-2">
                        {Object.entries(friendshipsMap)
                          .filter(([_, f]) => f.status === "pending" && f.addressee_id === user.id)
                          .map(([uid, f]) => {
                            const p = friendsProfiles[uid] || {};
                            const initials = `${(p.first_name?.[0] || "").toUpperCase()}${(p.last_name?.[0] || "").toUpperCase()}`;
                            return (
                              <div key={uid} className="flex items-center justify-between bg-muted/20 p-2.5 rounded-lg border border-border/40">
                                <div className="flex items-center gap-2 cursor-pointer" onClick={() => setProfileDialogUser(uid)}>
                                  <Avatar className="h-8 w-8">
                                    <AvatarFallback className="gradient-primary text-primary-foreground font-bold text-[10px]">{initials}</AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="text-xs font-semibold hover:underline">{p.first_name} {p.last_name}</p>
                                    <p className="text-[10px] text-muted-foreground">@{p.username || "—"}</p>
                                  </div>
                                </div>
                                <div className="flex gap-1">
                                  <Button size="sm" className="h-7 px-2.5 text-xs" onClick={() => respondFriendRequest(uid, "accepted")}><Check className="h-3.5 w-3.5 mr-1" />Accept</Button>
                                  <Button size="sm" variant="outline" className="h-7 px-2.5 text-xs" onClick={() => respondFriendRequest(uid, "rejected")}><X className="h-3.5 w-3.5" /></Button>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>

                  {/* Outgoing */}
                  <div className="pt-2 border-t border-border/30">
                    <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2">Sent Requests</h4>
                    {Object.entries(friendshipsMap).filter(([_, f]) => f.status === "pending" && f.requester_id === user.id).length === 0 ? (
                      <p className="text-xs text-muted-foreground py-2">No pending outgoing requests.</p>
                    ) : (
                      <div className="space-y-2">
                        {Object.entries(friendshipsMap)
                          .filter(([_, f]) => f.status === "pending" && f.requester_id === user.id)
                          .map(([uid, f]) => {
                            const p = friendsProfiles[uid] || {};
                            const initials = `${(p.first_name?.[0] || "").toUpperCase()}${(p.last_name?.[0] || "").toUpperCase()}`;
                            return (
                              <div key={uid} className="flex items-center justify-between bg-muted/10 p-2 py-1.5 rounded-lg">
                                <div className="flex items-center gap-2 cursor-pointer" onClick={() => setProfileDialogUser(uid)}>
                                  <Avatar className="h-8 w-8">
                                    <AvatarFallback className="gradient-primary text-primary-foreground font-bold text-[10px]">{initials}</AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="text-xs font-semibold hover:underline">{p.first_name} {p.last_name}</p>
                                    <p className="text-[10px] text-muted-foreground">@{p.username || "—"}</p>
                                  </div>
                                </div>
                                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => removeFriend(uid)}>Cancel</Button>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* Sub-tab: Discover */}
                <TabsContent value="discover" className="space-y-3">
                  <div className="flex gap-2">
                    <Input 
                      placeholder="Search by name or @username..." 
                      value={searchQuery} 
                      onChange={(e) => setSearchQuery(e.target.value)} 
                      onKeyDown={(e) => e.key === "Enter" && searchFriends()} 
                    />
                    <Button size="sm" onClick={searchFriends}><Search className="h-4 w-4" /></Button>
                  </div>
                  
                  {searchResults.length > 0 ? (
                    <div className="divide-y divide-border/40">
                      {searchResults.map((r) => {
                        const existing = friendshipsMap[r.id];
                        const initials = `${(r.first_name?.[0] || "").toUpperCase()}${(r.last_name?.[0] || "").toUpperCase()}`;
                        return (
                          <div key={r.id} className="flex items-center justify-between py-2.5">
                            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setProfileDialogUser(r.id)}>
                              <Avatar className="h-9 w-9">
                                <AvatarFallback className="gradient-primary text-primary-foreground font-bold text-xs">{initials}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-sm font-semibold hover:underline">{r.first_name} {r.last_name}</p>
                                <p className="text-xs text-muted-foreground">@{r.username || "—"} · Class {r.student_class || "—"}</p>
                              </div>
                            </div>
                            {!existing ? (
                              <Button size="sm" onClick={() => sendFriendRequest(r.id)}><UserPlus className="h-4 w-4" /></Button>
                            ) : existing.status === "accepted" ? (
                              <Badge className="bg-green-600">Friends</Badge>
                            ) : (
                              <Badge variant="secondary">Pending</Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : searchQuery.trim() ? (
                    <p className="text-xs text-muted-foreground text-center py-4">No profiles found matching "{searchQuery}"</p>
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-4">Search for classmates or teachers to link up!</p>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="details" className="space-y-4">
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
        </TabsContent>
      </Tabs>

      {/* Friend Profile Dialog Modal */}
      <Dialog open={!!profileDialogUser} onOpenChange={(o) => !o && setProfileDialogUser(null)}>
        <DialogContent className="max-w-lg p-0 overflow-hidden bg-background">
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

const StatBlock = ({ icon, value, label }: any) => (
  <div className="rounded-lg py-2 hover:bg-muted/40 transition-colors w-full cursor-pointer">
    <p className="text-xl font-bold leading-none">{value ?? 0}</p>
    <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wide">{label}</p>
  </div>
);
const MiniStat = ({ icon, value, label }: any) => (
  <div className="rounded-lg bg-muted/40 p-2 text-center hover:bg-muted/70 transition-colors cursor-pointer w-full">
    <div className="flex justify-center mb-1">{icon}</div>
    <p className="text-base font-bold leading-none">{value}</p>
    <p className="text-[9px] text-muted-foreground mt-1">{label}</p>
  </div>
);

export default StudentProfile;
