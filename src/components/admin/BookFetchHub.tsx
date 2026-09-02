import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, BookOpen, Sparkles, Check, Globe, Loader2, Plus, Edit, Image as ImageIcon, GraduationCap, Languages } from "lucide-react";
import { fetchBookByQuery, FetchedBookDetails, inferAcademicDetails } from "@/lib/bookApi";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface BookFetchHubProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBookCreatedOrUpdated: () => void;
}

export const BookFetchHub: React.FC<BookFetchHubProps> = ({
  open,
  onOpenChange,
  onBookCreatedOrUpdated,
}) => {
  const [query, setQuery] = useState("");
  const [authorQuery, setAuthorQuery] = useState("");
  const [isbnQuery, setIsbnQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState<FetchedBookDetails | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [academicMeta, setAcademicMeta] = useState<{ class_level: string; subject: string; category: string; language: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!query.trim() && !authorQuery.trim() && !isbnQuery.trim()) {
      toast({ title: "Query required", description: "Enter a title, author, or ISBN to fetch details.", variant: "destructive" });
      return;
    }

    setLoading(true);
    setHasSearched(true);
    try {
      const res = await fetchBookByQuery(query, authorQuery, isbnQuery);
      const inferred = inferAcademicDetails(query || res?.title || "", authorQuery || res?.author || "");

      const merged: FetchedBookDetails = res
        ? {
            ...res,
            subject: res.subject || inferred.subject,
            class_level: res.class_level || inferred.class_level,
            category: res.category || inferred.category,
            language: res.language || inferred.language,
          }
        : {
            title: query,
            author: authorQuery,
            subject: inferred.subject,
            class_level: inferred.class_level,
            category: inferred.category,
            language: inferred.language,
            description: `Academic title: ${query}`,
          };

      setDetails(merged);
      setAcademicMeta(inferred);
    } catch (e: any) {
      toast({ title: "Fetch error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNewBook = async () => {
    if (!details?.title) return;
    setIsSaving(true);
    try {
      const payload = {
        title: details.title,
        author: details.author || "Unknown",
        category: details.category || "General Literature",
        subject: details.subject || null,
        class_level: details.class_level || null,
        language: details.language || "English",
        description: details.description || null,
        cover_url: details.cover_url || null,
        total_copies: 1,
        available_copies: 1,
      };

      const { error } = await supabase.from("books").insert(payload);
      if (error) throw error;

      toast({ title: "Book created! 🎉", description: `Added "${details.title}" to library catalog.` });
      onBookCreatedOrUpdated();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Error creating book", description: err.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-6">
        <DialogHeader className="pb-3 border-b">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Globe className="h-5 w-5 text-indigo-500" /> Unified Single-Page Book Fetch Hub
          </DialogTitle>
          <DialogDescription>
            Search any book title, author, or ISBN to auto-fetch online covers, summaries, and academic class & subject metadata.
          </DialogDescription>
        </DialogHeader>

        {/* Search Bar Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 py-3">
          <div>
            <span className="text-xs font-semibold text-muted-foreground block mb-1">Book Title</span>
            <Input
              placeholder="e.g. NCERT Physics Class XI"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="h-9 text-xs"
            />
          </div>
          <div>
            <span className="text-xs font-semibold text-muted-foreground block mb-1">Author (Optional)</span>
            <Input
              placeholder="e.g. NCERT / H.C. Verma"
              value={authorQuery}
              onChange={(e) => setAuthorQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="h-9 text-xs"
            />
          </div>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <span className="text-xs font-semibold text-muted-foreground block mb-1">ISBN / Code</span>
              <Input
                placeholder="e.g. 9780143454321"
                value={isbnQuery}
                onChange={(e) => setIsbnQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="h-9 text-xs"
              />
            </div>
            <Button size="sm" onClick={handleSearch} disabled={loading} className="gradient-primary h-9 text-xs font-semibold gap-1">
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />} Search
            </Button>
          </div>
        </div>

        {/* Results Studio Card */}
        <div className="flex-1 overflow-y-auto p-4 border rounded-xl bg-slate-50/50 dark:bg-slate-900/50">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-medium">Fetching details & inferring academic metadata...</p>
            </div>
          ) : details ? (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              {/* Cover Column */}
              <div className="md:col-span-4 space-y-3 text-center">
                <div className="w-36 aspect-[2/3] mx-auto rounded-xl border bg-card overflow-hidden shadow-md">
                  {details.cover_url ? (
                    <img src={details.cover_url} alt={details.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-indigo-50/50 text-indigo-500">
                      <BookOpen className="h-10 w-10 mb-2" />
                      <span className="text-xs font-semibold">{details.title}</span>
                    </div>
                  )}
                </div>
                {details.cover_url && (
                  <Badge variant="outline" className="text-[10px] text-emerald-600 bg-emerald-50 border-emerald-300">
                    High-Res Cover Fetched
                  </Badge>
                )}
              </div>

              {/* Metadata Details Column */}
              <div className="md:col-span-8 space-y-3">
                <div>
                  <h3 className="text-lg font-bold text-foreground">{details.title}</h3>
                  <p className="text-xs text-muted-foreground">by {details.author || "Unknown Author"}</p>
                </div>

                {/* Auto-Inferred Academic Badges */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {details.subject && (
                    <Badge variant="outline" className="text-xs font-semibold bg-indigo-50 text-indigo-700 border-indigo-300 gap-1">
                      <GraduationCap className="h-3 w-3" /> Subject: {details.subject}
                    </Badge>
                  )}
                  {details.class_level && (
                    <Badge variant="secondary" className="text-xs font-semibold gap-1">
                      Class Level: {details.class_level}
                    </Badge>
                  )}
                  {details.category && (
                    <Badge variant="default" className="text-xs font-semibold">
                      Category: {details.category}
                    </Badge>
                  )}
                  {details.language && (
                    <Badge variant="outline" className="text-xs font-semibold gap-1">
                      <Languages className="h-3 w-3" /> {details.language}
                    </Badge>
                  )}
                </div>

                {/* Description Snippet */}
                {details.description && (
                  <div className="border rounded-lg p-3 bg-card text-xs space-y-1">
                    <span className="font-semibold text-muted-foreground block text-[11px]">Overview / Description</span>
                    <p className="line-clamp-4 leading-relaxed italic text-foreground">"{details.description}"</p>
                  </div>
                )}
              </div>
            </div>
          ) : hasSearched ? (
            <div className="text-center py-16 text-muted-foreground">
              <BookOpen className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="font-semibold text-sm">No exact metadata matches online.</p>
              <p className="text-xs mt-1">Try entering standard keywords like "NCERT Physics 11".</p>
            </div>
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              <Sparkles className="h-10 w-10 mx-auto mb-2 opacity-30 text-indigo-500" />
              <p className="font-semibold text-sm">Single-Page Book Data Fetch Studio</p>
              <p className="text-xs mt-1">Type a book title above to fetch covers, class levels, and subjects.</p>
            </div>
          )}
        </div>

        <DialogFooter className="pt-3 border-t flex justify-between items-center">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {details && (
            <Button
              size="sm"
              onClick={handleCreateNewBook}
              disabled={isSaving}
              className="gradient-primary text-xs font-semibold gap-1.5"
            >
              {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Create New Book Entry
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
