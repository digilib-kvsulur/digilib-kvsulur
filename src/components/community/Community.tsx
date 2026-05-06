import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Heart, MessageCircle, Trash2, Send, Plus, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Post { id: string; title: string; content: string; user_id: string; created_at: string; author?: string; likes: number; liked: boolean; comment_count: number; }
interface Comment { id: string; content: string; user_id: string; created_at: string; author?: string; }

const Community = ({ currentUserId, isAdmin }: { currentUserId: string; isAdmin: boolean }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [draft, setDraft] = useState({ title: "", content: "" });
  const [openComments, setOpenComments] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [commentDraft, setCommentDraft] = useState("");
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const { data: postsData } = await supabase.from("posts").select("*").order("created_at", { ascending: false });
    if (!postsData) { setLoading(false); return; }
    const ids = postsData.map((p) => p.id);
    const userIds = Array.from(new Set(postsData.map((p) => p.user_id)));

    const [profilesRes, likesRes, commentsRes] = await Promise.all([
      supabase.from("profiles").select("id, first_name, last_name").in("id", userIds),
      supabase.from("post_likes").select("post_id, user_id").in("post_id", ids),
      supabase.from("post_comments").select("post_id").in("post_id", ids),
    ]);

    const profileMap = new Map((profilesRes.data || []).map((p: any) => [p.id, `${p.first_name || ""} ${p.last_name || ""}`.trim() || "User"]));
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
    if (!draft.title.trim() || !draft.content.trim()) {
      toast({ title: "Fill both fields", variant: "destructive" }); return;
    }
    const { error } = await supabase.from("posts").insert({ user_id: currentUserId, title: draft.title, content: draft.content });
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    setDraft({ title: "", content: "" }); setShowNew(false); toast({ title: "Posted!" }); load();
  };

  const deletePost = async (id: string) => {
    await supabase.from("posts").delete().eq("id", id);
    toast({ title: "Deleted" }); load();
  };

  const toggleLike = async (post: Post) => {
    if (post.liked) {
      await supabase.from("post_likes").delete().eq("post_id", post.id).eq("user_id", currentUserId);
    } else {
      await supabase.from("post_likes").insert({ post_id: post.id, user_id: currentUserId });
    }
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> Community</h2>
          <p className="text-sm text-muted-foreground">Share thoughts, ask questions, connect with classmates</p>
        </div>
        <Button size="sm" className="gradient-primary border-0" onClick={() => setShowNew((s) => !s)}>
          <Plus className="h-4 w-4 mr-2" />New Post
        </Button>
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
          <p className="text-sm">No posts yet. Be the first to share!</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {posts.map((p) => (
            <Card key={p.id} className="border-border/50 hover-lift">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="h-9 w-9"><AvatarFallback className="gradient-primary text-primary-foreground text-xs">{p.author?.[0] || "U"}</AvatarFallback></Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold">{p.author}</p>
                        <p className="text-[10px] text-muted-foreground">{new Date(p.created_at).toLocaleString()}</p>
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

export default Community;
