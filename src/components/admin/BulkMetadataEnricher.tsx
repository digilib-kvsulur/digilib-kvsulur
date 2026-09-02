import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Loader2, Check, BookOpen, Image as ImageIcon, AlertCircle, Wand2, Filter } from "lucide-react";
import { fetchBookByQuery, FetchedBookDetails, inferAcademicDetails } from "@/lib/bookApi";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface BookItem {
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
}

interface EnrichedCandidate {
  bookId: string;
  bookTitle: string;
  bookAuthor: string;
  selected: boolean;
  applyMode: "full" | "cover_only" | "academic_only";
  proposed: FetchedBookDetails | null;
  status: "pending" | "fetching" | "found" | "not_found" | "updated" | "error";
  errorMsg?: string;
}

interface BulkMetadataEnricherProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  books: BookItem[];
  onComplete: () => void;
}

export const BulkMetadataEnricher: React.FC<BulkMetadataEnricherProps> = ({
  open,
  onOpenChange,
  books,
  onComplete,
}) => {
  const [filterMode, setFilterMode] = useState<"missing_cover" | "missing_metadata" | "all">("missing_cover");
  const [batchSize, setBatchSize] = useState<number>(20);
  const [candidates, setCandidates] = useState<EnrichedCandidate[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState("");
  const { toast } = useToast();

  const getFilteredBooks = () => {
    return books.filter((b) => {
      if (filterMode === "missing_cover") return !b.cover_url || b.cover_url.trim() === "";
      if (filterMode === "missing_metadata") {
        return (
          !b.cover_url ||
          !b.description ||
          !b.category ||
          !b.subject ||
          !b.class_level ||
          b.description.trim().length < 20
        );
      }
      return true;
    });
  };

  const startBulkSearch = async () => {
    const targetBooks = getFilteredBooks();
    if (targetBooks.length === 0) {
      toast({
        title: "No books match filter",
        description: "All loaded books already have complete metadata for this filter.",
      });
      return;
    }

    setIsSearching(true);
    setProgress(0);
    setProgressText(`Searching online metadata for ${targetBooks.length} books in batches of ${batchSize}...`);

    const initialCandidates: EnrichedCandidate[] = targetBooks.map((b) => ({
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

    for (let i = 0; i < targetBooks.length; i += batchSize) {
      const chunk = targetBooks.slice(i, i + batchSize);
      
      // Mark chunk candidates as fetching
      for (let j = 0; j < chunk.length; j++) {
        updatedCandidates[i + j].status = "fetching";
      }
      setCandidates([...updatedCandidates]);

      // Execute chunk concurrently via Promise.all
      await Promise.all(
        chunk.map(async (book, indexInChunk) => {
          const globalIdx = i + indexInChunk;
          try {
            let details = await fetchBookByQuery(book.title, book.author);

            // Academic Auto-Fill fallback logic
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
      setProgress(Math.round((completed / targetBooks.length) * 100));
      setProgressText(`Batch completed: ${completed} of ${targetBooks.length} books...`);
      setCandidates([...updatedCandidates]);
    }

    setIsSearching(false);
    toast({
      title: "Bulk Search Complete!",
      description: `Fetched metadata candidates for ${targetBooks.length} books in batches of ${batchSize}.`,
    });
  };

  const toggleSelectCandidate = (index: number) => {
    setCandidates((prev) => {
      const next = [...prev];
      next[index].selected = !next[index].selected;
      return next;
    });
  };

  const setCandidateApplyMode = (index: number, mode: "full" | "cover_only" | "academic_only") => {
    setCandidates((prev) => {
      const next = [...prev];
      next[index].applyMode = mode;
      return next;
    });
  };

  const toggleSelectAll = (selected: boolean) => {
    setCandidates((prev) => prev.map((c) => ({ ...c, selected })));
  };

  const applySelectedUpdates = async () => {
    const selectedCandidates = candidates.filter((c) => c.selected && c.proposed);
    if (selectedCandidates.length === 0) {
      toast({
        title: "No updates selected",
        description: "Select at least one candidate update to apply.",
        variant: "destructive",
      });
      return;
    }

    setIsApplying(true);
    setProgress(0);
    setProgressText(`Saving updates to ${selectedCandidates.length} books in database...`);

    let successCount = 0;
    for (let i = 0; i < selectedCandidates.length; i++) {
      const cand = selectedCandidates[i];
      const p = cand.proposed!;
      const updates: any = {};

      if (cand.applyMode === "full" || cand.applyMode === "cover_only") {
        if (p.cover_url) updates.cover_url = p.cover_url;
      }

      if (cand.applyMode === "full" || cand.applyMode === "academic_only") {
        if (p.description && p.description.trim().length >= 20) updates.description = p.description;
        if (p.category) updates.category = p.category;
        if (p.subject) updates.subject = p.subject;
        if (p.class_level) updates.class_level = p.class_level;
        if (p.language) updates.language = p.language;
      }

      if (Object.keys(updates).length > 0) {
        const { error } = await supabase.from("books").update(updates).eq("id", cand.bookId);
        if (!error) {
          successCount++;
          cand.status = "updated";
        }
      }

      setProgress(Math.round(((i + 1) / selectedCandidates.length) * 100));
    }

    setIsApplying(false);
    toast({
      title: "Batch Enrichment Successful! 🎉",
      description: `Successfully updated metadata & covers for ${successCount} books.`,
    });

    onComplete();
  };

  const selectedCount = candidates.filter((c) => c.selected && c.proposed).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-6">
        <DialogHeader className="pb-3 border-b">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Sparkles className="h-5 w-5 text-purple-500" /> Interactive Bulk Cover & Metadata Selector
          </DialogTitle>
          <DialogDescription>
            Search online APIs for missing covers, descriptions, categories, subjects, and class levels, then apply batch updates.
          </DialogDescription>
        </DialogHeader>

        {/* Toolbar & Filter */}
        <div className="flex flex-wrap items-center justify-between gap-3 py-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-semibold">Target Books:</span>
            <Select
              value={filterMode}
              onValueChange={(val: any) => setFilterMode(val)}
              disabled={isSearching || isApplying}
            >
              <SelectTrigger className="h-8 text-xs w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="missing_cover">Missing Cover Only</SelectItem>
                <SelectItem value="missing_metadata">Missing Metadata / Cover</SelectItem>
                <SelectItem value="all">All Library Books ({books.length})</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-xs font-semibold ml-2">Batch Size:</span>
            <Select
              value={String(batchSize)}
              onValueChange={(val) => setBatchSize(Number(val))}
              disabled={isSearching || isApplying}
            >
              <SelectTrigger className="h-8 text-xs w-[110px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 / batch</SelectItem>
                <SelectItem value="20">20 / batch</SelectItem>
                <SelectItem value="50">50 / batch</SelectItem>
                <SelectItem value="100">100 / batch</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant="outline" className="text-xs">
              {getFilteredBooks().length} books matched
            </Badge>
          </div>

          <Button
            size="sm"
            onClick={startBulkSearch}
            disabled={isSearching || isApplying || getFilteredBooks().length === 0}
            className="gradient-primary text-xs gap-1.5 h-8 font-semibold"
          >
            {isSearching ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching...
              </>
            ) : (
              <>
                <Wand2 className="h-3.5 w-3.5" /> Start Bulk Search & Inference
              </>
            )}
          </Button>
        </div>

        {/* Progress Bar */}
        {(isSearching || isApplying) && (
          <div className="space-y-1.5 py-2">
            <div className="flex justify-between text-xs font-medium text-muted-foreground">
              <span>{progressText}</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Candidate Interactive List */}
        <div className="flex-1 overflow-y-auto border rounded-xl p-2 bg-slate-50/50 dark:bg-slate-900/50">
          {candidates.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={candidates.length > 0 && candidates.every((c) => c.selected)}
                      onCheckedChange={(checked) => toggleSelectAll(!!checked)}
                    />
                  </TableHead>
                  <TableHead className="w-[200px]">Book Title & Author</TableHead>
                  <TableHead className="w-[110px]">Proposed Cover</TableHead>
                  <TableHead>Proposed Metadata (Subject / Class / Cat)</TableHead>
                  <TableHead className="w-[140px] text-right">Apply Mode</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {candidates.map((item, idx) => {
                  const p = item.proposed;
                  return (
                    <TableRow key={item.bookId} className={item.selected ? "bg-purple-50/40 dark:bg-purple-950/20" : ""}>
                      <TableCell>
                        <Checkbox
                          checked={item.selected}
                          onCheckedChange={() => toggleSelectCandidate(idx)}
                          disabled={!p || item.status === "fetching"}
                        />
                      </TableCell>

                      <TableCell>
                        <p className="font-semibold text-xs text-foreground line-clamp-1" title={item.bookTitle}>
                          {item.bookTitle}
                        </p>
                        <p className="text-[11px] text-muted-foreground">by {item.bookAuthor || "Unknown"}</p>
                      </TableCell>

                      <TableCell>
                        {item.status === "fetching" ? (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Fetching...
                          </div>
                        ) : p?.cover_url ? (
                          <div className="w-12 h-16 rounded border overflow-hidden bg-muted shrink-0 shadow-xs">
                            <img src={p.cover_url} alt="" className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <span className="text-[11px] text-muted-foreground italic flex items-center gap-1">
                            <AlertCircle className="h-3 w-3 text-amber-500" /> No cover
                          </span>
                        )}
                      </TableCell>

                      <TableCell>
                        {p ? (
                          <div className="space-y-1">
                            <div className="flex flex-wrap gap-1">
                              {p.subject && <Badge variant="outline" className="text-[10px] px-1 py-0 border-indigo-300 text-indigo-700 bg-indigo-50">{p.subject}</Badge>}
                              {p.class_level && <Badge variant="secondary" className="text-[10px] px-1 py-0">Class {p.class_level}</Badge>}
                              {p.category && <Badge variant="default" className="text-[10px] px-1 py-0">{p.category}</Badge>}
                              {p.language && <Badge variant="outline" className="text-[10px] px-1 py-0">{p.language}</Badge>}
                            </div>
                            {p.description && (
                              <p className="text-[10px] text-muted-foreground line-clamp-1 italic">"{p.description}"</p>
                            )}
                          </div>
                        ) : item.status === "not_found" ? (
                          <span className="text-xs text-muted-foreground">No candidate found</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Pending</span>
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        {p && (
                          <Select
                            value={item.applyMode}
                            onValueChange={(val: any) => setCandidateApplyMode(idx, val)}
                          >
                            <SelectTrigger className="h-7 text-[11px] w-[130px] ml-auto">
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
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              <Sparkles className="h-10 w-10 mx-auto mb-2 opacity-30 text-purple-500" />
              <p className="font-semibold text-sm">Interactive Bulk Metadata & Cover Selector</p>
              <p className="text-xs mt-1">Select a filter criteria above and click "Start Bulk Search & Inference".</p>
            </div>
          )}
        </div>

        <DialogFooter className="pt-3 border-t flex flex-wrap justify-between items-center gap-2">
          <div className="text-xs text-muted-foreground">
            {selectedCount > 0 ? (
              <span className="font-bold text-foreground">{selectedCount} updates ready to apply</span>
            ) : (
              "No updates selected"
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={applySelectedUpdates}
              disabled={isApplying || selectedCount === 0}
              className="gradient-primary text-xs font-semibold gap-1.5"
            >
              {isApplying ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" /> Apply Selected Updates ({selectedCount})
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
