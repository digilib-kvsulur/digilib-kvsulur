import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, BookOpen, Star, Compass, GraduationCap } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Recommendations({ userId, studentClass }: { userId: string; studentClass?: string }) {
  const navigate = useNavigate();
  const [personalizedBooks, setPersonalizedBooks] = useState<any[]>([]);
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

      // 2. Fetch history categories & subjects
      const [
        { data: issues },
        { data: history },
        { data: wishlist },
        { data: quizResults }
      ] = await Promise.all([
        supabase.from("book_issues").select("book_id, books(category, subject)").eq("user_id", userId),
        supabase.from("reading_history").select("book_title, rating"),
        supabase.from("book_wishlist").select("book_id, books(category, subject)").eq("user_id", userId),
        supabase.from("quiz_results").select("*, quizzes(subject)").eq("user_id", userId)
      ]);

      // Extract current active book IDs so we don't recommend them
      const issuedBookIds = new Set<string>();
      issues?.forEach((i: any) => { if (i.book_id) issuedBookIds.add(i.book_id); });
      wishlist?.forEach((w: any) => { if (w.book_id) issuedBookIds.add(w.book_id); });

      // Gather categories & subjects of interest
      const interestedCategories = new Set<string>();
      const interestedSubjects = new Set<string>();

      issues?.forEach((i: any) => {
        if (i.books?.category) interestedCategories.add(i.books.category);
        if (i.books?.subject) interestedSubjects.add(i.books.subject);
      });

      wishlist?.forEach((w: any) => {
        if (w.books?.category) interestedCategories.add(w.books.category);
        if (w.books?.subject) interestedSubjects.add(w.books.subject);
      });

      quizResults?.forEach((q: any) => {
        if (q.quizzes?.subject) interestedSubjects.add(q.quizzes.subject);
      });

      // 3. Fetch books matching these categories & subjects OR student class level
      let query = supabase.from("books").select("*").gt("available_copies", 0).limit(20);

      const { data: matchedBooks } = await query;

      if (matchedBooks) {
        // Score each book based on parameters
        const scored = matchedBooks.map(b => {
          let score = 0;

          // Exclude already checked out or wishlisted
          if (issuedBookIds.has(b.id)) return null;

          // Points for class level match
          if (studentClass && b.class_level === studentClass) score += 5;

          // Points for matching user categories
          if (b.category && interestedCategories.has(b.category)) score += 3;

          // Points for matching quiz subjects
          if (b.subject && interestedSubjects.has(b.subject)) score += 4;

          return { book: b, score };
        })
        .filter(Boolean) as { book: any; score: number }[];

        // Sort by score desc
        scored.sort((a, b) => b.score - a.score);
        
        let finalRecs = scored.map(s => s.book).slice(0, 6);

        // Fallback if not enough recommendations
        if (finalRecs.length < 3) {
          const { data: fallbackBooks } = await supabase
            .from("books")
            .select("*")
            .gt("available_copies", 0)
            .order("first_added_at", { ascending: false })
            .limit(6);
          
          const existingIds = new Set(finalRecs.map(r => r.id));
          const addOn = (fallbackBooks || []).filter(b => !existingIds.has(b.id) && !issuedBookIds.has(b.id));
          finalRecs = [...finalRecs, ...addOn].slice(0, 6);
        }

        setPersonalizedBooks(finalRecs);
      }
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
              {personalizedBooks.map(b => (
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
