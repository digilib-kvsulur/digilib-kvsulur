import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, BookOpen, Star, Compass, GraduationCap } from "lucide-react";
import { useNavigate } from "react-router-dom";

type Scored = { book: any; score: number; reasons: string[] };

export default function Recommendations({ userId, studentClass }: { userId: string; studentClass?: string }) {
  const navigate = useNavigate();
  const [personalizedBooks, setPersonalizedBooks] = useState<Scored[]>([]);
  const [trending, setTrending] = useState<any[]>([]);
  const [teacherPicks, setTeacherPicks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRecommendations = async () => {
    try {
      setLoading(true);

      // 1. Load Teacher recommendations for the class
      if (studentClass) {
        const { data: tpData } = await supabase
          .from("class_book_recommendations")
          .select("*, books(*)")
          .eq("class_level", studentClass);

        if (tpData) {
          setTeacherPicks(tpData.map(t => ({
            ...t.books,
            notes: t.notes,
            recommended_by_teacher: true
          })).filter(Boolean));
        }
      }

      // 2. Fetch signals: history, wishlist, quizzes, ratings
      const [
        { data: issues },
        { data: wishlist },
        { data: quizResults },
        { data: reviews },
      ] = await Promise.all([
        supabase.from("book_issues").select("book_id, books(category, subject, author)").eq("user_id", userId),
        supabase.from("book_wishlist").select("book_id, books(category, subject, author)").eq("user_id", userId),
        supabase.from("quiz_results").select("quiz_id, quizzes(subject)").eq("user_id", userId),
        supabase.from("book_reviews").select("book_id, rating").eq("user_id", userId),
      ]);

      // Books to exclude (already borrowed / wishlisted / reviewed)
      const seenBookIds = new Set<string>();
      issues?.forEach((i: any) => i.book_id && seenBookIds.add(i.book_id));
      wishlist?.forEach((w: any) => w.book_id && seenBookIds.add(w.book_id));
      reviews?.forEach((r: any) => r.book_id && seenBookIds.add(r.book_id));

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
        supabase.from("books").select("*").gt("available_copies", 0).order("issue_count", { ascending: false }).limit(40),
        supabase.from("books").select("*").gt("available_copies", 0).order("first_added_at", { ascending: false }).limit(30),
      ]);

      const poolMap = new Map<string, any>();
      [...(popular || []), ...(fresh || [])].forEach((b: any) => poolMap.set(b.id, b));
      const pool = Array.from(poolMap.values());

      // Average community rating per candidate book
      const ratingMap: Record<string, { sum: number; n: number }> = {};
      if (pool.length) {
        const { data: allReviews } = await supabase
          .from("book_reviews")
          .select("book_id, rating")
          .in("book_id", pool.map((b) => b.id))
          .eq("is_hidden", false);
        (allReviews || []).forEach((r: any) => {
          const e = (ratingMap[r.book_id] ||= { sum: 0, n: 0 });
          e.sum += r.rating; e.n += 1;
        });
      }

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

          const rt = ratingMap[b.id];
          if (rt && rt.n > 0) {
            const avg = rt.sum / rt.n;
            score += avg;
            if (avg >= 4) reasons.push(`${avg.toFixed(1)}★ rated`);
          }

          score += 3 * ((b.issue_count || 0) / maxIssues);
          if ((b.issue_count || 0) >= maxIssues * 0.6 && maxIssues > 1) reasons.push("Popular");

          return { book: b, score, reasons: reasons.slice(0, 3) };
        })
        .sort((a, b) => b.score - a.score);

      setPersonalizedBooks(scored.slice(0, 6));
      setTrending(
        [...(popular || [])]
          .filter((b: any) => (b.issue_count || 0) > 0)
          .slice(0, 6)
      );
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
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-yellow-500 fill-yellow-500 animate-pulse" />
              Recommended for You
            </CardTitle>
            <CardDescription className="text-xs">Based on your class level, reading habits, and quizzes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {personalizedBooks.map(({ book: b, reasons }) => (
                <div key={b.id} className="p-3.5 rounded-xl border bg-card flex flex-col justify-between hover:shadow-sm transition-all border-border/50">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 mb-1">
                      <BookOpen className="h-4 w-4 text-primary shrink-0" />
                      <p className="font-semibold text-sm text-foreground truncate">{b.title}</p>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">by {b.author}</p>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex gap-1 flex-wrap">
                      {b.category && <Badge variant="outline" className="text-[9px] px-1.5 py-0">{b.category}</Badge>}
                      {b.class_level === studentClass && <Badge className="bg-primary/10 text-primary hover:bg-primary/20 text-[9px] px-1.5 py-0 border-0">Class Pick</Badge>}
                    </div>
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
    </div>
  );
}
