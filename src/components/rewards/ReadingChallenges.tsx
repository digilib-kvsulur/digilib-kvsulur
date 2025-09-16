
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { BookOpen, Target, Clock, Trophy, CheckCircle } from "lucide-react";

interface ReadingChallenge {
  id: string;
  title: string;
  description: string;
  type: string;
  targetValue: number;
  rewardPoints: number;
  deadline: string;
  progress: number;
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
    case 'books_read':
      return BookOpen;
    case 'quiz_completed':
      return Target;
    case 'points_earned':
      return Trophy;
    default:
      return Target;
  }
};

const getChallengeTypeLabel = (type: string) => {
  switch (type) {
    case 'books_read':
      return 'Books to Read';
    case 'quiz_completed':
      return 'Quizzes to Complete';
    case 'points_earned':
      return 'Points to Earn';
    default:
      return 'Challenge';
  }
};

const ReadingChallenges = ({ challenges, onJoinChallenge, onClaimReward }: ReadingChallengesProps) => {
  console.log('ReadingChallenges received challenges:', challenges);

  const activeChallenges = challenges.filter(c => !c.isCompleted);
  const completedChallenges = challenges.filter(c => c.isCompleted);
  const unclaimedChallenges = completedChallenges.filter(c => !c.isClaimed);
  const claimedChallenges = completedChallenges.filter(c => c.isClaimed);

  console.log('Active challenges:', activeChallenges);
  console.log('Completed challenges:', completedChallenges);

  const getDaysRemaining = (deadline: string) => {
    if (!deadline) return 'No deadline';
    
    const today = new Date();
    const deadlineDate = new Date(deadline);
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="space-y-6">
      {/* Active Challenges */}
      {activeChallenges.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-600" />
            Active Challenges ({activeChallenges.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeChallenges.map((challenge) => {
              const IconComponent = getChallengeIcon(challenge.type);
              const progress = Math.min((challenge.progress / challenge.targetValue) * 100, 100);
              const daysRemaining = getDaysRemaining(challenge.deadline);
              
              return (
                <Card key={challenge.id} className="border-blue-200 bg-blue-50">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <IconComponent className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{challenge.title}</CardTitle>
                          <CardDescription>{challenge.description}</CardDescription>
                        </div>
                      </div>
                      <Badge variant="outline" className="border-blue-500 text-blue-700">
                        +{challenge.rewardPoints} pts
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span>{getChallengeTypeLabel(challenge.type)}</span>
                          <span>{challenge.progress}/{challenge.targetValue}</span>
                        </div>
                        <Progress value={progress} className="h-3" />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Clock className="h-4 w-4" />
                          <span>
                            {typeof daysRemaining === 'number' 
                              ? (daysRemaining > 0 ? `${daysRemaining} days left` : 'Expires today')
                              : daysRemaining
                            }
                          </span>
                        </div>
                        {progress < 100 && onJoinChallenge && (
                          <Button 
                            size="sm" 
                            onClick={() => onJoinChallenge(challenge.id)}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            Continue
                          </Button>
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

      {/* Completed Challenges Ready to Claim */}
      {unclaimedChallenges.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-600" />
            Ready to Claim ({unclaimedChallenges.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {unclaimedChallenges.map((challenge) => {
              const IconComponent = getChallengeIcon(challenge.type);
              
              return (
                <Card key={challenge.id} className="border-amber-200 bg-amber-50">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 rounded-lg">
                          <IconComponent className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            {challenge.title}
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          </CardTitle>
                          <CardDescription>{challenge.description}</CardDescription>
                        </div>
                      </div>
                      <Badge className="bg-amber-600">
                        +{challenge.rewardPoints} pts
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-amber-700 font-medium">
                        Challenge Completed! 🎉
                      </span>
                      <Button 
                        onClick={() => onClaimReward?.(challenge.id)}
                        className="bg-amber-600 hover:bg-amber-700"
                        size="sm"
                      >
                        Claim Reward
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Already Claimed Challenges */}
      {claimedChallenges.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Claimed Rewards ({claimedChallenges.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {claimedChallenges.map((challenge) => {
              const IconComponent = getChallengeIcon(challenge.type);
              
              return (
                <Card key={challenge.id} className="border-green-200 bg-green-50">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <IconComponent className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            {challenge.title}
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          </CardTitle>
                          <CardDescription>{challenge.description}</CardDescription>
                        </div>
                      </div>
                      <Badge className="bg-green-600">
                        +{challenge.rewardPoints} pts
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-green-700 font-medium">
                        Reward Claimed! ✅
                      </span>
                      {challenge.completedAt && (
                        <span className="text-xs text-gray-600">
                          {new Date(challenge.completedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {challenges.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Target className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No challenges available</h3>
            <p className="text-gray-600">New reading challenges will be added soon!</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ReadingChallenges;
