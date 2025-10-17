import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Target, Shield } from "lucide-react";
import StatCard from "@/components/StatCard";

const Stats = () => {
  const { data: players } = useQuery({
    queryKey: ["players"],
    queryFn: async () => {
      const { data } = await supabase.from("players").select("*, teams(name)");
      return data || [];
    },
  });

  const { data: teams } = useQuery({
    queryKey: ["teams"],
    queryFn: async () => {
      const { data } = await supabase
        .from("teams")
        .select("*")
        .order("fair_play_points", { ascending: false });
      return data || [];
    },
  });

  const { topScorers, topGoalkeepers, topScorer, topGoalkeeper } = useMemo(() => {
    const p = players || [];
    const scorers = [...p].sort((a, b) => (b?.goals || 0) - (a?.goals || 0)).slice(0, 10);
    const keepers = [...p].sort((a, b) => (b?.saves || 0) - (a?.saves || 0)).slice(0, 10);
    return {
      topScorers: scorers,
      topGoalkeepers: keepers,
      topScorer: scorers[0],
      topGoalkeeper: keepers[0],
    };
  }, [players]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold">Tournament Statistics</h1>
        <p className="text-muted-foreground mt-2">Player and team performance</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatCard
          title="Top Scorer"
          value={topScorer?.goals ?? 0}
          subtitle={topScorer?.name ?? "No goals yet"}
          icon={Target}
          variant="accent"
        />
        <StatCard
          title="Top Goalkeeper"
          value={topGoalkeeper?.saves ?? 0}
          subtitle={topGoalkeeper?.name ?? "No saves yet"}
          icon={Shield}
          variant="success"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-accent" />
              Top Scorers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topScorers.length === 0 && <p className="text-sm text-muted-foreground">No scorers yet.</p>}
              {topScorers.map((player: any, index: number) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-lg w-6">{index + 1}</span>
                    <div>
                      <p className="font-semibold">{player.name}</p>
                      <p className="text-sm text-muted-foreground">{player.teams?.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-xl">{player.goals ?? 0}</p>
                    <p className="text-xs text-muted-foreground">goals</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-success" />
              Top Goalkeepers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topGoalkeepers.length === 0 && <p className="text-sm text-muted-foreground">No goalkeepers recorded yet.</p>}
              {topGoalkeepers.map((player: any, index: number) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-lg w-6">{index + 1}</span>
                    <div>
                      <p className="font-semibold">{player.name}</p>
                      <p className="text-sm text-muted-foreground">{player.teams?.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-xl">{player.saves ?? 0}</p>
                    <p className="text-xs text-muted-foreground">saves</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Fair Play Award
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Teams start with 50 points. Each foul deducts 5 points.
          </p>
          <div className="space-y-3">
            {teams?.length === 0 && <p className="text-sm text-muted-foreground">No teams yet.</p>}
            {teams?.map((team: any, index: number) => (
              <div key={team.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-lg w-6">{index + 1}</span>
                  <p className="font-semibold">{team.name}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-xl">{team.fair_play_points ?? 0}</p>
                  <p className="text-xs text-muted-foreground">points</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Stats;