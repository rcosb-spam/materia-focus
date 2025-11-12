import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Calculator, Clock, Plus, Pencil } from 'lucide-react';

const TrackCycleTab = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [hoursToAdd, setHoursToAdd] = useState<Record<string, string>>({});
  const [editingTotalHours, setEditingTotalHours] = useState(false);
  const [newTotalHours, setNewTotalHours] = useState<number>(0);

  const { data: subjects } = useQuery({
    queryKey: ['subjects-with-lessons', user?.id],
    queryFn: async () => {
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('subjects')
        .select('id, name')
        .eq('user_id', user!.id);
      
      if (subjectsError) throw subjectsError;

      const subjectsWithCounts = await Promise.all(
        subjectsData.map(async (subject) => {
          const { data: lessons, error: lessonsError } = await supabase
            .from('lessons')
            .select('is_studied')
            .eq('subject_id', subject.id);
          
          if (lessonsError) throw lessonsError;

          const unstudiedCount = lessons.filter(l => !l.is_studied).length;

          return {
            id: subject.id,
            name: subject.name,
            unstudiedCount,
          };
        })
      );

      return subjectsWithCounts.filter(s => s.unstudiedCount > 0);
    },
    enabled: !!user,
  });

  const { data: currentCycle } = useQuery({
    queryKey: ['current-cycle', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('study_cycles')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: cycleAllocations } = useQuery({
    queryKey: ['cycle-allocations', currentCycle?.id],
    queryFn: async () => {
      if (!currentCycle?.id) return [];
      
      const { data, error } = await supabase
        .from('cycle_allocations')
        .select('*')
        .eq('cycle_id', currentCycle.id);
      
      if (error) throw error;
      return data;
    },
    enabled: !!currentCycle?.id,
  });

  const { data: studySessions } = useQuery({
    queryKey: ['study-sessions', currentCycle?.id],
    queryFn: async () => {
      if (!currentCycle?.id) return [];
      
      const { data, error } = await supabase
        .from('study_sessions')
        .select('*')
        .eq('cycle_id', currentCycle.id);
      
      if (error) throw error;
      return data;
    },
    enabled: !!currentCycle?.id,
  });

  const addStudySessionMutation = useMutation({
    mutationFn: async ({ subjectId, hours }: { subjectId: string; hours: number }) => {
      if (!currentCycle?.id) throw new Error('Nenhum ciclo ativo');

      const { error } = await supabase
        .from('study_sessions')
        .insert({
          cycle_id: currentCycle.id,
          subject_id: subjectId,
          hours_studied: hours,
        });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['study-sessions'] });
      setHoursToAdd(prev => ({ ...prev, [variables.subjectId]: '' }));
      toast({
        title: 'Horas registradas!',
        description: 'Suas horas de estudo foram registradas com sucesso.',
      });
    },
    onError: () => {
      toast({
        title: 'Erro ao registrar horas',
        description: 'Não foi possível registrar as horas estudadas.',
        variant: 'destructive',
      });
    },
  });

  const updateTotalHoursMutation = useMutation({
    mutationFn: async (totalHours: number) => {
      if (!currentCycle?.id) throw new Error('Nenhum ciclo ativo');

      const { error } = await supabase
        .from('study_cycles')
        .update({ total_hours: totalHours })
        .eq('id', currentCycle.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-cycle'] });
      setEditingTotalHours(false);
      toast({
        title: 'Total de horas atualizado!',
        description: 'O total de horas do ciclo foi atualizado com sucesso.',
      });
    },
    onError: () => {
      toast({
        title: 'Erro ao atualizar horas',
        description: 'Não foi possível atualizar o total de horas.',
        variant: 'destructive',
      });
    },
  });

  const getStudiedHours = (subjectId: string) => {
    if (!studySessions) return 0;
    return studySessions
      .filter(session => session.subject_id === subjectId)
      .reduce((sum, session) => sum + session.hours_studied, 0);
  };

  const getAllocatedHours = (subjectId: string) => {
    if (!cycleAllocations) return 0;
    const allocation = cycleAllocations.find(alloc => alloc.subject_id === subjectId);
    return allocation?.allocated_hours || 0;
  };

  const handleAddStudyHours = (subjectId: string) => {
    const hours = parseFloat(hoursToAdd[subjectId] || '0');
    if (hours > 0) {
      addStudySessionMutation.mutate({ subjectId, hours });
    }
  };

  const handleUpdateTotalHours = () => {
    if (newTotalHours > 0) {
      updateTotalHoursMutation.mutate(newTotalHours);
    }
  };

  if (!currentCycle) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Clock className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhum ciclo ativo</h3>
          <p className="text-muted-foreground text-center">
            Crie um novo ciclo de estudos na aba "Criar Ciclo"
          </p>
        </CardContent>
      </Card>
    );
  }

  const allocationsWithData = cycleAllocations?.map(alloc => {
    const subject = subjects?.find(s => s.id === alloc.subject_id);
    return {
      ...alloc,
      subjectName: subject?.name || 'Matéria',
      unstudiedCount: subject?.unstudiedCount || 0,
    };
  }) || [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Ciclo Atual
          </CardTitle>
          <CardDescription>
            {editingTotalHours ? (
              <div className="flex items-center gap-2 mt-2">
                <Input
                  type="number"
                  min="1"
                  value={newTotalHours}
                  onChange={(e) => setNewTotalHours(parseInt(e.target.value))}
                  className="w-24"
                />
                <Button 
                  size="sm" 
                  onClick={handleUpdateTotalHours}
                  disabled={updateTotalHoursMutation.isPending || newTotalHours <= 0}
                >
                  Salvar
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => setEditingTotalHours(false)}
                >
                  Cancelar
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span>Total: {currentCycle.total_hours} horas</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setNewTotalHours(currentCycle.total_hours);
                    setEditingTotalHours(true);
                  }}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
              </div>
            )}
          </CardDescription>
        </CardHeader>
      </Card>

      {allocationsWithData.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              Acompanhamento do Ciclo
            </CardTitle>
            <CardDescription>
              Registre suas horas de estudo e acompanhe o progresso
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {allocationsWithData.map((allocation) => {
                const allocatedHours = allocation.allocated_hours;
                const studiedHours = getStudiedHours(allocation.subject_id);
                const remainingHours = Math.max(0, allocatedHours - studiedHours);
                const progress = allocatedHours > 0 ? (studiedHours / allocatedHours) * 100 : 0;

                return (
                  <div key={allocation.subject_id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold">{allocation.subjectName}</h3>
                        <p className="text-sm text-muted-foreground">
                          {allocation.unstudiedCount} aulas não estudadas
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Progresso</span>
                        <span className="font-medium">
                          {studiedHours.toFixed(1)}h / {allocatedHours.toFixed(1)}h
                        </span>
                      </div>
                      <Progress value={progress} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        Faltam {remainingHours.toFixed(1)}h para completar
                      </p>
                    </div>
                    
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Input
                          type="number"
                          min="0.5"
                          step="0.5"
                          placeholder="Horas estudadas"
                          value={hoursToAdd[allocation.subject_id] || ''}
                          onChange={(e) => setHoursToAdd(prev => ({
                            ...prev,
                            [allocation.subject_id]: e.target.value
                          }))}
                        />
                      </div>
                      <Button
                        onClick={() => handleAddStudyHours(allocation.subject_id)}
                        disabled={!hoursToAdd[allocation.subject_id] || addStudySessionMutation.isPending}
                        size="icon"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calculator className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma matéria alocada</h3>
            <p className="text-muted-foreground text-center">
              Este ciclo não possui matérias alocadas
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TrackCycleTab;
