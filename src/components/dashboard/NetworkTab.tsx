import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users, Search, UserPlus, UserX, Check, X, Clock, Sparkles, RefreshCw, Trophy
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ProfileView } from "@/components/community/ProfileView";
import { UserConnectionsDialog } from "@/components/community/UserConnectionsDialog";

interface NetworkTabProps {
  user: any;
}

interface SuggestionUser {
  id: string;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  student_class: string | null;
  role: string | null;
  points: number | null;
  avatar_url: string | null;
  bio?: string | null;
  reason?: string | null;
  mutual_count?: number | null;
}

const NetworkTab = ({ user }: NetworkTabProps) => {
  const [friendshipsMap, setFriendshipsMap] = useState<Record<string, any>>({});
  const [friendsProfiles, setFriendsProfiles] = useState<Record<string, any>>({});
  const [profileDialogUser, setProfileDialogUser] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [activeSubTab, setActiveSubTab] = useState("list");
  
  // Follow suggestions state
  const [suggestions, setSuggestions] = useState<SuggestionUser[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionFilter, setSuggestionFilter] = useState<"all" | "class" | "readers" | "mutual">("all");
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());

  // Direct connections dialog state (view followers or following of any user)
  const [connectionsDialog, setConnectionsDialog] = useState<{
    userId: string;
    userName: string;
    tab: "followers" | "following";
  } | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    if (user?.id) {
      loadFriendshipsMap();
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      loadSuggestions();
    }
  }, [user?.id, Object.keys(friendshipsMap).length]);

  useEffect(() => {
    if (activeSubTab !== "discover") return;
    const query = searchQuery.trim();
    if (!query) { setSearchResults([]); return; }
    const timer = window.setTimeout(() => { searchFriends(); }, 250);
    return () => window.clearTimeout(timer);
  }, [searchQuery, activeSubTab, user?.id]);

  const loadFriendshipsMap = async () => {
    if (!user?.id) return;
    try {
      const { data } = await supabase
        .from("friendships")
        .select("*")
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

      const m: Record<string, any> = {};
      (data || []).forEach((f: any) => {
        const other = f.requester_id === user.id ? f.addressee_id : f.requester_id;
        m[other] = f;
      });
      setFriendshipsMap(m);

      const ids = Object.keys(m);
      if (ids.length > 0) {
        const { data: profs } = await supabase.rpc("get_public_profiles", { _ids: ids });
        const pMap: Record<string, any> = {};
        await Promise.all((profs || []).map(async (p: any) => {
          let avatarUrl = p.avatar_url || null;
          if (avatarUrl && !avatarUrl.startsWith("http")) {
            const { data: pub } = supabase.storage.from("avatars").getPublicUrl(avatarUrl);
            avatarUrl = pub?.publicUrl || null;
          }
          pMap[p.id] = { ...p, avatar_url: avatarUrl };
        }));
        setFriendsProfiles(pMap);
      } else {
        setFriendsProfiles({});
      }
    } catch (e) {
      console.error("Error loading friendships:", e);
    }
  };

  const loadSuggestions = async () => {
    if (!user?.id) return;
    setSuggestionsLoading(true);
    try {
      let list: SuggestionUser[] = [];
      const { data: rpcData, error: rpcErr } = await (supabase.rpc as any)(
        "get_follow_suggestions",
        { p_user_id: user.id, p_limit: 30 }
      );

      if (!rpcErr && Array.isArray(rpcData) && rpcData.length > 0) {
        list = rpcData;
      } else {
        // Fallback: Query profiles directly
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, username, student_class, role, points, avatar_url, bio")
          .eq("is_approved", true)
          .neq("id", user.id)
          .limit(40);

        const myFriendIds = new Set(Object.keys(friendshipsMap));
        myFriendIds.add(user.id);

        const candidates = (profs || []).filter((p: any) => !myFriendIds.has(p.id));

        list = candidates.map((p: any) => {
          let reason = "Active in library";
          if (user.student_class && p.student_class === user.student_class) {
            reason = `Classmate in ${user.student_class}`;
          } else if (
            user.student_class &&
            p.student_class &&
            p.student_class.slice(0, 2) === user.student_class.slice(0, 2)
          ) {
            reason = `Same grade (${p.student_class})`;
          } else if (p.points && p.points > 50) {
            reason = `Top reader (${p.points} XP)`;
          }

          return {
            ...p,
            reason,
            mutual_count: 0,
          };
        });

        // Prioritize classmates then high points
        list.sort((a, b) => {
          const aMatch = user.student_class && a.student_class === user.student_class ? 1 : 0;
          const bMatch = user.student_class && b.student_class === user.student_class ? 1 : 0;
          if (aMatch !== bMatch) return bMatch - aMatch;
          return (b.points || 0) - (a.points || 0);
        });
      }

      // Resolve avatars
      const resolved = await Promise.all(
        list.map(async (item) => {
          let av = item.avatar_url;
          if (av && !av.startsWith("http")) {
            const { data: pub } = supabase.storage.from("avatars").getPublicUrl(av);
            av = pub?.publicUrl || null;
          }
          return { ...item, avatar_url: av };
        })
      );

      setSuggestions(resolved);
    } catch (err) {
      console.error("Failed to load follow suggestions:", err);
    } finally {
      setSuggestionsLoading(false);
    }
  };

  const sendFriendRequest = async (targetId: string) => {
    if (!user?.id) return;
    try {
      const existing = friendshipsMap[targetId];
      if (existing?.id) {
        const { error, data } = await supabase
          .from("friendships")
          .update({
            status: "pending",
            requester_id: user.id,
            addressee_id: targetId,
            updated_at: new Date().toISOString()
          })
          .eq("id", existing.id)
          .select().single();
        if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
        setFriendshipsMap(m => ({ ...m, [targetId]: data }));
        toast({ title: "Follow request sent!" });
        await loadFriendshipsMap();
        return;
      }

      const { data: dbExisting } = await supabase
        .from("friendships")
        .select("id")
        .or(`and(requester_id.eq.${user.id},addressee_id.eq.${targetId}),and(requester_id.eq.${targetId},addressee_id.eq.${user.id})`)
        .maybeSingle();

      if (dbExisting?.id) {
        const { error, data } = await supabase
          .from("friendships")
          .update({
            status: "pending",
            requester_id: user.id,
            addressee_id: targetId,
            updated_at: new Date().toISOString()
          })
          .eq("id", dbExisting.id)
          .select().single();
        if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
        setFriendshipsMap(m => ({ ...m, [targetId]: data }));
        toast({ title: "Follow request sent!" });
        await loadFriendshipsMap();
        return;
      }

      const { error, data } = await supabase
        .from("friendships")
        .insert({ requester_id: user.id, addressee_id: targetId, status: "pending" })
        .select().single();
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      setFriendshipsMap(m => ({ ...m, [targetId]: data }));
      toast({ title: "Follow request sent!" });
      await loadFriendshipsMap();
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to send request", variant: "destructive" });
    }
  };

  const respondFriendRequest = async (targetId: string, status: string) => {
    const f = friendshipsMap[targetId];
    if (!f) return;
    const { error } = await supabase.from("friendships").update({ status }).eq("id", f.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: status === "accepted" ? "Friend request accepted 🎉" : "Declined" });
    await loadFriendshipsMap();
  };

  const removeFriend = async (targetId: string) => {
    const f = friendshipsMap[targetId];
    if (!f) return;
    const { error } = await supabase.from("friendships").delete().eq("id", f.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setFriendshipsMap(m => { const c = { ...m }; delete c[targetId]; return c; });
    toast({ title: "Friend removed" });
    await loadFriendshipsMap();
  };

  const searchFriends = async () => {
    if (!searchQuery.trim() || !user?.id) { setSearchResults([]); return; }
    const { data, error } = await supabase.rpc("search_public_profiles", { _q: searchQuery.trim(), _exclude: user.id });
    if (error) { toast({ title: "Search failed", description: error.message, variant: "destructive" }); }
    else { setSearchResults(data || []); }
  };

  const pendingIncoming = Object.entries(friendshipsMap).filter(([_, f]) => f.status === "pending" && f.addressee_id === user?.id);
  const pendingOutgoing = Object.entries(friendshipsMap).filter(([_, f]) => f.status === "pending" && f.requester_id === user?.id);
  const acceptedFriends = Object.entries(friendshipsMap).filter(([_, f]) => f.status === "accepted");

  const filteredSuggestions = useMemo(() => {
    return suggestions.filter((s) => {
      if (dismissedSuggestions.has(s.id)) return false;
      if (friendshipsMap[s.id]?.status === "accepted") return false;

      if (suggestionFilter === "class") {
        return (
          user?.student_class &&
          (s.student_class === user.student_class ||
            (s.student_class && s.student_class.slice(0, 2) === user.student_class.slice(0, 2)))
        );
      }
      if (suggestionFilter === "readers") {
        return (s.points || 0) >= 30;
      }
      if (suggestionFilter === "mutual") {
        return (s.mutual_count || 0) > 0;
      }
      return true;
    });
  }, [suggestions, dismissedSuggestions, friendshipsMap, suggestionFilter, user?.student_class]);

  const activeSuggestionsCount = suggestions.filter(
    (s) => !dismissedSuggestions.has(s.id) && friendshipsMap[s.id]?.status !== "accepted"
  ).length;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0">
          <Users className="h-5 w-5 text-indigo-500" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Classmate Network</h2>
          <p className="text-xs text-muted-foreground">Connect, follow, and explore classmate profiles</p>
        </div>
      </div>

      <Card className="border-border/40 bg-card/75 backdrop-blur-md shadow-md">
        <CardContent className="p-3 sm:p-4">
          <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="space-y-3">

            {/* ── Tab bar — 4 columns, compact icon + short text on mobile ── */}
            <TabsList className="grid w-full grid-cols-4 p-0.5 bg-muted/30 border border-border/30 rounded-lg h-auto">
              {/* Friends */}
              <TabsTrigger
                value="list"
                className="text-[10px] sm:text-xs font-bold py-1.5 flex flex-col sm:flex-row items-center gap-0.5 sm:gap-1 relative"
              >
                <Users className="h-3.5 w-3.5 shrink-0" />
                <span>Friends</span>
                {acceptedFriends.length > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-indigo-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center sm:static sm:min-w-0 sm:h-auto sm:px-0 sm:bg-transparent sm:text-indigo-600 dark:sm:text-indigo-400 sm:rounded-none">
                    {acceptedFriends.length}
                  </span>
                )}
              </TabsTrigger>

              {/* Suggestions */}
              <TabsTrigger
                value="suggestions"
                className="text-[10px] sm:text-xs font-bold py-1.5 flex flex-col sm:flex-row items-center gap-0.5 sm:gap-1 relative"
              >
                <Sparkles className="h-3.5 w-3.5 shrink-0" />
                <span className="sm:hidden">Suggest</span>
                <span className="hidden sm:inline">Suggestions</span>
                {activeSuggestionsCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-indigo-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center sm:static sm:min-w-0 sm:h-auto sm:px-1.5 sm:py-0 sm:bg-indigo-500/10 sm:text-indigo-600 dark:sm:text-indigo-400 sm:border sm:border-indigo-500/20 sm:rounded-full">
                    {activeSuggestionsCount}
                  </span>
                )}
              </TabsTrigger>

              {/* Requests */}
              <TabsTrigger
                value="requests"
                className="text-[10px] sm:text-xs font-bold py-1.5 flex flex-col sm:flex-row items-center gap-0.5 sm:gap-1 relative"
              >
                <UserPlus className="h-3.5 w-3.5 shrink-0" />
                <span>Requests</span>
                {pendingIncoming.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full animate-pulse" />
                )}
              </TabsTrigger>

              {/* Discover */}
              <TabsTrigger
                value="discover"
                className="text-[10px] sm:text-xs font-bold py-1.5 flex flex-col sm:flex-row items-center gap-0.5 sm:gap-1"
              >
                <Search className="h-3.5 w-3.5 shrink-0" />
                <span>Discover</span>
              </TabsTrigger>
            </TabsList>

            {/* ── Friends List ── */}
            <TabsContent value="list" className="space-y-3 pt-1 outline-none">
              {acceptedFriends.length === 0 ? (
                <div className="space-y-5">
                  <div className="text-center py-8 text-muted-foreground">
                    <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500 mx-auto mb-3">
                      <Users className="h-6 w-6" />
                    </div>
                    <p className="font-bold text-foreground/90 text-sm">No classmate links yet</p>
                    <p className="text-xs text-muted-foreground/80 mt-1 mb-4">Discover and connect with classmates!</p>
                    <div className="flex justify-center gap-2 flex-wrap">
                      <Button size="sm" onClick={() => setActiveSubTab("suggestions")} className="rounded-lg bg-indigo-600 hover:bg-indigo-700 shadow-md">
                        <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                        Suggestions ({activeSuggestionsCount})
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setActiveSubTab("discover")} className="rounded-lg">
                        Discover All
                      </Button>
                    </div>
                  </div>

                  {/* Quick suggestions strip */}
                  {filteredSuggestions.length > 0 && (
                    <div className="pt-4 border-t border-border/30">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <Sparkles className="h-3.5 w-3.5 text-indigo-500" /> Suggested
                        </h4>
                        <button
                          onClick={() => setActiveSubTab("suggestions")}
                          className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                        >
                          See all ({activeSuggestionsCount}) →
                        </button>
                      </div>

                      <div className="space-y-2">
                        {filteredSuggestions.slice(0, 3).map((s) => {
                          const fullName = `${s.first_name || ""} ${s.last_name || ""}`.trim() || s.username || "User";
                          const ini = fullName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "U";
                          return (
                            <div key={s.id} className="p-2.5 bg-muted/20 hover:bg-muted/30 border border-border/30 rounded-xl flex items-center justify-between gap-2 transition-all">
                              <div className="flex items-center gap-2.5 min-w-0 cursor-pointer" onClick={() => setProfileDialogUser(s.id)}>
                                <Avatar className="h-8 w-8 ring-2 ring-indigo-500/10 shrink-0">
                                  {s.avatar_url && <AvatarImage src={s.avatar_url} />}
                                  <AvatarFallback className="bg-gradient-to-br from-indigo-500/80 to-purple-500/80 text-white font-bold text-xs">{ini}</AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-foreground truncate hover:underline">{fullName}</p>
                                  <p className="text-[10px] text-muted-foreground truncate">{s.reason || `Class ${s.student_class || "—"}`}</p>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                onClick={() => sendFriendRequest(s.id)}
                                className="h-7 px-2.5 text-xs bg-indigo-600 hover:bg-indigo-700 rounded-lg shrink-0"
                              >
                                <UserPlus className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {acceptedFriends.map(([uid]) => {
                    const p = friendsProfiles[uid] || {};
                    const ini = `${(p.first_name?.[0] || "").toUpperCase()}${(p.last_name?.[0] || "").toUpperCase()}`;
                    return (
                      <div key={uid} className="flex items-center justify-between p-3 bg-muted/20 hover:bg-muted/40 border border-border/30 rounded-xl transition-all">
                        <div className="flex items-center gap-3 cursor-pointer min-w-0 flex-1 pr-2" onClick={() => setProfileDialogUser(uid)}>
                          <Avatar className="h-9 w-9 ring-2 ring-indigo-500/10 shrink-0">
                            {p.avatar_url && <AvatarImage src={p.avatar_url} alt={`${p.first_name || "User"}'s profile picture`} />}
                            <AvatarFallback className="bg-gradient-to-br from-indigo-500/80 to-purple-500/80 text-white font-bold text-xs">{ini || "U"}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-foreground hover:underline truncate">{p.first_name} {p.last_name}</p>
                            <p className="text-xs text-muted-foreground truncate">@{p.username || "username"} · {p.student_class || "—"}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => setConnectionsDialog({ userId: uid, userName: `${p.first_name || "Friend"}'s`, tab: "followers" })}
                            title="View followers & following"
                          >
                            <Users className="h-3.5 w-3.5 text-muted-foreground hover:text-indigo-600" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => removeFriend(uid)} title="Remove friend">
                            <UserX className="h-4 w-4 text-muted-foreground/60 hover:text-rose-500 transition-colors" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* ── Suggestions Tab ── */}
            <TabsContent value="suggestions" className="space-y-3 pt-1 outline-none">
              {/* Header & Refresh — always inline */}
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-indigo-500 shrink-0" /> Suggested for You
                  </h3>
                  <p className="text-xs text-muted-foreground truncate">
                    Classmates, grade-mates &amp; top readers
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={loadSuggestions}
                  disabled={suggestionsLoading}
                  className="h-7 text-xs px-2.5 shrink-0 rounded-lg border-border/50"
                >
                  <RefreshCw className={`h-3 w-3 mr-1 ${suggestionsLoading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>

              {/* Filter Chips — horizontal scroll, bleeds to card edge on mobile */}
              <div className="-mx-3 sm:mx-0 overflow-x-auto pb-1 scrollbar-none">
                <div className="flex items-center gap-1.5 px-3 sm:px-0 whitespace-nowrap">
                  <button
                    onClick={() => setSuggestionFilter("all")}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                      suggestionFilter === "all"
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    All ({suggestions.filter((s) => !dismissedSuggestions.has(s.id) && friendshipsMap[s.id]?.status !== "accepted").length})
                  </button>
                  {user?.student_class && (
                    <button
                      onClick={() => setSuggestionFilter("class")}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                        suggestionFilter === "class"
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "bg-muted/50 text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      Class {user.student_class}
                    </button>
                  )}
                  <button
                    onClick={() => setSuggestionFilter("readers")}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                      suggestionFilter === "readers"
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    Top Readers
                  </button>
                  {suggestions.some((s) => (s.mutual_count || 0) > 0) && (
                    <button
                      onClick={() => setSuggestionFilter("mutual")}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                        suggestionFilter === "mutual"
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "bg-muted/50 text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      Mutual
                    </button>
                  )}
                </div>
              </div>

              {/* Suggestion Cards — single column, compact 2-row layout */}
              {suggestionsLoading && suggestions.length === 0 ? (
                <div className="space-y-2 pt-1">
                  {[1, 2, 3, 4].map((n) => (
                    <div key={n} className="p-3 bg-muted/20 border border-border/20 rounded-xl animate-pulse flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-muted/40 shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 bg-muted/40 rounded w-2/3" />
                        <div className="h-2.5 bg-muted/30 rounded w-1/2" />
                      </div>
                      <div className="w-16 h-7 bg-muted/30 rounded-lg shrink-0" />
                    </div>
                  ))}
                </div>
              ) : filteredSuggestions.length === 0 ? (
                <div className="text-center py-8 px-4 border border-dashed border-border/40 rounded-xl">
                  <Sparkles className="h-8 w-8 mx-auto mb-2 text-indigo-500/40" />
                  <p className="text-sm font-semibold text-foreground">You're all caught up!</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                    No new suggestions for this filter. Try Discover to search classmates!
                  </p>
                  <Button
                    size="sm"
                    onClick={() => setActiveSubTab("discover")}
                    className="mt-3 text-xs bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
                  >
                    Search All Classmates
                  </Button>
                </div>
              ) : (
                <div className="space-y-2 pt-0.5">
                  {filteredSuggestions.map((s) => {
                    const existing = friendshipsMap[s.id];
                    const isPending = existing?.status === "pending";
                    const fullName = `${s.first_name || ""} ${s.last_name || ""}`.trim() || s.username || "User";
                    const ini = fullName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase() || "U";

                    return (
                      <div
                        key={s.id}
                        className="relative flex items-center justify-between p-3 bg-card/60 hover:bg-card border border-border/30 hover:border-indigo-500/20 rounded-xl shadow-xs transition-all group"
                      >
                        {/* Dismiss — appears on hover/touch */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDismissedSuggestions((prev) => new Set([...prev, s.id]));
                          }}
                          className="absolute top-2 right-2 text-muted-foreground/40 hover:text-muted-foreground p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity z-10"
                          title="Dismiss suggestion"
                        >
                          <X className="h-3 w-3" />
                        </button>

                        <div
                          className="flex items-center gap-2.5 cursor-pointer min-w-0 flex-1 pr-2"
                          onClick={() => setProfileDialogUser(s.id)}
                        >
                          <Avatar className="h-10 w-10 ring-2 ring-indigo-500/10 shrink-0">
                            {s.avatar_url && <AvatarImage src={s.avatar_url} alt={fullName} />}
                            <AvatarFallback className="bg-gradient-to-br from-indigo-500/80 to-purple-500/80 text-white font-bold text-xs">
                              {ini}
                            </AvatarFallback>
                          </Avatar>

                          <div className="min-w-0 flex-1">
                            {/* Row 1: name + class badge (no wrap) */}
                            <div className="flex items-center gap-1.5 min-w-0">
                              <p className="text-xs font-bold text-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-400 truncate">
                                {fullName}
                              </p>
                              {s.student_class && (
                                <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-border/50 shrink-0">
                                  {s.student_class}
                                </Badge>
                              )}
                            </div>
                            {/* Row 2: reason pill + XP inline */}
                            <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded-full truncate max-w-[130px] sm:max-w-none">
                                <Sparkles className="h-2.5 w-2.5 shrink-0" />
                                {s.reason || "Classmate"}
                              </span>
                              {typeof s.points === "number" && s.points > 0 && (
                                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold shrink-0">
                                  ⭐ {s.points} XP
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Action button */}
                        <div className="shrink-0">
                          {isPending ? (
                            <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px] py-0.5 px-2">
                              <Clock className="h-2.5 w-2.5 mr-0.5" /> Sent
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => sendFriendRequest(s.id)}
                              className="h-7 text-xs px-2 sm:px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 shadow-sm"
                              title="Follow classmate"
                            >
                              <UserPlus className="h-3.5 w-3.5 sm:mr-1" />
                              <span className="hidden sm:inline">Follow</span>
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* ── Requests ── */}
            <TabsContent value="requests" className="space-y-4 pt-1 outline-none">
              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-emerald-500" /> Incoming ({pendingIncoming.length})
                </h4>
                {pendingIncoming.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-3 bg-muted/10 border border-border/10 rounded-lg text-center">No incoming requests</p>
                ) : (
                  <div className="space-y-2">
                    {pendingIncoming.map(([uid]) => {
                      const p = friendsProfiles[uid] || {};
                      const ini = `${(p.first_name?.[0] || "").toUpperCase()}${(p.last_name?.[0] || "").toUpperCase()}`;
                      return (
                        <div key={uid} className="flex items-center justify-between p-3 bg-card border border-border/40 rounded-xl shadow-sm">
                          <div className="flex items-center gap-3 cursor-pointer min-w-0 flex-1 pr-2" onClick={() => setProfileDialogUser(uid)}>
                            <Avatar className="h-8 w-8 shrink-0">
                              <AvatarFallback className="bg-indigo-500/10 text-indigo-500 font-bold text-xs">{ini}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-foreground hover:underline truncate">{p.first_name} {p.last_name}</p>
                              <p className="text-[10px] text-muted-foreground">@{p.username || "—"}</p>
                            </div>
                          </div>
                          <div className="flex gap-1.5 shrink-0">
                            <Button size="sm" className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700" onClick={() => respondFriendRequest(uid, "accepted")}>
                              <Check className="h-3.5 w-3.5 sm:mr-1" />
                              <span className="hidden sm:inline">Accept</span>
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 w-7 p-0 text-rose-500 hover:bg-rose-500/10 border-rose-500/20" onClick={() => respondFriendRequest(uid, "rejected")}>
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-border/30">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-amber-500" /> Sent ({pendingOutgoing.length})
                </h4>
                {pendingOutgoing.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-3 bg-muted/10 border border-border/10 rounded-lg text-center">No outgoing requests pending</p>
                ) : (
                  <div className="space-y-2">
                    {pendingOutgoing.map(([uid]) => {
                      const p = friendsProfiles[uid] || {};
                      const ini = `${(p.first_name?.[0] || "").toUpperCase()}${(p.last_name?.[0] || "").toUpperCase()}`;
                      return (
                        <div key={uid} className="flex items-center justify-between p-3 bg-card border border-border/30 rounded-xl">
                          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setProfileDialogUser(uid)}>
                            <Avatar className="h-8 w-8 shrink-0">
                              <AvatarFallback className="bg-indigo-500/10 text-indigo-500 font-bold text-xs">{ini}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-xs font-bold text-foreground">{p.first_name} {p.last_name}</p>
                              <p className="text-[10px] text-muted-foreground">@{p.username || "—"}</p>
                            </div>
                          </div>
                          <Button size="sm" variant="ghost" className="h-7 px-3 text-xs text-rose-500 hover:bg-rose-500/10" onClick={() => removeFriend(uid)}>
                            Cancel
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ── Discover ── */}
            <TabsContent value="discover" className="space-y-3 pt-1 outline-none">
              <div className="flex gap-2">
                <Input
                  placeholder="Search name or username…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && searchFriends()}
                  className="rounded-lg border-border/60"
                />
                <Button size="sm" onClick={searchFriends} className="rounded-lg bg-indigo-600 hover:bg-indigo-700 shadow-md px-3 shrink-0">
                  <Search className="h-4 w-4" />
                </Button>
              </div>

              {searchResults.length > 0 ? (
                <div className="space-y-2 mt-1">
                  {searchResults.map((r) => {
                    const existing = friendshipsMap[r.id];
                    const ini = `${(r.first_name?.[0] || "").toUpperCase()}${(r.last_name?.[0] || "").toUpperCase()}`;
                    return (
                      <div key={r.id} className="flex items-center justify-between p-3 bg-muted/20 border border-border/30 rounded-xl">
                        <div className="flex items-center gap-3 cursor-pointer min-w-0 flex-1 pr-2" onClick={() => setProfileDialogUser(r.id)}>
                          <Avatar className="h-9 w-9 shrink-0">
                            <AvatarFallback className="bg-indigo-500/10 text-indigo-500 font-bold text-xs">{ini}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-foreground hover:underline truncate">{r.first_name} {r.last_name}</p>
                            <p className="text-xs text-muted-foreground truncate">@{r.username || "—"} · {r.student_class || "—"}</p>
                          </div>
                        </div>
                        {!existing || existing.status === "rejected" ? (
                          <Button size="sm" onClick={() => sendFriendRequest(r.id)} className="h-8 bg-indigo-600 hover:bg-indigo-700 rounded-lg shrink-0" title={existing?.status === "rejected" ? "Send Request Again" : "Add Friend"}>
                            <UserPlus className="h-4 w-4" />
                          </Button>
                        ) : existing.status === "accepted" ? (
                          <Badge className="bg-emerald-600 shrink-0">Friends</Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 border-amber-500/20 font-bold shrink-0">Pending</Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : searchQuery.trim() ? (
                <p className="text-xs text-muted-foreground text-center py-6">No matching profiles found for "{searchQuery}"</p>
              ) : (
                <div className="text-center py-6 text-muted-foreground border border-dashed border-border/30 rounded-xl">
                  <Search className="h-8 w-8 mx-auto mb-2 opacity-30 text-indigo-500" />
                  <p className="text-xs font-semibold">Enter a name or username to find classmates!</p>
                </div>
              )}
            </TabsContent>

          </Tabs>
        </CardContent>
      </Card>

      {/* Profile Dialog — full-screen on mobile, modal on sm+ */}
      <Dialog open={!!profileDialogUser} onOpenChange={(o) => !o && setProfileDialogUser(null)}>
        <DialogContent className="w-full max-w-lg p-0 overflow-hidden bg-background sm:rounded-xl rounded-none border-0 sm:border border-border/40 shadow-xl h-[100dvh] sm:h-auto max-h-[100dvh] sm:max-h-[90vh] overflow-y-auto">
          <DialogHeader className="sr-only">
            <DialogTitle>User Profile</DialogTitle>
            <DialogDescription>View user profile and network options</DialogDescription>
          </DialogHeader>
          {profileDialogUser && (
            <ProfileView
              userId={profileDialogUser}
              currentUserId={user.id}
              friendship={friendshipsMap[profileDialogUser]}
              onSend={sendFriendRequest}
              onRespond={respondFriendRequest}
              onRemove={removeFriend}
              onSelectUser={(selectedId) => setProfileDialogUser(selectedId)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Direct Connections Dialog (Followers / Following) */}
      {connectionsDialog && (
        <UserConnectionsDialog
          isOpen={!!connectionsDialog}
          onClose={() => setConnectionsDialog(null)}
          userId={connectionsDialog.userId}
          userName={connectionsDialog.userName}
          initialTab={connectionsDialog.tab}
          currentUserId={user.id}
          onSelectUser={(selectedId) => {
            setProfileDialogUser(selectedId);
            setConnectionsDialog(null);
          }}
          onFollowChange={loadFriendshipsMap}
        />
      )}
    </div>
  );
};

export default NetworkTab;
