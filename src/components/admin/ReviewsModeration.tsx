import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Star, Eye, EyeOff, Trash2, Flag, ShieldAlert, CheckCircle2, UserX, Eraser, AlertTriangle, User } from "lucide-react";

export default function ReviewsModeration() {
  const { toast } = useToast();
  const [rows, setRows] = useState<any[]>([]);
  const [showHidden, setShowHidden] = useState(false);
  const [reports, setReports] = useState<any[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);

  const loadReviews = async () => {
    let q = supabase.from("book_reviews")
      .select("*, books(title)")
      .order("created_at", { ascending: false }).limit(200);
    if (!showHidden) q = q.eq("is_hidden", false);
    const { data, error } = await q;
    if (error) {
      console.error(error);
      toast({ title: "Error", description: error.message || "Failed to load reviews.", variant: "destructive" });
      return;
    }
    const userIds = Array.from(new Set((data || []).map((r: any) => r.user_id).filter(Boolean)));
    let profileMap: Record<string, any> = {};
    if (userIds.length) {
      const { data: profs } = await supabase.from("profiles")
        .select("id, first_name, last_name").in("id", userIds);
      (profs || []).forEach((p: any) => { profileMap[p.id] = p; });
    }
    setRows((data || []).map((r: any) => ({ ...r, profiles: profileMap[r.user_id] })));
  };

  const loadReports = async () => {
    setLoadingReports(true);
    try {
      const { data, error } = await (supabase as any)
        .from("community_reports")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        setReports([]);
        return;
      }

      const postIds = Array.from(new Set((data || []).map((r: any) => r.post_id).filter(Boolean))) as string[];
      let postMap: Record<string, any> = {};
      if (postIds.length) {
        const { data: postsData } = await supabase.from("posts").select("*").in("id", postIds);
        (postsData || []).forEach((p: any) => { postMap[p.id] = p; });
      }

      const authorIds = Array.from(new Set(Object.values(postMap).map((p: any) => p.user_id).filter(Boolean))) as string[];
      let authorMap: Record<string, any> = {};
      if (authorIds.length) {
        const { data: authorsData } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, username, student_class, admission_number, avatar_url, community_blocked_until")
          .in("id", authorIds);
        (authorsData || []).forEach((a: any) => { authorMap[a.id] = a; });
      }

      const reporterIds = Array.from(new Set((data || []).map((r: any) => r.reporter_id).filter(Boolean))) as string[];
      let reporterMap: Record<string, any> = {};
      if (reporterIds.length) {
        const { data: profs } = await supabase.from("profiles").select("id, first_name, last_name, username").in("id", reporterIds);
        (profs || []).forEach((p: any) => { reporterMap[p.id] = p; });
      }

      setReports((data || []).map((r: any) => ({
        ...r,
        post: postMap[r.post_id],
        author: postMap[r.post_id] ? authorMap[postMap[r.post_id].user_id] : null,
        reporter: reporterMap[r.reporter_id],
      })));
    } catch {
      setReports([]);
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => { loadReviews(); }, [showHidden]);
  useEffect(() => { loadReports(); }, []);

  const toggleHide = async (r: any) => {
    await supabase.from("book_reviews").update({ is_hidden: !r.is_hidden }).eq("id", r.id);
    toast({ title: r.is_hidden ? "Unhidden" : "Hidden" });
    loadReviews();
  };

  const removeReview = async (id: string) => {
    if (!confirm("Delete this review?")) return;
    await supabase.from("book_reviews").delete().eq("id", id);
    toast({ title: "Deleted review" });
    loadReviews();
  };

  const deleteReportedPost = async (postId: string, reportId: string) => {
    if (!confirm("Delete this reported post from the community feed?")) return;
    try {
      await supabase.from("posts").delete().eq("id", postId);
      await (supabase as any).from("community_reports").delete().eq("id", reportId);
      toast({ title: "Post deleted", description: "The reported post has been removed from the community feed." });
      loadReports();
    } catch (e: any) {
      toast({ title: "Error deleting post", description: e.message, variant: "destructive" });
    }
  };

  const clearAllUserMessages = async (authorId: string, authorName: string) => {
    if (!confirm(`⚠️ DANGER: Are you sure you want to permanently DELETE ALL posts and ALL replies/comments authored by ${authorName}? This cannot be undone.`)) {
      return;
    }
    try {
      // 1. Delete all posts by this user
      const { error: postErr } = await supabase.from("posts").delete().eq("user_id", authorId);
      if (postErr) throw postErr;

      // 2. Delete all comments by this user
      const { error: commentErr } = await supabase.from("post_comments").delete().eq("user_id", authorId);
      if (commentErr) throw commentErr;

      toast({
        title: "User History Cleared 🧹",
        description: `All posts and replies by ${authorName} have been permanently cleared from the community.`,
      });
      loadReports();
    } catch (e: any) {
      toast({ title: "Error clearing user history", description: e.message, variant: "destructive" });
    }
  };

  const blockUserFromCommunity = async (authorId: string, authorName: string, durationHours: number) => {
    try {
      const blockedUntil = new Date(Date.now() + durationHours * 3600 * 1000).toISOString();
      const { error } = await supabase.from("profiles").update({
        community_blocked_until: blockedUntil
      }).eq("id", authorId);

      if (error) throw error;

      toast({
        title: "User Blocked 🚫",
        description: `${authorName} has been blocked from posting/commenting for ${durationHours >= 720 ? '30 days' : durationHours >= 168 ? '7 days' : durationHours + ' hours'}.`,
      });
      loadReports();
    } catch (e: any) {
      toast({ title: "Error blocking user", description: e.message, variant: "destructive" });
    }
  };

  const dismissReport = async (reportId: string) => {
    try {
      await (supabase as any).from("community_reports").delete().eq("id", reportId);
      toast({ title: "Report dismissed", description: "The post was kept in the community feed." });
      loadReports();
    } catch (e: any) {
      toast({ title: "Error dismissing report", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <ShieldAlert className="h-6 w-6 text-indigo-600" /> Content & Moderation Hub
        </h2>
        <p className="text-sm text-muted-foreground">Moderate student reviews and reported community posts.</p>
      </div>

      <Tabs defaultValue="reports" className="space-y-4">
        <TabsList>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <Flag className="h-4 w-4 text-amber-500" /> Reported Posts ({reports.length})
          </TabsTrigger>
          <TabsTrigger value="reviews" className="flex items-center gap-2">
            <Star className="h-4 w-4 text-yellow-500" /> Book Reviews ({rows.length})
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: Reported Posts */}
        <TabsContent value="reports" className="space-y-3">
          {loadingReports ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Loading reported posts...</p>
          ) : reports.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center text-muted-foreground space-y-2">
                <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
                <p className="font-semibold text-foreground">No pending reported posts</p>
                <p className="text-xs">All community posts are clean and follow library guidelines.</p>
              </CardContent>
            </Card>
          ) : (
            reports.map((rep) => {
              const authorName = rep.author
                ? `${rep.author.first_name || ""} ${rep.author.last_name || ""}`.trim() || rep.author.username || "Student"
                : "Unknown Author";

              const isAuthorBlocked = rep.author?.community_blocked_until && new Date(rep.author.community_blocked_until).getTime() > Date.now();

              return (
                <Card key={rep.id} className="border-amber-200/80 bg-amber-50/20 shadow-xs">
                  <CardContent className="p-4 sm:p-5 space-y-4">
                    {/* Header: Flag reason & Reporter */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200/60 pb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="bg-amber-100 text-amber-900 border-amber-300 capitalize font-black text-xs">
                          🚩 {rep.reason || "Flagged"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Reported by <strong className="text-foreground">{rep.reporter ? `${rep.reporter.first_name || ""} ${rep.reporter.last_name || ""} (@${rep.reporter.username || "user"})` : "Anonymous User"}</strong>
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 self-end sm:self-auto">
                        <Button size="sm" variant="outline" onClick={() => dismissReport(rep.id)} className="h-8 text-xs">
                          Keep Post (Dismiss)
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => deleteReportedPost(rep.post_id, rep.id)} className="h-8 text-xs">
                          <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete Post
                        </Button>
                      </div>
                    </div>

                    {rep.details && (
                      <p className="text-xs text-slate-700 bg-white/90 border border-slate-200 rounded-lg p-2.5 italic">
                        &ldquo;Reporter Note: {rep.details}&rdquo;
                      </p>
                    )}

                    {/* Post Content Preview */}
                    {rep.post ? (
                      <div className="rounded-xl border border-border bg-card p-3.5 space-y-1.5 shadow-2xs">
                        <p className="font-bold text-sm text-foreground">{rep.post.title}</p>
                        {rep.post.content && (
                          <p className="text-xs text-foreground/85 whitespace-pre-wrap">{rep.post.content}</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic bg-muted/60 p-2.5 rounded-lg">
                        Original post has already been removed.
                      </p>
                    )}

                    {/* Reported Author Profile & Administrative Actions */}
                    {rep.author && (
                      <div className="pt-2 border-t border-amber-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/60 p-3 rounded-xl border border-amber-100">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Post Author:</span>
                            <span className="text-xs font-black text-foreground">{authorName}</span>
                            {rep.author.student_class && (
                              <Badge variant="outline" className="text-[10px] py-0">Class {rep.author.student_class}</Badge>
                            )}
                            {rep.author.admission_number && (
                              <span className="text-[10px] text-muted-foreground font-mono">Adm: {rep.author.admission_number}</span>
                            )}
                            {isAuthorBlocked && (
                              <Badge className="bg-destructive text-[10px] font-bold">🚫 Currently Blocked</Badge>
                            )}
                          </div>
                        </div>

                        {/* Admin History Actions */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-8 text-xs font-bold bg-rose-600 hover:bg-rose-700"
                            onClick={() => clearAllUserMessages(rep.author.id, authorName)}
                            title="Purge all posts and replies by this author"
                          >
                            <Eraser className="h-3.5 w-3.5 mr-1" /> Clear All User Posts &amp; Replies
                          </Button>

                          {!isAuthorBlocked ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs border-amber-400 text-amber-800 hover:bg-amber-100 font-semibold"
                              onClick={() => blockUserFromCommunity(rep.author.id, authorName, 24)}
                            >
                              <UserX className="h-3.5 w-3.5 mr-1 text-amber-600" /> Suspend 24h
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs font-semibold"
                              onClick={() => blockUserFromCommunity(rep.author.id, authorName, 0)}
                            >
                              Unblock
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* TAB 2: Book Reviews */}
        <TabsContent value="reviews" className="space-y-3">
          <div className="flex justify-end mb-2">
            <Button variant="outline" size="sm" onClick={() => setShowHidden((v) => !v)}>
              {showHidden ? "Only visible" : "Include hidden"}
            </Button>
          </div>
          {rows.length === 0 && <p className="text-sm text-muted-foreground">No book reviews found.</p>}
          <div className="space-y-3">
            {rows.map((r) => (
              <Card key={r.id} className={r.is_hidden ? "opacity-60" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium">{r.books?.title || "Book"}</p>
                        <div className="flex">
                          {Array.from({ length: r.rating }).map((_, i) => (
                            <Star key={i} className="h-3 w-3 fill-warning text-warning" />
                          ))}
                        </div>
                        {r.is_hidden && <Badge variant="secondary">Hidden</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">by {r.profiles?.first_name} {r.profiles?.last_name}</p>
                      {r.review_text && <p className="text-sm mt-2">{r.review_text}</p>}
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => toggleHide(r)}>
                        {r.is_hidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => removeReview(r.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

