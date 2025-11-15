// src/components/dashboard/TrackQuestionCycleTab.tsx
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
import { Calculator, Clock, Plus, Pencil, Target } from 'lucide-react';

const TrackQuestionCycleTab = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [hoursToAdd, setHoursToAdd] = useState<Record<string, string>>({});
  const [editingTotalHours, setEditingTotalHours] = useState(false);
  const [newTotalHours, setNewTotalHours] = useState<number>(0);

  const { data: currentCycle } = useQuery({
    queryKey: ['current-question-cycle', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('question_cycles')
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
    queryKey: ['question-cycle-allocations', currentCycle?.id],
    queryFn: async () => {
      if (!currentCycle?.id) return [];
      
      const { data, error } = await supabase
        .from('question_cycle_allocations')
        .select('*')
        .eq('cycle_id', currentCycle.id);
      
      if (error) throw error;
      return data;
    },
    enabled: !!currentCycle?.id,
  });

  const { data: studySessions } = useQuery({
    queryKey: ['question-study-sessions', currentCycle?.id],
    queryFn: async () => {
      if (!currentCycle?.id) return [];
      
      const { data, error } = await supabase
        .from('question_study_sessions')
        .select('*')
        .eq('cycle_id', currentCycle.id);
      
      if (error) throw error;
      return data;
    },
    enabled: !!currentCycle?.id,
  });

  const { data: subjectsWithPerformance } = useQuery({
    queryKey: ['subjects-performance-details', user?.id, currentCycle?.target_percentage, currentCycle?.min_questions],
    queryFn: async () => {
      if (!currentCycle) return [];

      const { data: examSubjects, error: subjectsError } = await supabase
        .from('exam_subjects')
        .select('id, subject_name')
        .eq('user_id', user!.id);
      
      if (subjectsError) throw subjectsError;

      if (!examSubjects || examSubjects.length === 0) {
        return [];
      }

      const subjectsWithTopics = await Promise.all(
        examSubjects.map(async (subject) => {
          const { data: topics, error: topicsError } = await supabase
            .from('exam_topics')
            .select('id, topic_name, is_relevant')
            .eq('exam_subject_id', subject.id)
            .eq('is_relevant', true);
          
          if (topicsError) throw topicsError;

          if (!topics || topics.length === 0) {
            return null;
          }

          const topicsWithPerformance = await Promise.all(
            topics.map(async (topic) => {
              const { data: performances, error: perfError } = await supabase
                .from('question_performance')
                .select('correct_answers, answered_questions, total_questions')
                .eq('exam_topic_id', topic.id)
                .order('created_at', { ascending: false })
                .limit(1);
              
              if (perfError) throw perfError;

              const latestPerf = performances?.[0];
              const currentPercentage = latestPerf && latestPerf.answered_questions > 0 
                ? Math.round((latestPerf.correct_answers / latestPerf.answered_questions) * 100)
                : 0;
              
              const totalAnswered = latestPerf?.answered_questions || 0;

              return {
                ...topic,
                currentPercentage,
                totalAnswered,
                meetsTarget: currentPercentage >= currentCycle.target_percentage && totalAnswered >= currentCycle.min_questions
              };
            })
          );

          const unmetTargetsCount = topicsWithPerformance.filter(topic => !topic.meetsTarget).length;

          return {
            id: subject.id,
            name: subject.subject_name,
            topics: topicsWithPerformance,
            unmetTargetsCount,
            totalTopics: topicsWithPerformance.length
          };
        })
      );

      return subjectsWithTopics.filter((subject): subject is NonNullable<typeof subject> => subject !== null);
    },
    enabled: !!currentCycle && !!user,
  });

  const addStudySessionMutation = useMutation({
    mutationFn: async ({ subjectId, hours }: { subjectId: string; hours: number }) => {
      if (!currentCycle?.id) throw new Error('Nenhum ciclo ativo');

      const { error } = await supabase
        .from('question_study_sessions')
        .insert({
          cycle_id: currentCycle.id,
          subject_id: subjectId,
          hours_studied: hours,
        });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['question-study-sessions'] });
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
        .from('question_cycles')
        .update({ total_hours: totalHours })
        .eq('id', currentCycle.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-question-cycle'] });
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

  const getSubjectPerformance = (subjectId: string) => {
    const subject = subjectsWithPerformance?.find(s => s.id === subjectId);
    if (!subject) return { unmetTargetsCount: 0, totalTopics: 0 };
    
    return {
      unmetTargetsCount: subject.unmetTargetsCount,
      totalTopics: subject.totalTopics
    };
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
            Crie um novo ciclo de questões na aba "Criar Ciclo"
          </p>
        </CardContent>
      </Card>
    );
  }

  const allocationsWithData = cycleAllocations?.map(alloc => {
    const subject = subjectsWithPerformance?.find(s => s.id === alloc.subject_id);
    const performance = getSubjectPerformance(alloc.subject_id);
    
    return {
      ...alloc,
      subjectName: subject?.name || 'Matéria',
      unmetTargetsCount: performance.unmetTargetsCount,
      totalTopics: performance.totalTopics,
    };
  }) || [];

  return (
    <div className="space-y-6">
      {/* Informações do Ciclo Atual */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Ciclo de Questões Atual
          </CardTitle>
          <CardDescription>
            <div className="space-y-2 mt-2">
              <div className="flex items-center gap-4 text-sm">
                <span><strong>Meta:</strong> {currentCycle.target_percentage}% de acertos</span>
                <span><strong>Mín. questões:</strong> {currentCycle.min_questions}</span>
              </div>
              {editingTotalHours ? (
                <div className="flex items-center gap-2 mt-2">
                  <Label htmlFor="edit-total-hours">Total de horas:</Label>
                  <Input
                    id="edit-total-hours"
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
                  <span><strong>Total:</strong> {currentCycle.total_hours} horas</span>
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
            </div>
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
                          {allocation.unmetTargetsCount} de {allocation.totalTopics} assuntos não atingiram a meta
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
              Este ciclo não possui matérias alocadas ou todas as matérias já atingiram a meta
            </p>
          </CardContent>
        </Card>
      )}

      {/* Resumo do Progresso Geral */}
      {allocationsWithData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Resumo do Progresso</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {allocationsWithData.length}
                </div>
                <div className="text-sm text-muted-foreground">Matérias no ciclo</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-warning">
                  {allocationsWithData.reduce((sum, alloc) => sum + alloc.unmetTargetsCount, 0)}
                </div>
                <div className="text-sm text-muted-foreground">Assuntos pendentes</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-success">
                  {studySessions?.reduce((sum, session) => sum + session.hours_studied, 0).toFixed(1)}h
                </div>
                <div className="text-sm text-muted-foreground">Total estudado</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TrackQuestionCycleTab;