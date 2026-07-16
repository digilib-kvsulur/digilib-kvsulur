import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Heart, MessageCircle, Trash2, Send, Plus, Users, Search, UserPlus, Check, X, Flame, Trophy, Award } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Post { id: string; title: string; content: string; user_id: string; created_at: string; author?: any; likes: number; liked: boolean; comment_count: number; }
interface Comment { id: string; content: string; user_id: string; created_at: string; author?: string; }

const Community = ({ currentUserId, isAdmin }: { currentUserId: string; isAdmin: boolean }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [draft, setDraft] = useState({ title: "", content: "" });
  const [openComments, setOpenComments] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [commentDraft, setCommentDraft] = useState("");
  const [profileCache, setProfileCache] = useState<Record<string, any>>({});
  const [friendsOpen, setFriendsOpen] = useState(false);
  const { toast } = useToast();

  const fetchProfileFull = async (userId: string) => {
    if (profileCache[userId]) return profileCache[userId];
    const [{ data: p }, { count: booksCount }, { count: quizCount }, { data: streak }, { data: awards }] = await Promise.all([
      supabase.from("profiles").select("id, first_name, last_name, username, student_class, points").eq("id", userId).maybeSingle(),
      supabase.from("reading_history").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("quiz_results").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("login_streaks").select("current_streak, longest_streak").eq("user_id", userId).maybeSingle(),
      supabase.from("badge_awards").select("badges(name, icon_name, color)").eq("user_id", userId).limit(5),
    ]);
    const full = { ...p, booksRead: booksCount || 0, quizzes: quizCount || 0, streak: streak?.current_streak || 0, longestStreak: streak?.longest_streak || 0, badges: (awards || []).map((a: any) => a.badges).filter(Boolean) };
    setProfileCache(c => ({ ...c, [userId]: full }));
    return full;
  };

  const load = async () => {
    setLoading(true);
    const { data: postsData } = await supabase.from("posts").select("*").order("created_at", { ascending: false });
    if (!postsData) { setLoading(false); return; }
    const ids = postsData.map((p) => p.id);
    const userIds = Array.from(new Set(postsData.map((p) => p.user_id)));

    const [profilesRes, likesRes, commentsRes] = await Promise.all([
      supabase.from("profiles").select("id, first_name, last_name, username, student_class, points").in("id", userIds),
      supabase.from("post_likes").select("post_id, user_id").in("post_id", ids),
      supabase.from("post_comments").select("post_id").in("post_id", ids),
    ]);

    const profileMap = new Map((profilesRes.data || []).map((p: any) => [p.id, p]));
    const likeMap = new Map<string, { count: number; liked: boolean }>();
    (likesRes.data || []).forEach((l: any) => {
      const e = likeMap.get(l.post_id) || { count: 0, liked: false };
      e.count++; if (l.user_id === currentUserId) e.liked = true;
      likeMap.set(l.post_id, e);
    });
    const commentMap = new Map<string, number>();
    (commentsRes.data || []).forEach((c: any) => commentMap.set(c.post_id, (commentMap.get(c.post_id) || 0) + 1));

    setPosts(postsData.map((p: any) => ({
      ...p, author: profileMap.get(p.user_id),
      likes: likeMap.get(p.id)?.count || 0,
      liked: likeMap.get(p.id)?.liked || false,
      comment_count: commentMap.get(p.id) || 0,
    })));
    setLoading(false);
  };

  useEffect(() => { if (currentUserId) load(); }, [currentUserId]);

  const createPost = async () => {
    if (!draft.title.trim() || !draft.content.trim()) { toast({ title: "Fill both fields", variant: "destructive" }); return; }
    const { error } = await supabase.from("posts").insert({ user_id: currentUserId, title: draft.title, content: draft.content });
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    setDraft({ title: "", content: "" }); setShowNew(false); toast({ title: "Posted!" }); load();
  };

  const deletePost = async (id: string) => { await supabase.from("posts").delete().eq("id", id); toast({ title: "Deleted" }); load(); };

  const toggleLike = async (post: Post) => {
    if (post.liked) await supabase.from("post_likes").delete().eq("post_id", post.id).eq("user_id", currentUserId);
    else await supabase.from("post_likes").insert({ post_id: post.id, user_id: currentUserId });
    setPosts((ps) => ps.map((p) => p.id === post.id ? { ...p, liked: !p.liked, likes: p.likes + (p.liked ? -1 : 1) } : p));
  };

  const loadComments = async (postId: string) => {
    const { data } = await supabase.from("post_comments").select("*").eq("post_id", postId).order("created_at", { ascending: true });
    if (!data) return;
    const userIds = Array.from(new Set(data.map((c: any) => c.user_id)));
    const { data: profs } = await supabase.from("profiles").select("id, first_name, last_name").in("id", userIds);
    const m = new Map((profs || []).map((p: any) => [p.id, `${p.first_name || ""} ${p.last_name || ""}`.trim() || "User"]));
    setComments((c) => ({ ...c, [postId]: data.map((x: any) => ({ ...x, author: m.get(x.user_id) })) }));
  };
  const toggleComments = async (postId: string) => {
    if (openComments === postId) { setOpenComments(null); return; }
    setOpenComments(postId);
    if (!comments[postId]) await loadComments(postId);
  };
  const addComment = async (postId: string) => {
    if (!commentDraft.trim()) return;
    await supabase.from("post_comments").insert({ post_id: postId, user_id: currentUserId, content: commentDraft });
    setCommentDraft(""); await loadComments(postId);
    setPosts((ps) => ps.map((p) => p.id === postId ? { ...p, comment_count: p.comment_count + 1 } : p));
  };
  const deleteComment = async (postId: string, id: string) => {
    await supabase.from("post_comments").delete().eq("id", id);
    await loadComments(postId);
    setPosts((ps) => ps.map((p) => p.id === postId ? { ...p, comment_count: Math.max(0, p.comment_count - 1) } : p));
  };

  const authorName = (a: any) => a ? `${a.first_name || ""} ${a.last_name || ""}`.trim() || a.username || "User" : "User";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> Community</h2>
          <p className="text-sm text-muted-foreground">Share thoughts, connect with classmates & teachers</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={friendsOpen} onOpenChange={setFriendsOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline"><UserPlus className="h-4 w-4 mr-2" />Friends</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Friends & Follow Requests</DialogTitle></DialogHeader>
              <FriendsPanel currentUserId={currentUserId} />
            </DialogContent>
          </Dialog>
          <Button size="sm" className="gradient-primary border-0" onClick={() => setShowNew((s) => !s)}>
            <Plus className="h-4 w-4 mr-2" />New Post
          </Button>
        </div>
      </div>

      {showNew && (
        <Card className="border-primary/30">
          <CardContent className="p-4 space-y-3">
            <Input placeholder="Post title..." value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} maxLength={150} />
            <Textarea placeholder="What's on your mind?" rows={4} value={draft.content} onChange={(e) => setDraft({ ...draft, content: e.target.value })} maxLength={2000} />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setShowNew(false)}>Cancel</Button>
              <Button size="sm" onClick={createPost}>Post</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? <p className="text-sm text-muted-foreground">Loading...</p> : posts.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No posts yet. Be the first!</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {posts.map((p) => (
            <Card key={p.id} className="border-border/50 hover-lift">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <UserProfilePopover userId={p.user_id} authorSummary={p.author} fetchFull={fetchProfileFull} currentUserId={currentUserId}>
                    <Avatar className="h-9 w-9 cursor-pointer"><AvatarFallback className="gradient-primary text-primary-foreground text-xs">{authorName(p.author)?.[0]}</AvatarFallback></Avatar>
                  </UserProfilePopover>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <UserProfilePopover userId={p.user_id} authorSummary={p.author} fetchFull={fetchProfileFull} currentUserId={currentUserId}>
                          <p className="text-sm font-semibold hover:underline cursor-pointer">{authorName(p.author)}</p>
                        </UserProfilePopover>
                        <p className="text-[10px] text-muted-foreground">
                          {p.author?.username ? `@${p.author.username} · ` : ""}Class {p.author?.student_class || "—"} · {new Date(p.created_at).toLocaleString()}
                        </p>
                      </div>
                      {(p.user_id === currentUserId || isAdmin) && (
                        <button onClick={() => deletePost(p.id)} className="text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <h3 className="font-bold mt-2">{p.title}</h3>
                    <p className="text-sm whitespace-pre-wrap mt-1">{p.content}</p>
                    <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/50">
                      <button onClick={() => toggleLike(p)} className="flex items-center gap-1 text-sm hover:text-primary transition-colors">
                        <Heart className={`h-4 w-4 ${p.liked ? "fill-destructive text-destructive" : ""}`} /> {p.likes}
                      </button>
                      <button onClick={() => toggleComments(p.id)} className="flex items-center gap-1 text-sm hover:text-primary transition-colors">
                        <MessageCircle className="h-4 w-4" /> {p.comment_count}
                      </button>
                    </div>
                    {openComments === p.id && (
                      <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
                        {(comments[p.id] || []).map((c) => (
                          <div key={c.id} className="flex items-start gap-2 p-2 bg-muted/40 rounded-lg">
                            <Avatar className="h-6 w-6"><AvatarFallback className="text-[10px] gradient-primary text-primary-foreground">{c.author?.[0] || "U"}</AvatarFallback></Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold">{c.author} <span className="font-normal text-muted-foreground">· {new Date(c.created_at).toLocaleDateString()}</span></p>
                              <p className="text-xs">{c.content}</p>
                            </div>
                            {(c.user_id === currentUserId || isAdmin) && (
                              <button onClick={() => deleteComment(p.id, c.id)} className="text-muted-foreground hover:text-destructive">
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        ))}
                        <div className="flex gap-2">
                          <Input placeholder="Add a comment..." value={commentDraft} onChange={(e) => setCommentDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addComment(p.id); }} />
                          <Button size="sm" onClick={() => addComment(p.id)}><Send className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

/* ============ User profile popover ============ */
function UserProfilePopover({ userId, authorSummary, fetchFull, currentUserId, children }: { userId: string; authorSummary: any; fetchFull: (id: string) => Promise<any>; currentUserId: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [friendship, setFriendship] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!open) return;
    (async () => {
      const full = await fetchFull(userId);
      setProfile(full);
      if (userId !== currentUserId) {
        const { data } = await supabase.from("friendships").select("*").or(`and(requester_id.eq.${currentUserId},addressee_id.eq.${userId}),and(requester_id.eq.${userId},addressee_id.eq.${currentUserId})`).maybeSingle();
        setFriendship(data);
      }
    })();
  }, [open, userId]);

  const sendRequest = async () => {
    const { error, data } = await supabase.from("friendships").insert({ requester_id: currentUserId, addressee_id: userId }).select().single();
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { setFriendship(data); toast({ title: "Friend request sent" }); }
  };

  const authorName = authorSummary ? `${authorSummary.first_name || ""} ${authorSummary.last_name || ""}`.trim() || authorSummary.username || "User" : "User";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-80">
        {!profile ? <p className="text-sm text-muted-foreground">Loading…</p> : (
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Avatar className="h-12 w-12"><AvatarFallback className="gradient-primary text-primary-foreground">{authorName[0]}</AvatarFallback></Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{authorName}</p>
                {profile.username && <p className="text-xs text-muted-foreground">@{profile.username}</p>}
                <p className="text-xs text-muted-foreground">Class {profile.student_class || "—"}</p>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div><Trophy className="h-3.5 w-3.5 mx-auto text-yellow-500" /><p className="text-xs font-bold">{profile.points || 0}</p><p className="text-[9px] text-muted-foreground">pts</p></div>
              <div><Flame className="h-3.5 w-3.5 mx-auto text-orange-500" /><p className="text-xs font-bold">{profile.streak}</p><p className="text-[9px] text-muted-foreground">streak</p></div>
              <div><span className="text-xs font-bold block">{profile.booksRead}</span><p className="text-[9px] text-muted-foreground">books</p></div>
              <div><span className="text-xs font-bold block">{profile.quizzes}</span><p className="text-[9px] text-muted-foreground">quizzes</p></div>
            </div>
            {profile.badges?.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase text-muted-foreground mb-1">Badges</p>
                <div className="flex flex-wrap gap-1">
                  {profile.badges.slice(0, 5).map((b: any, i: number) => (
                    <Badge key={i} variant="secondary" className="text-[10px]"><Award className="h-2.5 w-2.5 mr-1" />{b.name}</Badge>
                  ))}
                </div>
              </div>
            )}
            {userId !== currentUserId && (
              <div className="pt-2 border-t">
                {!friendship ? (
                  <Button size="sm" className="w-full" onClick={sendRequest}><UserPlus className="h-3.5 w-3.5 mr-2" />Send Friend Request</Button>
                ) : friendship.status === "pending" ? (
                  <Badge variant="secondary" className="w-full justify-center py-1">Request {friendship.requester_id === currentUserId ? "sent" : "received"}</Badge>
                ) : friendship.status === "accepted" ? (
                  <Badge className="w-full justify-center py-1 bg-green-600">✓ Friends</Badge>
                ) : null}
              </div>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

/* ============ Friends panel ============ */
function FriendsPanel({ currentUserId }: { currentUserId: string }) {
  const { toast } = useToast();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [friendships, setFriendships] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});

  const loadFriendships = async () => {
    const { data } = await supabase.from("friendships").select("*").or(`requester_id.eq.${currentUserId},addressee_id.eq.${currentUserId}`);
    setFriendships(data || []);
    const ids = Array.from(new Set((data || []).flatMap((f: any) => [f.requester_id, f.addressee_id]).filter(id => id !== currentUserId)));
    if (ids.length) {
      const { data: p } = await supabase.from("profiles").select("id, first_name, last_name, username, student_class, role").in("id", ids);
      const m: Record<string, any> = {};
      (p || []).forEach((x: any) => { m[x.id] = x; });
      setProfiles(m);
    }
  };
  useEffect(() => { loadFriendships(); }, []);

  const search = async () => {
    if (!q.trim()) { setResults([]); return; }
    const { data } = await supabase.from("profiles").select("id, first_name, last_name, username, student_class, role").ilike("username", `%${q.trim()}%`).neq("id", currentUserId).limit(15);
    setResults(data || []);
  };

  const sendRequest = async (userId: string) => {
    const { error } = await supabase.from("friendships").insert({ requester_id: currentUserId, addressee_id: userId });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Request sent" }); loadFriendships(); }
  };
  const respond = async (id: string, status: string) => {
    await supabase.from("friendships").update({ status }).eq("id", id);
    loadFriendships();
  };
  const remove = async (id: string) => {
    await supabase.from("friendships").delete().eq("id", id); loadFriendships();
  };

  const pending = friendships.filter(f => f.status === "pending" && f.addressee_id === currentUserId);
  const sent = friendships.filter(f => f.status === "pending" && f.requester_id === currentUserId);
  const accepted = friendships.filter(f => f.status === "accepted");
  const otherId = (f: any) => f.requester_id === currentUserId ? f.addressee_id : f.requester_id;
  const name = (p: any) => p ? `${p.first_name || ""} ${p.last_name || ""}`.trim() || p.username || "User" : "User";

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Search by username</p>
        <div className="flex gap-2">
          <Input placeholder="Enter username..." value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === "Enter" && search()} />
          <Button size="sm" onClick={search}><Search className="h-4 w-4" /></Button>
        </div>
        {results.length > 0 && (
          <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
            {results.map(r => (
              <div key={r.id} className="flex items-center justify-between p-2 rounded bg-muted/40 text-xs">
                <div>
                  <p className="font-medium">{name(r)} <Badge variant="outline" className="text-[9px] ml-1">{r.role}</Badge></p>
                  <p className="text-muted-foreground">@{r.username || "—"} · Class {r.student_class || "—"}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => sendRequest(r.id)}><UserPlus className="h-3 w-3" /></Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {pending.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Incoming Requests ({pending.length})</p>
          {pending.map(f => (
            <div key={f.id} className="flex items-center justify-between p-2 rounded bg-primary/5 text-xs mb-1">
              <span>{name(profiles[otherId(f)])}</span>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => respond(f.id, "accepted")}><Check className="h-3 w-3" /></Button>
                <Button size="sm" variant="outline" onClick={() => respond(f.id, "rejected")}><X className="h-3 w-3" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {sent.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Sent ({sent.length})</p>
          {sent.map(f => (
            <div key={f.id} className="flex items-center justify-between p-2 rounded bg-muted/30 text-xs mb-1">
              <span>{name(profiles[otherId(f)])}</span>
              <Button size="sm" variant="ghost" onClick={() => remove(f.id)}><X className="h-3 w-3" /></Button>
            </div>
          ))}
        </div>
      )}

      <div>
        <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Friends ({accepted.length})</p>
        {accepted.length === 0 ? <p className="text-xs text-muted-foreground">No friends yet.</p> : accepted.map(f => (
          <div key={f.id} className="flex items-center justify-between p-2 rounded bg-muted/40 text-xs mb-1">
            <span>{name(profiles[otherId(f)])} · Class {profiles[otherId(f)]?.student_class || "—"}</span>
            <Button size="sm" variant="ghost" onClick={() => remove(f.id)}><X className="h-3 w-3" /></Button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Community;
