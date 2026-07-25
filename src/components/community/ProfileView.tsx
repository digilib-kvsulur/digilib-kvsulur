import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import {
  UserPlus, Check, X, Clock, UserCheck, UserX, Trophy, Flame, BookOpen,
  Sparkles, Award, MessageCircle, Heart, FileText, Users as UsersIcon
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const nameOf = (p: any) => p ? `${p.first_name || ""} ${p.last_name || ""}`.trim() || p.username || "User" : "User";
const initials = (p: any) => nameOf(p).split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();

interface Props {
  userId: string;
  currentUserId: string;
  friendship?: any;
  onSend: (id: string) => void;
  onRespond: (id: string, status: string) => void;
  onRemove: (id: string) => void;
}

export const ProfileView = ({ userId, currentUserId, friendship, onSend, onRespond, onRemove }: Props) => {
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [badges, setBadges] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [{ data: full }, { data: extraStats }, { data: allBadges }, { data: awards }, { data: userPosts }] = await Promise.all([
        supabase.rpc("get_public_profile_full", { _id: userId }),
        supabase.rpc("get_public_profile_stats", { _id: userId }),
        supabase.from("badges").select("*").eq("is_active", true),
        supabase.from("badge_awards").select("badge_id").eq("user_id", userId),
        supabase.rpc("get_public_posts_by_user", { _id: userId, _limit: 20 }),
      ]);
      const p: any = (full || [])[0] || null;
      const s: any = (extraStats || [])[0] || {};
      setProfile(p);
      setStats({ ...p, ...s });
      
      const manualAwards = new Set((awards || []).map((a: any) => a.badge_id));
      const getStatValue = (type?: string) => {
        if (type === "points") return p?.points || 0;
        if (type === "books_read") return s?.books_read || 0;
        if (type === "quizzes_completed") return s?.quizzes || 0;
        if (type === "login_streak") return s?.current_streak || 0;
        return 0;
      };

      const unlockedBadges = (allBadges || []).filter((b: any) => {
        if (manualAwards.has(b.id)) return true;
        if (b.criteria_type === "manual" || !b.criteria_type) return false;
        return getStatValue(b.criteria_type) >= (b.criteria_value || 0);
      });

      setBadges(unlockedBadges);
      setPosts(userPosts || []);
      if (p?.avatar_url) {
        if (p.avatar_url.startsWith("http")) {
          setAvatarUrl(p.avatar_url);
        } else {
          const { data: signed } = await supabase.storage.from("avatars").createSignedUrl(p.avatar_url, 3600);
          setAvatarUrl(signed?.signedUrl || null);
        }
      } else {
        setAvatarUrl(null);
      }
      setLoading(false);
    };
    load();
  }, [userId]);

  if (loading || !profile) return <div className="p-10 text-center text-sm text-muted-foreground">Loading profile…</div>;

  const isSelf = userId === currentUserId;
  const status = friendship?.status;
  const iSent = friendship?.requester_id === currentUserId;

  return (
    <div className="max-h-[85vh] overflow-y-auto">
      {/* Profile Header – no overlapping banner */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center gap-4 mb-4">
          <Avatar className="h-20 w-20 ring-4 ring-primary/20 shadow-lg shrink-0">
            {avatarUrl && <AvatarImage src={avatarUrl} />}
            <AvatarFallback className="gradient-primary text-primary-foreground font-bold text-2xl">{initials(profile)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 grid grid-cols-3 gap-2 text-center">
            <StatBlock value={profile.posts_count} label="Posts" />
            <StatBlock value={profile.followers_count} label="Followers" />
            <StatBlock value={profile.following_count} label="Following" />
          </div>
        </div>

        <DialogHeader className="text-left space-y-1 mb-3">
          <DialogTitle className="text-lg">{nameOf(profile)}</DialogTitle>
          <div className="flex flex-wrap items-center gap-1.5">
            {profile.username && <span className="text-xs text-muted-foreground">@{profile.username}</span>}
            {profile.role && <Badge variant="secondary" className="capitalize text-[10px]">{profile.role}</Badge>}
            {profile.student_class && <Badge variant="outline" className="text-[10px]">Class {profile.student_class}</Badge>}
          </div>
          {profile.bio && <p className="text-sm text-foreground/80 pt-1">{profile.bio}</p>}
        </DialogHeader>

        {!isSelf && (
          <div className="mb-4">
            {!friendship && <Button className="w-full" onClick={() => onSend(userId)}><UserPlus className="h-4 w-4 mr-2" />Follow / Add Friend</Button>}
            {status === "pending" && iSent && <Button variant="outline" className="w-full" disabled><Clock className="h-4 w-4 mr-2" />Request Sent</Button>}
            {status === "pending" && !iSent && (
              <div className="flex gap-2">
                <Button className="flex-1" onClick={() => onRespond(userId, "accepted")}><Check className="h-4 w-4 mr-2" />Accept</Button>
                <Button variant="outline" className="flex-1" onClick={() => onRespond(userId, "rejected")}><X className="h-4 w-4 mr-2" />Decline</Button>
              </div>
            )}
            {status === "accepted" && (
              <div className="flex gap-2">
                <Badge className="flex-1 justify-center py-2 bg-green-600 text-sm"><UserCheck className="h-4 w-4 mr-2" />Following</Badge>
                <Button variant="outline" onClick={() => onRemove(userId)}><UserX className="h-4 w-4" /></Button>
              </div>
            )}
          </div>
        )}

        <Tabs defaultValue="posts" className="space-y-3">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="posts" className="text-xs"><FileText className="h-3.5 w-3.5 mr-1" />Posts</TabsTrigger>
            <TabsTrigger value="stats" className="text-xs"><Trophy className="h-3.5 w-3.5 mr-1" />Stats</TabsTrigger>
            <TabsTrigger value="badges" className="text-xs"><Award className="h-3.5 w-3.5 mr-1" />Badges</TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="space-y-2">
            {posts.length === 0 ? (
              <p className="text-center py-10 text-sm text-muted-foreground">No posts yet.</p>
            ) : posts.map((p: any) => (
              <Card key={p.id} className="border-border/60">
                <CardContent className="p-3">
                  <p className="text-sm font-semibold">{p.title}</p>
                  <p className="text-xs text-foreground/80 mt-1 whitespace-pre-wrap line-clamp-4">{p.content}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Heart className="h-3 w-3" />{p.likes_count}</span>
                    <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" />{p.comments_count}</span>
                    <span className="ml-auto">{new Date(p.created_at).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="stats">
            <div className="grid grid-cols-4 gap-2">
              <BigStat icon={<Trophy className="h-4 w-4 text-yellow-500" />} value={profile.points || 0} label="Points" />
              <BigStat icon={<Flame className="h-4 w-4 text-orange-500" />} value={stats?.current_streak || 0} label="Streak" />
              <BigStat icon={<BookOpen className="h-4 w-4 text-blue-500" />} value={stats?.books_read || 0} label="Books" />
              <BigStat icon={<Sparkles className="h-4 w-4 text-purple-500" />} value={stats?.quizzes || 0} label="Quizzes" />
            </div>
            <div className="mt-3 rounded-md bg-muted/30 p-3 text-xs space-y-1">
              <p><span className="font-semibold">Longest streak:</span> {stats?.longest_streak || 0} days</p>
              <p><span className="font-semibold">Friends:</span> {profile.friends_count}</p>
            </div>
          </TabsContent>

          <TabsContent value="badges">
            {badges.length === 0 ? (
              <p className="text-center py-10 text-sm text-muted-foreground">No badges earned yet.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {badges.map((b: any, i: number) => (
                  <Badge key={i} variant="secondary" className="text-xs"><Award className="h-3 w-3 mr-1" />{b.name}</Badge>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

const StatBlock = ({ value, label }: any) => (
  <div className="rounded-lg py-1.5">
    <p className="text-lg font-bold leading-none">{value ?? 0}</p>
    <p className="text-[10px] text-muted-foreground mt-1">{label}</p>
  </div>
);

const BigStat = ({ icon, value, label }: any) => (
  <div className="rounded-lg bg-muted/40 p-2 text-center">
    <div className="flex justify-center mb-1">{icon}</div>
    <p className="text-lg font-bold leading-none">{value}</p>
    <p className="text-[9px] text-muted-foreground mt-1">{label}</p>
  </div>
);
