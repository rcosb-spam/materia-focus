// src/components/dashboard/CreateQuestionCycleTab.tsx
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Calculator, Target, Save } from 'lucide-react';
import { calculateQuestionCycleAllocations } from '@/utils/questionCycleCalculator';

interface SubjectWithPerformance {
  id: string;
  name: string;
  unmetTargetsCount: number;
  totalTopics: number;
}

const CreateQuestionCycleTab = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [totalHours, setTotalHours] = useState<number>(20);
  const [targetPercentage, setTargetPercentage] = useState<number>(70);
  const [minQuestions, setMinQuestions] = useState<number>(10);
  const [customAllocations, setCustomAllocations] = useState<Record<string, number>>({});

  const { data: subjectsWithPerformance, isLoading } = useQuery({
    queryKey: ['subjects-performance', user?.id, targetPercentage, minQuestions],
    queryFn: async (): Promise<SubjectWithPerformance[]> => {
      // Buscar matérias da prova com assuntos relevantes
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
          // Buscar assuntos relevantes desta matéria
          const { data: topics, error: topicsError } = await supabase
            .from('exam_topics')
            .select('id, topic_name, is_relevant')
            .eq('exam_subject_id', subject.id)
            .eq('is_relevant', true);
          
          if (topicsError) throw topicsError;

          if (!topics || topics.length === 0) {
            return null;
          }

          // Para cada assunto, buscar desempenho
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
                meetsTarget: currentPercentage >= targetPercentage && totalAnswered >= minQuestions
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

      // Filtrar matérias nulas e matérias sem assuntos não atingidos
      return subjectsWithTopics
        .filter((subject): subject is NonNullable<typeof subject> => subject !== null)
        .filter(subject => subject.unmetTargetsCount > 0);
    },
    enabled: !!user,
  });

  const saveCycleMutation = useMutation({
    mutationFn: async () => {
      if (!subjectsWithPerformance || allocations.length === 0) {
        throw new Error('Nenhuma matéria para alocar');
      }

      const finalAllocations = allocations.map(allocation => ({
        subjectId: allocation.subjectId,
        hours: customAllocations[allocation.subjectId] ?? allocation.suggestedHours,
      }));

      const { data: cycle, error: cycleError } = await supabase
        .from('question_cycles')
        .insert({
          user_id: user!.id,
          total_hours: totalHours,
          target_percentage: targetPercentage,
          min_questions: minQuestions,
        })
        .select()
        .single();

      if (cycleError) throw cycleError;

      const allocationsToInsert = finalAllocations.map(alloc => ({
        cycle_id: cycle.id,
        subject_id: alloc.subjectId,
        allocated_hours: alloc.hours,
      }));

      const { error: allocError } = await supabase
        .from('question_cycle_allocations')
        .insert(allocationsToInsert);

      if (allocError) throw allocError;

      return cycle;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-question-cycle'] });
      queryClient.invalidateQueries({ queryKey: ['question-cycle-allocations'] });
      toast({
        title: 'Ciclo salvo!',
        description: 'Seu ciclo de questões foi salvo com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao salvar ciclo',
        description: error.message || 'Não foi possível salvar o ciclo de questões.',
        variant: 'destructive',
      });
    },
  });

  const allocations = subjectsWithPerformance 
    ? calculateQuestionCycleAllocations(subjectsWithPerformance, totalHours, targetPercentage, minQuestions)
    : [];

  const handleAllocationChange = (subjectId: string, hours: number) => {
    setCustomAllocations(prev => ({
      ...prev,
      [subjectId]: hours,
    }));
  };

  const getTotalAllocated = () => {
    let total = 0;
    allocations.forEach(allocation => {
      const customHours = customAllocations[allocation.subjectId];
      total += customHours !== undefined ? customHours : allocation.suggestedHours;
    });
    return total;
  };

  const totalAllocated = getTotalAllocated();
  const isOverAllocated = totalAllocated > totalHours;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Analisando desempenho...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Configurações de Meta */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Meta de Desempenho
          </CardTitle>
          <CardDescription>
            Defina as metas que devem ser alcançadas por cada assunto
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="target-percentage">Percentual de Acertos (%)</Label>
              <Input
                id="target-percentage"
                type="number"
                min="0"
                max="100"
                value={targetPercentage}
                onChange={(e) => setTargetPercentage(parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="min-questions">Mín. de Questões</Label>
              <Input
                id="min-questions"
                type="number"
                min="1"
                value={minQuestions}
                onChange={(e) => setMinQuestions(parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="total-hours">Horas Totais do Ciclo</Label>
              <Input
                id="total-hours"
                type="number"
                min="1"
                value={totalHours}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  if (value > 0) {
                    setTotalHours(value);
                    setCustomAllocations({});
                  }
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {allocations.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              Distribuição de Horas
            </CardTitle>
            <CardDescription>
              Sugestão baseada em assuntos que não atingiram a meta (mínimo 1h por matéria)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {allocations.map((allocation) => {
                const customHours = customAllocations[allocation.subjectId];
                const displayHours = customHours !== undefined ? customHours : allocation.suggestedHours;

                return (
                  <div key={allocation.subjectId} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold">{allocation.subjectName}</h3>
                        <p className="text-sm text-muted-foreground">
                          {allocation.unmetTargetsCount} de {allocation.totalTopics} assuntos não atingiram a meta ({allocation.percentage}%)
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor={`hours-${allocation.subjectId}`}>
                        Horas Alocadas
                        {customHours === undefined && (
                          <span className="text-xs text-muted-foreground ml-2">
                            (sugestão: {allocation.suggestedHours}h)
                          </span>
                        )}
                      </Label>
                      <Input
                        id={`hours-${allocation.subjectId}`}
                        type="number"
                        min="1"
                        step="0.5"
                        value={displayHours}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value);
                          if (value >= 1) {
                            handleAllocationChange(allocation.subjectId, value);
                          }
                        }}
                      />
                    </div>
                  </div>
                );
              })}

              <div className="border-t pt-4 mt-4">
                <div className="flex items-center justify-between text-lg font-semibold">
                  <span>Total Alocado:</span>
                  <span className={isOverAllocated ? 'text-destructive' : 'text-success'}>
                    {totalAllocated.toFixed(1)}h / {totalHours}h
                  </span>
                </div>
                {isOverAllocated && (
                  <p className="text-sm text-destructive mt-2">
                    ⚠️ Total alocado excede as horas disponíveis
                  </p>
                )}
              </div>
              
              <Button 
                onClick={() => saveCycleMutation.mutate()} 
                disabled={isOverAllocated || saveCycleMutation.isPending}
                className="w-full"
              >
                <Save className="mr-2 h-4 w-4" />
                {saveCycleMutation.isPending ? 'Salvando...' : 'Salvar Ciclo'}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calculator className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {!subjectsWithPerformance || subjectsWithPerformance.length === 0 
                ? "Nenhuma matéria com assuntos relevantes" 
                : "Todas as matérias atingiram a meta!"}
            </h3>
            <p className="text-muted-foreground text-center">
              {!subjectsWithPerformance || subjectsWithPerformance.length === 0 
                ? "Marque assuntos como relevantes na aba 'Matérias da Prova'"
                : "Parabéns! Todas as matérias atingiram as metas de desempenho."}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CreateQuestionCycleTab;