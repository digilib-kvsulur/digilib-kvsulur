import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { BookOpen, Plus, Star, Edit, Trash2, Library, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ReadingHistoryEntry {
  id: string;
  book_title: string;
  book_author: string;
  book_id?: string | null;
  completed_date: string;
  rating?: number;
  points_earned: number;
  notes?: string;
  status?: string;
}

interface CatalogBook {
  id: string;
  title: string;
  author: string | null;
}

interface ReadingHistoryManagerProps {
  onPointsUpdate?: () => void;
}

const ReadingHistoryManager = ({ onPointsUpdate }: ReadingHistoryManagerProps) => {
  const [entries, setEntries] = useState<ReadingHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ReadingHistoryEntry | null>(null);
  const [configuredPoints, setConfiguredPoints] = useState(25);
  const [fromCatalog, setFromCatalog] = useState(false);
  const [catalogQuery, setCatalogQuery] = useState("");
  const [catalogResults, setCatalogResults] = useState<CatalogBook[]>([]);
  const [searchingCatalog, setSearchingCatalog] = useState(false);
  const [formData, setFormData] = useState({
    book_title: "",
    book_author: "",
    book_id: "" as string | null,
    completed_date: "",
    rating: 5,
    notes: "",
  });
  const searchTimer = useRef<number | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadReadingHistory();
    fetchPointsConfig();
  }, []);

  const fetchPointsConfig = async () => {
    try {
      const { data } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "points_per_book_read")
        .maybeSingle();
      if (data && data.value) {
        setConfiguredPoints(Number(data.value));
      }
    } catch (e) {
      console.warn("Could not load points configuration settings:", e);
    }
  };

  const loadReadingHistory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("reading_history")
        .select("*")
        .eq("user_id", user.id)
        .order("completed_date", { ascending: false });

      if (error) throw error;
      setEntries(data || []);
    } catch (error) {
      console.error("Error loading reading history:", error);
      toast({
        title: "Error",
        description: "Failed to load reading history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const searchCatalog = (q: string) => {
    setCatalogQuery(q);
    if (searchTimer.current) window.clearTimeout(searchTimer.current);
    if (!q.trim()) {
      setCatalogResults([]);
      return;
    }
    searchTimer.current = window.setTimeout(async () => {
      setSearchingCatalog(true);
      const term = q.trim();
      const { data } = await supabase
        .from("books")
        .select("id, title, author")
        .or(`title.ilike.%${term}%,author.ilike.%${term}%`)
        .limit(12);
      setCatalogResults((data || []) as CatalogBook[]);
      setSearchingCatalog(false);
    }, 280);
  };

  const selectCatalogBook = (book: CatalogBook) => {
    setFormData((prev) => ({
      ...prev,
      book_id: book.id,
      book_title: book.title,
      book_author: book.author || "",
    }));
    setCatalogQuery(book.title);
    setCatalogResults([]);
  };

  const resetForm = () => {
    setFormData({
      book_title: "",
      book_author: "",
      book_id: null,
      completed_date: "",
      rating: 5,
      notes: "",
    });
    setFromCatalog(false);
    setCatalogQuery("");
    setCatalogResults([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const pointsEarned = configuredPoints;

      const entryData = {
        book_title: formData.book_title,
        book_author: formData.book_author,
        book_id: formData.book_id || null,
        rating: formData.rating,
        notes: formData.notes,
        user_id: user.id,
        points_earned: pointsEarned,
        completed_date: formData.completed_date || new Date().toISOString().split("T")[0],
      };

      if (editingEntry) {
        const { error } = await supabase
          .from("reading_history")
          .update(entryData)
          .eq("id", editingEntry.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Reading history updated successfully",
        });
      } else {
        const { error } = await supabase
          .from("reading_history")
          .insert({ ...entryData, status: "pending" });

        if (error) throw error;

        toast({
          title: "Entry submitted for approval",
          description: "Your reading entry will be reviewed by the admin. Points will be awarded after approval.",
        });
      }

      setShowAddDialog(false);
      setEditingEntry(null);
      resetForm();
      loadReadingHistory();
      onPointsUpdate?.();
    } catch (error: any) {
      console.error("Error saving reading history:", error);
      const msg = error?.message || "Failed to save reading history";
      toast({
        title: "Error",
        description: msg,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (entry: ReadingHistoryEntry) => {
    setEditingEntry(entry);
    setFormData({
      book_title: entry.book_title,
      book_author: entry.book_author,
      book_id: entry.book_id || null,
      completed_date: entry.completed_date,
      rating: entry.rating || 5,
      notes: entry.notes || "",
    });
    setFromCatalog(!!entry.book_id);
    setCatalogQuery(entry.book_id ? entry.book_title : "");
    setShowAddDialog(true);
  };

  const handleDelete = async (entryId: string) => {
    try {
      const { error } = await supabase
        .from("reading_history")
        .delete()
        .eq("id", entryId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Reading history entry deleted",
      });

      loadReadingHistory();
    } catch (error) {
      console.error("Error deleting entry:", error);
      toast({
        title: "Error",
        description: "Failed to delete entry",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Dialog open={showAddDialog} onOpenChange={(o) => { setShowAddDialog(o); if (!o) { setEditingEntry(null); resetForm(); } }}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingEntry(null); resetForm(); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Book
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md w-[92%] rounded-2xl p-5">
            <DialogHeader>
              <DialogTitle>{editingEntry ? "Edit" : "Add"} Reading Entry</DialogTitle>
              <DialogDescription>
                {editingEntry
                  ? "Update your reading entry"
                  : "Add a book you've completed. Pick from the library catalog or enter details manually."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setFromCatalog(true);
                    setFormData((p) => ({ ...p, book_id: p.book_id, book_title: "", book_author: "" }));
                  }}
                  className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-bold h-8 rounded-lg transition-colors ${
                    fromCatalog ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-white"
                  }`}
                >
                  <Library className="h-3.5 w-3.5" /> Library catalog
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFromCatalog(false);
                    setFormData((p) => ({ ...p, book_id: null }));
                    setCatalogQuery("");
                    setCatalogResults([]);
                  }}
                  className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-bold h-8 rounded-lg transition-colors ${
                    !fromCatalog ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-white"
                  }`}
                >
                  Manual entry
                </button>
              </div>

              {fromCatalog ? (
                <div className="space-y-2 relative">
                  <Label>Search catalog</Label>
                  <div className="relative">
                    <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      className="pl-9"
                      value={catalogQuery}
                      onChange={(e) => searchCatalog(e.target.value)}
                      placeholder="Search by title or author…"
                      required={!formData.book_id}
                    />
                  </div>
                  {searchingCatalog && <p className="text-[10px] text-slate-400">Searching…</p>}
                  {catalogResults.length > 0 && (
                    <div className="absolute z-20 left-0 right-0 max-h-40 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                      {catalogResults.map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          className="w-full text-left px-3 py-2 text-xs hover:bg-indigo-50 border-b border-slate-50 last:border-0"
                          onClick={() => selectCatalogBook(b)}
                        >
                          <p className="font-semibold text-slate-800 truncate">{b.title}</p>
                          <p className="text-slate-500 truncate">{b.author || "Unknown author"}</p>
                        </button>
                      ))}
                    </div>
                  )}
                  {formData.book_id && (
                    <p className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-2 py-1.5">
                      Selected: {formData.book_title}{formData.book_author ? ` — ${formData.book_author}` : ""}
                    </p>
                  )}
                </div>
              ) : (
                <>
                  <div>
                    <Label htmlFor="book_title">Book Title</Label>
                    <Input
                      id="book_title"
                      value={formData.book_title}
                      onChange={(e) => setFormData((prev) => ({ ...prev, book_title: e.target.value, book_id: null }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="book_author">Author</Label>
                    <Input
                      id="book_author"
                      value={formData.book_author}
                      onChange={(e) => setFormData((prev) => ({ ...prev, book_author: e.target.value }))}
                      required
                    />
                  </div>
                </>
              )}

              <div>
                <Label htmlFor="completed_date">Completion Date</Label>
                <Input
                  id="completed_date"
                  type="date"
                  value={formData.completed_date}
                  onChange={(e) => setFormData((prev) => ({ ...prev, completed_date: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="rating">Rating (1-5 stars)</Label>
                <Input
                  id="rating"
                  type="number"
                  min="1"
                  max="5"
                  value={formData.rating}
                  onChange={(e) => setFormData((prev) => ({ ...prev, rating: Number(e.target.value) }))}
                />
                <p className="text-xs text-indigo-600 font-bold mt-1.5">Points to be earned: +{configuredPoints} XP (Admin configured)</p>
              </div>
              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Your thoughts about the book..."
                  className="h-20"
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700" disabled={fromCatalog && !formData.book_id}>
                  {editingEntry ? "Update" : "Add"} Book
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {entries.map((entry) => (
          <Card key={entry.id} className="border-border/60 shadow-xs">
            <CardContent className="pt-5 pb-5">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-slate-800 text-sm sm:text-base">{entry.book_title}</h4>
                    {entry.book_id && (
                      <Badge variant="secondary" className="text-[9px] font-bold">Library book</Badge>
                    )}
                  </div>
                  <p className="text-xs font-medium text-slate-500 mt-0.5">by {entry.book_author}</p>
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 mt-2">
                    <span>Completed: {new Date(entry.completed_date).toLocaleDateString()}</span>
                    {entry.rating && (
                      <div className="flex items-center gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3 w-3 ${
                              i < entry.rating! ? "text-amber-500 fill-amber-500" : "text-slate-200"
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  {entry.notes && (
                    <p className="text-xs text-slate-600 mt-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100">{entry.notes}</p>
                  )}
                </div>
                <div className="flex items-center justify-end gap-2 shrink-0 self-end sm:self-start mt-2 sm:mt-0">
                  {entry.status === "approved" ? (
                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 font-bold text-[10px]">+{entry.points_earned} pts</Badge>
                  ) : entry.status === "rejected" ? (
                    <Badge variant="destructive" className="font-bold text-[10px]">Rejected</Badge>
                  ) : (
                    <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 font-bold text-[10px]">⏳ Pending</Badge>
                  )}
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7 rounded-lg text-slate-500 border-slate-200 hover:bg-slate-50"
                    onClick={() => handleEdit(entry)}
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7 rounded-lg border-slate-200 text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-100"
                    onClick={() => handleDelete(entry.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {entries.length === 0 && (
          <Card className="border-dashed border-slate-200">
            <CardContent className="text-center py-12">
              <BookOpen className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-base font-bold text-slate-800 mb-1">No reading history yet</h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto mb-4">Start adding books you've completed to earn points!</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ReadingHistoryManager;
