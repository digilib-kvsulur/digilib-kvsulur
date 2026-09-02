import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sparkles, Globe, BookOpen, Image as ImageIcon, FileText, GraduationCap,
  CheckCircle2, AlertCircle, Wand2, Loader2, Search, Check, RefreshCw, Filter, Layers, Plus
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchBookByQuery, FetchedBookDetails, inferAcademicDetails, isAcademicBook } from "@/lib/bookApi";
import { useToast } from "@/hooks/use-toast";

interface Book {
  id: string;
  title: string;
  author: string;
  cover_url?: string;
  description?: string;
  category?: string;
  subject?: string;
  class_level?: string;
  language?: string;
  accession_number?: string;
  accession_numbers?: string[];
}

interface CandidateItem {
  bookId: string;
  bookTitle: string;
  bookAuthor: string;
  selected: boolean;
  applyMode: "full" | "cover_only" | "academic_only";
  proposed: FetchedBookDetails | null;
  status: "pending" | "fetching" | "found" | "not_found" | "updated" | "error";
  errorMsg?: string;
}

export default function MetadataFetchDashboard() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMode, setFilterMode] = useState<"missing_cover" | "missing_desc" | "missing_academic" | "missing_category" | "all">("missing_cover");
  const [searchQuery, setSearchQuery] = useState("");
  const [batchSize, setBatchSize] = useState<number>(20);
  const [candidates, setCandidates] = useState<CandidateItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState("");

  // Single book studio search
  const [studioTitle, setStudioTitle] = useState("");
  const [studioAuthor, setStudioAuthor] = useState("");
  const [studioIsbn, setStudioIsbn] = useState("");
  const [studioLoading, setStudioLoading] = useState(false);
  const [studioResult, setStudioResult] = useState<FetchedBookDetails | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    loadBooks();
  }, []);

  const loadBooks = async () => {
    setLoading(true);
    try {
      let allBooks: Book[] = [];
      const PAGE = 1000;
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from("books")
          .select("*")
          .order("created_at", { ascending: false })
          .range(from, from + PAGE - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        allBooks = [...allBooks, ...data];
        if (data.length < PAGE) break;
        from += PAGE;
      }
      setBooks(allBooks);
    } catch (err) {
      toast({ title: "Error", description: "Failed to load library books", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Analytics Computations
  const totalBooks = books.length;
  const missingCoverBooks = books.filter((b) => !b.cover_url || b.cover_url.trim() === "");
  const missingDescBooks = books.filter((b) => !b.description || b.description.trim().length < 20);
  const missingAcademicBooks = books.filter((b) => isAcademicBook(b.title, b.category, b.subject) && (!b.subject || !b.class_level));
  const missingCategoryBooks = books.filter((b) => !b.category || b.category.trim() === "");

  const completeBooks = books.filter((b) => {
    const hasCover = b.cover_url && b.cover_url.trim() !== "";
    const hasDesc = b.description && b.description.trim().length >= 20;
    const hasCat = b.category && b.category.trim() !== "";
    if (!isAcademicBook(b.title, b.category, b.subject)) {
      return hasCover && hasDesc && hasCat;
    }
    return hasCover && hasDesc && hasCat && b.subject && b.class_level;
  });

  const completenessPercentage = totalBooks > 0 ? Math.round((completeBooks.length / totalBooks) * 100) : 0;

  const getFilteredBooks = () => {
    return books.filter((b) => {
      const matchesSearch =
        !searchQuery ||
        b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (b.accession_number && b.accession_number.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      if (filterMode === "missing_cover") return !b.cover_url || b.cover_url.trim() === "";
      if (filterMode === "missing_desc") return !b.description || b.description.trim().length < 20;
      if (filterMode === "missing_academic") return isAcademicBook(b.title, b.category, b.subject) && (!b.subject || !b.class_level);
      if (filterMode === "missing_category") return !b.category || b.category.trim() === "";

      return true;
    });
  };

  const filteredBooks = getFilteredBooks();

  const startBatchSearch = async () => {
    if (filteredBooks.length === 0) {
      toast({ title: "No books to process", description: "No books match the current filter criteria." });
      return;
    }

    setIsSearching(true);
    setProgress(0);
    setProgressText(`Searching online metadata for ${filteredBooks.length} books in batches of ${batchSize}...`);

    const initialCandidates: CandidateItem[] = filteredBooks.map((b) => ({
      bookId: b.id,
      bookTitle: b.title,
      bookAuthor: b.author,
      selected: true,
      applyMode: "full",
      proposed: null,
      status: "pending",
    }));

    setCandidates(initialCandidates);
    let completed = 0;
    const updatedCandidates = [...initialCandidates];

    for (let i = 0; i < filteredBooks.length; i += batchSize) {
      const chunk = filteredBooks.slice(i, i + batchSize);

      for (let j = 0; j < chunk.length; j++) {
        updatedCandidates[i + j].status = "fetching";
      }
      setCandidates([...updatedCandidates]);

      await Promise.all(
        chunk.map(async (book, indexInChunk) => {
          const globalIdx = i + indexInChunk;
          try {
            let details = await fetchBookByQuery(book.title, book.author);
            const academic = inferAcademicDetails(book.title, book.author);

            if (!details) {
              details = {
                title: book.title,
                author: book.author,
                category: academic.category,
                subject: academic.subject,
                class_level: academic.class_level,
                language: academic.language,
              };
            } else {
              if (!details.subject) details.subject = academic.subject;
              if (!details.class_level) details.class_level = academic.class_level;
              if (!details.category) details.category = academic.category;
              if (!details.language) details.language = academic.language;
            }

            updatedCandidates[globalIdx].proposed = details;
            updatedCandidates[globalIdx].status = details ? "found" : "not_found";
          } catch (err: any) {
            updatedCandidates[globalIdx].status = "error";
            updatedCandidates[globalIdx].errorMsg = err.message || "Failed";
          }
        })
      );

      completed += chunk.length;
      setProgress(Math.round((completed / filteredBooks.length) * 100));
      setProgressText(`Completed batch: ${completed} of ${filteredBooks.length} books...`);
      setCandidates([...updatedCandidates]);
    }

    setIsSearching(false);
    toast({
      title: "Batch Search Complete! 🎉",
      description: `Fetched candidates for ${filteredBooks.length} books in batches of ${batchSize}.`,
    });
  };

  const applySelectedUpdates = async () => {
    const selected = candidates.filter((c) => c.selected && c.proposed);
    if (selected.length === 0) {
      toast({ title: "No updates selected", description: "Select at least one candidate update to apply.", variant: "destructive" });
      return;
    }

    setIsApplying(true);
    setProgress(0);
    setProgressText(`Saving updates for ${selected.length} books to database...`);

    let updatedCount = 0;
    for (let i = 0; i < selected.length; i++) {
      const item = selected[i];
      const p = item.proposed!;
      const updates: any = {};

      if (item.applyMode === "full" || item.applyMode === "cover_only") {
        if (p.cover_url) updates.cover_url = p.cover_url;
      }
      if (item.applyMode === "full" || item.applyMode === "academic_only") {
        if (p.description && p.description.trim().length >= 20) updates.description = p.description;
        if (p.category) updates.category = p.category;
        if (p.subject) updates.subject = p.subject;
        if (p.class_level) updates.class_level = p.class_level;
        if (p.language) updates.language = p.language;
      }

      if (Object.keys(updates).length > 0) {
        const { error } = await supabase.from("books").update(updates).eq("id", item.bookId);
        if (!error) {
          updatedCount++;
          item.status = "updated";
        }
      }
      setProgress(Math.round(((i + 1) / selected.length) * 100));
    }

    setIsApplying(false);
    toast({
      title: "Batch Updates Applied! 🎉",
      description: `Updated covers & metadata for ${updatedCount} books.`,
    });

    loadBooks();
  };

  const handleStudioSearch = async () => {
    if (!studioTitle.trim() && !studioAuthor.trim() && !studioIsbn.trim()) return;
    setStudioLoading(true);
    try {
      const res = await fetchBookByQuery(studioTitle, studioAuthor, studioIsbn);
      const inferred = inferAcademicDetails(studioTitle || res?.title || "", studioAuthor || res?.author || "");
      const merged: FetchedBookDetails = res
        ? {
            ...res,
            subject: res.subject || inferred.subject,
            class_level: res.class_level || inferred.class_level,
            category: res.category || inferred.category,
            language: res.language || inferred.language,
          }
        : {
            title: studioTitle,
            author: studioAuthor,
            subject: inferred.subject,
            class_level: inferred.class_level,
            category: inferred.category,
            language: inferred.language,
          };
      setStudioResult(merged);
    } catch (e: any) {
      toast({ title: "Studio search error", description: e.message, variant: "destructive" });
    } finally {
      setStudioLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2 text-foreground">
            <Sparkles className="h-6 w-6 text-purple-500" /> Book Metadata & Cover Fetch Dashboard
          </h2>
          <p className="text-sm text-muted-foreground">
            Audit metadata health, run batch multi-source online searches, and auto-populate academic class levels & subjects.
          </p>
        </div>
        <Button onClick={loadBooks} variant="outline" size="sm" className="gap-1.5 font-semibold">
          <RefreshCw className="h-4 w-4" /> Refresh Audit Data
        </Button>
      </div>

      {/* Analytics Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-border/50 bg-gradient-to-br from-indigo-50/50 to-blue-50/50 dark:from-indigo-950/20 dark:to-blue-950/20">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex justify-between items-center">
              <span>Overall Completeness</span>
              <CheckCircle2 className="h-4 w-4" />
            </CardDescription>
            <CardTitle className="text-2xl font-black">{completenessPercentage}%</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <Progress value={completenessPercentage} className="h-1.5 mb-1" />
            <p className="text-[11px] text-muted-foreground">{completeBooks.length} of {totalBooks} books 100% complete</p>
          </CardContent>
        </Card>

        <Card
          onClick={() => setFilterMode("missing_cover")}
          className={`cursor-pointer transition-all border-border/50 hover:border-amber-400 ${filterMode === "missing_cover" ? "ring-2 ring-amber-400 bg-amber-50/30" : ""}`}
        >
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex justify-between items-center">
              <span>Missing Covers</span>
              <ImageIcon className="h-4 w-4" />
            </CardDescription>
            <CardTitle className="text-2xl font-black">{missingCoverBooks.length}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-[11px] text-muted-foreground">Click to view & fetch covers</p>
          </CardContent>
        </Card>

        <Card
          onClick={() => setFilterMode("missing_desc")}
          className={`cursor-pointer transition-all border-border/50 hover:border-blue-400 ${filterMode === "missing_desc" ? "ring-2 ring-blue-400 bg-blue-50/30" : ""}`}
        >
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-semibold text-blue-600 dark:text-blue-400 flex justify-between items-center">
              <span>Missing Overviews</span>
              <FileText className="h-4 w-4" />
            </CardDescription>
            <CardTitle className="text-2xl font-black">{missingDescBooks.length}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-[11px] text-muted-foreground">Short or missing descriptions</p>
          </CardContent>
        </Card>

        <Card
          onClick={() => setFilterMode("missing_academic")}
          className={`cursor-pointer transition-all border-border/50 hover:border-purple-400 ${filterMode === "missing_academic" ? "ring-2 ring-purple-400 bg-purple-50/30" : ""}`}
        >
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-semibold text-purple-600 dark:text-purple-400 flex justify-between items-center">
              <span>Missing Class/Subject</span>
              <GraduationCap className="h-4 w-4" />
            </CardDescription>
            <CardTitle className="text-2xl font-black">{missingAcademicBooks.length}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-[11px] text-muted-foreground">Academic level auto-fillable</p>
          </CardContent>
        </Card>

        <Card
          onClick={() => setFilterMode("missing_category")}
          className={`cursor-pointer transition-all border-border/50 hover:border-emerald-400 ${filterMode === "missing_category" ? "ring-2 ring-emerald-400 bg-emerald-50/30" : ""}`}
        >
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex justify-between items-center">
              <span>Missing Category</span>
              <Layers className="h-4 w-4" />
            </CardDescription>
            <CardTitle className="text-2xl font-black">{missingCategoryBooks.length}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-[11px] text-muted-foreground">Uncategorized library books</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Interactive Audit & Batch Studio Card */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="border-b pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Wand2 className="h-5 w-5 text-indigo-500" /> Interactive Batch Fetch Studio
              </CardTitle>
              <CardDescription>
                Configure batch size and trigger multi-source search across Google Books, Open Library, Internet Archive, and NCERT lookup.
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground">Filter:</span>
              <Select value={filterMode} onValueChange={(val: any) => setFilterMode(val)}>
                <SelectTrigger className="h-9 text-xs w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="missing_cover">Missing Cover Only</SelectItem>
                  <SelectItem value="missing_desc">Missing Description</SelectItem>
                  <SelectItem value="missing_academic">Missing Class/Subject</SelectItem>
                  <SelectItem value="missing_category">Missing Category</SelectItem>
                  <SelectItem value="all">All Library Books ({books.length})</SelectItem>
                </SelectContent>
              </Select>

              <span className="text-xs font-semibold text-muted-foreground ml-2">Batch Size:</span>
              <Select value={String(batchSize)} onValueChange={(val) => setBatchSize(Number(val))}>
                <SelectTrigger className="h-9 text-xs w-[110px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 / batch</SelectItem>
                  <SelectItem value="20">20 / batch</SelectItem>
                  <SelectItem value="50">50 / batch</SelectItem>
                  <SelectItem value="100">100 / batch</SelectItem>
                </SelectContent>
              </Select>

              <Button
                onClick={startBatchSearch}
                disabled={isSearching || isApplying || filteredBooks.length === 0}
                className="gradient-primary text-xs font-semibold gap-1.5 h-9"
              >
                {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                Run Batch Search ({filteredBooks.length})
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-4 space-y-4">
          {/* Progress Bar */}
          {(isSearching || isApplying) && (
            <div className="space-y-2 border rounded-xl p-3 bg-purple-50/50 dark:bg-purple-950/20">
              <div className="flex justify-between text-xs font-semibold">
                <span>{progressText}</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* Search Filter Bar */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Filter by title, author, or accession number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>
            <Badge variant="outline" className="text-xs">
              {filteredBooks.length} matching books
            </Badge>
          </div>

          {/* Candidates Side-by-Side Comparison Table */}
          {candidates.length > 0 ? (
            <div className="border rounded-xl overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={candidates.every((c) => c.selected)}
                        onCheckedChange={(checked) => setCandidates((prev) => prev.map((c) => ({ ...c, selected: !!checked })))}
                      />
                    </TableHead>
                    <TableHead>Book Details</TableHead>
                    <TableHead>Proposed Cover</TableHead>
                    <TableHead>Proposed Metadata (Subject / Class / Cat)</TableHead>
                    <TableHead className="w-[140px] text-right">Apply Mode</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {candidates.map((cand, idx) => {
                    const p = cand.proposed;
                    return (
                      <TableRow key={cand.bookId} className={cand.selected ? "bg-purple-50/30 dark:bg-purple-950/10" : ""}>
                        <TableCell>
                          <Checkbox
                            checked={cand.selected}
                            onCheckedChange={() =>
                              setCandidates((prev) => {
                                const next = [...prev];
                                next[idx].selected = !next[idx].selected;
                                return next;
                              })
                            }
                            disabled={!p || cand.status === "fetching"}
                          />
                        </TableCell>
                        <TableCell>
                          <p className="font-bold text-xs line-clamp-1">{cand.bookTitle}</p>
                          <p className="text-[11px] text-muted-foreground">by {cand.bookAuthor || "Unknown"}</p>
                        </TableCell>
                        <TableCell>
                          {cand.status === "fetching" ? (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Fetching...
                            </div>
                          ) : p?.cover_url ? (
                            <div className="w-10 h-14 rounded border overflow-hidden bg-muted shrink-0">
                              <img src={p.cover_url} alt="" className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <span className="text-[11px] text-muted-foreground italic">No cover</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {p ? (
                            <div className="space-y-1">
                              <div className="flex flex-wrap gap-1">
                                {p.subject && <Badge variant="outline" className="text-[10px] bg-indigo-50 border-indigo-300 text-indigo-700">{p.subject}</Badge>}
                                {p.class_level && <Badge variant="secondary" className="text-[10px]">Class {p.class_level}</Badge>}
                                {p.category && <Badge variant="default" className="text-[10px]">{p.category}</Badge>}
                                {p.language && <Badge variant="outline" className="text-[10px]">{p.language}</Badge>}
                              </div>
                              {p.description && <p className="text-[10px] text-muted-foreground line-clamp-1 italic">"{p.description}"</p>}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">Pending</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {p && (
                            <Select
                              value={cand.applyMode}
                              onValueChange={(val: any) =>
                                setCandidates((prev) => {
                                  const next = [...prev];
                                  next[idx].applyMode = val;
                                  return next;
                                })
                              }
                            >
                              <SelectTrigger className="h-7 text-[11px] w-[120px] ml-auto">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="full">Full Metadata</SelectItem>
                                <SelectItem value="cover_only">Cover Only</SelectItem>
                                <SelectItem value="academic_only">Academic Only</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="border rounded-xl overflow-hidden max-h-[350px] overflow-y-auto">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Accession #</TableHead>
                    <TableHead>Book Title & Author</TableHead>
                    <TableHead>Cover</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Class Level</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBooks.slice(0, 50).map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {b.accession_number || "—"}
                      </TableCell>
                      <TableCell>
                        <p className="font-semibold text-xs text-foreground line-clamp-1">{b.title}</p>
                        <p className="text-[11px] text-muted-foreground">by {b.author || "Unknown"}</p>
                      </TableCell>
                      <TableCell>
                        {b.cover_url ? (
                          <div className="w-8 h-11 rounded border overflow-hidden">
                            <img src={b.cover_url} alt="" className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-700 bg-amber-50">
                            Missing Cover
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">{b.category || "—"}</TableCell>
                      <TableCell className="text-xs">{b.subject || "—"}</TableCell>
                      <TableCell className="text-xs">{b.class_level ? `Class ${b.class_level}` : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Action Footer */}
          {candidates.length > 0 && (
            <div className="flex justify-between items-center pt-2">
              <p className="text-xs text-muted-foreground font-medium">
                {candidates.filter((c) => c.selected && c.proposed).length} updates ready to apply
              </p>
              <Button
                onClick={applySelectedUpdates}
                disabled={isApplying || candidates.filter((c) => c.selected && c.proposed).length === 0}
                className="gradient-primary text-xs font-semibold gap-1.5 h-9"
              >
                {isApplying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Apply Selected Updates ({candidates.filter((c) => c.selected && c.proposed).length})
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Single-Book Fetch Studio Card */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Globe className="h-5 w-5 text-blue-500" /> Single Book Query Studio
          </CardTitle>
          <CardDescription>
            Instantly query any title, author, or ISBN to test online metadata fetching and academic auto-inference.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              placeholder="Book Title (e.g. NCERT Chemistry Class 12)"
              value={studioTitle}
              onChange={(e) => setStudioTitle(e.target.value)}
              className="h-9 text-xs"
            />
            <Input
              placeholder="Author (Optional)"
              value={studioAuthor}
              onChange={(e) => setStudioAuthor(e.target.value)}
              className="h-9 text-xs"
            />
            <div className="flex gap-2">
              <Input
                placeholder="ISBN (Optional)"
                value={studioIsbn}
                onChange={(e) => setStudioIsbn(e.target.value)}
                className="h-9 text-xs flex-1"
              />
              <Button onClick={handleStudioSearch} disabled={studioLoading} size="sm" className="gradient-primary h-9 text-xs gap-1 font-semibold">
                {studioLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />} Search
              </Button>
            </div>
          </div>

          {studioResult && (
            <div className="border rounded-xl p-4 bg-slate-50/50 dark:bg-slate-900/50 flex gap-4 items-start">
              <div className="w-24 h-36 rounded-lg border bg-card overflow-hidden shrink-0 shadow-sm">
                {studioResult.cover_url ? (
                  <img src={studioResult.cover_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center text-xs text-muted-foreground">
                    <BookOpen className="h-8 w-8 mb-1 opacity-40" /> No cover
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-2">
                <h4 className="font-bold text-sm text-foreground">{studioResult.title}</h4>
                <p className="text-xs text-muted-foreground">by {studioResult.author || "Unknown Author"}</p>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {studioResult.subject && <Badge variant="outline" className="text-xs bg-indigo-50 border-indigo-300 text-indigo-700 font-semibold">Subject: {studioResult.subject}</Badge>}
                  {studioResult.class_level && <Badge variant="secondary" className="text-xs font-semibold">Class {studioResult.class_level}</Badge>}
                  {studioResult.category && <Badge variant="default" className="text-xs font-semibold">Category: {studioResult.category}</Badge>}
                  {studioResult.language && <Badge variant="outline" className="text-xs font-semibold">{studioResult.language}</Badge>}
                </div>

                {studioResult.description && (
                  <p className="text-xs text-muted-foreground italic line-clamp-3">"{studioResult.description}"</p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
