// src/components/dashboard/QuestionCycleTab.tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CreateQuestionCycleTab from './CreateQuestionCycleTab';
import TrackQuestionCycleTab from './TrackQuestionCycleTab';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

const QuestionCycleTab = () => {
  const { user } = useAuth();

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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Ciclo Questões</h2>
        <p className="text-muted-foreground">Configure e visualize a distribuição de horas baseada no desempenho</p>
      </div>

      <Tabs defaultValue={currentCycle ? "acompanhar" : "criar"} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="criar">Criar Ciclo</TabsTrigger>
          <TabsTrigger value="acompanhar">Acompanhar Ciclo</TabsTrigger>
        </TabsList>
        <TabsContent value="criar" className="mt-6">
          <CreateQuestionCycleTab />
        </TabsContent>
        <TabsContent value="acompanhar" className="mt-6">
          <TrackQuestionCycleTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default QuestionCycleTab;