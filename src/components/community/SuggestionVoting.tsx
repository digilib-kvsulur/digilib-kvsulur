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
import { Flame, Check, X, ThumbsUp, Plus, Lightbulb, BookOpen, Clock, Loader2, Trash2, Settings } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

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

interface Category {
  id: string;
  label: string;
  icon?: string; // 'book' | 'feature' | 'event' | 'other'
}

const DEFAULT_CATEGORIES: Category[] = [
  { id: "book", label: "Book Suggestions", icon: "book" },
  { id: "feature", label: "Feature Suggestions", icon: "feature" }
];

export default function SuggestionVoting({ userId, isAdmin }: { userId: string; isAdmin: boolean }) {
  const { toast } = useToast();
  const [suggestions, setSuggestions] = useState<SuggestionPost[]>([]);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [activeSubTab, setActiveSubTab] = useState<string>("book");
  const [loading, setLoading] = useState(true);

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ title: "", author: "", details: "" });

  // Admin Manage Categories States
  const [showManageModal, setShowManageModal] = useState(false);
  const [newCatId, setNewCatId] = useState("");
  const [newCatLabel, setNewCatLabel] = useState("");

  const getStatusAndContent = (content: string) => {
    if (content.startsWith("[STATUS:")) {
      const match = content.match(/^\[STATUS:([^\]]+)\](.*)/s);
      if (match) {
        return { status: match[1], cleanContent: match[2].trim() };
      }
    }
    return { status: "voting", cleanContent: content };
  };

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "suggestion_categories")
        .maybeSingle();
      if (data?.value) {
        const parsed = typeof data.value === "string" ? JSON.parse(data.value) : data.value;
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCategories(parsed);
          // Auto select first category if current isn't in list
          if (!parsed.some(c => c.id === activeSubTab)) {
            setActiveSubTab(parsed[0].id);
          }
        }
      }
    } catch (e) {
      console.error("Error loading categories:", e);
    }
  };

  const loadSuggestions = async () => {
    setLoading(true);
    try {
      // 1. Fetch categories
      await loadCategories();

      // 2. Fetch suggestions from posts table matching suggestion_%
      const { data: postsData, error } = await supabase
        .from("posts")
        .select("id, title, content, user_id, created_at, post_type")
        .like("post_type", "suggestion_%")
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
      const type = `suggestion_${activeSubTab}`;
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

  const handleAddCategory = async () => {
    if (!newCatId.trim() || !newCatLabel.trim()) return;
    const cleanId = newCatId.toLowerCase().trim().replace(/[^a-z0-9_-]/g, "");
    if (categories.some(c => c.id === cleanId)) {
      toast({ title: "Tab already exists", variant: "destructive" });
      return;
    }

    const updated = [...categories, { id: cleanId, label: newCatLabel.trim() }];
    try {
      const { error } = await supabase
        .from("system_settings")
        .upsert([{ key: "suggestion_categories", value: updated as any }], { onConflict: "key" });
      if (error) throw error;
      setCategories(updated);
      setNewCatId("");
      setNewCatLabel("");
      toast({ title: "Tab added successfully" });
    } catch (e: any) {
      toast({ title: "Failed to add tab", description: e.message, variant: "destructive" });
    }
  };

  const handleDeleteCategory = async (catId: string) => {
    if (catId === "book" || catId === "feature") {
      toast({ title: "Cannot delete default tabs", variant: "destructive" });
      return;
    }
    if (!confirm(`Are you sure you want to delete the "${catId}" tab? Existing suggestions in this tab will remain in the database but won't be displayed.`)) return;

    const updated = categories.filter(c => c.id !== catId);
    try {
      const { error } = await supabase
        .from("system_settings")
        .upsert([{ key: "suggestion_categories", value: updated as any }], { onConflict: "key" });
      if (error) throw error;
      setCategories(updated);
      if (activeSubTab === catId) {
        setActiveSubTab(updated[0]?.id || "book");
      }
      toast({ title: "Tab deleted successfully" });
    } catch (e: any) {
      toast({ title: "Failed to delete tab", description: e.message, variant: "destructive" });
    }
  };

  const filtered = suggestions.filter(p => p.post_type === `suggestion_${activeSubTab}`);

  const activeCategory = categories.find(c => c.id === activeSubTab) || { id: "general", label: "General" };

  return (
    <div className="space-y-4">
      {/* Tab controls */}
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div className="flex flex-wrap gap-2 items-center">
          {categories.map(cat => {
            const Icon = cat.id === "book" ? BookOpen : Lightbulb;
            return (
              <Button 
                key={cat.id}
                size="sm" 
                variant={activeSubTab === cat.id ? "default" : "outline"}
                onClick={() => { setActiveSubTab(cat.id); setShowForm(false); }}
                className="rounded-full gap-1.5"
              >
                <Icon className="h-4 w-4" />
                <span>{cat.label}</span>
              </Button>
            );
          })}

          {isAdmin && (
            <Dialog open={showManageModal} onOpenChange={setShowManageModal}>
              <DialogTrigger asChild>
                <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full border border-dashed border-muted-foreground/30 hover:bg-muted">
                  <Settings className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-base font-bold">Manage Suggestion Tabs</DialogTitle>
                  <DialogDescription className="text-xs">
                    Create new tabs or delete existing custom tabs. Default tabs (Book, Feature) cannot be deleted.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  {/* List existing */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Active Tabs</Label>
                    <div className="border rounded-lg divide-y text-sm max-h-[150px] overflow-y-auto">
                      {categories.map(c => (
                        <div key={c.id} className="flex justify-between items-center px-3 py-1.5">
                          <span className="font-medium">{c.label} <code className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">({c.id})</code></span>
                          {c.id !== "book" && c.id !== "feature" && (
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteCategory(c.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Add new tab form */}
                  <div className="border-t pt-3 space-y-3">
                    <h4 className="text-xs font-bold text-foreground">Create Custom Tab</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[10px] font-semibold">Tab Key (Lowercase, no spaces)</Label>
                        <Input placeholder="e.g. event" value={newCatId} onChange={e => setNewCatId(e.target.value)} className="h-8 text-xs" />
                      </div>
                      <div>
                        <Label className="text-[10px] font-semibold">Display Label</Label>
                        <Input placeholder="e.g. Event Ideas" value={newCatLabel} onChange={e => setNewCatLabel(e.target.value)} className="h-8 text-xs" />
                      </div>
                    </div>
                    <Button onClick={handleAddCategory} className="w-full h-8 text-xs font-semibold" disabled={!newCatId || !newCatLabel}>
                      Add Tab
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)} className="gradient-primary border-0 rounded-full">
          <Plus className="h-4 w-4 mr-1.5" /> Suggest {activeCategory.label.replace(" Suggestions", "")}
        </Button>
      </div>

      {/* Suggestion Form */}
      {showForm && (
        <Card className="border-indigo-100 shadow-sm animate-in fade-in-50 slide-in-from-top-3">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold">
              Suggest a new {activeCategory.label.replace(" Suggestions", "")}
            </CardTitle>
            <CardDescription className="text-xs">
              Students and teachers will see this in the public survey to upvote it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateSuggestion} className="space-y-3">
              <div>
                <Label className="text-xs font-semibold">{activeSubTab === "book" ? "Book Title *" : "Suggestion Title *"}</Label>
                <Input 
                  value={form.title} 
                  onChange={e => setForm({ ...form, title: e.target.value })} 
                  placeholder={activeSubTab === "book" ? "e.g. Harry Potter & The Sorcerer's Stone" : "e.g. New chess boards or general request"} 
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
                <Label className="text-xs font-semibold">{activeSubTab === "book" ? "Why should we buy this book? *" : "Describe your suggestion and how it helps students *"}</Label>
                <Textarea 
                  value={form.details} 
                  onChange={e => setForm({ ...form, details: e.target.value })} 
                  placeholder={activeSubTab === "book" ? "e.g. Recommended for competitive exams or high student demand..." : "e.g. Please outline details of what is needed and benefits..."} 
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
