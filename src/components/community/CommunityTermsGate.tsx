import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ShieldAlert, Users, Heart, Ban, MessageCircle, Flag } from "lucide-react";

export const COMMUNITY_TERMS_VERSION = "v1";

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
    text: "Do not post the same message repeatedly, advertise, share unrelated links, or flood comments and polls.",
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

          <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4">
            <p className="text-sm font-bold text-destructive flex items-center gap-2">
              <Ban className="h-4 w-4" /> Important warning
            </p>
            <p className="text-xs text-destructive/90 mt-1.5 leading-relaxed">
              Using bad words, posting vulgar content, harassing others or spamming the community may lead to a
              <strong> temporary or permanent ban</strong> from the community, removal of your posts, and loss of
              earned points. Repeat offences are reported to the librarian and class teacher.
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
