import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Compass, Search, BookOpen, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import BookShelfLocator from "@/components/student/BookShelfLocator";

export default function LibraryMapExplorer() {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedBook, setSelectedBook] = useState<any>(null);
  const [areas, setAreas] = useState<any[]>([]);

  useEffect(() => {
    const loadZones = async () => {
      const { data } = await supabase.from("system_settings").select("value").eq("key", "library_map_zones").maybeSingle();
      if (data?.value) {
        try {
          const parsed = typeof data.value === "string" ? JSON.parse(data.value) : data.value;
          if (Array.isArray(parsed)) {
            setAreas(parsed);
            return;
          }
        } catch (e) { console.error(e); }
      }
      setAreas([
        { label: "Fiction & Novels", color: "bg-blue-100 text-blue-800" },
        { label: "Science & Math", color: "bg-emerald-100 text-emerald-800" },
        { label: "History & Geography", color: "bg-amber-100 text-amber-800" },
        { label: "NCERT & Textbooks", color: "bg-indigo-100 text-indigo-800" },
        { label: "Reference & Encyclopedias", color: "bg-purple-100 text-purple-800" },
      ]);
    };
    loadZones();
  }, []);

  const searchBooks = async () => {
    if (!search.trim()) return;
    setLoading(true);
    const { data } = await supabase
      .from("books")
      .select("id, title, author, category, shelf_number, cupboard_number")
      .or(`title.ilike.%${search.trim()}%,author.ilike.%${search.trim()}%`)
      .limit(8);
    setResults(data || []);
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          <Compass className="h-6 w-6 text-primary" /> Library Map
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Find where books are shelved in the library. Search a title to see its location on the map.
        </p>
      </div>

      <Card className="border-border/50 overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-indigo-500 to-purple-500" />
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Locate a Book</CardTitle>
          <CardDescription>Search by title or author, then tap &quot;Show on Map&quot;</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchBooks()}
                placeholder="Search book title or author..."
                className="pl-9"
              />
            </div>
            <Button onClick={searchBooks} disabled={loading} className="shrink-0">
              Search
            </Button>
          </div>

          {results.length > 0 && (
            <div className="space-y-2">
              {results.map((book) => (
                <div
                  key={book.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl border bg-muted/20"
                >
                  <div className="min-w-0 flex items-start gap-3">
                    <div className="w-9 h-11 rounded bg-white border flex items-center justify-center shrink-0">
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{book.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{book.author}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {book.shelf_number && (
                          <Badge variant="outline" className="text-[10px]">Shelf {book.shelf_number}</Badge>
                        )}
                        {book.cupboard_number && (
                          <Badge variant="outline" className="text-[10px]">Cupboard {book.cupboard_number}</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button size="sm" variant="secondary" className="shrink-0" onClick={() => setSelectedBook(book)}>
                    <MapPin className="h-4 w-4 mr-1" /> Show on Map
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base">Library Zones</CardTitle>
          <CardDescription>Overview of sections in the KV Sulur library</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {areas.map((area) => (
              <div key={area.label} className={`rounded-xl px-4 py-3 text-sm font-semibold ${area.color}`}>
                {area.label}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedBook && (
        <BookShelfLocator
          bookTitle={selectedBook.title}
          shelfNumber={selectedBook.shelf_number}
          cupboardNumber={selectedBook.cupboard_number}
          category={selectedBook.category}
          isOpen={!!selectedBook}
          onClose={() => setSelectedBook(null)}
        />
      )}
    </div>
  );
}
