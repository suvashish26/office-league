import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";

const Matches = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [teamAId, setTeamAId] = useState("");
  const [teamBId, setTeamBId] = useState("");
  const [foulsA, setFoulsA] = useState(0);
  const [foulsB, setFoulsB] = useState(0);

  const [teamAGoalEntries, setTeamAGoalEntries] = useState<{ playerId: string; goals: number }[]>([]);
  const [teamBGoalEntries, setTeamBGoalEntries] = useState<{ playerId: string; goals: number }[]>([]);

  const [teamAGoalkeeperId, setTeamAGoalkeeperId] = useState("");
  const [teamAGoalkeeperSaves, setTeamAGoalkeeperSaves] = useState(0);
  const [teamBGoalkeeperId, setTeamBGoalkeeperId] = useState("");
  const [teamBGoalkeeperSaves, setTeamBGoalkeeperSaves] = useState(0);

  const { data: teams } = useQuery({
    queryKey: ["teams"],
    queryFn: async () => {
      const { data } = await supabase.from("teams").select("*");
      return data || [];
    },
  });

  const { data: players } = useQuery({
    queryKey: ["players"],
    queryFn: async () => {
      const { data } = await supabase.from("players").select("*");
      return data || [];
    },
  });

  const playersForA = useMemo(() => 
    players?.filter((p: any) => String(p.team_id) === String(teamAId)) || [], 
    [players, teamAId]
  );

  const playersForB = useMemo(() => 
    players?.filter((p: any) => String(p.team_id) === String(teamBId)) || [], 
    [players, teamBId]
  );

  useEffect(() => {
    setTeamAGoalEntries([]);
    setTeamAGoalkeeperId("");
    setTeamAGoalkeeperSaves(0);
  }, [teamAId]);

  useEffect(() => {
    setTeamBGoalEntries([]);
    setTeamBGoalkeeperId("");
    setTeamBGoalkeeperSaves(0);
  }, [teamBId]);

  const submitMatchMutation = useMutation({
    mutationFn: async (matchData: any) => {
      // First insert match without played_at
      const { data: match, error: matchError } = await supabase
        .from("matches")
        .insert({
          team_a_id: matchData.team_a_id,
          team_b_id: matchData.team_b_id,
          team_a_goals: matchData.team_a_goals,
          team_b_goals: matchData.team_b_goals,
          fouls_a: matchData.fouls_a,
          fouls_b: matchData.fouls_b
        })
        .select("id")
        .single();

      if (matchError) throw matchError;

      // Update player stats in parallel
      const updates = [];

      // Update scorers
      for (const scorer of matchData.scorers) {
        const player = players?.find(p => String(p.id) === String(scorer.playerId));
        if (player) {
          updates.push(
            supabase
              .from("players")
              .update({ goals: (player.goals || 0) + scorer.goals })
              .eq("id", scorer.playerId)
          );
        }
      }

      // Update goalkeepers
      for (const save of matchData.saves) {
        const player = players?.find(p => String(p.id) === String(save.playerId));
        if (player) {
          updates.push(
            supabase
              .from("players")
              .update({ saves: (player.saves || 0) + save.saves })
              .eq("id", save.playerId)
          );
        }
      }

      // Update team stats
      const teamA = teams?.find(t => String(t.id) === String(matchData.team_a_id));
      const teamB = teams?.find(t => String(t.id) === String(matchData.team_b_id));

      if (teamA && teamB) {
        let teamAPoints = 0;
        let teamBPoints = 0;
        let teamAWins = teamA.wins || 0;
        let teamBWins = teamB.wins || 0;
        let teamADraws = teamA.draws || 0;
        let teamBDraws = teamB.draws || 0;
        let teamALosses = teamA.losses || 0;
        let teamBLosses = teamB.losses || 0;

        if (matchData.team_a_goals > matchData.team_b_goals) {
          teamAPoints = 3;
          teamAWins += 1;
          teamBLosses += 1;
        } else if (matchData.team_a_goals < matchData.team_b_goals) {
          teamBPoints = 3;
          teamBWins += 1;
          teamALosses += 1;
        } else {
          teamAPoints = 1;
          teamBPoints = 1;
          teamADraws += 1;
          teamBDraws += 1;
        }

        updates.push(
          supabase
            .from("teams")
            .update({
              points: (teamA.points || 0) + teamAPoints,
              wins: teamAWins,
              draws: teamADraws,
              losses: teamALosses,
              total_goals: (teamA.total_goals || 0) + matchData.team_a_goals,
              goals_conceded: (teamA.goals_conceded || 0) + matchData.team_b_goals,
              fair_play_points: Math.max(0, (teamA.fair_play_points || 50) - (matchData.fouls_a * 5))
            })
            .eq("id", teamA.id)
        );

        updates.push(
          supabase
            .from("teams")
            .update({
              points: (teamB.points || 0) + teamBPoints,
              wins: teamBWins,
              draws: teamBDraws,
              losses: teamBLosses,
              total_goals: (teamB.total_goals || 0) + matchData.team_b_goals,
              goals_conceded: (teamB.goals_conceded || 0) + matchData.team_a_goals,
              fair_play_points: Math.max(0, (teamB.fair_play_points || 50) - (matchData.fouls_b * 5))
            })
            .eq("id", teamB.id)
        );
      }

      await Promise.all(updates);
      return match;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      queryClient.invalidateQueries({ queryKey: ["players"] });
      toast({ title: "Match recorded successfully" });
      // Reset form
      setTeamAId("");
      setTeamBId("");
      setTeamAGoalEntries([]);
      setTeamBGoalEntries([]);
      setTeamAGoalkeeperId("");
      setTeamAGoalkeeperSaves(0);
      setTeamBGoalkeeperId("");
      setTeamBGoalkeeperSaves(0);
      setFoulsA(0);
      setFoulsB(0);
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error recording match",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleAddGoalEntry = (team: "A" | "B") => {
    if (team === "A") {
      if (playersForA.length === 0) {
        toast({ 
          title: "No players available",
          description: "Add players to Team A first",
          variant: "destructive"
        });
        return;
      }
      setTeamAGoalEntries(s => [...s, { playerId: String(playersForA[0].id), goals: 1 }]);
    } else {
      if (playersForB.length === 0) {
        toast({ 
          title: "No players available",
          description: "Add players to Team B first",
          variant: "destructive"
        });
        return;
      }
      setTeamBGoalEntries(s => [...s, { playerId: String(playersForB[0].id), goals: 1 }]);
    }
  };

  const handleSubmit = () => {
    if (!teamAId || !teamBId) {
      toast({ title: "Select both teams", variant: "destructive" });
      return;
    }
    if (teamAId === teamBId) {
      toast({ title: "Teams must be different", variant: "destructive" });
      return;
    }

    const team_a_goals = teamAGoalEntries.reduce((sum, entry) => sum + (entry.goals || 0), 0);
    const team_b_goals = teamBGoalEntries.reduce((sum, entry) => sum + (entry.goals || 0), 0);

    const matchData = {
      team_a_id: teamAId,
      team_b_id: teamBId,
      team_a_goals,
      team_b_goals,
      fouls_a: foulsA,
      fouls_b: foulsB,
      scorers: [
        ...teamAGoalEntries.map(e => ({ playerId: e.playerId, goals: e.goals })),
        ...teamBGoalEntries.map(e => ({ playerId: e.playerId, goals: e.goals }))
      ],
      saves: []
    };

    if (teamAGoalkeeperId && teamAGoalkeeperSaves > 0) {
      matchData.saves.push({ playerId: teamAGoalkeeperId, saves: teamAGoalkeeperSaves });
    }
    if (teamBGoalkeeperId && teamBGoalkeeperSaves > 0) {
      matchData.saves.push({ playerId: teamBGoalkeeperId, saves: teamBGoalkeeperSaves });
    }

    submitMatchMutation.mutate(matchData);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold">Record Match</h1>
        <p className="text-muted-foreground mt-2">Select teams, add scorers and goalkeeper saves</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Match Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium">Team A</label>
              <select 
                className="w-full p-2 border rounded" 
                value={teamAId} 
                onChange={(e) => setTeamAId(e.target.value)}
              >
                <option value="">Select team A</option>
                {teams?.map((t: any) => (
                  <option key={t.id} value={String(t.id)}>{t.name}</option>
                ))}
              </select>

              <div className="mt-3">
                <p className="font-medium">Scorers</p>
                {teamAGoalEntries.map((entry, idx) => (
                  <div key={idx} className="flex gap-2 items-center mt-2">
                    <select
                      className="flex-1 p-2 border rounded"
                      value={entry.playerId}
                      onChange={(e) => setTeamAGoalEntries(s => 
                        s.map((it, i) => i === idx ? { ...it, playerId: e.target.value } : it)
                      )}
                    >
                      <option value="">Select player</option>
                      {playersForA.map((p: any) => (
                        <option key={p.id} value={String(p.id)}>{p.name}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={1}
                      className="w-20 p-2 border rounded"
                      value={entry.goals}
                      onChange={(e) => setTeamAGoalEntries(s => 
                        s.map((it, i) => i === idx ? { ...it, goals: Number(e.target.value) } : it)
                      )}
                    />
                  </div>
                ))}
                <div className="mt-2">
                  <button 
                    className="px-3 py-1 rounded bg-secondary"
                    onClick={() => handleAddGoalEntry("A")}
                  >
                    + Add scorer
                  </button>
                </div>
                {playersForA.length === 0 && 
                  <p className="text-xs text-muted-foreground mt-2">
                    No players in selected team.
                  </p>
                }
              </div>

              <div className="mt-4">
                <p className="font-medium">Goalkeeper (saves)</p>
                <div className="flex gap-2 mt-2">
                  <select
                    className="flex-1 p-2 border rounded"
                    value={teamAGoalkeeperId}
                    onChange={(e) => setTeamAGoalkeeperId(e.target.value)}
                  >
                    <option value="">Select goalkeeper</option>
                    {playersForA.map((p: any) => (
                      <option key={p.id} value={String(p.id)}>{p.name}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={0}
                    className="w-24 p-2 border rounded"
                    value={teamAGoalkeeperSaves}
                    onChange={(e) => setTeamAGoalkeeperSaves(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium">Fouls A</label>
                <input
                  type="number"
                  min={0}
                  className="w-full p-2 border rounded"
                  value={foulsA}
                  onChange={(e) => setFoulsA(Number(e.target.value))}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium">Team B</label>
              <select 
                className="w-full p-2 border rounded" 
                value={teamBId} 
                onChange={(e) => setTeamBId(e.target.value)}
              >
                <option value="">Select team B</option>
                {teams?.map((t: any) => (
                  <option key={t.id} value={String(t.id)}>{t.name}</option>
                ))}
              </select>

              <div className="mt-3">
                <p className="font-medium">Scorers</p>
                {teamBGoalEntries.map((entry, idx) => (
                  <div key={idx} className="flex gap-2 items-center mt-2">
                    <select
                      className="flex-1 p-2 border rounded"
                      value={entry.playerId}
                      onChange={(e) => setTeamBGoalEntries(s => 
                        s.map((it, i) => i === idx ? { ...it, playerId: e.target.value } : it)
                      )}
                    >
                      <option value="">Select player</option>
                      {playersForB.map((p: any) => (
                        <option key={p.id} value={String(p.id)}>{p.name}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={1}
                      className="w-20 p-2 border rounded"
                      value={entry.goals}
                      onChange={(e) => setTeamBGoalEntries(s => 
                        s.map((it, i) => i === idx ? { ...it, goals: Number(e.target.value) } : it)
                      )}
                    />
                  </div>
                ))}
                <div className="mt-2">
                  <button 
                    className="px-3 py-1 rounded bg-secondary"
                    onClick={() => handleAddGoalEntry("B")}
                  >
                    + Add scorer
                  </button>
                </div>
                {playersForB.length === 0 && 
                  <p className="text-xs text-muted-foreground mt-2">
                    No players in selected team.
                  </p>
                }
              </div>

              <div className="mt-4">
                <p className="font-medium">Goalkeeper (saves)</p>
                <div className="flex gap-2 mt-2">
                  <select
                    className="flex-1 p-2 border rounded"
                    value={teamBGoalkeeperId}
                    onChange={(e) => setTeamBGoalkeeperId(e.target.value)}
                  >
                    <option value="">Select goalkeeper</option>
                    {playersForB.map((p: any) => (
                      <option key={p.id} value={String(p.id)}>{p.name}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={0}
                    className="w-24 p-2 border rounded"
                    value={teamBGoalkeeperSaves}
                    onChange={(e) => setTeamBGoalkeeperSaves(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium">Fouls B</label>
                <input
                  type="number"
                  min={0}
                  className="w-full p-2 border rounded"
                  value={foulsB}
                  onChange={(e) => setFoulsB(Number(e.target.value))}
                />
              </div>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button 
              className="px-4 py-2 rounded bg-primary text-white"
              onClick={handleSubmit}
            >
              Record Match
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Matches;