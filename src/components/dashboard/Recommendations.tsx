import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, BookOpen, Star, Compass, GraduationCap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { readShortLivedCache, writeShortLivedCache } from "@/lib/shortLivedUserCache";

type Scored = { book: any; score: number; reasons: string[] };
type RecommendationSnapshot = { personalizedBooks: Scored[]; trending: any[]; teacherPicks: any[] };
const RECOMMENDATIONS_TTL_MS = 5 * 60 * 1000;

export default function Recommendations({ userId, studentClass }: { userId: string; studentClass?: string }) {
  const navigate = useNavigate();
  const [personalizedBooks, setPersonalizedBooks] = useState<Scored[]>([]);
  const [trending, setTrending] = useState<any[]>([]);
  const [teacherPicks, setTeacherPicks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRecommendations = async () => {
    const cacheKey = `recommendations:${userId}:${studentClass || "none"}`;
    const cached = readShortLivedCache<RecommendationSnapshot>(cacheKey, RECOMMENDATIONS_TTL_MS);
    if (cached) {
      setPersonalizedBooks(cached.personalizedBooks);
      setTrending(cached.trending);
      setTeacherPicks(cached.teacherPicks);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      let nextTeacherPicks: any[] = [];

      // 1. Load Teacher recommendations for the class
      if (studentClass) {
        const { data: tpData } = await supabase
          .from("class_book_recommendations")
          .select("notes, books(id, title, author, category)")
          .eq("class_level", studentClass);

        if (tpData) {
          nextTeacherPicks = tpData.map(t => ({
            ...t.books,
            notes: t.notes,
            recommended_by_teacher: true
          })).filter(Boolean);
        }
      }
      setTeacherPicks(nextTeacherPicks);

      // 2. Fetch signals: history, wishlist, quizzes, ratings
      const [
        { data: issues },
        { data: wishlist },
        { data: quizResults },
      ] = await Promise.all([
        supabase.from("book_issues").select("book_id, books(category, subject, author)").eq("user_id", userId),
        supabase.from("book_wishlist").select("book_id, books(category, subject, author)").eq("user_id", userId),
        supabase.from("quiz_results").select("quiz_id, quizzes(subject)").eq("user_id", userId),
      ]);

      // Books to exclude (already borrowed / wishlisted / reviewed)
      const seenBookIds = new Set<string>();
      issues?.forEach((i: any) => i.book_id && seenBookIds.add(i.book_id));
      wishlist?.forEach((w: any) => w.book_id && seenBookIds.add(w.book_id));

      // Weighted interest maps
      const catWeights: Record<string, number> = {};
      const subjWeights: Record<string, number> = {};
      const authorWeights: Record<string, number> = {};
      const bump = (map: Record<string, number>, key?: string | null, by = 1) => {
        if (key) map[key] = (map[key] || 0) + by;
      };

      issues?.forEach((i: any) => {
        bump(catWeights, i.books?.category, 2);
        bump(subjWeights, i.books?.subject, 2);
        bump(authorWeights, i.books?.author, 2);
      });
      wishlist?.forEach((w: any) => {
        bump(catWeights, w.books?.category, 1);
        bump(subjWeights, w.books?.subject, 1);
        bump(authorWeights, w.books?.author, 1);
      });
      quizResults?.forEach((q: any) => bump(subjWeights, q.quizzes?.subject, 2));

      // 3. Candidate pool — popular + newest available books
      const [{ data: popular }, { data: fresh }] = await Promise.all([
        supabase.from("books")
          .select("id, title, author, category, subject, class_level, issue_count")
          .gt("available_copies", 0)
          .order("issue_count", { ascending: false })
          .limit(40),
        supabase.from("books")
          .select("id, title, author, category, subject, class_level, issue_count")
          .gt("available_copies", 0)
          .order("first_added_at", { ascending: false })
          .limit(30),
      ]);

      const poolMap = new Map<string, any>();
      [...(popular || []), ...(fresh || [])].forEach((b: any) => poolMap.set(b.id, b));
      const pool = Array.from(poolMap.values());

      const maxIssues = Math.max(1, ...pool.map((b: any) => b.issue_count || 0));

      const scored: Scored[] = pool
        .filter((b: any) => !seenBookIds.has(b.id))
        .map((b: any) => {
          let score = 0;
          const reasons: string[] = [];

          if (studentClass && b.class_level === studentClass) { score += 6; reasons.push("Class pick"); }
          if (b.subject && subjWeights[b.subject]) { score += 3 * subjWeights[b.subject]; reasons.push(b.subject); }
          if (b.category && catWeights[b.category]) { score += 2 * catWeights[b.category]; reasons.push(b.category); }
          if (b.author && authorWeights[b.author]) { score += 4; reasons.push("Author you read"); }

          score += 3 * ((b.issue_count || 0) / maxIssues);
          if ((b.issue_count || 0) >= maxIssues * 0.6 && maxIssues > 1) reasons.push("Popular");

          return { book: b, score, reasons: reasons.slice(0, 3) };
        })
        .sort((a, b) => b.score - a.score);

      const nextPersonalizedBooks = scored.slice(0, 6);
      const nextTrending =
        [...(popular || [])]
          .filter((b: any) => (b.issue_count || 0) > 0)
          .slice(0, 6);
      setPersonalizedBooks(nextPersonalizedBooks);
      setTrending(nextTrending);
      writeShortLivedCache<RecommendationSnapshot>(cacheKey, {
        personalizedBooks: nextPersonalizedBooks,
        trending: nextTrending,
        teacherPicks: nextTeacherPicks,
      });
    } catch (e) {
      console.error("Error generating recommendations:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecommendations();
  }, [userId, studentClass]);


  if (loading) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto" />
          <p className="mt-2 text-xs text-muted-foreground">Tailoring recommendations...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Teacher Recommendations */}
      {teacherPicks.length > 0 && (
        <Card className="border-accent/30 bg-accent/5 dark:bg-accent/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-primary">
              <GraduationCap className="h-5 w-5" />
              Teacher's Picks (Class {studentClass})
            </CardTitle>
            <CardDescription className="text-xs">Books recommended specifically for your class by your teacher</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {teacherPicks.map(b => (
                <div key={b.id} className="p-3.5 rounded-xl border bg-card flex flex-col justify-between hover:shadow-sm transition-all">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 mb-1">
                      <BookOpen className="h-4 w-4 text-primary shrink-0" />
                      <p className="font-semibold text-sm text-foreground truncate">{b.title}</p>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">by {b.author}</p>
                    {b.notes && (
                      <p className="text-xs italic bg-muted/40 p-2 rounded-lg text-muted-foreground border-l-2 border-primary/50 mt-2">
                        "{b.notes}"
                      </p>
                    )}
                  </div>
                  <div className="mt-3.5 flex items-center justify-between">
                    {b.category && <Badge variant="outline" className="text-[9px] px-1.5 py-0">{b.category}</Badge>}
                    <Button variant="ghost" size="sm" className="h-7 text-xs font-semibold" onClick={() => navigate("/catalog")}>
                      View
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Personalized recommendations */}
      {personalizedBooks.length > 0 && (
        <Card className="border border-border/70 rounded-3xl overflow-hidden bg-card/70 backdrop-blur-md shadow-sm">
          <CardHeader className="p-4 sm:p-5 pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm sm:text-base font-black flex items-center gap-2 text-foreground tracking-tight">
                <div className="w-6 h-6 rounded-lg bg-amber-500/15 flex items-center justify-center text-amber-500 shadow-2xs">
                  <Sparkles className="h-3.5 w-3.5 fill-amber-500" />
                </div>
                <span>Personalized "Next Read" Suggestions</span>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                AI & collaborative recommendation engine based on your reading velocity, class trends & favorites
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/catalog")}
              className="text-xs font-bold text-primary hover:text-primary/80 h-8"
            >
              Browse All →
            </Button>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {personalizedBooks.map(({ book: b, reasons }) => (
                <div
                  key={b.id}
                  onClick={() => navigate(`/book/${b.id}`)}
                  className="p-3.5 sm:p-4 rounded-2xl border border-border/60 bg-card hover:bg-muted/40 hover:border-primary/40 flex flex-col justify-between hover:shadow-md transition-all cursor-pointer group active:scale-[0.98]"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <BookOpen className="h-4 w-4" />
                      </div>
                      <p className="font-bold text-xs sm:text-sm text-foreground group-hover:text-primary transition-colors truncate">
                        {b.title}
                      </p>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate pl-0.5">by {b.author || "Unknown"}</p>

                    {/* Smart Reason Badge */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      {reasons.slice(0, 2).map((r, rIdx) => (
                        <span
                          key={rIdx}
                          className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20"
                        >
                          ✦ {r}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-3.5 pt-2.5 flex items-center justify-between border-t border-border/40">
                    <span className="text-[10px] font-medium text-muted-foreground uppercase">
                      {b.category || "General"}
                    </span>
                    <span className="text-xs font-bold text-primary flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                      View Details →
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
