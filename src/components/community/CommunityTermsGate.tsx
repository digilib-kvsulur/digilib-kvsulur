import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ShieldAlert, Users, Heart, Ban, MessageCircle, Flag, BookMarked } from "lucide-react";

export const COMMUNITY_TERMS_VERSION = "v2";

export const communityTermsKey = (userId: string) =>
  `community_terms_accepted_${COMMUNITY_TERMS_VERSION}_${userId}`;

export const hasAcceptedCommunityTerms = (userId?: string | null) => {
  if (!userId) return false;
  try {
    return localStorage.getItem(communityTermsKey(userId)) === "true";
  } catch {
    return false;
  }
};

const RULES = [
  {
    icon: Heart,
    title: "Be respectful",
    text: "Treat every classmate, teacher and librarian with kindness. No bullying, harassment, threats or personal attacks.",
  },
  {
    icon: Ban,
    title: "No bad language or vulgar content",
    text: "Abusive words, slurs, adult content or hateful posts are strictly not allowed. Posts are auto-filtered and reviewed by staff.",
  },
  {
    icon: MessageCircle,
    title: "No spam or flooding",
    text: "Normal greetings and brief replies are welcome. Do not flood the community with repeated words or the same message (for example, ‘hi hi hi’), or repeatedly post unrelated links.",
  },
  {
    icon: BookMarked,
    title: "Share original work and credit sources",
    text: "Write posts and stories in your own words. Do not present another person’s writing, answers, or creative work as your own. Quote only what you need and name/link the source. Suspected copies may be held from posting for review.",
  },
  {
    icon: Users,
    title: "Keep it school-appropriate",
    text: "Share reading reflections, doubts, book reviews and library news. Never share personal details like phone numbers or addresses.",
  },
  {
    icon: Flag,
    title: "Report, don't retaliate",
    text: "Use the report option on any post or comment that breaks these rules. The library team reviews every report.",
  },
];

export default function CommunityTermsGate({
  userId,
  onAccept,
}: {
  userId: string;
  onAccept: () => void;
}) {
  const [checked, setChecked] = useState(false);

  const accept = () => {
    try {
      localStorage.setItem(communityTermsKey(userId), "true");
      localStorage.setItem(`${communityTermsKey(userId)}_at`, new Date().toISOString());
    } catch {
      /* ignore storage errors */
    }
    onAccept();
  };

  return (
    <div className="max-w-3xl mx-auto">
      <Card className="border-primary/30 shadow-lg overflow-hidden">
        <div className="h-1.5 gradient-primary" />
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-xl">
            <ShieldAlert className="h-5 w-5 text-primary" />
            Community Terms &amp; Conditions
          </CardTitle>
          <CardDescription>
            Please read these rules once before joining the school library community.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {RULES.map((r) => (
              <div key={r.title} className="flex gap-3 rounded-xl border border-border/60 p-3 bg-muted/20">
                <div className="h-9 w-9 shrink-0 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <r.icon className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{r.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{r.text}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 space-y-2">
            <p className="text-sm font-bold text-destructive flex items-center gap-2">
              <Ban className="h-4 w-4" /> Content Policy &amp; Warnings
            </p>
            <div className="text-xs text-destructive/95 space-y-1.5 font-medium leading-relaxed bg-white/60 p-3 rounded-lg border border-destructive/20">
              <p><strong>Ordinary reminders:</strong> Clear repeated-content spam receives up to three ordinary reminders first. Posting speed alone only asks you to slow down and does not count as misconduct.</p>
              <p><strong>Formal warning 1:</strong> After three ordinary reminders, posting is paused for 24 hours.</p>
              <p><strong>Formal warning 2:</strong> Continued clear violations pause posting for 48 hours.</p>
              <p><strong>Formal warning 3:</strong> Continued violations may lead to account deactivation and administrator review.</p>
              <p><strong>Plagiarism:</strong> Likely copied posts are stopped before publishing. Rewrite in your own words or quote and clearly credit the author/source. Repeated deliberate plagiarism may receive formal moderation.</p>
              <p>Badges are not automatically removed for a community warning. You may appeal a decision to the library team.</p>
            </div>
            <p className="text-[11px] text-muted-foreground italic">
              * Administrators and staff members are exempt from community moderation rules.
            </p>
          </div>

          <label className="flex items-start gap-3 rounded-xl border p-3 cursor-pointer hover:bg-muted/40 transition-colors">
            <Checkbox
              checked={checked}
              onCheckedChange={(v) => setChecked(v === true)}
              className="mt-0.5"
            />
            <span className="text-sm">
              I have read and agree to follow the community terms and conditions. I understand that breaking these
              rules can get me temporarily or permanently banned.
            </span>
          </label>

          <Button className="w-full" size="lg" disabled={!checked} onClick={accept}>
            Agree &amp; Enter Community
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
