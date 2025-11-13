import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { Upload, BarChart3, TrendingUp, ChevronDown } from 'lucide-react';
import { parseNotebookPerformanceCSV } from '@/utils/performanceCsvParser';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const PerformanceTracker = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [openSubjects, setOpenSubjects] = useState<Record<string, boolean>>({});
  const [openTopics, setOpenTopics] = useState<Record<string, boolean>>({});

  const { data: performances, isLoading } = useQuery({
    queryKey: ['performances', user?.id],
    queryFn: async () => {
      // First get all notebooks for this user
      const { data: notebooks, error: notebooksError } = await supabase
        .from('question_notebooks')
        .select('id')
        .eq('user_id', user!.id);
      
      if (notebooksError) throw notebooksError;
      
      if (!notebooks || notebooks.length === 0) {
        return [];
      }
      
      const notebookIds = notebooks.map(n => n.id);
      
      // Then get performances for those notebooks
      const { data, error } = await supabase
        .from('question_performance')
        .select(`
          *,
          question_notebooks(notebook_id, uploaded_at),
          exam_subjects(subject_name),
          exam_topics(topic_name, is_relevant)
        `)
        .in('notebook_id', notebookIds)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!csvFile) {
        throw new Error('Por favor, selecione um arquivo CSV');
      }

      const fileContent = await csvFile.text();
      const parsedData = parseNotebookPerformanceCSV(fileContent);

      if (parsedData.length === 0) {
        throw new Error('Nenhum dado válido encontrado no CSV');
      }

      // Get unique notebook ID
      const notebookId = parsedData[0].notebookId;

      // Create notebook entry
      const { data: notebook, error: notebookError } = await supabase
        .from('question_notebooks')
        .insert({ 
          user_id: user!.id, 
          notebook_id: notebookId 
        })
        .select()
        .single();

      if (notebookError) throw notebookError;

      // Process each performance entry
      for (const perf of parsedData) {
        // Find or create subject
        const { data: subject } = await supabase
          .from('exam_subjects')
          .select('id')
          .eq('user_id', user!.id)
          .eq('subject_name', perf.subject)
          .single();

        if (!subject) continue;

        // Find or create topic
        const { data: topic } = await supabase
          .from('exam_topics')
          .select('id')
          .eq('exam_subject_id', subject.id)
          .eq('topic_name', perf.topic)
          .single();

        if (!topic) continue;

        // Insert performance
        await supabase
          .from('question_performance')
          .insert({
            notebook_id: notebook.id,
            exam_subject_id: subject.id,
            exam_topic_id: topic.id,
            correct_answers: perf.correctAnswers,
            answered_questions: perf.answeredQuestions,
            total_questions: perf.totalQuestions,
          });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performances'] });
      toast({
        title: 'Sucesso!',
        description: 'Desempenho do caderno importado com sucesso.',
      });
      setIsUploadOpen(false);
      setCsvFile(null);
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao importar',
        description: error.message,
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.csv')) {
        toast({
          variant: 'destructive',
          title: 'Arquivo inválido',
          description: 'Por favor, selecione um arquivo CSV.',
        });
        return;
      }
      setCsvFile(file);
    }
  };

  const getPerformancePercentage = (correct: number, answered: number) => {
    if (answered === 0) return 0;
    return Math.round((correct / answered) * 100);
  };

  const getPerformanceColor = (percentage: number) => {
    if (percentage >= 70) return 'text-green-600';
    if (percentage >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (isLoading) {
    return <div>Carregando...</div>;
  }

  // Group performances by subject, then by topic
  const subjectPerformances = new Map<string, Map<string, any[]>>();
  performances?.forEach((perf: any) => {
    const subjectName = perf.exam_subjects.subject_name;
    const topicName = perf.exam_topics.topic_name;
    
    if (!subjectPerformances.has(subjectName)) {
      subjectPerformances.set(subjectName, new Map());
    }
    
    const topicMap = subjectPerformances.get(subjectName)!;
    if (!topicMap.has(topicName)) {
      topicMap.set(topicName, []);
    }
    
    topicMap.get(topicName)!.push(perf);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Acompanhamento de Desempenho</h2>
          <p className="text-muted-foreground">Importe cadernos de questões e acompanhe seu progresso</p>
        </div>
        
        <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
          <DialogTrigger asChild>
            <Button>
              <Upload className="h-4 w-4 mr-2" />
              Importar Caderno
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Importar Caderno de Questões</DialogTitle>
              <DialogDescription>
                Faça upload de um arquivo CSV com as colunas: caderno;Matéria;Subtópico;acertos;resolvidas;total
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="csv">Arquivo CSV</Label>
                <Input
                  id="csv"
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                />
                {csvFile && (
                  <p className="text-sm text-muted-foreground">
                    Arquivo selecionado: {csvFile.name}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsUploadOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={() => uploadMutation.mutate()}
                disabled={!csvFile || uploadMutation.isPending}
              >
                {uploadMutation.isPending ? 'Importando...' : 'Importar'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {!performances || performances.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Nenhum desempenho registrado</CardTitle>
            <CardDescription>
              Importe um caderno de questões para começar o acompanhamento
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Clique no botão "Importar Caderno" para adicionar seus resultados
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {Array.from(subjectPerformances.entries()).map(([subjectName, topicMap]) => {
            const totalRegistros = Array.from(topicMap.values()).reduce((acc, perfs) => acc + perfs.length, 0);
            
            return (
              <Card key={subjectName}>
                <CardHeader>
                  <Collapsible
                    open={openSubjects[subjectName] !== false}
                    onOpenChange={(open) => setOpenSubjects({ ...openSubjects, [subjectName]: open })}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>{subjectName}</CardTitle>
                        <CardDescription>
                          {topicMap.size} {topicMap.size === 1 ? 'assunto' : 'assuntos'} • {totalRegistros} {totalRegistros === 1 ? 'registro' : 'registros'}
                        </CardDescription>
                      </div>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <ChevronDown className={`h-4 w-4 transition-transform ${openSubjects[subjectName] !== false ? 'rotate-180' : ''}`} />
                        </Button>
                      </CollapsibleTrigger>
                    </div>
                    
                    <CollapsibleContent>
                      <CardContent className="pt-4 px-0 space-y-4">
                        {Array.from(topicMap.entries()).map(([topicName, perfs]) => {
                          // Only show relevant topics
                          if (!perfs[0].exam_topics.is_relevant) return null;
                          
                          const topicKey = `${subjectName}-${topicName}`;
                          
                          return (
                            <Collapsible
                              key={topicKey}
                              open={openTopics[topicKey] !== false}
                              onOpenChange={(open) => setOpenTopics({ ...openTopics, [topicKey]: open })}
                            >
                              <Card>
                                <CardHeader>
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <CardTitle className="text-base">{topicName}</CardTitle>
                                      <CardDescription>
                                        {perfs.length} {perfs.length === 1 ? 'registro' : 'registros'}
                                      </CardDescription>
                                    </div>
                                    <CollapsibleTrigger asChild>
                                      <Button variant="ghost" size="sm">
                                        <ChevronDown className={`h-4 w-4 transition-transform ${openTopics[topicKey] !== false ? 'rotate-180' : ''}`} />
                                      </Button>
                                    </CollapsibleTrigger>
                                  </div>
                                </CardHeader>
                                
                                <CollapsibleContent>
                                  <CardContent className="space-y-4">
                                    {perfs.map((perf: any) => {
                                      const percentage = getPerformancePercentage(
                                        perf.correct_answers,
                                        perf.answered_questions
                                      );
                                      
                                      return (
                                        <div key={perf.id} className="flex items-center justify-between p-4 border rounded-lg">
                                          <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                              <span className="text-sm font-medium">
                                                Caderno: {perf.question_notebooks.notebook_id}
                                              </span>
                                              <span className="text-xs text-muted-foreground">
                                                {format(new Date(perf.question_notebooks.uploaded_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                              </span>
                                            </div>
                                            <div className="text-sm text-muted-foreground">
                                              {perf.answered_questions} de {perf.total_questions} questões resolvidas
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <TrendingUp className={`h-5 w-5 ${getPerformanceColor(percentage)}`} />
                                            <span className={`text-2xl font-bold ${getPerformanceColor(percentage)}`}>
                                              {percentage}%
                                            </span>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </CardContent>
                                </CollapsibleContent>
                              </Card>
                            </Collapsible>
                          );
                        })}
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PerformanceTracker;
