import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users, Search, UserPlus, UserX, Check, X, Clock
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ProfileView } from "@/components/community/ProfileView";

interface NetworkTabProps {
  user: any;
}

const NetworkTab = ({ user }: NetworkTabProps) => {
  const [friendshipsMap, setFriendshipsMap] = useState<Record<string, any>>({});
  const [friendsProfiles, setFriendsProfiles] = useState<Record<string, any>>({});
  const [profileDialogUser, setProfileDialogUser] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [activeSubTab, setActiveSubTab] = useState("list");
  const { toast } = useToast();

  useEffect(() => {
    if (user?.id) loadFriendshipsMap();
  }, [user?.id]);

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
        (profs || []).forEach((p: any) => { pMap[p.id] = p; });
        setFriendsProfiles(pMap);
      } else {
        setFriendsProfiles({});
      }
    } catch (e) {
      console.error("Error loading friendships:", e);
    }
  };

  const sendFriendRequest = async (targetId: string) => {
    if (!user?.id) return;
    const { error, data } = await supabase
      .from("friendships")
      .insert({ requester_id: user.id, addressee_id: targetId })
      .select().single();
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setFriendshipsMap(m => ({ ...m, [targetId]: data }));
    toast({ title: "Friend request sent!" });
    await loadFriendshipsMap();
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

  return (
    <div className="space-y-4">
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
        <CardContent className="p-4">
          <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-3 p-0.5 bg-muted/30 border border-border/30 rounded-lg">
              <TabsTrigger value="list" className="text-xs font-bold py-1.5">
                Friends ({acceptedFriends.length})
              </TabsTrigger>
              <TabsTrigger value="requests" className="text-xs font-bold py-1.5">
                Requests
                {pendingIncoming.length > 0 && (
                  <span className="ml-1 w-2 h-2 bg-rose-500 rounded-full inline-block animate-pulse" />
                )}
              </TabsTrigger>
              <TabsTrigger value="discover" className="text-xs font-bold py-1.5">Discover</TabsTrigger>
            </TabsList>

            {/* Friends List */}
            <TabsContent value="list" className="space-y-3 pt-1 outline-none">
              {acceptedFriends.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500 mx-auto mb-3">
                    <Users className="h-6 w-6" />
                  </div>
                  <p className="font-bold text-foreground/90 text-sm">No classmate links yet</p>
                  <p className="text-xs text-muted-foreground/80 mt-1 mb-4">Discover and connect with classmates!</p>
                  <Button size="sm" onClick={() => setActiveSubTab("discover")} className="rounded-lg bg-indigo-600 hover:bg-indigo-700 shadow-md">
                    Discover Classmates
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {acceptedFriends.map(([uid]) => {
                    const p = friendsProfiles[uid] || {};
                    const ini = `${(p.first_name?.[0] || "").toUpperCase()}${(p.last_name?.[0] || "").toUpperCase()}`;
                    return (
                      <div key={uid} className="flex items-center justify-between p-3.5 bg-muted/20 hover:bg-muted/40 border border-border/30 rounded-xl transition-all">
                        <div className="flex items-center gap-3 cursor-pointer min-w-0" onClick={() => setProfileDialogUser(uid)}>
                          <Avatar className="h-10 w-10 ring-2 ring-indigo-500/10">
                            <AvatarFallback className="bg-gradient-to-br from-indigo-500/80 to-purple-500/80 text-white font-bold text-xs">{ini || "U"}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-foreground hover:underline truncate">{p.first_name} {p.last_name}</p>
                            <p className="text-xs text-muted-foreground truncate">@{p.username || "username"} · Class {p.student_class || "—"}</p>
                          </div>
                        </div>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => removeFriend(uid)} title="Remove">
                          <UserX className="h-4 w-4 text-muted-foreground/60 hover:text-rose-500 transition-colors" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* Requests */}
            <TabsContent value="requests" className="space-y-4 pt-1 outline-none">
              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-emerald-500" /> Incoming Requests ({pendingIncoming.length})
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
                          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setProfileDialogUser(uid)}>
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-indigo-500/10 text-indigo-500 font-bold text-xs">{ini}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-xs font-bold text-foreground hover:underline">{p.first_name} {p.last_name}</p>
                              <p className="text-[10px] text-muted-foreground">@{p.username || "—"}</p>
                            </div>
                          </div>
                          <div className="flex gap-1.5">
                            <Button size="sm" className="h-8 px-3 text-xs bg-emerald-600 hover:bg-emerald-700" onClick={() => respondFriendRequest(uid, "accepted")}>
                              <Check className="h-3.5 w-3.5 mr-1" />Accept
                            </Button>
                            <Button size="sm" variant="outline" className="h-8 px-2 text-xs text-rose-500 hover:bg-rose-500/10 border-rose-500/20" onClick={() => respondFriendRequest(uid, "rejected")}>
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
                  <Clock className="h-3.5 w-3.5 text-amber-500" /> Sent Requests ({pendingOutgoing.length})
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
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-indigo-500/10 text-indigo-500 font-bold text-xs">{ini}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-xs font-bold text-foreground">{p.first_name} {p.last_name}</p>
                              <p className="text-[10px] text-muted-foreground">@{p.username || "—"}</p>
                            </div>
                          </div>
                          <Button size="sm" variant="ghost" className="h-8 px-3 text-xs text-rose-500 hover:bg-rose-500/10" onClick={() => removeFriend(uid)}>
                            Cancel
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Discover */}
            <TabsContent value="discover" className="space-y-3 pt-1 outline-none">
              <div className="flex gap-2">
                <Input
                  placeholder="Search classmates by name or username..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && searchFriends()}
                  className="rounded-lg border-border/60"
                />
                <Button size="sm" onClick={searchFriends} className="rounded-lg bg-indigo-600 hover:bg-indigo-700 shadow-md px-3">
                  <Search className="h-4 w-4" />
                </Button>
              </div>

              {searchResults.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                  {searchResults.map((r) => {
                    const existing = friendshipsMap[r.id];
                    const ini = `${(r.first_name?.[0] || "").toUpperCase()}${(r.last_name?.[0] || "").toUpperCase()}`;
                    return (
                      <div key={r.id} className="flex items-center justify-between p-3 bg-muted/20 border border-border/30 rounded-xl">
                        <div className="flex items-center gap-3 cursor-pointer min-w-0" onClick={() => setProfileDialogUser(r.id)}>
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="bg-indigo-500/10 text-indigo-500 font-bold text-xs">{ini}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-foreground hover:underline truncate">{r.first_name} {r.last_name}</p>
                            <p className="text-xs text-muted-foreground truncate">@{r.username || "—"} · Class {r.student_class || "—"}</p>
                          </div>
                        </div>
                        {!existing ? (
                          <Button size="sm" onClick={() => sendFriendRequest(r.id)} className="h-8 bg-indigo-600 hover:bg-indigo-700 rounded-lg">
                            <UserPlus className="h-4 w-4" />
                          </Button>
                        ) : existing.status === "accepted" ? (
                          <Badge className="bg-emerald-600">Friends</Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 border-amber-500/20 font-bold">Pending</Badge>
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
                  <p className="text-xs font-semibold">Enter a name or username above to find classmates!</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Profile Dialog */}
      <Dialog open={!!profileDialogUser} onOpenChange={(o) => !o && setProfileDialogUser(null)}>
        <DialogContent className="max-w-lg p-0 overflow-hidden bg-background rounded-xl border border-border/40 shadow-xl">
          {profileDialogUser && (
            <ProfileView
              userId={profileDialogUser}
              currentUserId={user.id}
              friendship={friendshipsMap[profileDialogUser]}
              onSend={sendFriendRequest}
              onRespond={respondFriendRequest}
              onRemove={removeFriend}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NetworkTab;
