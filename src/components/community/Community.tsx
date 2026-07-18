import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Heart, MessageCircle, Trash2, Send, Plus, Users, Search, UserPlus, Check, X, Flame, Trophy, Award, BookOpen, Sparkles, UserCheck, Clock, UserX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Post { id: string; title: string; content: string; user_id: string; created_at: string; author?: any; likes: number; liked: boolean; comment_count: number; }
interface Comment { id: string; content: string; user_id: string; created_at: string; author?: any; }

const nameOf = (p: any) => p ? `${p.first_name || ""} ${p.last_name || ""}`.trim() || p.username || "User" : "User";
const initials = (p: any) => nameOf(p).split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();

const Community = ({ currentUserId, isAdmin }: { currentUserId: string; isAdmin: boolean }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [draft, setDraft] = useState({ title: "", content: "" });
  const [openComments, setOpenComments] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [commentDraft, setCommentDraft] = useState("");
  const [profileCache, setProfileCache] = useState<Record<string, any>>({});
  const [statsCache, setStatsCache] = useState<Record<string, any>>({});
  const [friendshipsMap, setFriendshipsMap] = useState<Record<string, any>>({});
  const [friendsOpen, setFriendsOpen] = useState(false);
  const [profileDialogUser, setProfileDialogUser] = useState<string | null>(null);
  const { toast } = useToast();

  const loadFriendshipsMap = async () => {
    const { data } = await supabase.from("friendships").select("*").or(`requester_id.eq.${currentUserId},addressee_id.eq.${currentUserId}`);
    const m: Record<string, any> = {};
    (data || []).forEach((f: any) => {
      const other = f.requester_id === currentUserId ? f.addressee_id : f.requester_id;
      m[other] = f;
    });
    setFriendshipsMap(m);
  };

  const fetchProfileStats = async (userId: string) => {
    if (statsCache[userId]) return statsCache[userId];
    const [{ data: profRows }, { data: statsRows }, { data: awards }] = await Promise.all([
      supabase.rpc("get_public_profiles", { _ids: [userId] }),
      supabase.rpc("get_public_profile_stats", { _id: userId }),
      supabase.from("badge_awards").select("badges(name, icon_name, color)").eq("user_id", userId).limit(8),
    ]);
    const prof: any = (profRows || [])[0] || {};
    const stats: any = (statsRows || [])[0] || {};
    const full = {
      ...prof,
      booksRead: stats.books_read || 0,
      quizzes: stats.quizzes || 0,
      streak: stats.current_streak || 0,
      longestStreak: stats.longest_streak || 0,
      badges: (awards || []).map((a: any) => a.badges).filter(Boolean),
    };
    setStatsCache((c) => ({ ...c, [userId]: full }));
    setProfileCache((c) => ({ ...c, [userId]: prof }));
    return full;
  };

  const load = async () => {
    setLoading(true);
    const { data: postsData } = await supabase.from("posts").select("*").order("created_at", { ascending: false });
    if (!postsData) { setLoading(false); return; }
    const ids = postsData.map((p) => p.id);
    const userIds = Array.from(new Set(postsData.map((p) => p.user_id)));

    const [{ data: profs }, likesRes, commentsRes] = await Promise.all([
      supabase.rpc("get_public_profiles", { _ids: userIds }),
      supabase.from("post_likes").select("post_id, user_id").in("post_id", ids),
      supabase.from("post_comments").select("post_id").in("post_id", ids),
    ]);

    const profileMap = new Map((profs || []).map((p: any) => [p.id, p]));
    setProfileCache((c) => ({ ...c, ...Object.fromEntries((profs || []).map((p: any) => [p.id, p])) }));
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

  useEffect(() => { if (currentUserId) { load(); loadFriendshipsMap(); } }, [currentUserId]);

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
    const { data: profs } = await supabase.rpc("get_public_profiles", { _ids: userIds });
    const m = new Map((profs || []).map((p: any) => [p.id, p]));
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

  const sendFriendRequest = async (userId: string) => {
    const { error, data } = await supabase.from("friendships").insert({ requester_id: currentUserId, addressee_id: userId }).select().single();
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setFriendshipsMap((m) => ({ ...m, [userId]: data }));
    toast({ title: "Friend request sent" });
  };
  const respondFriendRequest = async (userId: string, status: string) => {
    const f = friendshipsMap[userId];
    if (!f) return;
    await supabase.from("friendships").update({ status }).eq("id", f.id);
    setFriendshipsMap((m) => ({ ...m, [userId]: { ...f, status } }));
    toast({ title: status === "accepted" ? "Friend added" : "Request declined" });
  };
  const removeFriend = async (userId: string) => {
    const f = friendshipsMap[userId];
    if (!f) return;
    await supabase.from("friendships").delete().eq("id", f.id);
    setFriendshipsMap((m) => { const c = { ...m }; delete c[userId]; return c; });
    toast({ title: "Removed" });
  };

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
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>My Network</DialogTitle></DialogHeader>
              <FriendsPanel
                currentUserId={currentUserId}
                friendshipsMap={friendshipsMap}
                reload={loadFriendshipsMap}
                openProfile={(id) => { setFriendsOpen(false); setProfileDialogUser(id); }}
              />
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
                  <UserHoverCard userId={p.user_id} author={p.author} currentUserId={currentUserId} fetchStats={fetchProfileStats} friendship={friendshipsMap[p.user_id]} onSend={sendFriendRequest} onRespond={respondFriendRequest} onRemove={removeFriend} onView={setProfileDialogUser}>
                    <Avatar className="h-10 w-10 cursor-pointer ring-2 ring-transparent hover:ring-primary/40 transition-all">
                      <AvatarFallback className="gradient-primary text-primary-foreground text-xs font-bold">{initials(p.author)}</AvatarFallback>
                    </Avatar>
                  </UserHoverCard>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <UserHoverCard userId={p.user_id} author={p.author} currentUserId={currentUserId} fetchStats={fetchProfileStats} friendship={friendshipsMap[p.user_id]} onSend={sendFriendRequest} onRespond={respondFriendRequest} onRemove={removeFriend} onView={setProfileDialogUser}>
                          <p className="text-sm font-semibold hover:underline cursor-pointer inline-flex items-center gap-1.5">
                            {nameOf(p.author)}
                            {p.author?.role && p.author.role !== "student" && <Badge variant="outline" className="text-[9px] py-0 px-1.5 capitalize">{p.author.role}</Badge>}
                          </p>
                        </UserHoverCard>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {p.author?.username ? `@${p.author.username} · ` : ""}Class {p.author?.student_class || "—"} · {new Date(p.created_at).toLocaleString()}
                        </p>
                      </div>
                      {(p.user_id === currentUserId || isAdmin) && (
                        <button onClick={() => deletePost(p.id)} className="text-muted-foreground hover:text-destructive shrink-0">
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
                            <UserHoverCard userId={c.user_id} author={c.author} currentUserId={currentUserId} fetchStats={fetchProfileStats} friendship={friendshipsMap[c.user_id]} onSend={sendFriendRequest} onRespond={respondFriendRequest} onRemove={removeFriend} onView={setProfileDialogUser}>
                              <Avatar className="h-6 w-6 cursor-pointer"><AvatarFallback className="text-[10px] gradient-primary text-primary-foreground">{initials(c.author)}</AvatarFallback></Avatar>
                            </UserHoverCard>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold">{nameOf(c.author)} <span className="font-normal text-muted-foreground">· {new Date(c.created_at).toLocaleDateString()}</span></p>
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

      <Dialog open={!!profileDialogUser} onOpenChange={(o) => !o && setProfileDialogUser(null)}>
        <DialogContent className="max-w-lg p-0 overflow-hidden">
          {profileDialogUser && (
            <ProfileView
              userId={profileDialogUser}
              currentUserId={currentUserId}
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

/* ============ Hover card ============ */
function UserHoverCard({ userId, author, currentUserId, fetchStats, friendship, onSend, onRespond, onRemove, onView, children }: any) {
  const [full, setFull] = useState<any>(null);
  const [hovered, setHovered] = useState(false);

  useEffect(() => { if (hovered && !full) fetchStats(userId).then(setFull); }, [hovered]);

  const isSelf = userId === currentUserId;
  const status = friendship?.status;
  const iSent = friendship?.requester_id === currentUserId;

  return (
    <HoverCard openDelay={200} closeDelay={100} onOpenChange={setHovered}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent className="w-80 p-0 overflow-hidden border-2">
        <div className="h-16 gradient-primary" />
        <div className="p-4 -mt-8 space-y-3">
          <div className="flex items-end gap-3">
            <Avatar className="h-16 w-16 ring-4 ring-background">
              <AvatarFallback className="gradient-primary text-primary-foreground font-bold text-lg">{initials(author)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 pb-1">
              <p className="font-bold text-sm truncate">{nameOf(author)}</p>
              {author?.username && <p className="text-xs text-muted-foreground truncate">@{author.username}</p>}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
            {author?.role && <Badge variant="secondary" className="capitalize">{author.role}</Badge>}
            {author?.student_class && <Badge variant="outline">Class {author.student_class}</Badge>}
          </div>
          {full ? (
            <>
              <div className="grid grid-cols-4 gap-1 text-center pt-1">
                <StatMini icon={<Trophy className="h-3 w-3 text-yellow-500" />} value={full.points || 0} label="pts" />
                <StatMini icon={<Flame className="h-3 w-3 text-orange-500" />} value={full.streak} label="streak" />
                <StatMini icon={<BookOpen className="h-3 w-3 text-blue-500" />} value={full.booksRead} label="books" />
                <StatMini icon={<Sparkles className="h-3 w-3 text-purple-500" />} value={full.quizzes} label="quiz" />
              </div>
              {full.badges?.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {full.badges.slice(0, 4).map((b: any, i: number) => (
                    <Badge key={i} variant="secondary" className="text-[9px]"><Award className="h-2.5 w-2.5 mr-0.5" />{b.name}</Badge>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-2">Loading…</p>
          )}
          {!isSelf && (
            <div className="pt-2 border-t space-y-1.5">
              {!friendship && <Button size="sm" className="w-full h-8" onClick={() => onSend(userId)}><UserPlus className="h-3.5 w-3.5 mr-1.5" />Add Friend</Button>}
              {status === "pending" && iSent && <Button size="sm" variant="outline" className="w-full h-8" disabled><Clock className="h-3.5 w-3.5 mr-1.5" />Request Sent</Button>}
              {status === "pending" && !iSent && (
                <div className="flex gap-1.5">
                  <Button size="sm" className="flex-1 h-8" onClick={() => onRespond(userId, "accepted")}><Check className="h-3.5 w-3.5 mr-1" />Accept</Button>
                  <Button size="sm" variant="outline" className="flex-1 h-8" onClick={() => onRespond(userId, "rejected")}><X className="h-3.5 w-3.5" /></Button>
                </div>
              )}
              {status === "accepted" && (
                <div className="flex gap-1.5">
                  <Badge className="flex-1 justify-center py-1.5 bg-green-600"><UserCheck className="h-3.5 w-3.5 mr-1" />Friends</Badge>
                  <Button size="sm" variant="outline" className="h-8" onClick={() => onRemove(userId)}><UserX className="h-3.5 w-3.5" /></Button>
                </div>
              )}
              <Button size="sm" variant="ghost" className="w-full h-8" onClick={() => onView(userId)}>View full profile →</Button>
            </div>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

const StatMini = ({ icon, value, label }: any) => (
  <div className="rounded-md bg-muted/40 p-1.5">
    <div className="flex justify-center mb-0.5">{icon}</div>
    <p className="text-xs font-bold leading-none">{value}</p>
    <p className="text-[8px] text-muted-foreground mt-0.5">{label}</p>
  </div>
);

/* ============ Full profile dialog ============ */
function ProfileDialog({ userId, currentUserId, fetchStats, friendship, onSend, onRespond, onRemove, onClose }: any) {
  const [full, setFull] = useState<any>(null);
  useEffect(() => { fetchStats(userId).then(setFull); }, [userId]);
  const isSelf = userId === currentUserId;
  const status = friendship?.status;
  const iSent = friendship?.requester_id === currentUserId;

  if (!full) return <div className="p-8 text-center text-sm text-muted-foreground">Loading profile…</div>;

  return (
    <div>
      <div className="h-24 gradient-primary" />
      <div className="px-6 pb-6 -mt-12">
        <Avatar className="h-24 w-24 ring-4 ring-background mb-3">
          <AvatarFallback className="gradient-primary text-primary-foreground font-bold text-2xl">{initials(full)}</AvatarFallback>
        </Avatar>
        <DialogHeader className="text-left space-y-1 mb-4">
          <DialogTitle className="text-xl">{nameOf(full)}</DialogTitle>
          <div className="flex flex-wrap items-center gap-1.5">
            {full.username && <p className="text-sm text-muted-foreground">@{full.username}</p>}
            {full.role && <Badge variant="secondary" className="capitalize">{full.role}</Badge>}
            {full.student_class && <Badge variant="outline">Class {full.student_class}</Badge>}
          </div>
        </DialogHeader>
        <div className="grid grid-cols-4 gap-2 mb-4">
          <BigStat icon={<Trophy className="h-4 w-4 text-yellow-500" />} value={full.points || 0} label="Points" />
          <BigStat icon={<Flame className="h-4 w-4 text-orange-500" />} value={full.streak} label="Day streak" />
          <BigStat icon={<BookOpen className="h-4 w-4 text-blue-500" />} value={full.booksRead} label="Books" />
          <BigStat icon={<Sparkles className="h-4 w-4 text-purple-500" />} value={full.quizzes} label="Quizzes" />
        </div>
        {full.badges?.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Badges Earned</p>
            <div className="flex flex-wrap gap-1.5">
              {full.badges.map((b: any, i: number) => (
                <Badge key={i} variant="secondary"><Award className="h-3 w-3 mr-1" />{b.name}</Badge>
              ))}
            </div>
          </div>
        )}
        <div className="rounded-md bg-muted/30 p-3 text-xs text-muted-foreground mb-4">
          <p><span className="font-semibold text-foreground">Longest streak:</span> {full.longestStreak} days</p>
        </div>
        {!isSelf && (
          <div className="space-y-2">
            {!friendship && <Button className="w-full" onClick={() => onSend(userId)}><UserPlus className="h-4 w-4 mr-2" />Send Friend Request</Button>}
            {status === "pending" && iSent && <Button variant="outline" className="w-full" disabled><Clock className="h-4 w-4 mr-2" />Request Sent</Button>}
            {status === "pending" && !iSent && (
              <div className="flex gap-2">
                <Button className="flex-1" onClick={() => onRespond(userId, "accepted")}><Check className="h-4 w-4 mr-2" />Accept</Button>
                <Button variant="outline" className="flex-1" onClick={() => onRespond(userId, "rejected")}><X className="h-4 w-4 mr-2" />Decline</Button>
              </div>
            )}
            {status === "accepted" && (
              <div className="flex gap-2">
                <Badge className="flex-1 justify-center py-2 bg-green-600 text-sm"><UserCheck className="h-4 w-4 mr-2" />Friends</Badge>
                <Button variant="outline" onClick={() => onRemove(userId)}><UserX className="h-4 w-4" /></Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const BigStat = ({ icon, value, label }: any) => (
  <div className="rounded-lg bg-muted/40 p-2 text-center">
    <div className="flex justify-center mb-1">{icon}</div>
    <p className="text-lg font-bold leading-none">{value}</p>
    <p className="text-[9px] text-muted-foreground mt-1">{label}</p>
  </div>
);

/* ============ Friends panel ============ */
function FriendsPanel({ currentUserId, friendshipsMap, reload, openProfile }: any) {
  const { toast } = useToast();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});

  useEffect(() => {
    const ids = Object.keys(friendshipsMap);
    if (ids.length === 0) { setProfiles({}); return; }
    supabase.rpc("get_public_profiles", { _ids: ids }).then(({ data }) => {
      const m: Record<string, any> = {};
      (data || []).forEach((p: any) => { m[p.id] = p; });
      setProfiles(m);
    });
  }, [friendshipsMap]);

  const search = async () => {
    if (!q.trim()) { setResults([]); return; }
    const { data, error } = await supabase.rpc("search_public_profiles", { _q: q.trim(), _exclude: currentUserId });
    if (error) toast({ title: "Search failed", description: error.message, variant: "destructive" });
    else setResults(data || []);
  };

  const sendRequest = async (userId: string) => {
    const { error } = await supabase.from("friendships").insert({ requester_id: currentUserId, addressee_id: userId });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Request sent" }); reload(); }
  };
  const respond = async (id: string, status: string) => {
    await supabase.from("friendships").update({ status }).eq("id", id); reload();
  };
  const remove = async (id: string) => {
    await supabase.from("friendships").delete().eq("id", id); reload();
  };

  const entries = Object.entries(friendshipsMap) as [string, any][];
  const accepted = entries.filter(([, f]) => f.status === "accepted");
  const incoming = entries.filter(([, f]) => f.status === "pending" && f.addressee_id === currentUserId);
  const outgoing = entries.filter(([, f]) => f.status === "pending" && f.requester_id === currentUserId);

  const Row = ({ userId, f, actions }: any) => {
    const p = profiles[userId];
    return (
      <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/60 transition-colors">
        <Avatar className="h-10 w-10 cursor-pointer" onClick={() => openProfile(userId)}>
          <AvatarFallback className="gradient-primary text-primary-foreground text-xs font-bold">{initials(p)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openProfile(userId)}>
          <p className="text-sm font-semibold truncate">{nameOf(p)}</p>
          <p className="text-xs text-muted-foreground truncate">
            {p?.username ? `@${p.username} · ` : ""}Class {p?.student_class || "—"}
          </p>
        </div>
        <div className="flex gap-1">{actions}</div>
      </div>
    );
  };

  return (
    <Tabs defaultValue="friends" className="space-y-3">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="friends" className="text-xs">Friends {accepted.length > 0 && `(${accepted.length})`}</TabsTrigger>
        <TabsTrigger value="incoming" className="text-xs">Requests {incoming.length > 0 && `(${incoming.length})`}</TabsTrigger>
        <TabsTrigger value="sent" className="text-xs">Sent {outgoing.length > 0 && `(${outgoing.length})`}</TabsTrigger>
        <TabsTrigger value="discover" className="text-xs">Discover</TabsTrigger>
      </TabsList>

      <TabsContent value="friends" className="space-y-1">
        {accepted.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No friends yet — Discover people to add!</p>
          </div>
        ) : accepted.map(([uid, f]) => (
          <Row key={uid} userId={uid} f={f} actions={
            <Button size="sm" variant="ghost" onClick={() => remove(f.id)}><UserX className="h-4 w-4" /></Button>
          } />
        ))}
      </TabsContent>

      <TabsContent value="incoming" className="space-y-1">
        {incoming.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">No incoming requests</p> : incoming.map(([uid, f]) => (
          <Row key={uid} userId={uid} f={f} actions={
            <>
              <Button size="sm" onClick={() => respond(f.id, "accepted")}><Check className="h-4 w-4" /></Button>
              <Button size="sm" variant="outline" onClick={() => respond(f.id, "rejected")}><X className="h-4 w-4" /></Button>
            </>
          } />
        ))}
      </TabsContent>

      <TabsContent value="sent" className="space-y-1">
        {outgoing.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">No pending requests sent</p> : outgoing.map(([uid, f]) => (
          <Row key={uid} userId={uid} f={f} actions={
            <Button size="sm" variant="ghost" onClick={() => remove(f.id)}><X className="h-4 w-4" /></Button>
          } />
        ))}
      </TabsContent>

      <TabsContent value="discover" className="space-y-3">
        <div className="flex gap-2">
          <Input placeholder="Search by name or @username…" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()} />
          <Button size="sm" onClick={search}><Search className="h-4 w-4" /></Button>
        </div>
        {results.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">Search for classmates or teachers to connect with.</p>
        ) : (
          <div className="space-y-1">
            {results.map((r) => {
              const existing = friendshipsMap[r.id];
              return (
                <div key={r.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/60">
                  <Avatar className="h-10 w-10 cursor-pointer" onClick={() => openProfile(r.id)}>
                    <AvatarFallback className="gradient-primary text-primary-foreground text-xs font-bold">{initials(r)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openProfile(r.id)}>
                    <p className="text-sm font-semibold truncate">{nameOf(r)}</p>
                    <p className="text-xs text-muted-foreground truncate">@{r.username || "—"} · {r.role} · Class {r.student_class || "—"}</p>
                  </div>
                  {!existing ? (
                    <Button size="sm" onClick={() => sendRequest(r.id)}><UserPlus className="h-4 w-4" /></Button>
                  ) : existing.status === "accepted" ? (
                    <Badge className="bg-green-600">Friends</Badge>
                  ) : (
                    <Badge variant="secondary">Pending</Badge>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}

export default Community;
