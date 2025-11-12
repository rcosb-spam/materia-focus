import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Calculator, Clock, Save } from 'lucide-react';
import { calculateCycleAllocations } from '@/utils/cycleCalculator';

const CreateCycleTab = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [totalHours, setTotalHours] = useState<number>(30);
  const [customAllocations, setCustomAllocations] = useState<Record<string, number>>({});

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

      return subjectsWithCounts;
    },
    enabled: !!user,
  });

  const saveCycleMutation = useMutation({
    mutationFn: async () => {
      const finalAllocations = allocations.map(allocation => ({
        subjectId: allocation.subjectId,
        hours: customAllocations[allocation.subjectId] ?? allocation.suggestedHours,
      }));

      const { data: cycle, error: cycleError } = await supabase
        .from('study_cycles')
        .insert({
          user_id: user!.id,
          total_hours: totalHours,
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
        .from('cycle_allocations')
        .insert(allocationsToInsert);

      if (allocError) throw allocError;

      return cycle;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-cycle'] });
      queryClient.invalidateQueries({ queryKey: ['cycle-allocations'] });
      toast({
        title: 'Ciclo salvo!',
        description: 'Seu ciclo de estudos foi salvo com sucesso.',
      });
    },
    onError: () => {
      toast({
        title: 'Erro ao salvar ciclo',
        description: 'Não foi possível salvar o ciclo de estudos.',
        variant: 'destructive',
      });
    },
  });

  const allocations = subjects ? calculateCycleAllocations(subjects, totalHours) : [];

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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Total de Horas do Ciclo
          </CardTitle>
          <CardDescription>
            Defina quantas horas terá o seu ciclo de estudos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="total-hours">Horas Totais</Label>
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
              Sugestão baseada nas aulas não estudadas (mínimo 1h por matéria)
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
                          {allocation.unstudiedCount} aulas não estudadas ({allocation.percentage}%)
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
                Salvar Ciclo
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calculator className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma matéria com aulas pendentes</h3>
            <p className="text-muted-foreground text-center">
              Importe matérias e cadastre aulas para começar a planejar seu ciclo de estudos
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CreateCycleTab;
