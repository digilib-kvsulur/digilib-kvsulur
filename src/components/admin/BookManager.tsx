import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Edit, Trash2, BookOpen, Search, CheckSquare, Wand2, Loader2, ShieldAlert, AlertTriangle, GitMerge } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import BulkImportBooks from "./BulkImportBooks";
import { fetchBookByQuery } from "@/lib/bookApi";

interface Book {
  id: string;
  title: string;
  author: string;
  accession_number?: string;
  accession_numbers?: string[];
  language?: string;
  subject?: string;
  class_level?: string;
  category?: string;
  description?: string;
  total_copies: number;
  available_copies: number;
  cover_url?: string;
}

interface BookFormData {
  title: string;
  author: string;
  accession_numbers: string[];
  language: string;
  category: string;
  subject: string;
  class_level: string;
  description: string;
  cover_url: string;
}

const emptyForm: BookFormData = {
  title: '', author: '', accession_numbers: [], language: '', category: '', subject: '', class_level: '', description: '', cover_url: '',
};

const BookManager = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [availabilityFilter, setAvailabilityFilter] = useState<string>("all");
  const [duplicatesOnly, setDuplicatesOnly] = useState(false);
  const [selectedBookIds, setSelectedBookIds] = useState<Set<string>>(new Set());
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [bulkEdit, setBulkEdit] = useState({ category: "", language: "", subject: "", class_level: "", cover_url: "" });
  const [bulkBusy, setBulkBusy] = useState(false);
  const [formData, setFormData] = useState<BookFormData>(emptyForm);
  const [fetchingDetails, setFetchingDetails] = useState(false);
  const [fetchingAll, setFetchingAll] = useState(false);
  const [fetchAllProgress, setFetchAllProgress] = useState("");
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [missingAccessionInputs, setMissingAccessionInputs] = useState<Record<string, string>>({});
  const [newAccessionInput, setNewAccessionInput] = useState("");
  const [selectedTitleKeys, setSelectedTitleKeys] = useState<Set<string>>(new Set());
  // Per-book manual accession inputs for multi-copy verifier (bookId -> string[])
  const [multiCopyManualAccessions, setMultiCopyManualAccessions] = useState<Record<string, string[]>>({});
  const { toast } = useToast();

  useEffect(() => { loadBooks(); }, []);

  const loadBooks = async () => {
    try {
      // Fetch ALL books using pagination (Supabase default limit is 1000)
      let allBooks: Book[] = [];
      const PAGE = 1000;
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from('books')
          .select('*')
          .order('created_at', { ascending: false })
          .range(from, from + PAGE - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        allBooks = [...allBooks, ...data];
        if (data.length < PAGE) break;
        from += PAGE;
      }
      setBooks(allBooks);
    } catch (error) {
      toast({ title: "Error", description: "Failed to load books", variant: "destructive" });
    } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const accessions = formData.accession_numbers.filter(a => a.trim());
      const totalCopies = Math.max(accessions.length, 1);
      const payload = {
        title: formData.title,
        author: formData.author,
        accession_number: accessions[0] || null, // keep first for backwards compat
        accession_numbers: accessions,
        language: formData.language.trim() || null,
        category: formData.category.trim() || null,
        subject: formData.subject.trim() || null,
        class_level: formData.class_level.trim() || null,
        description: formData.description.trim() || null,
        cover_url: formData.cover_url.trim() || null,
        total_copies: totalCopies,
      };
      if (editingBook) {
        const copiesDelta = totalCopies - editingBook.total_copies;
        const { error } = await supabase.from('books').update({
          ...payload,
          available_copies: Math.max(0, editingBook.available_copies + copiesDelta),
        }).eq('id', editingBook.id);
        if (error) throw error;
        toast({ title: "Success", description: "Book updated" });
      } else {
        const { error } = await supabase.from('books').insert({ ...payload, available_copies: totalCopies });
        if (error) throw error;
        toast({ title: "Success", description: "Book added" });
      }
      setShowAddDialog(false); setEditingBook(null); setFormData(emptyForm); setNewAccessionInput(""); loadBooks();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to save book", variant: "destructive" });
    }
  };

  const handleEdit = (book: Book) => {
    setEditingBook(book);
    // Populate accession_numbers from the array column or fall back to single value
    const accessions: string[] = (
      Array.isArray(book.accession_numbers) && book.accession_numbers.length > 0
        ? book.accession_numbers
        : book.accession_number ? [book.accession_number] : []
    );
    setFormData({
      title: book.title, author: book.author,
      accession_numbers: accessions,
      language: book.language || '',
      category: book.category || '', subject: book.subject || '', class_level: book.class_level || '',
      description: book.description || '', cover_url: (book as any).cover_url || '',
    });
    setNewAccessionInput("");
    setShowAddDialog(true);
  };

  const fetchBookDetails = async () => {
    if (!formData.title.trim()) {
      toast({ title: "Enter a title first", description: "Type the book title before fetching details.", variant: "destructive" });
      return;
    }
    setFetchingDetails(true);
    try {
      const details = await fetchBookByQuery(formData.title.trim(), formData.author.trim());
      if (!details) { 
        toast({ title: "Not found", description: "No matching book found. Fill details manually.", variant: "destructive" }); 
        return; 
      }

      setFormData(prev => ({
        ...prev,
        title: details.title || prev.title,
        author: details.author || prev.author,
        language: prev.language || details.language || "",
        category: prev.category || details.category || "",
        subject: prev.subject || details.subject || "",
        class_level: prev.class_level || details.class_level || "",
        description: prev.description || details.description || "",
        cover_url: prev.cover_url || details.cover_url || "",
      }));
      toast({ title: "Details fetched!", description: "Review and adjust the auto-filled fields as needed." });
    } catch (e: any) {
      toast({ title: "Fetch failed", description: e.message || "Could not fetch details.", variant: "destructive" });
    } finally {
      setFetchingDetails(false);
    }
  };

  const fetchBookCoverOnly = async () => {
    if (!formData.title.trim()) {
      toast({ title: "Enter a title first", description: "Type the book title before fetching cover.", variant: "destructive" });
      return;
    }
    setFetchingDetails(true);
    try {
      const details = await fetchBookByQuery(formData.title.trim(), formData.author.trim());
      if (!details || !details.cover_url) { 
        toast({ title: "Not found", description: "No cover image found for this book.", variant: "destructive" }); 
        return; 
      }
      setFormData(prev => ({ ...prev, cover_url: details.cover_url || "" }));
      toast({ title: "Cover fetched!", description: "Review the auto-filled cover URL." });
    } catch (e: any) {
      toast({ title: "Fetch failed", description: e.message || "Could not fetch cover.", variant: "destructive" });
    } finally {
      setFetchingDetails(false);
    }
  };

  const clearFetchedData = () => {
    setFormData(prev => ({ ...prev, cover_url: "", description: "" }));
    toast({ title: "Fetched data cleared", description: "Cover URL and description have been cleared." });
  };

  // Batch-fetch online metadata for ALL books that have missing description/cover/category
  const fetchAllMissingMetadata = async () => {
    const targets = books.filter(b =>
      !b.description || (b.description as string).trim().length < 20 || !b.cover_url || !b.category
    );
    if (targets.length === 0) {
      toast({ title: "All books already have metadata", description: "Nothing to update." });
      return;
    }
    setFetchingAll(true);
    let updated = 0;
    let failed = 0;
    for (let i = 0; i < targets.length; i++) {
      const book = targets[i];
      setFetchAllProgress(`Fetching ${i + 1}/${targets.length}: ${book.title.slice(0, 30)}...`);
      try {
        const details = await fetchBookByQuery(book.title, book.author);
        const patch: any = {};
        if (details) {
          if ((!book.description || (book.description as string).trim().length < 20) && details.description) patch.description = details.description;
          if (!book.cover_url && details.cover_url) patch.cover_url = details.cover_url;
          if (!book.category && details.category) patch.category = details.category;
          if (!(book as any).language && details.language) patch.language = details.language;
          if (!book.class_level && details.class_level) patch.class_level = details.class_level;
        }
        if (!patch.description) {
          const { generateSmartBookDescription } = await import("@/lib/bookApi");
          patch.description = generateSmartBookDescription(book.title, book.author, book.category || undefined);
        }
        if (Object.keys(patch).length > 0) {
          await supabase.from('books').update(patch).eq('id', book.id);
          updated++;
        }
        // Small delay to avoid hammering APIs
        await new Promise(r => setTimeout(r, 400));
      } catch {
        failed++;
      }
    }
    setFetchingAll(false);
    setFetchAllProgress("");
    toast({
      title: "Metadata fetch complete",
      description: `${updated} books updated${failed > 0 ? `, ${failed} failed` : ""}.`
    });
    loadBooks();
  };

  // Bulk fetch covers for selected books only
  const handleBulkFetchCovers = async () => {
    if (selectedBookIds.size === 0) {
      toast({ title: "No books selected", description: "Select at least one book first.", variant: "destructive" });
      return;
    }
    const targets = books.filter(b => selectedBookIds.has(b.id));
    setBulkBusy(true);
    let updated = 0; let failed = 0;
    for (let i = 0; i < targets.length; i++) {
      const book = targets[i];
      setFetchAllProgress(`Fetching cover ${i + 1}/${targets.length}: ${book.title.slice(0, 30)}...`);
      try {
        const details = await fetchBookByQuery(book.title, book.author);
        if (details?.cover_url) {
          await supabase.from('books').update({ cover_url: details.cover_url }).eq('id', book.id);
          updated++;
        }
        await new Promise(r => setTimeout(r, 300));
      } catch { failed++; }
    }
    setBulkBusy(false);
    setFetchAllProgress("");
    setSelectedBookIds(new Set());
    toast({ title: "Cover fetch complete", description: `${updated} covers updated${failed > 0 ? `, ${failed} failed` : ""}.` });
    loadBooks();
  };


  const handleDelete = async (bookId: string) => {
    if (!confirm('Delete this book?')) return;
    const { error } = await supabase.from('books').delete().eq('id', bookId);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Deleted" }); loadBooks();
  };

  const handleAddNew = () => { setEditingBook(null); setFormData(emptyForm); setShowAddDialog(true); };

  const toggleSelectBook = (id: string) => {
    const next = new Set(selectedBookIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedBookIds(next);
  };
  const toggleSelectAll = (filtered: Book[]) => {
    if (selectedBookIds.size === filtered.length && filtered.every(b => selectedBookIds.has(b.id))) setSelectedBookIds(new Set());
    else setSelectedBookIds(new Set(filtered.map(b => b.id)));
  };
  const handleBulkEdit = async () => {
    if (selectedBookIds.size === 0) return;
    const patch: any = {};
    (["category", "language", "subject", "class_level", "cover_url"] as const).forEach(k => {
      const v = bulkEdit[k].trim();
      if (v) patch[k] = v;
    });
    if (Object.keys(patch).length === 0) { toast({ title: "No changes", description: "Fill in at least one field.", variant: "destructive" }); return; }
    setBulkBusy(true);
    const ids = Array.from(selectedBookIds);
    const { error } = await supabase.from("books").update(patch).in("id", ids);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Updated", description: `${ids.length} book(s) updated` }); setSelectedBookIds(new Set()); setBulkEdit({ category: "", language: "", subject: "", class_level: "", cover_url: "" }); setShowBulkEdit(false); loadBooks(); }
    setBulkBusy(false);
  };
  const handleBulkDelete = async () => {
    if (selectedBookIds.size === 0) return;
    if (!confirm(`Delete ${selectedBookIds.size} book(s)? This cannot be undone.`)) return;
    setBulkBusy(true);
    const ids = Array.from(selectedBookIds);
    const { error } = await supabase.from("books").delete().in("id", ids);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Deleted", description: `${ids.length} book(s) removed` }); setSelectedBookIds(new Set()); loadBooks(); }
    setBulkBusy(false);
  };
  const handleRemoveDuplicateCopies = async () => {
    const duplicates = new Map<string, Book[]>();
    books.forEach(book => {
      const accession = book.accession_number?.trim().toLowerCase();
      if (!accession || !duplicateAccessionNumbers.has(accession)) return;
      duplicates.set(accession, [...(duplicates.get(accession) || []), book]);
    });
    const idsToDelete = Array.from(duplicates.values()).flatMap(group => group.slice(1).map(book => book.id));
    if (!idsToDelete.length) return;
    if (!confirm(`Keep the first book listed for each repeated accession number and delete ${idsToDelete.length} duplicate record(s)?`)) return;
    setBulkBusy(true);
    const { error } = await supabase.from("books").delete().in("id", idsToDelete);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Duplicates removed", description: `${idsToDelete.length} duplicate record(s) were deleted; one original was kept for each accession number.` }); setSelectedBookIds(new Set()); loadBooks(); }
    setBulkBusy(false);
  };
  const handleBulkClearMetadata = async () => {
    if (selectedBookIds.size === 0) return;
    if (!confirm(`Clear auto-fetched metadata (cover & description) from ${selectedBookIds.size} book(s)?`)) return;
    setBulkBusy(true);
    const ids = Array.from(selectedBookIds);
    const { error } = await supabase.from("books").update({ cover_url: null, description: null }).in("id", ids);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Metadata Cleared", description: `Cleared metadata for ${ids.length} book(s).` }); setSelectedBookIds(new Set()); loadBooks(); }
    setBulkBusy(false);
  };

  // Save manually entered accession numbers to the book's accession_numbers array
  const handleSaveManualAccessions = async (book: Book) => {
    const inputs = multiCopyManualAccessions[book.id] || [];
    const accessions = inputs.map(a => a.trim()).filter(Boolean);
    if (accessions.length === 0) {
      toast({ title: "No accessions entered", description: "Please type at least one accession number.", variant: "destructive" });
      return;
    }
    if (!confirm(`Save ${accessions.length} accession number(s) for "${book.title}"? This will update the catalog.`)) return;
    setBulkBusy(true);
    try {
      const { error } = await supabase.from("books").update({
        accession_numbers: accessions,
        accession_number: accessions[0],
        total_copies: Math.max(book.total_copies, accessions.length),
        available_copies: Math.max(book.available_copies, 0),
      }).eq("id", book.id);
      if (error) throw error;
      toast({ title: "Saved!", description: `${accessions.length} accession number(s) stored for "${book.title}".` });
      // Clear the local inputs for this book
      setMultiCopyManualAccessions(prev => { const n = { ...prev }; delete n[book.id]; return n; });
      loadBooks();
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to save.", variant: "destructive" });
    } finally {
      setBulkBusy(false);
    }
  };

  const handleQuickSaveAccession = async (bookId: string, accession: string) => {
    if (!accession.trim()) return;
    try {
      const { error } = await supabase
        .from("books")
        .update({ accession_number: accession.trim() })
        .eq("id", bookId);
      if (error) throw error;
      toast({ title: "Updated", description: "Accession number saved successfully." });
      setMissingAccessionInputs(prev => {
        const next = { ...prev };
        delete next[bookId];
        return next;
      });
      loadBooks();
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to save accession number.", variant: "destructive" });
    }
  };
  const handleMergeSameTitles = async (primaryBook: Book, duplicates: Book[]) => {
    setBulkBusy(true);
    try {
      const dupIds = duplicates.map(b => b.id);
      const newAccessions = new Set<string>(primaryBook.accession_numbers || []);
      if (primaryBook.accession_number) newAccessions.add(primaryBook.accession_number);
      
      let addTotal = 0;
      let addAvailable = 0;
      
      for (const dup of duplicates) {
        if (dup.accession_numbers) dup.accession_numbers.forEach(a => newAccessions.add(a));
        if (dup.accession_number) newAccessions.add(dup.accession_number);
        addTotal += dup.total_copies;
        addAvailable += dup.available_copies;
      }

      // Reassign foreign keys
      for (const table of ['book_issues', 'book_requests', 'book_reviews']) {
        const { error: fkeyError } = await (supabase as any).from(table).update({ book_id: primaryBook.id }).in('book_id', dupIds);
        // Ignore errors for tables that might not exist or be empty
        if (fkeyError && fkeyError.code !== '42P01') console.error(`Error updating ${table}:`, fkeyError);
      }
      
      // Update primary book
      const { error: updateError } = await supabase.from('books').update({
        total_copies: primaryBook.total_copies + addTotal,
        available_copies: primaryBook.available_copies + addAvailable,
        accession_numbers: Array.from(newAccessions).filter(Boolean),
        accession_number: Array.from(newAccessions).filter(Boolean)[0] || null, // Keep legacy field populated
      }).eq('id', primaryBook.id);
      if (updateError) throw updateError;
      
      // Delete duplicates
      const { error: deleteError } = await supabase.from('books').delete().in('id', dupIds);
      if (deleteError) throw deleteError;
      
      toast({ title: "Merged Successfully", description: "The identical title rows have been merged into one multi-copy book." });
      loadBooks();
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to merge titles.", variant: "destructive" });
    } finally {
      setBulkBusy(false);
    }
  };

  const handleBulkMergeSelected = async () => {
    if (selectedTitleKeys.size === 0) return;
    const groupsToMerge = sameTitleList.filter(item => selectedTitleKeys.has(item.title));
    if (groupsToMerge.length === 0) return;
    setBulkBusy(true);
    let mergedCount = 0;
    let errorCount = 0;
    try {
      for (const item of groupsToMerge) {
        const primary = item.books[0];
        const dupes = item.books.slice(1);
        if (dupes.length === 0) continue;
        try {
          const dupIds = dupes.map(b => b.id);
          const newAccessions = new Set<string>(primary.accession_numbers || []);
          if (primary.accession_number) newAccessions.add(primary.accession_number);
          let addTotal = 0;
          let addAvailable = 0;
          for (const dup of dupes) {
            if (dup.accession_numbers) dup.accession_numbers.forEach(a => newAccessions.add(a));
            if (dup.accession_number) newAccessions.add(dup.accession_number);
            addTotal += dup.total_copies;
            addAvailable += dup.available_copies;
          }
          for (const table of ['book_issues', 'book_requests', 'book_reviews']) {
            await (supabase as any).from(table).update({ book_id: primary.id }).in('book_id', dupIds);
          }
          const { error: updateError } = await supabase.from('books').update({
            total_copies: primary.total_copies + addTotal,
            available_copies: primary.available_copies + addAvailable,
            accession_numbers: Array.from(newAccessions).filter(Boolean),
            accession_number: Array.from(newAccessions).filter(Boolean)[0] || null,
          }).eq('id', primary.id);
          if (updateError) throw updateError;
          const { error: deleteError } = await supabase.from('books').delete().in('id', dupIds);
          if (deleteError) throw deleteError;
          mergedCount++;
        } catch {
          errorCount++;
        }
      }
      toast({
        title: `Bulk Merge Complete`,
        description: `${mergedCount} title group(s) merged successfully.${errorCount > 0 ? ` ${errorCount} failed.` : ''}`,
        variant: errorCount > 0 ? 'destructive' : 'default',
      });
      setSelectedTitleKeys(new Set());
      loadBooks();
    } finally {
      setBulkBusy(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  const categories = Array.from(new Set(books.map(b => b.category).filter(Boolean))) as string[];
  const duplicateAccessionNumbers = new Set(
    Object.entries(books.reduce<Record<string, number>>((counts, book) => {
      const accession = book.accession_number?.trim().toLowerCase();
      if (accession) counts[accession] = (counts[accession] || 0) + 1;
      return counts;
    }, {})).filter(([, count]) => count > 1).map(([accession]) => accession)
  );

  const duplicateAccessionMap = new Map<string, Book[]>();
  books.forEach(b => {
    const acc = b.accession_number?.trim().toLowerCase();
    if (acc) {
      duplicateAccessionMap.set(acc, [...(duplicateAccessionMap.get(acc) || []), b]);
    }
  });
  const duplicatesList = Array.from(duplicateAccessionMap.entries())
    .filter(([, list]) => list.length > 1)
    .map(([acc, list]) => ({ accession: acc, books: list }));

  const sameTitleMap = new Map<string, Book[]>();
  books.forEach(b => {
    const titleKey = b.title.trim().toLowerCase();
    if (titleKey) {
      sameTitleMap.set(titleKey, [...(sameTitleMap.get(titleKey) || []), b]);
    }
  });
  const sameTitleList = Array.from(sameTitleMap.entries())
    .filter(([, list]) => list.length > 1)
    .map(([title, list]) => ({ title, books: list }));

  const missingAccessions = books.filter(b => !b.accession_number?.trim());
  const multiCopyBooks = books.filter(b => b.total_copies > 1);
  const filteredBooks = books.filter(b => {
    if (categoryFilter !== "all" && b.category !== categoryFilter) return false;
    if (availabilityFilter === "available" && b.available_copies <= 0) return false;
    if (availabilityFilter === "issued" && b.available_copies >= b.total_copies) return false;
    if (duplicatesOnly && !duplicateAccessionNumbers.has(b.accession_number?.trim().toLowerCase() || "")) return false;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q) || (b.accession_number || "").toLowerCase().includes(q);
  });
  const totalCopies = books.reduce((s, b) => s + b.total_copies, 0);
  const availableCopies = books.reduce((s, b) => s + b.available_copies, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2 text-foreground">
            <BookOpen className="h-6 w-6 text-primary" />Book Management
          </h2>
          <p className="text-sm text-muted-foreground">{books.length} titles · {totalCopies} copies · {availableCopies} available</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {fetchingAll && (
            <div className="flex items-center gap-2 text-xs text-indigo-600 font-medium bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-1.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {fetchAllProgress || "Fetching metadata..."}
            </div>
          )}
          <Button
            onClick={fetchAllMissingMetadata}
            disabled={fetchingAll}
            variant="outline"
            size="sm"
            className="border-indigo-300 text-indigo-700 hover:bg-indigo-50"
          >
            <Wand2 className="h-4 w-4 mr-2" />
            Smart Fetch (Google, Open Library & Archive)
          </Button>
          <BulkImportBooks onImported={loadBooks} />
          <Button onClick={handleAddNew} className="gradient-primary border-0 shadow-md">
            <Plus className="h-4 w-4 mr-2" />Add Book
          </Button>
        </div>
      </div>

      <Card className="border-border/50">
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search title, author, accession..." className="pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
              <SelectTrigger><SelectValue placeholder="Availability" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="available">Available only</SelectItem>
                <SelectItem value="issued">Issued only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-md border bg-muted/30 p-3 text-sm">
            <div className="flex flex-col gap-0.5">
              <span>{duplicateAccessionNumbers.size} repeated accession number{duplicateAccessionNumbers.size === 1 ? "" : "s"} found</span>
              <span className="text-[10px] text-muted-foreground">Verify physical copy counts and format alignment.</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="outline" className="border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 hover:text-indigo-800" onClick={() => setVerifyOpen(true)}>
                <ShieldAlert className="h-4 w-4 mr-1.5" /> Accession Verifier
              </Button>
              <Button type="button" size="sm" variant={duplicatesOnly ? "default" : "outline"} onClick={() => setDuplicatesOnly(value => !value)}>{duplicatesOnly ? "Show all books" : "Find duplicates"}</Button>
              {duplicateAccessionNumbers.size > 0 && <Button type="button" size="sm" variant="destructive" disabled={bulkBusy} onClick={handleRemoveDuplicateCopies}>Keep originals, delete duplicates</Button>}
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedBookIds.size > 0 && (
        <Card className="border-primary bg-primary/5">
          <CardContent className="py-3 px-4 flex flex-wrap items-center gap-3">
            <CheckSquare className="h-4 w-4 text-primary shrink-0" />
            <span className="text-sm font-semibold text-primary">{selectedBookIds.size} selected</span>
            <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
              <Button size="sm" onClick={() => setShowBulkEdit(true)} disabled={bulkBusy}><Edit className="h-3.5 w-3.5 mr-1.5" />Bulk Edit</Button>
              <Button size="sm" variant="destructive" onClick={handleBulkDelete} disabled={bulkBusy}><Trash2 className="h-3.5 w-3.5 mr-1.5" />Delete Selected</Button>
              <Button size="sm" variant="outline" onClick={handleBulkClearMetadata} disabled={bulkBusy} className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700">Clear Metadata</Button>
              <Button size="sm" variant="outline" onClick={handleBulkFetchCovers} disabled={bulkBusy} className="border-indigo-200 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700">
                {bulkBusy && fetchAllProgress ? fetchAllProgress : "Fetch Covers"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setSelectedBookIds(new Set())}>Clear</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">All Books</CardTitle>
          <CardDescription>Showing {filteredBooks.length} of {books.length}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <input type="checkbox" checked={filteredBooks.length > 0 && filteredBooks.every(b => selectedBookIds.has(b.id))} onChange={() => toggleSelectAll(filteredBooks)} />
                  </TableHead>
                  <TableHead>Accession</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Author</TableHead>
                  <TableHead>Language</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Copies</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBooks.map((book) => (
                  <TableRow key={book.id} className={selectedBookIds.has(book.id) ? "bg-primary/5" : ""}>
                    <TableCell>
                      <input type="checkbox" checked={selectedBookIds.has(book.id)} onChange={() => toggleSelectBook(book.id)} />
                    </TableCell>
                    <TableCell className="text-xs font-mono">{book.accession_number || '—'}</TableCell>
                    <TableCell className="font-medium">{book.title}</TableCell>
                    <TableCell>{book.author}</TableCell>
                    <TableCell className="text-xs">{book.language || '—'}</TableCell>
                    <TableCell>{book.category || '—'}</TableCell>
                    <TableCell>{book.available_copies}/{book.total_copies}</TableCell>
                    <TableCell>
                      {book.available_copies === 0
                        ? <Badge variant="destructive">Out</Badge>
                        : book.available_copies < book.total_copies
                          ? <Badge variant="secondary">Partial</Badge>
                          : <Badge className="bg-green-600">Available</Badge>}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(book)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="outline" size="sm" onClick={() => handleDelete(book.id)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredBooks.length === 0 && (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    {books.length === 0 ? "No books yet. Add your first book or bulk import!" : "No books match your filters."}
                  </TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingBook ? 'Edit Book' : 'Add New Book'}</DialogTitle>
            <DialogDescription>{editingBook ? 'Update book information' : 'Add a new book to the library'}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <Label>Accession Numbers (Physical Copies)</Label>
              <p className="text-[11px] text-muted-foreground mb-2">Each accession number = one physical copy. The title shows once in catalog regardless of how many copies exist.</p>
              {/* Chip list */}
              <div className="flex flex-wrap gap-1.5 mb-2 min-h-[32px]">
                {formData.accession_numbers.map((acc, idx) => (
                  <span key={idx} className="inline-flex items-center gap-1 bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs font-mono rounded-full px-2.5 py-0.5">
                    {acc}
                    <button type="button" onClick={() => setFormData(p => ({ ...p, accession_numbers: p.accession_numbers.filter((_, i) => i !== idx) }))} className="text-indigo-400 hover:text-red-500 ml-0.5 leading-none">×</button>
                  </span>
                ))}
                {formData.accession_numbers.length === 0 && <span className="text-xs text-muted-foreground italic">No accession numbers added yet</span>}
              </div>
              {/* Add new accession */}
              <div className="flex gap-2">
                <Input
                  value={newAccessionInput}
                  onChange={e => setNewAccessionInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const val = newAccessionInput.trim();
                      if (val && !formData.accession_numbers.includes(val)) {
                        setFormData(p => ({ ...p, accession_numbers: [...p.accession_numbers, val] }));
                        setNewAccessionInput("");
                      }
                    }
                  }}
                  placeholder="e.g. 00001  (press Enter to add)"
                  className="font-mono text-sm"
                />
                <Button type="button" size="sm" variant="outline" className="shrink-0 border-indigo-300 text-indigo-700 hover:bg-indigo-50" onClick={() => {
                  const val = newAccessionInput.trim();
                  if (val && !formData.accession_numbers.includes(val)) {
                    setFormData(p => ({ ...p, accession_numbers: [...p.accession_numbers, val] }));
                    setNewAccessionInput("");
                  }
                }}>Add</Button>
              </div>
              {formData.accession_numbers.length > 0 && (
                <p className="text-[11px] text-muted-foreground mt-1">{formData.accession_numbers.length} copy(ies) — <span className="font-semibold">Total Copies</span> will be set to {formData.accession_numbers.length} automatically.</p>
              )}
            </div>
            <div>
              <Label htmlFor="title">Book Name *</Label>
              <Input id="title" value={formData.title} onChange={(e) => setFormData(p => ({ ...p, title: e.target.value }))} required />
            </div>
            <div>
              <Label htmlFor="author">Author *</Label>
              <Input id="author" value={formData.author} onChange={(e) => setFormData(p => ({ ...p, author: e.target.value }))} required />
            </div>


            {/* AI Auto-Fetch Button */}
            <div className="rounded-lg border border-dashed border-indigo-400/40 bg-indigo-500/5 p-3">
              <p className="text-xs text-muted-foreground mb-2">
                <span className="font-bold text-foreground">Auto-Fill</span> — fill Accession #, Title, Author & Copies above, then click below to fetch details from Open Library.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={fetchBookDetails} disabled={fetchingDetails} className="flex-1 border-indigo-400/40 hover:bg-indigo-500/10 font-semibold text-indigo-600 dark:text-indigo-400">
                  {fetchingDetails ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Fetching...</> : <><Wand2 className="h-4 w-4 mr-2" />Auto-Fill All</>}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={fetchBookCoverOnly} disabled={fetchingDetails} className="flex-1 border-indigo-400/40 hover:bg-indigo-500/10 font-semibold text-indigo-600 dark:text-indigo-400">
                  {fetchingDetails ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Fetching...</> : <><BookOpen className="h-4 w-4 mr-2" />Fetch Cover Only</>}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={clearFetchedData} className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700">
                  Clear Data
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="category">Catalogue / Category (optional)</Label>
                <Input id="category" value={formData.category} onChange={(e) => setFormData(p => ({ ...p, category: e.target.value }))} placeholder="e.g. Fiction, Science" />
              </div>
              <div>
                <Label htmlFor="language">Language (optional)</Label>
                <Input id="language" value={formData.language} onChange={(e) => setFormData(p => ({ ...p, language: e.target.value }))} placeholder="e.g. English, Hindi" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="subject">Subject (optional)</Label>
                <Input id="subject" value={formData.subject} onChange={(e) => setFormData(p => ({ ...p, subject: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="class_level">Class Level (optional)</Label>
                <Input id="class_level" value={formData.class_level} onChange={(e) => setFormData(p => ({ ...p, class_level: e.target.value }))} placeholder="e.g. 11" />
              </div>
            </div>
            <div>
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea id="description" value={formData.description} onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))} rows={2} />
            </div>
            <div>
              <Label htmlFor="cover_url">Cover Image URL (optional)</Label>
              <Input id="cover_url" value={formData.cover_url} onChange={(e) => setFormData(p => ({ ...p, cover_url: e.target.value }))} placeholder="https://covers.openlibrary.org/b/id/..." />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
              <Button type="submit" className="gradient-primary border-0">{editingBook ? 'Update' : 'Add'} Book</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showBulkEdit} onOpenChange={setShowBulkEdit}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Bulk Edit {selectedBookIds.size} Book(s)</DialogTitle>
            <DialogDescription>Only filled fields will be applied to selected books. Leave blank to keep existing values.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Category</Label>
              <Input value={bulkEdit.category} onChange={e => setBulkEdit(p => ({ ...p, category: e.target.value }))} placeholder="e.g. Fiction" />
            </div>
            <div>
              <Label>Language</Label>
              <Input value={bulkEdit.language} onChange={e => setBulkEdit(p => ({ ...p, language: e.target.value }))} placeholder="e.g. English" />
            </div>
            <div>
              <Label>Subject</Label>
              <Input value={bulkEdit.subject} onChange={e => setBulkEdit(p => ({ ...p, subject: e.target.value }))} placeholder="e.g. Science" />
            </div>
            <div>
              <Label>Class Level</Label>
              <Input value={bulkEdit.class_level} onChange={e => setBulkEdit(p => ({ ...p, class_level: e.target.value }))} placeholder="e.g. 11" />
            </div>
            <div>
              <Label>Cover Image URL</Label>
              <Input value={bulkEdit.cover_url} onChange={e => setBulkEdit(p => ({ ...p, cover_url: e.target.value }))} placeholder="https://..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkEdit(false)}>Cancel</Button>
            <Button onClick={handleBulkEdit} disabled={bulkBusy} className="gradient-primary border-0">{bulkBusy ? "Applying…" : "Apply Changes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Accession Verifier Dialog */}
      <Dialog open={verifyOpen} onOpenChange={setVerifyOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <ShieldAlert className="h-5 w-5 text-indigo-600" />
              Accession & Copy Alignment Verifier
            </DialogTitle>
            <DialogDescription>
              Check database alignment for physical library accessions. In KV systems, each row represents 1 unique book copy with its own accession code.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="duplicates" className="mt-4">
            <TabsList className="grid grid-cols-4">
              <TabsTrigger value="duplicates">Duplicates ({duplicatesList.length})</TabsTrigger>
              <TabsTrigger value="missing">Missing ({missingAccessions.length})</TabsTrigger>
              <TabsTrigger value="multicopy">Multi-Copy ({multiCopyBooks.length})</TabsTrigger>
              <TabsTrigger value="same_titles">Same Titles ({sameTitleList.length})</TabsTrigger>
            </TabsList>

            {/* Duplicates Tab */}
            <TabsContent value="duplicates" className="space-y-3 pt-3">
              {duplicatesList.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">No duplicate accession numbers found! Good job!</div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Accession #</TableHead>
                        <TableHead>Conflicting Books</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {duplicatesList.map(item => (
                        <TableRow key={item.accession}>
                          <TableCell className="font-mono font-bold text-xs">{item.accession.toUpperCase()}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {item.books.map(b => (
                                <div key={b.id} className="text-xs">
                                  <span className="font-bold">{b.title}</span> by {b.author}
                                </div>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button size="sm" variant="destructive" onClick={() => {
                              handleRemoveDuplicateCopies();
                            }}>Deduplicate</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            {/* Missing Tab */}
            <TabsContent value="missing" className="space-y-3 pt-3">
              {missingAccessions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">Every book has an accession number! All clear!</div>
              ) : (
                <div className="border rounded-lg overflow-hidden max-h-[50vh] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Author</TableHead>
                        <TableHead className="w-[240px]">Assign Accession #</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {missingAccessions.map(b => (
                        <TableRow key={b.id}>
                          <TableCell className="text-xs font-semibold">{b.title}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{b.author}</TableCell>
                          <TableCell>
                            <div className="flex gap-1.5">
                              <Input
                                placeholder="e.g. KV-ACC-1002"
                                className="h-8 text-xs font-mono"
                                value={missingAccessionInputs[b.id] || ""}
                                onChange={e => setMissingAccessionInputs(prev => ({ ...prev, [b.id]: e.target.value }))}
                              />
                              <Button
                                size="sm"
                                className="h-8 text-xs"
                                disabled={!missingAccessionInputs[b.id]?.trim()}
                                onClick={() => handleQuickSaveAccession(b.id, missingAccessionInputs[b.id])}
                              >
                                Save
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            {/* Multi-Copy Tab */}
            <TabsContent value="multicopy" className="space-y-3 pt-3">
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 text-xs text-indigo-800 flex gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Keep Catalog Clean:</span> Converting creates multiple physical copy accession numbers under the <strong>same single row</strong> (e.g. KV-ACC-1200-1, KV-ACC-1200-2). This prevents duplicate title listings from cluttering the catalog pages.
                </div>
              </div>

              {multiCopyBooks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">All books have individual single-copy rows! Excellent!</div>
              ) : (
                <div className="border rounded-lg overflow-hidden max-h-[55vh] overflow-y-auto divide-y">
                  {multiCopyBooks.map(b => {
                    // Build initial slots from existing array or fallback to empty slots equal to total_copies
                    const existingAccs = Array.isArray(b.accession_numbers) && b.accession_numbers.length > 0
                      ? b.accession_numbers
                      : Array(b.total_copies).fill("");
                    const currentInputs = multiCopyManualAccessions[b.id] ?? existingAccs;
                    return (
                      <div key={b.id} className="p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="text-xs font-semibold text-foreground">{b.title}</p>
                            <p className="text-[10px] text-muted-foreground">{b.author} · {b.total_copies} copies</p>
                          </div>
                          <Button
                            size="sm"
                            className="h-7 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white"
                            onClick={() => handleSaveManualAccessions(b)}
                            disabled={bulkBusy}
                          >
                            Save Accessions
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                          {currentInputs.map((acc: string, idx: number) => (
                            <div key={idx} className="flex items-center gap-1">
                              <span className="text-[10px] text-muted-foreground w-5 shrink-0">#{idx + 1}</span>
                              <Input
                                value={acc}
                                onChange={e => {
                                  const updated = [...currentInputs];
                                  updated[idx] = e.target.value;
                                  setMultiCopyManualAccessions(prev => ({ ...prev, [b.id]: updated }));
                                }}
                                placeholder={`Copy ${idx + 1} (e.g. 0${String(idx + 1).padStart(4, '0')})`}
                                className="h-7 text-xs font-mono"
                              />
                            </div>
                          ))}
                          {/* Add extra copy slot */}
                          <button
                            type="button"
                            className="h-7 px-2 text-[10px] border border-dashed border-indigo-300 text-indigo-600 rounded hover:bg-indigo-50 flex items-center gap-1"
                            onClick={() => setMultiCopyManualAccessions(prev => ({ ...prev, [b.id]: [...currentInputs, ""] }))}
                          >
                            <span>+</span> Add Copy
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* Same Titles Tab */}
            <TabsContent value="same_titles" className="space-y-3 pt-3">
              {sameTitleList.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">No identical titles found!</div>
              ) : (
                <div className="space-y-3">
                  {/* Bulk Action Bar */}
                  <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-indigo-50/60 border border-indigo-100">
                    <div className="flex items-center gap-2.5">
                      <Checkbox
                        id="select-all-titles"
                        checked={selectedTitleKeys.size === sameTitleList.length && sameTitleList.length > 0}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedTitleKeys(new Set(sameTitleList.map(i => i.title)));
                          } else {
                            setSelectedTitleKeys(new Set());
                          }
                        }}
                      />
                      <label htmlFor="select-all-titles" className="text-xs font-semibold text-indigo-700 cursor-pointer select-none">
                        Select All ({sameTitleList.length} groups)
                      </label>
                    </div>
                    <Button
                      size="sm"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white h-8 text-xs gap-1.5"
                      disabled={selectedTitleKeys.size === 0 || bulkBusy}
                      onClick={handleBulkMergeSelected}
                    >
                      {bulkBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <GitMerge className="h-3.5 w-3.5" />}
                      Merge Selected ({selectedTitleKeys.size})
                    </Button>
                  </div>

                  <div className="border rounded-lg overflow-hidden max-h-[42vh] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10"></TableHead>
                          <TableHead>Title</TableHead>
                          <TableHead>Conflicting Rows</TableHead>
                          <TableHead>Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sameTitleList.map(item => (
                          <TableRow key={item.title} className={selectedTitleKeys.has(item.title) ? "bg-indigo-50/40" : ""}>
                            <TableCell>
                              <Checkbox
                                checked={selectedTitleKeys.has(item.title)}
                                onCheckedChange={(checked) => {
                                  setSelectedTitleKeys(prev => {
                                    const next = new Set(prev);
                                    if (checked) next.add(item.title);
                                    else next.delete(item.title);
                                    return next;
                                  });
                                }}
                              />
                            </TableCell>
                            <TableCell className="font-semibold text-xs max-w-[160px]">
                              <span className="line-clamp-2">{item.books[0].title}</span>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                {item.books.map((b, idx) => (
                                  <div key={b.id} className="text-xs flex items-center gap-2">
                                    <Badge variant="outline" className="text-[9px]">{idx === 0 ? 'Primary' : `Dup ${idx}`}</Badge>
                                    <span className="text-muted-foreground truncate max-w-[100px]">{b.author}</span>
                                    <span className="text-muted-foreground">({b.total_copies}c)</span>
                                  </div>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 h-7 text-xs"
                                onClick={() => handleMergeSameTitles(item.books[0], item.books.slice(1))}
                                disabled={bulkBusy}
                              >
                                <GitMerge className="h-3 w-3 mr-1" /> Merge
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setVerifyOpen(false)}>Close Verifier</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BookManager;
