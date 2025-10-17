import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Target, Shield, Users } from "lucide-react";
import StatCard from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const Dashboard = () => {
  const { data: teams } = useQuery({
    queryKey: ["teams"],
    queryFn: async () => {
      const { data } = await supabase.from("teams").select("*").order("points", { ascending: false });
      return data || [];
    },
  });

  const { data: players } = useQuery({
    queryKey: ["players"],
    queryFn: async () => {
      const { data } = await supabase.from("players").select("*, teams(name)").order("goals", { ascending: false });
      return data || [];
    },
  });

  const topScorer = players?.[0];
  const topGoalkeeper = [...(players || [])].sort((a, b) => b.saves - a.saves)[0];
  const fairPlayLeader = [...(teams || [])].sort((a, b) => b.fair_play_points - a.fair_play_points)[0];
  const totalGoals = teams?.reduce((sum, team) => sum + team.total_goals, 0) || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold">Tournament Dashboard</h1>
        <p className="text-muted-foreground mt-2">Live overview of the office league</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Top Scorer"
          value={topScorer?.goals || 0}
          subtitle={topScorer?.name || "No goals yet"}
          icon={Target}
          variant="accent"
        />
        <StatCard
          title="Best Goalkeeper"
          value={topGoalkeeper?.saves || 0}
          subtitle={topGoalkeeper?.name || "No saves yet"}
          icon={Shield}
          variant="success"
        />
        <StatCard
          title="Fair Play Leader"
          value={`${fairPlayLeader?.fair_play_points || 50}/50`}
          subtitle={fairPlayLeader?.name || "No teams yet"}
          icon={Trophy}
          variant="default"
        />
        <StatCard
          title="Total Goals"
          value={totalGoals}
          subtitle={`Across ${teams?.length || 0} teams`}
          icon={Users}
          variant="default"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>League Standings</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Team</TableHead>
                <TableHead className="text-center">MP</TableHead>
                <TableHead className="text-center">W</TableHead>
                <TableHead className="text-center">D</TableHead>
                <TableHead className="text-center">L</TableHead>
                <TableHead className="text-center">GF</TableHead>
                <TableHead className="text-center">GA</TableHead>
                <TableHead className="text-center">Pts</TableHead>
                <TableHead className="text-center">FP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teams?.slice(0, 5).map((team, index) => (
                <TableRow key={team.id}>
                  <TableCell className="font-bold">{index + 1}</TableCell>
                  <TableCell className="font-semibold">{team.name}</TableCell>
                  <TableCell className="text-center">{team.wins + team.draws + team.losses}</TableCell>
                  <TableCell className="text-center">{team.wins}</TableCell>
                  <TableCell className="text-center">{team.draws}</TableCell>
                  <TableCell className="text-center">{team.losses}</TableCell>
                  <TableCell className="text-center">{team.total_goals}</TableCell>
                  <TableCell className="text-center">{team.goals_conceded}</TableCell>
                  <TableCell className="text-center font-bold">{team.points}</TableCell>
                  <TableCell className="text-center">{team.fair_play_points}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;