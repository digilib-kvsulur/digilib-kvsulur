import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, BookOpen, Sparkles, Check, Globe, Library, Loader2, Image as ImageIcon } from "lucide-react";
import { FetchedBookDetails, fetchBookByQuery } from "@/lib/bookApi";
import { useToast } from "@/hooks/use-toast";

interface BookFetchPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTitle?: string;
  initialAuthor?: string;
  onSelectBook: (details: FetchedBookDetails) => void;
}

export interface MultiSourceSearchResult extends FetchedBookDetails {
  id: string;
  source: "Google Books" | "Open Library" | "Internet Archive" | "Combined API";
  publisher?: string;
  publishYear?: string;
  pageCount?: number;
}

export const BookFetchPicker: React.FC<BookFetchPickerProps> = ({
  open,
  onOpenChange,
  initialTitle = "",
  initialAuthor = "",
  onSelectBook,
}) => {
  const [queryTitle, setQueryTitle] = useState(initialTitle);
  const [queryAuthor, setQueryAuthor] = useState(initialAuthor);
  const [queryIsbn, setQueryIsbn] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "google" | "openlibrary">("all");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<MultiSourceSearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const { toast } = useToast();

  React.useEffect(() => {
    if (open) {
      setQueryTitle(initialTitle);
      setQueryAuthor(initialAuthor);
      if (initialTitle.trim() || initialAuthor.trim()) {
        void executeSearch(initialTitle, initialAuthor, queryIsbn);
      }
    }
  }, [open, initialTitle, initialAuthor]);

  const executeSearch = async (titleVal: string, authorVal: string, isbnVal: string) => {
    if (!titleVal.trim() && !authorVal.trim() && !isbnVal.trim()) return;

    setLoading(true);
    setHasSearched(true);
    const candidateResults: MultiSourceSearchResult[] = [];

    try {
      // 1. Fetch from Google Books API
      const searchTerms = [
        queryIsbn.trim() ? `isbn:${queryIsbn.trim()}` : "",
        queryTitle.trim() ? `intitle:${queryTitle.trim()}` : "",
        queryAuthor.trim() ? `inauthor:${queryAuthor.trim()}` : "",
      ]
        .filter(Boolean)
        .join("+");

      if (searchTerms) {
        const gbRes = await fetch(
          `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(searchTerms)}&maxResults=6`
        );
        if (gbRes.ok) {
          const gbData = await gbRes.json();
          if (gbData.items && Array.isArray(gbData.items)) {
            gbData.items.forEach((item: any) => {
              const info = item.volumeInfo || {};
              const cover =
                info.imageLinks?.thumbnail?.replace("http://", "https://") ||
                info.imageLinks?.smallThumbnail?.replace("http://", "https://");
              candidateResults.push({
                id: `gb-${item.id}`,
                source: "Google Books",
                title: info.title || queryTitle,
                author: info.authors ? info.authors.join(", ") : queryAuthor,
                description: info.description || "",
                cover_url: cover || "",
                category: info.categories ? info.categories[0] : "",
                subject: info.categories ? info.categories.join(", ") : "",
                language: info.language === "en" ? "English" : info.language || "",
                publisher: info.publisher || "",
                publishYear: info.publishedDate ? info.publishedDate.substring(0, 4) : "",
                pageCount: info.pageCount || 0,
                isbn: info.industryIdentifiers?.[0]?.identifier || queryIsbn,
              });
            });
          }
        }
      }
    } catch (err) {
      console.error("Google Books fetch error:", err);
    }

    try {
      // 2. Fetch from Open Library API
      const olQuery = queryIsbn.trim() || `${queryTitle.trim()} ${queryAuthor.trim()}`.trim();
      if (olQuery) {
        const olRes = await fetch(
          `https://openlibrary.org/search.json?q=${encodeURIComponent(olQuery)}&limit=6`
        );
        if (olRes.ok) {
          const olData = await olRes.json();
          if (olData.docs && Array.isArray(olData.docs)) {
            olData.docs.forEach((doc: any) => {
              const cover = doc.cover_i
                ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`
                : "";
              candidateResults.push({
                id: `ol-${doc.key}`,
                source: "Open Library",
                title: doc.title || queryTitle,
                author: doc.author_name ? doc.author_name.join(", ") : queryAuthor,
                description: doc.first_sentence ? doc.first_sentence[0] : "",
                cover_url: cover,
                category: doc.subject ? doc.subject[0] : "",
                subject: doc.subject ? doc.subject.slice(0, 3).join(", ") : "",
                language: doc.language ? (doc.language[0] === "eng" ? "English" : doc.language[0]) : "",
                publisher: doc.publisher ? doc.publisher[0] : "",
                publishYear: doc.first_publish_year ? String(doc.first_publish_year) : "",
                isbn: doc.isbn ? doc.isbn[0] : queryIsbn,
              });
            });
          }
        }
      }
    } catch (err) {
      console.error("Open Library fetch error:", err);
    }

    // 3. Smart Fallback / Combined API check if no results yet
    if (candidateResults.length === 0 && (queryTitle || queryAuthor)) {
      try {
        const smartDetails = await fetchBookByQuery(queryTitle, queryAuthor);
        if (smartDetails) {
          candidateResults.push({
            id: `smart-${Date.now()}`,
            source: "Combined API",
            title: smartDetails.title || queryTitle,
            author: smartDetails.author || queryAuthor,
            description: smartDetails.description || "",
            cover_url: smartDetails.cover_url || "",
            category: smartDetails.category || "",
            subject: smartDetails.subject || "",
            language: smartDetails.language || "",
            class_level: smartDetails.class_level || "",
          });
        }
      } catch (err) {
        console.error("Combined fallback error:", err);
      }
    }

    setResults(candidateResults);
    setLoading(false);

    if (candidateResults.length === 0) {
      toast({
        title: "No candidate books found",
        description: "Try refining your search terms or enter details manually.",
      });
    }
  };

  const handleSearch = () => {
    void executeSearch(queryTitle, queryAuthor, queryIsbn);
  };

  const filteredResults = results.filter((item) => {
    if (activeTab === "google") return item.source === "Google Books";
    if (activeTab === "openlibrary") return item.source === "Open Library";
    return true;
  });

  const handleSelect = (item: MultiSourceSearchResult) => {
    onSelectBook({
      title: item.title,
      author: item.author,
      description: item.description,
      cover_url: item.cover_url,
      category: item.category,
      subject: item.subject,
      language: item.language,
      class_level: item.class_level,
      isbn: item.isbn,
    });
    toast({
      title: "Book metadata selected!",
      description: `Populated details for "${item.title}".`,
    });
    onOpenChange(false);
  };

  const handleSelectCoverOnly = (item: MultiSourceSearchResult) => {
    onSelectBook({
      cover_url: item.cover_url,
    });
    toast({
      title: "Cover selected!",
      description: `Updated cover image for "${item.title}".`,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Sparkles className="h-5 w-5 text-indigo-500" /> Multi-Source Book Fetch Picker
          </DialogTitle>
          <DialogDescription>
            Search across Google Books, Open Library, and Internet Archive to fetch covers, descriptions, and categories.
          </DialogDescription>
        </DialogHeader>

        {/* Search Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-2">
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Book Title</label>
            <Input
              placeholder="e.g. Wings of Fire"
              value={queryTitle}
              onChange={(e) => setQueryTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Author</label>
            <Input
              placeholder="e.g. A.P.J. Abdul Kalam"
              value={queryAuthor}
              onChange={(e) => setQueryAuthor(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">ISBN / Barcode</label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. 9780143424123"
                value={queryIsbn}
                onChange={(e) => setQueryIsbn(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <Button onClick={handleSearch} disabled={loading} className="gradient-primary shrink-0">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Source Filter Tabs */}
        {results.length > 0 && (
          <div className="flex justify-between items-center my-2 border-b pb-2">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
              <TabsList className="h-8">
                <TabsTrigger value="all" className="text-xs px-3">
                  All Sources ({results.length})
                </TabsTrigger>
                <TabsTrigger value="google" className="text-xs px-3">
                  Google Books ({results.filter((r) => r.source === "Google Books").length})
                </TabsTrigger>
                <TabsTrigger value="openlibrary" className="text-xs px-3">
                  Open Library ({results.filter((r) => r.source === "Open Library").length})
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <span className="text-xs text-muted-foreground">Select candidate to populate form</span>
          </div>
        )}

        {/* Results Display */}
        <ScrollArea className="flex-1 max-h-[50vh] pr-3 my-2">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-medium">Searching metadata across multiple internet sources...</p>
            </div>
          ) : filteredResults.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredResults.map((item) => (
                <div
                  key={item.id}
                  className="border rounded-xl p-4 flex gap-4 bg-card hover:border-primary/50 transition-all shadow-sm relative group"
                >
                  <div className="w-20 h-28 bg-muted rounded-md overflow-hidden shrink-0 flex items-center justify-center border">
                    {item.cover_url ? (
                      <img
                        src={item.cover_url}
                        alt={item.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <BookOpen className="h-8 w-8 text-muted-foreground/40" />
                    )}
                  </div>

                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    <div>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge
                          variant={item.source === "Google Books" ? "default" : "secondary"}
                          className="text-[10px] px-1.5 py-0"
                        >
                          {item.source}
                        </Badge>
                        {item.category && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {item.category}
                          </Badge>
                        )}
                        {item.publishYear && (
                          <span className="text-[10px] text-muted-foreground">{item.publishYear}</span>
                        )}
                      </div>

                      <h4 className="font-semibold text-sm line-clamp-1 text-foreground" title={item.title}>
                        {item.title}
                      </h4>
                      <p className="text-xs text-muted-foreground mb-1">by {item.author || "Unknown"}</p>
                      {item.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 italic">
                          "{item.description}"
                        </p>
                      )}
                    </div>

                    <div className="pt-2 flex justify-end gap-2">
                      {item.cover_url && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSelectCoverOnly(item)}
                          className="h-7 text-xs gap-1 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                        >
                          <ImageIcon className="h-3.5 w-3.5 text-indigo-500" /> Cover Only
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleSelect(item)}
                        className="h-7 text-xs gap-1 gradient-primary"
                      >
                        <Check className="h-3.5 w-3.5" /> Use Metadata
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : hasSearched ? (
            <div className="text-center py-12 text-muted-foreground">
              <BookOpen className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="font-medium text-sm">No book results found for these terms.</p>
              <p className="text-xs mt-1">Try entering only the main title keywords or ISBN number.</p>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Globe className="h-10 w-10 mx-auto mb-2 opacity-30 text-indigo-500" />
              <p className="font-medium text-sm">Search and compare metadata across sources</p>
              <p className="text-xs mt-1">Enter a title or ISBN above and click Search.</p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
