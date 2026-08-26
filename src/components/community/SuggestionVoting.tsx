import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Flame, Check, X, ThumbsUp, Plus, Lightbulb, BookOpen, Clock, Loader2, Trash2 } from "lucide-react";

interface SuggestionPost {
  id: string;
  title: string;
  content: string;
  user_id: string;
  created_at: string;
  post_type: string;
  likes: number;
  liked: boolean;
  authorName?: string;
  status: string;
  cleanContent: string;
}

export default function SuggestionVoting({ userId, isAdmin }: { userId: string; isAdmin: boolean }) {
  const { toast } = useToast();
  const [suggestions, setSuggestions] = useState<SuggestionPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<"book" | "feature">("book");
  
  // Form states
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ title: "", author: "", details: "" });

  const getStatusAndContent = (content: string) => {
    if (content.startsWith("[STATUS:")) {
      const match = content.match(/^\[STATUS:([^\]]+)\](.*)/s);
      if (match) {
        return { status: match[1], cleanContent: match[2].trim() };
      }
    }
    return { status: "voting", cleanContent: content };
  };

  const loadSuggestions = async () => {
    setLoading(true);
    try {
      // 1. Fetch suggestions from posts table
      const { data: postsData, error } = await supabase
        .from("posts")
        .select("id, title, content, user_id, created_at, post_type")
        .in("post_type", ["suggestion_book", "suggestion_feature"])
        .order("created_at", { ascending: false });

      if (error) throw error;

      // 2. Fetch profiles to display author names
      const uids = Array.from(new Set((postsData || []).map(p => p.user_id)));
      let profilesMap: Record<string, string> = {};
      if (uids.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, first_name, last_name")
          .in("id", uids);
        profilesMap = (profiles || []).reduce((acc: any, p: any) => {
          acc[p.id] = `${p.first_name || ""} ${p.last_name || ""}`.trim();
          return acc;
        }, {});
      }

      // 3. Fetch likes for checking upvoted status
      const { data: likesData } = await supabase
        .from("post_likes")
        .select("post_id, user_id")
        .in("post_id", (postsData || []).map(p => p.id));

      // Calculate total likes and current user's liked status per post
      const enriched: SuggestionPost[] = (postsData || []).map((p: any) => {
        const postLikes = (likesData || []).filter(l => l.post_id === p.id);
        const liked = postLikes.some(l => l.user_id === userId);
        const { status, cleanContent } = getStatusAndContent(p.content);

        return {
          id: p.id,
          title: p.title,
          content: p.content,
          user_id: p.user_id,
          created_at: p.created_at,
          post_type: p.post_type,
          likes: postLikes.length,
          liked,
          authorName: profilesMap[p.user_id] || "Unknown Student",
          status,
          cleanContent
        };
      });

      setSuggestions(enriched);
    } catch (e: any) {
      console.error(e);
      toast({ title: "Failed to load suggestions", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuggestions();
  }, [userId]);

  const handleVote = async (post: SuggestionPost) => {
    try {
      if (post.liked) {
        await supabase.from("post_likes").delete().eq("post_id", post.id).eq("user_id", userId);
        setSuggestions(prev => prev.map(p => p.id === post.id ? { ...p, liked: false, likes: Math.max(0, p.likes - 1) } : p));
      } else {
        await supabase.from("post_likes").insert({ post_id: post.id, user_id: userId });
        setSuggestions(prev => prev.map(p => p.id === post.id ? { ...p, liked: true, likes: p.likes + 1 } : p));
      }
    } catch (e: any) {
      toast({ title: "Failed to cast vote", description: e.message, variant: "destructive" });
    }
  };

  const handleCreateSuggestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;

    setSubmitting(true);
    try {
      const type = activeSubTab === "book" ? "suggestion_book" : "suggestion_feature";
      const displayContent = activeSubTab === "book" 
        ? `[STATUS:voting] Author: ${form.author.trim() || 'Unknown'}\n\nReason: ${form.details.trim()}`
        : `[STATUS:voting] ${form.details.trim()}`;

      // 1. Insert post in community feed
      const { data: newPost, error: postErr } = await supabase
        .from("posts")
        .insert({
          title: form.title.trim(),
          content: displayContent,
          post_type: type,
          user_id: userId
        })
        .select()
        .single();

      if (postErr) throw postErr;

      // 2. If it is a book suggestion, also add it to book_suggestions table
      if (activeSubTab === "book") {
        await supabase.from("book_suggestions").insert({
          title: form.title.trim(),
          author: form.author.trim() || null,
          reason: form.details.trim() || null,
          user_id: userId,
          status: "pending"
        });
      }

      toast({ title: "Suggestion posted! 🚀", description: "Classmates can now vote on your suggestion." });
      setForm({ title: "", author: "", details: "" });
      setShowForm(false);
      loadSuggestions();
    } catch (err: any) {
      toast({ title: "Failed to post", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (post: SuggestionPost, newStatus: string) => {
    try {
      const updatedContent = `[STATUS:${newStatus}] ${post.cleanContent}`;
      const { error } = await supabase
        .from("posts")
        .update({ content: updatedContent })
        .eq("id", post.id);

      if (error) throw error;
      toast({ title: "Status updated" });
      loadSuggestions();
    } catch (e: any) {
      toast({ title: "Failed to update status", description: e.message, variant: "destructive" });
    }
  };

  const handleDeleteSuggestion = async (postId: string) => {
    if (!confirm("Are you sure you want to delete this suggestion?")) return;
    try {
      const { error } = await supabase.from("posts").delete().eq("id", postId);
      if (error) throw error;
      toast({ title: "Deleted" });
      loadSuggestions();
    } catch (e: any) {
      toast({ title: "Failed to delete", description: e.message, variant: "destructive" });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "voting": return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">🗳️ Voting</Badge>;
      case "planned": return <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100">📋 Planned</Badge>;
      case "in-progress": return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">🔨 In Progress</Badge>;
      case "live": return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">✅ Live</Badge>;
      case "declined": return <Badge variant="destructive">❌ Declined</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filtered = suggestions.filter(p => 
    activeSubTab === "book" ? p.post_type === "suggestion_book" : p.post_type === "suggestion_feature"
  );

  return (
    <div className="space-y-4">
      {/* Tab controls */}
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div className="flex flex-wrap gap-2">
          <Button 
            size="sm" 
            variant={activeSubTab === "book" ? "default" : "outline"}
            onClick={() => { setActiveSubTab("book"); setShowForm(false); }}
            className="rounded-full"
          >
            <BookOpen className="h-4 w-4 mr-1.5" /> Book Suggestions
          </Button>
          <Button 
            size="sm" 
            variant={activeSubTab === "feature" ? "default" : "outline"}
            onClick={() => { setActiveSubTab("feature"); setShowForm(false); }}
            className="rounded-full"
          >
            <Lightbulb className="h-4 w-4 mr-1.5" /> Feature suggestions
          </Button>
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)} className="gradient-primary border-0 rounded-full">
          <Plus className="h-4 w-4 mr-1.5" /> Suggest {activeSubTab === "book" ? "Book" : "Feature"}
        </Button>
      </div>

      {/* Suggestion Form */}
      {showForm && (
        <Card className="border-indigo-100 shadow-sm animate-in fade-in-50 slide-in-from-top-3">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold">
              Suggest a new {activeSubTab === "book" ? "Book to Buy" : "App Feature"}
            </CardTitle>
            <CardDescription className="text-xs">
              Students and teachers will see this in the public survey to upvote it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateSuggestion} className="space-y-3">
              <div>
                <Label className="text-xs font-semibold">{activeSubTab === "book" ? "Book Title *" : "Feature Name *"}</Label>
                <Input 
                  value={form.title} 
                  onChange={e => setForm({ ...form, title: e.target.value })} 
                  placeholder={activeSubTab === "book" ? "e.g. Harry Potter & The Sorcerer's Stone" : "e.g. Dark Mode Theme"} 
                  required 
                />
              </div>

              {activeSubTab === "book" && (
                <div>
                  <Label className="text-xs font-semibold">Author / Publisher</Label>
                  <Input 
                    value={form.author} 
                    onChange={e => setForm({ ...form, author: e.target.value })} 
                    placeholder="e.g. J.K. Rowling" 
                  />
                </div>
              )}

              <div>
                <Label className="text-xs font-semibold">{activeSubTab === "book" ? "Why should we buy this book? *" : "Describe the feature and how it helps students *"}</Label>
                <Textarea 
                  value={form.details} 
                  onChange={e => setForm({ ...form, details: e.target.value })} 
                  placeholder={activeSubTab === "book" ? "e.g. Recommended for competitive exams or high student demand..." : "e.g. Add a direct notes sharing tool inside the study dashboard..."} 
                  rows={3}
                  required 
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)} size="sm">Cancel</Button>
                <Button type="submit" disabled={submitting} size="sm">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
                  Submit Suggestion
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* List suggestions */}
      {loading ? (
        <div className="text-center py-12"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No {activeSubTab === "book" ? "book" : "feature"} suggestions submitted yet. Be the first to suggest!</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {filtered.map(post => (
            <Card key={post.id} className="border-border/60 hover:shadow-sm transition-all flex flex-col justify-between">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-sm font-extrabold text-foreground line-clamp-1">{post.title}</CardTitle>
                  {getStatusBadge(post.status)}
                </div>
                <CardDescription className="text-[10px] flex items-center gap-1.5 mt-0.5">
                  <span>Suggested by {post.authorName}</span>
                  <span>•</span>
                  <Clock className="h-3 w-3 shrink-0" />
                  <span>{new Date(post.created_at).toLocaleDateString()}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 flex-1 flex flex-col justify-between pt-0">
                <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap flex-1">{post.cleanContent}</p>
                
                <div className="flex items-center justify-between border-t pt-3 mt-3">
                  <Button 
                    size="sm" 
                    variant={post.liked ? "default" : "outline"}
                    onClick={() => handleVote(post)}
                    className="h-8 rounded-full gap-1.5 text-xs font-bold"
                  >
                    <ThumbsUp className={`h-3.5 w-3.5 ${post.liked ? 'fill-current' : ''}`} />
                    <span>Upvote ({post.likes})</span>
                  </Button>

                  {/* Admin controls */}
                  {isAdmin && (
                    <div className="flex items-center gap-2">
                      <Select value={post.status} onValueChange={(val) => handleUpdateStatus(post, val)}>
                        <SelectTrigger className="h-8 w-28 text-xs font-medium">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="voting">🗳️ Voting</SelectItem>
                          <SelectItem value="planned">📋 Planned</SelectItem>
                          <SelectItem value="in-progress">🔨 Progress</SelectItem>
                          <SelectItem value="live">✅ Live</SelectItem>
                          <SelectItem value="declined">❌ Declined</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeleteSuggestion(post.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
