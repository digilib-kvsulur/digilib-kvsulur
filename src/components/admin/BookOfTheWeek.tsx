import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Star, BookOpen, Crown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

export default function BookOfTheWeek() {
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [currentPicks, setCurrentPicks] = useState<any[]>([]);
  const { toast } = useToast();

  const fetchPicks = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('books')
      .select('id, title, author, cover_url, is_book_of_the_week')
      .eq('is_book_of_the_week', true);
    setCurrentPicks(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchPicks(); }, []);

  const searchBooks = async () => {
    if (!search.trim()) return;
    setLoading(true);
    const { data } = await supabase
      .from('books')
      .select('id, title, author, cover_url, is_book_of_the_week')
      .ilike('title', `%${search.trim()}%`)
      .limit(10);
    setResults(data || []);
    setLoading(false);
  };

  const togglePin = async (bookId: string, currentStatus: boolean) => {
    setLoading(true);
    const { error } = await supabase
      .from('books')
      .update({ is_book_of_the_week: !currentStatus })
      .eq('id', bookId);
      
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: !currentStatus ? "Pinned!" : "Unpinned" });
      await fetchPicks();
      if (search) searchBooks();
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <Card className="border-border/50">
        <CardHeader>
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                <Crown className="h-5 w-5 text-amber-600" />
             </div>
             <div>
               <CardTitle className="text-xl">Book of the Week Manager</CardTitle>
               <CardDescription>Pin special books to be highlighted on the landing page</CardDescription>
             </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
           
           <div className="bg-amber-50 rounded-xl border border-amber-100 p-4">
             <h3 className="text-sm font-bold text-amber-800 mb-3 uppercase tracking-widest flex items-center gap-2">
               <Star className="h-4 w-4 fill-amber-500" /> Currently Pinned Books
             </h3>
             {currentPicks.length === 0 ? (
               <p className="text-sm text-amber-600/70 italic">No books are currently pinned.</p>
             ) : (
               <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                 {currentPicks.map(b => (
                   <div key={b.id} className="bg-white p-3 rounded-lg border border-amber-200 shadow-sm flex items-center justify-between gap-3">
                     <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-10 h-14 bg-slate-100 rounded overflow-hidden shrink-0">
                          {b.cover_url ? <img src={b.cover_url} className="w-full h-full object-cover" /> : <BookOpen className="h-4 w-4 text-slate-400 m-auto mt-4" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate text-slate-800">{b.title}</p>
                          <p className="text-[10px] text-slate-500 truncate">{b.author}</p>
                        </div>
                     </div>
                     <Button size="sm" variant="outline" className="shrink-0 h-8 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200" onClick={() => togglePin(b.id, true)} disabled={loading}>
                       Unpin
                     </Button>
                   </div>
                 ))}
               </div>
             )}
           </div>
           
           <div>
              <h3 className="text-sm font-bold text-slate-700 mb-3">Search & Pin New Book</h3>
              <div className="flex gap-2 mb-4">
                <Input 
                  value={search} 
                  onChange={e => setSearch(e.target.value)} 
                  onKeyDown={e => e.key === 'Enter' && searchBooks()}
                  placeholder="Search by title..." 
                  className="max-w-sm" 
                />
                <Button onClick={searchBooks} disabled={loading}><Search className="h-4 w-4 mr-2" /> Search</Button>
              </div>
              
              <div className="space-y-2">
                {results.map(b => (
                  <div key={b.id} className="flex items-center justify-between p-3 rounded-xl border hover:bg-slate-50">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-14 bg-slate-100 rounded overflow-hidden shrink-0 flex items-center justify-center">
                        {b.cover_url ? <img src={b.cover_url} className="w-full h-full object-cover" /> : <BookOpen className="h-4 w-4 text-slate-400" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate text-slate-800">{b.title}</p>
                        <p className="text-[10px] text-slate-500 truncate">{b.author}</p>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      variant={b.is_book_of_the_week ? "outline" : "default"} 
                      className="shrink-0 ml-4"
                      onClick={() => togglePin(b.id, b.is_book_of_the_week)}
                      disabled={loading}
                    >
                      {b.is_book_of_the_week ? "Unpin" : "Pin Book"}
                    </Button>
                  </div>
                ))}
              </div>
           </div>
        </CardContent>
      </Card>
    </div>
  );
}
