import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Users, UserPlus, Trash2 } from "lucide-react";

interface Player {
  id: string;
  name: string;
  team_id: string;
  goals: number;
  saves: number;
  teams?: {
    name: string;
  };
}

interface Team {
  id: string;
  name: string;
  points: number;
  wins: number;
  draws: number;
  losses: number;
}

const Teams = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [teamName, setTeamName] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState("");

  const { data: teams, isLoading: teamsLoading } = useQuery<Team[]>({
    queryKey: ["teams"],
    queryFn: async () => {
      const { data, error } = await supabase.from("teams").select("*");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: players, isLoading: playersLoading } = useQuery<Player[]>({
    queryKey: ["players"],
    queryFn: async () => {
      const { data, error } = await supabase.from("players").select("*, teams(name)");
      if (error) throw error;
      return data || [];
    },
  });

  const createTeamMutation = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from("teams").insert({ 
        name,
        fair_play_points: 50,
        points: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        total_goals: 0,
        goals_conceded: 0
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      toast({ title: "Team created" });
      setTeamName("");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const createPlayerMutation = useMutation({
    mutationFn: async ({ name, teamId }: { name: string; teamId: string }) => {
      const { error } = await supabase.from("players").insert({
        name,
        team_id: teamId,
        goals: 0,
        saves: 0
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["players"] });
      toast({ title: "Player added" });
      setPlayerName("");
      setSelectedTeamId("");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deletePlayerMutation = useMutation({
    mutationFn: async (playerId: string) => {
      // First delete related match events
      await supabase
        .from("match_events")
        .delete()
        .eq("player_id", playerId);

      // Then delete the player
      const { error } = await supabase
        .from("players")
        .delete()
        .eq("id", playerId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["players"] });
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      toast({ title: "Player deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleDeletePlayer = async (playerId: string, playerName: string) => {
    if (window.confirm(`Are you sure you want to delete ${playerName}? This will also remove their match history.`)) {
      try {
        await deletePlayerMutation.mutateAsync(playerId);
      } catch (error) {
        console.error("Delete failed:", error);
      }
    }
  };

  if (teamsLoading || playersLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold">Team Management</h1>
        <p className="text-muted-foreground mt-2">Create teams and manage players</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Create Team</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="teamName">Team Name</Label>
              <Input
                id="teamName"
                placeholder="Enter team name"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
              />
            </div>
            <Button
              onClick={() => {
                if (!teamName.trim()) {
                  toast({ title: "Enter a team name", variant: "destructive" });
                  return;
                }
                createTeamMutation.mutate(teamName.trim());
              }}
              className="w-full"
            >
              <Users className="mr-2 h-4 w-4" />
              Create Team
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Add Player</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="playerName">Player Name</Label>
              <Input
                id="playerName"
                placeholder="Enter player name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="teamSelect">Select Team</Label>
              <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                <SelectTrigger id="teamSelect">
                  <SelectValue placeholder="Select a team" />
                </SelectTrigger>
                <SelectContent>
                  {teams?.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={() => {
                if (!playerName.trim()) {
                  toast({ title: "Enter a player name", variant: "destructive" });
                  return;
                }
                if (!selectedTeamId) {
                  toast({ title: "Select a team", variant: "destructive" });
                  return;
                }
                createPlayerMutation.mutate({
                  name: playerName.trim(),
                  teamId: selectedTeamId,
                });
              }}
              className="w-full"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Add Player
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Teams & Players</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {!teams?.length && (
              <p className="text-sm text-muted-foreground">No teams yet.</p>
            )}
            {teams?.map((team) => (
              <div key={team.id} className="p-4 rounded-lg bg-secondary/50">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">{team.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      Points: {team.points || 0} • W{team.wins || 0} D{team.draws || 0} L{team.losses || 0}
                    </p>
                  </div>
                </div>
                <div className="mt-3">
                  <h4 className="text-sm font-medium mb-2">Players</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {players
                      ?.filter((p) => p.team_id === team.id)
                      .map((player) => (
                        <div
                          key={player.id}
                          className="p-2 border rounded flex justify-between items-center"
                        >
                          <div>
                            <p className="font-medium">{player.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Goals: {player.goals || 0} • Saves: {player.saves || 0}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeletePlayer(player.id, player.name)}
                            disabled={deletePlayerMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    {!players?.filter((p) => p.team_id === team.id).length && (
                      <p className="text-sm text-muted-foreground">
                        No players added
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Teams;