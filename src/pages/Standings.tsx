import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trophy } from "lucide-react";

const Standings = () => {
  const { data: teams } = useQuery({
    queryKey: ["teams"],
    queryFn: async () => {
      const { data } = await supabase.from("teams").select("*").order("points", { ascending: false });
      return data || [];
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold">League Standings</h1>
        <p className="text-muted-foreground mt-2">Current tournament positions</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            League Table
          </CardTitle>
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
                <TableHead className="text-center">GD</TableHead>
                <TableHead className="text-center font-bold">Pts</TableHead>
                <TableHead className="text-center">FP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teams?.map((team, index) => {
                const goalDifference = team.total_goals - team.goals_conceded;
                const isLeader = index === 0;
                
                return (
                  <TableRow key={team.id} className={isLeader ? "bg-accent/20" : ""}>
                    <TableCell className="font-bold">
                      {index + 1}
                      {isLeader && <Trophy className="inline h-4 w-4 ml-1 text-accent" />}
                    </TableCell>
                    <TableCell className="font-semibold">{team.name}</TableCell>
                    <TableCell className="text-center">{team.wins + team.draws + team.losses}</TableCell>
                    <TableCell className="text-center">{team.wins}</TableCell>
                    <TableCell className="text-center">{team.draws}</TableCell>
                    <TableCell className="text-center">{team.losses}</TableCell>
                    <TableCell className="text-center">{team.total_goals}</TableCell>
                    <TableCell className="text-center">{team.goals_conceded}</TableCell>
                    <TableCell className={`text-center ${goalDifference > 0 ? 'text-success' : goalDifference < 0 ? 'text-destructive' : ''}`}>
                      {goalDifference > 0 ? '+' : ''}{goalDifference}
                    </TableCell>
                    <TableCell className="text-center font-bold text-lg">{team.points}</TableCell>
                    <TableCell className="text-center">{team.fair_play_points}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Standings;