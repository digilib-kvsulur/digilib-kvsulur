import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Star, Eye, EyeOff, Trash2, Flag, ShieldAlert, CheckCircle2 } from "lucide-react";

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

      const reporterIds = Array.from(new Set((data || []).map((r: any) => r.reporter_id).filter(Boolean))) as string[];
      let reporterMap: Record<string, any> = {};
      if (reporterIds.length) {
        const { data: profs } = await supabase.from("profiles").select("id, first_name, last_name, username").in("id", reporterIds);
        (profs || []).forEach((p: any) => { reporterMap[p.id] = p; });
      }

      setReports((data || []).map((r: any) => ({
        ...r,
        post: postMap[r.post_id],
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
            reports.map((rep) => (
              <Card key={rep.id} className="border-amber-200/80 bg-amber-50/20">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 capitalize font-bold text-xs">
                          🚩 {rep.reason || "Flagged"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Reported by {rep.reporter ? `${rep.reporter.first_name || ""} ${rep.reporter.last_name || ""} (@${rep.reporter.username || "user"})` : "Anonymous User"}
                        </span>
                      </div>
                      {rep.details && (
                        <p className="text-xs text-slate-600 bg-white/80 border border-slate-200 rounded-md p-2 italic">
                          "Details: {rep.details}"
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button size="sm" variant="outline" onClick={() => dismissReport(rep.id)} className="text-xs">
                        Keep Post (Dismiss)
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => deleteReportedPost(rep.post_id, rep.id)} className="text-xs">
                        <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete Post
                      </Button>
                    </div>
                  </div>

                  {/* Post Content Preview */}
                  {rep.post ? (
                    <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-1">
                      <p className="font-bold text-sm text-slate-900">{rep.post.title}</p>
                      {rep.post.content && (
                        <p className="text-xs text-slate-700 whitespace-pre-wrap">{rep.post.content}</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic bg-slate-100 p-2 rounded-md">
                      Original post has already been removed.
                    </p>
                  )}
                </CardContent>
              </Card>
            ))
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

