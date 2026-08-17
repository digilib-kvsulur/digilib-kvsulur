import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Search, Check, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

export default function CurrentlyReading({ user, onUpdate }: { user: any, onUpdate?: () => void }) {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const { toast } = useToast();

  const currentBook = user?.currently_reading;

  const searchBooks = async () => {
    if (!search.trim()) return;
    setLoading(true);
    const { data } = await supabase
      .from('books')
      .select('id, title, author, cover_url')
      .ilike('title', `%${search.trim()}%`)
      .limit(10);
    setResults(data || []);
    setLoading(false);
  };

  const setCurrentlyReading = async (book: any) => {
    setLoading(true);
    const payload = book ? { id: book.id, title: book.title, author: book.author, cover_url: book.cover_url } : null;
    const { error } = await supabase.from('profiles').update({ currently_reading: payload }).eq('id', user.id);
    setLoading(false);
    
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: book ? "Status updated" : "Status cleared" });
      setOpen(false);
      if (onUpdate) onUpdate();
    }
  };

  return (
    <>
      <Card className="border-border/50 overflow-hidden bg-white hover:border-indigo-200 transition-colors">
        <CardContent className="p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
             <div className="w-12 h-16 bg-slate-100 rounded shadow-sm border overflow-hidden flex items-center justify-center shrink-0">
               {currentBook?.cover_url ? (
                 <img src={currentBook.cover_url} alt="Cover" className="w-full h-full object-cover" />
               ) : (
                 <BookOpen className="h-5 w-5 text-slate-400" />
               )}
             </div>
             <div>
               <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1 mb-0.5">
                 <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                 Currently Reading
               </p>
               {currentBook ? (
                 <>
                   <p className="text-sm font-bold text-slate-900 line-clamp-1">{currentBook.title}</p>
                   <p className="text-xs text-slate-500 line-clamp-1">{currentBook.author}</p>
                 </>
               ) : (
                 <p className="text-xs font-medium text-slate-500 italic">Not reading anything right now.</p>
               )}
             </div>
          </div>
          <Button size="sm" variant={currentBook ? "outline" : "default"} onClick={() => setOpen(true)} className="shrink-0 rounded-xl">
             {currentBook ? "Update" : "Set Status"}
          </Button>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>What are you reading?</DialogTitle>
          </DialogHeader>
          <div className="flex gap-2 mb-4">
            <input 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              onKeyDown={e => e.key === 'Enter' && searchBooks()}
              placeholder="Search library catalog..." 
              className="flex-1 h-9 rounded-lg border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50" 
            />
            <Button size="sm" onClick={searchBooks} disabled={loading} className="rounded-lg">
              <Search className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="max-h-[300px] overflow-y-auto space-y-2">
            {results.map(b => (
              <div key={b.id} className="flex items-center justify-between p-2 rounded-lg border hover:bg-slate-50">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-10 bg-slate-100 rounded overflow-hidden shrink-0 flex items-center justify-center">
                    {b.cover_url ? <img src={b.cover_url} className="w-full h-full object-cover" /> : <BookOpen className="h-3 w-3 text-slate-400" />}
                  </div>
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="text-xs font-bold truncate">{b.title}</p>
                    <p className="text-[10px] text-slate-500 truncate">{b.author}</p>
                  </div>
                </div>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-full shrink-0 text-indigo-600 hover:bg-indigo-50" onClick={() => setCurrentlyReading(b)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {results.length === 0 && search && !loading && (
              <p className="text-center text-xs text-muted-foreground py-4">No books found matching "{search}"</p>
            )}
          </div>
          
          {currentBook && (
            <div className="mt-4 pt-4 border-t">
              <Button size="sm" variant="destructive" className="w-full rounded-xl" onClick={() => setCurrentlyReading(null)} disabled={loading}>
                Clear Currently Reading Status
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
