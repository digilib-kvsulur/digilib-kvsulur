import { BookOpen, MessageSquarePlus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function StudyEmptyState({
  title = "Materials for this chapter are being reviewed.",
  description = "You can still use the official NCERT chapter or ask for help while DLMS materials are reviewed.",
  onOpenNcert,
  onAskDoubt,
  onRequestNotes,
  requesting,
}: {
  title?: string;
  description?: string;
  onOpenNcert?: () => void;
  onAskDoubt?: () => void;
  onRequestNotes?: () => void;
  requesting?: boolean;
}) {
  return (
    <Card className="rounded-xl border-dashed border-border/80 shadow-none bg-muted/10">
      <CardContent className="py-10 px-5 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <BookOpen className="h-7 w-7" />
        </div>
        <h3 className="text-base sm:text-lg font-semibold text-foreground">{title}</h3>
        <p className="mt-2 text-sm text-muted-foreground max-w-xl mx-auto leading-6">{description}</p>
        <div className="mt-5 flex flex-col sm:flex-row flex-wrap justify-center gap-2.5">
          {onOpenNcert && <Button type="button" className="min-h-11 rounded-xl" onClick={onOpenNcert}><BookOpen className="h-4 w-4 mr-2" />Open NCERT chapter</Button>}
          {onAskDoubt && <Button type="button" variant="outline" className="min-h-11 rounded-xl" onClick={onAskDoubt}><Sparkles className="h-4 w-4 mr-2" />Ask AI doubt</Button>}
          {onRequestNotes && <Button type="button" variant="ghost" className="min-h-11 rounded-xl" onClick={onRequestNotes} disabled={requesting}><MessageSquarePlus className="h-4 w-4 mr-2" />{requesting ? "Requesting..." : "Request notes"}</Button>}
        </div>
      </CardContent>
    </Card>
  );
}
