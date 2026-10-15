import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Search,
  UserPlus,
  UserCheck,
  Clock,
  Sparkles,
  Loader2,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface UserConnectionsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName?: string;
  initialTab?: "followers" | "following";
  currentUserId: string;
  onSelectUser: (userId: string) => void;
  onFollowChange?: () => void;
}

interface ConnectionUser {
  id: string;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  student_class: string | null;
  role: string | null;
  points: number | null;
  avatar_url: string | null;
  bio?: string | null;
}

export const UserConnectionsDialog = ({
  isOpen,
  onClose,
  userId,
  userName = "User",
  initialTab = "followers",
  currentUserId,
  onSelectUser,
  onFollowChange,
}: UserConnectionsDialogProps) => {
  const [activeTab, setActiveTab] = useState<"followers" | "following">(initialTab);
  const [loading, setLoading] = useState(true);
  const [connections, setConnections] = useState<ConnectionUser[]>([]);
  const [currentUserFriendships, setCurrentUserFriendships] = useState<Record<string, any>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setSearchQuery("");
      loadData();
    }
  }, [isOpen, userId, initialTab]);

  const loadData = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      // 1. Load connections for the target user
      let users: ConnectionUser[] = [];
      const { data: rpcData, error: rpcErr } = await (supabase.rpc as any)(
        "get_user_network_connections",
        { p_user_id: userId, p_type: "all" }
      );

      if (!rpcErr && Array.isArray(rpcData)) {
        users = rpcData;
      } else {
        // Fallback: Query friendships directly
        const { data: fData } = await supabase
          .from("friendships")
          .select("requester_id, addressee_id, status")
          .eq("status", "accepted")
          .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

        const ids = Array.from(
          new Set(
            (fData || []).map((f: any) =>
              f.requester_id === userId ? f.addressee_id : f.requester_id
            )
          )
        );

        if (ids.length > 0) {
          const { data: profs } = await supabase.rpc("get_public_profiles", { _ids: ids });
          users = profs || [];
        }
      }

      // Resolve avatars for users
      const resolvedUsers = await Promise.all(
        users.map(async (u) => {
          let av = u.avatar_url;
          if (av && !av.startsWith("http")) {
            const { data: pub } = supabase.storage.from("avatars").getPublicUrl(av);
            av = pub?.publicUrl || null;
          }
          return { ...u, avatar_url: av };
        })
      );
      setConnections(resolvedUsers);

      // 2. Load current user's friendships with all target users so we can show proper follow status
      if (currentUserId) {
        const { data: myFriendships } = await supabase
          .from("friendships")
          .select("*")
          .or(`requester_id.eq.${currentUserId},addressee_id.eq.${currentUserId}`);

        const fMap: Record<string, any> = {};
        (myFriendships || []).forEach((f: any) => {
          const other = f.requester_id === currentUserId ? f.addressee_id : f.requester_id;
          fMap[other] = f;
        });
        setCurrentUserFriendships(fMap);
      }
    } catch (err) {
      console.error("Failed to load connections:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFollowToggle = async (targetId: string) => {
    if (!currentUserId || currentUserId === targetId) return;
    setActionLoadingId(targetId);
    try {
      const existing = currentUserFriendships[targetId];
      if (existing?.id) {
        const { error, data } = await supabase
          .from("friendships")
          .update({
            status: "pending",
            requester_id: currentUserId,
            addressee_id: targetId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id)
          .select()
          .single();

        if (error) throw error;
        setCurrentUserFriendships((prev) => ({ ...prev, [targetId]: data }));
        toast({ title: "Follow request sent!" });
      } else {
        const { error, data } = await supabase
          .from("friendships")
          .insert({
            requester_id: currentUserId,
            addressee_id: targetId,
            status: "pending",
          })
          .select()
          .single();

        if (error) throw error;
        setCurrentUserFriendships((prev) => ({ ...prev, [targetId]: data }));
        toast({ title: "Follow request sent!" });
      }
      onFollowChange?.();
    } catch (err: any) {
      toast({
        title: "Action failed",
        description: err.message || "Could not complete follow request",
        variant: "destructive",
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredConnections = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return connections;
    return connections.filter((u) => {
      const fullName = `${u.first_name || ""} ${u.last_name || ""}`.toLowerCase();
      const username = (u.username || "").toLowerCase();
      const sClass = (u.student_class || "").toLowerCase();
      return fullName.includes(q) || username.includes(q) || sClass.includes(q);
    });
  }, [connections, searchQuery]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md w-full p-0 overflow-hidden bg-background border border-border/50 rounded-2xl shadow-2xl">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border/40">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500 shrink-0">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                {userName}'s Network
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                View connections, classmates, and fellow readers
              </DialogDescription>
            </div>
          </div>

          <div className="pt-3">
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as "followers" | "following")}
            >
              <TabsList className="grid w-full grid-cols-2 p-1 bg-muted/40 border border-border/30 rounded-lg">
                <TabsTrigger value="followers" className="text-xs font-semibold py-1.5">
                  Followers ({connections.length})
                </TabsTrigger>
                <TabsTrigger value="following" className="text-xs font-semibold py-1.5">
                  Following ({connections.length})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="relative mt-2">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search by name, username, or class..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs rounded-lg border-border/50 bg-muted/20"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </DialogHeader>

        {/* Content list */}
        <div className="max-h-[380px] min-h-[220px] overflow-y-auto p-3 space-y-1.5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground space-y-2">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
              <p className="text-xs">Loading connections...</p>
            </div>
          ) : filteredConnections.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-2">
              <div className="w-10 h-10 rounded-full bg-muted/40 flex items-center justify-center mx-auto text-muted-foreground">
                <Users className="h-5 w-5" />
              </div>
              <p className="text-sm font-semibold text-foreground">
                {searchQuery ? "No matches found" : activeTab === "followers" ? "No followers yet" : "Not following anyone yet"}
              </p>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                {searchQuery
                  ? `No connection found matching "${searchQuery}"`
                  : activeTab === "followers"
                  ? `${userName} does not have any followers yet.`
                  : `${userName} is not following anyone yet.`}
              </p>
            </div>
          ) : (
            filteredConnections.map((u) => {
              const fullName = `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.username || "User";
              const initials = fullName
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase() || "U";
              const isSelf = u.id === currentUserId;
              const f = currentUserFriendships[u.id];
              const isAccepted = f?.status === "accepted";
              const isPending = f?.status === "pending";

              return (
                <div
                  key={u.id}
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-muted/40 transition-colors border border-transparent hover:border-border/30 group"
                >
                  <div
                    className="flex items-center gap-3 cursor-pointer min-w-0 flex-1 pr-2"
                    onClick={() => {
                      onSelectUser(u.id);
                      onClose();
                    }}
                  >
                    <Avatar className="h-10 w-10 ring-2 ring-indigo-500/10 shrink-0">
                      {u.avatar_url && <AvatarImage src={u.avatar_url} alt={fullName} />}
                      <AvatarFallback className="bg-gradient-to-br from-indigo-500/80 to-purple-500/80 text-white font-bold text-xs">
                        {initials}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                          {fullName}
                        </span>
                        {u.role && u.role !== "student" && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 capitalize">
                            {u.role}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        {u.username && <span>@{u.username}</span>}
                        {u.student_class && (
                          <>
                            <span>·</span>
                            <span>Class {u.student_class}</span>
                          </>
                        )}
                        {typeof u.points === "number" && u.points > 0 && (
                          <>
                            <span>·</span>
                            <span className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-0.5">
                              <Sparkles className="h-2.5 w-2.5 inline" /> {u.points} XP
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action button */}
                  <div className="shrink-0">
                    {isSelf ? (
                      <Badge variant="secondary" className="text-[10px] bg-muted text-muted-foreground">
                        You
                      </Badge>
                    ) : isAccepted ? (
                      <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] gap-1 px-2 py-1 cursor-default">
                        <UserCheck className="h-3 w-3" /> Following
                      </Badge>
                    ) : isPending ? (
                      <Badge variant="outline" className="text-[10px] gap-1 border-amber-500/40 text-amber-600 dark:text-amber-400">
                        <Clock className="h-3 w-3" /> Requested
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="default"
                        className="h-7 text-xs px-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                        disabled={actionLoadingId === u.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFollowToggle(u.id);
                        }}
                      >
                        {actionLoadingId === u.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <>
                            <UserPlus className="h-3 w-3 mr-1" /> Follow
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
