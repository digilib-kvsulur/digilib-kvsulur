import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { BookOpen, Target, Clock, Trophy, CheckCircle, Sparkles } from "lucide-react";

interface ReadingChallenge {
  id: string;
  title: string;
  description: string;
  type: string;
  targetValue: number;
  rewardPoints?: number;
  reward?: { points: number };
  deadline: string;
  progress?: number;
  currentProgress?: number;
  isCompleted: boolean;
  completedAt?: string;
  isClaimed?: boolean;
}

interface ReadingChallengesProps {
  challenges: ReadingChallenge[];
  onJoinChallenge?: (challengeId: string) => void;
  onClaimReward?: (challengeId: string) => void;
}

const getChallengeIcon = (type: string) => {
  switch (type) {
    case 'books_read': return BookOpen;
    case 'quiz_completed': return Target;
    case 'points_earned': return Trophy;
    default: return Target;
  }
};

const getChallengeTypeLabel = (type: string) => {
  switch (type) {
    case 'books_read': return 'Books to Read';
    case 'quiz_completed': return 'Quizzes to Complete';
    case 'points_earned': return 'Points to Earn';
    default: return 'Challenge';
  }
};

const ReadingChallenges = ({ challenges, onJoinChallenge, onClaimReward }: ReadingChallengesProps) => {
  const activeChallenges = challenges.filter(c => !c.isCompleted);
  const completedChallenges = challenges.filter(c => c.isCompleted);
  const unclaimedChallenges = completedChallenges.filter(c => !c.isClaimed);
  const claimedChallenges = completedChallenges.filter(c => c.isClaimed);

  const getDaysRemaining = (deadline: string) => {
    if (!deadline) return null;
    const diffDays = Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getRewardPoints = (c: ReadingChallenge) => c.rewardPoints || c.reward?.points || 0;
  const getProgress = (c: ReadingChallenge) => c.progress ?? c.currentProgress ?? 0;

  if (challenges.length === 0) return (
    <div className="text-center py-16">
      <Target className="h-14 w-14 text-muted-foreground/30 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-foreground mb-1">No challenges yet</h3>
      <p className="text-sm text-muted-foreground">New reading challenges will be added soon!</p>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Active Challenges */}
      {activeChallenges.length > 0 && (
        <div>
          <h3 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" /> Active ({activeChallenges.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeChallenges.map((challenge) => {
              const Icon = getChallengeIcon(challenge.type);
              const prog = getProgress(challenge);
              const progressPct = Math.min((prog / challenge.targetValue) * 100, 100);
              const days = getDaysRemaining(challenge.deadline);
              const pts = getRewardPoints(challenge);

              return (
                <Card key={challenge.id} className="border-border/50 overflow-hidden hover:shadow-md transition-all group">
                  <div className="h-1 gradient-primary" />
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm text-foreground">{challenge.title}</h4>
                          <p className="text-xs text-muted-foreground line-clamp-1">{challenge.description}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] border-primary/30 text-primary shrink-0">+{pts} XP</Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{getChallengeTypeLabel(challenge.type)}</span>
                        <span className="font-medium text-foreground">{prog}/{challenge.targetValue}</span>
                      </div>
                      <Progress value={progressPct} className="h-2" />
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {days !== null ? (days > 0 ? `${days}d left` : 'Expires today') : 'No deadline'}
                        </div>
                        {progressPct < 100 && onJoinChallenge && (
                          <Button size="sm" variant="outline" className="h-7 text-xs rounded-lg" onClick={() => onJoinChallenge(challenge.id)}>Continue</Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Ready to Claim */}
      {unclaimedChallenges.length > 0 && (
        <div>
          <h3 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-warning" /> Ready to Claim ({unclaimedChallenges.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {unclaimedChallenges.map((challenge) => {
              const Icon = getChallengeIcon(challenge.type);
              const pts = getRewardPoints(challenge);
              return (
                <Card key={challenge.id} className="border-warning/30 bg-warning/5 overflow-hidden">
                  <div className="h-1 bg-warning" />
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-warning/15 rounded-xl flex items-center justify-center">
                          <Icon className="h-5 w-5 text-warning" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm text-foreground flex items-center gap-1.5">{challenge.title} <CheckCircle className="h-4 w-4 text-success" /></h4>
                          <p className="text-xs text-muted-foreground">{challenge.description}</p>
                        </div>
                      </div>
                      <Badge className="bg-warning text-warning-foreground text-[10px]">+{pts} XP</Badge>
                    </div>
                    <Button onClick={() => onClaimReward?.(challenge.id)} className="w-full h-9 bg-warning text-warning-foreground hover:bg-warning/90 text-sm font-semibold rounded-lg">
                      🎁 Claim Reward
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Claimed */}
      {claimedChallenges.length > 0 && (
        <div>
          <h3 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-success" /> Completed ({claimedChallenges.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {claimedChallenges.map((challenge) => {
              const Icon = getChallengeIcon(challenge.type);
              const pts = getRewardPoints(challenge);
              return (
                <Card key={challenge.id} className="border-success/20 bg-success/5">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-success/15 rounded-lg flex items-center justify-center">
                        <Icon className="h-4 w-4 text-success" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm text-foreground truncate">{challenge.title}</h4>
                        <p className="text-xs text-muted-foreground">+{pts} XP earned</p>
                      </div>
                      <CheckCircle className="h-5 w-5 text-success shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReadingChallenges;
