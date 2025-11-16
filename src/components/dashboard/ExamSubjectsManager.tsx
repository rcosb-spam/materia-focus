import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileSpreadsheet, ChevronDown, Trash2, CheckSquare, Square } from 'lucide-react';
import { parseExamSubjectsCSV } from '@/utils/performanceCsvParser';

const ExamSubjectsManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [openSubjects, setOpenSubjects] = useState<Record<string, boolean>>({});
  const [deleteSubjectId, setDeleteSubjectId] = useState<string | null>(null);

  const { data: examSubjects, isLoading } = useQuery({
    queryKey: ['examSubjects', user?.id],
    queryFn: async () => {
      const { data: subjects, error } = await supabase
        .from('exam_subjects')
        .select('*, exam_topics(*)')
        .eq('user_id', user!.id)
        .order('subject_name');
      
      if (error) throw error;
      return subjects;
    },
    enabled: !!user,
  });

  const deleteSubjectMutation = useMutation({
    mutationFn: async (subjectId: string) => {
      const { error } = await supabase
        .from('exam_subjects')
        .delete()
        .eq('id', subjectId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['examSubjects'] });
      toast({
        title: 'Sucesso!',
        description: 'Matéria deletada com sucesso.',
      });
      setDeleteSubjectId(null);
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao deletar',
        description: error.message,
      });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!csvFile) {
        throw new Error('Por favor, selecione um arquivo CSV');
      }

      const fileContent = await csvFile.text();
      const parsedData = parseExamSubjectsCSV(fileContent);

      if (parsedData.length === 0) {
        throw new Error('Nenhum dado válido encontrado no CSV');
      }

      // Group topics by subject
      const subjectMap = new Map<string, string[]>();
      parsedData.forEach(item => {
        if (!subjectMap.has(item.subject)) {
          subjectMap.set(item.subject, []);
        }
        subjectMap.get(item.subject)!.push(item.topic);
      });

      // Insert subjects and topics
      for (const [subjectName, topics] of subjectMap.entries()) {
        // Check if subject already exists
        const { data: existingSubject } = await supabase
          .from('exam_subjects')
          .select('id')
          .eq('user_id', user!.id)
          .eq('subject_name', subjectName)
          .single();

        let subjectId: string;

        if (existingSubject) {
          subjectId = existingSubject.id;
        } else {
          // Create new subject
          const { data: newSubject, error: subjectError } = await supabase
            .from('exam_subjects')
            .insert({ user_id: user!.id, subject_name: subjectName })
            .select()
            .single();

          if (subjectError) throw subjectError;
          subjectId = newSubject.id;
        }

        // Insert topics
        for (const topicName of topics) {
          // Check if topic already exists
          const { data: existingTopic } = await supabase
            .from('exam_topics')
            .select('id')
            .eq('exam_subject_id', subjectId)
            .eq('topic_name', topicName)
            .single();

          if (!existingTopic) {
            await supabase
              .from('exam_topics')
              .insert({
                exam_subject_id: subjectId,
                topic_name: topicName,
                is_relevant: false,
              });
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['examSubjects'] });
      toast({
        title: 'Sucesso!',
        description: 'Matérias e assuntos importados com sucesso.',
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

  const toggleRelevanceMutation = useMutation({
    mutationFn: async ({ topicId, isRelevant }: { topicId: string; isRelevant: boolean }) => {
      const { error } = await supabase
        .from('exam_topics')
        .update({ is_relevant: isRelevant })
        .eq('id', topicId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['examSubjects'] });
    },
  });

  const toggleAllMutation = useMutation({
    mutationFn: async (isRelevant: boolean) => {
      const allTopicIds = examSubjects?.flatMap(subject => 
        subject.exam_topics.map((topic: any) => topic.id)
      ) || [];

      const { error } = await supabase
        .from('exam_topics')
        .update({ is_relevant: isRelevant })
        .in('id', allTopicIds);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['examSubjects'] });
      toast({
        title: 'Sucesso!',
        description: 'Todos os assuntos foram atualizados.',
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar',
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

  if (isLoading) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Matérias da Prova</h2>
          <p className="text-muted-foreground">Gerencie as matérias e assuntos relevantes para sua prova</p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => toggleAllMutation.mutate(true)}
            disabled={toggleAllMutation.isPending || !examSubjects || examSubjects.length === 0}
          >
            <CheckSquare className="h-4 w-4 mr-2" />
            Marcar Todos
          </Button>
          <Button
            variant="outline"
            onClick={() => toggleAllMutation.mutate(false)}
            disabled={toggleAllMutation.isPending || !examSubjects || examSubjects.length === 0}
          >
            <Square className="h-4 w-4 mr-2" />
            Desmarcar Todos
          </Button>
          <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
            <DialogTrigger asChild>
              <Button>
                <Upload className="h-4 w-4 mr-2" />
                Importar CSV
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Importar Matérias e Assuntos</DialogTitle>
              <DialogDescription>
                Faça upload de um arquivo CSV com as colunas: Matéria;Subtópico
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
      </div>

      {!examSubjects || examSubjects.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Nenhuma matéria cadastrada</CardTitle>
            <CardDescription>
              Importe um arquivo CSV para começar a gerenciar suas matérias
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <FileSpreadsheet className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Clique no botão "Importar CSV" para adicionar suas matérias
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Total: {examSubjects.length} {examSubjects.length === 1 ? 'matéria' : 'matérias'}
          </p>
          
          <div className="grid gap-4">
            {examSubjects.map((subject: any) => (
              <Collapsible
                key={subject.id}
                open={openSubjects[subject.id] === true}
                onOpenChange={(open) => setOpenSubjects({ ...openSubjects, [subject.id]: open })}
              >
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CardTitle>{subject.subject_name}</CardTitle>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteSubjectId(subject.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <ChevronDown className={`h-4 w-4 transition-transform ${openSubjects[subject.id] === true ? 'rotate-180' : ''}`} />
                        </Button>
                      </CollapsibleTrigger>
                    </div>
                    <CardDescription>
                      {subject.exam_topics.length} {subject.exam_topics.length === 1 ? 'assunto' : 'assuntos'}
                    </CardDescription>
                  </CardHeader>
                  
                  <CollapsibleContent>
                    <CardContent>
                      <div className="space-y-2">
                        {subject.exam_topics.map((topic: any) => (
                          <div key={topic.id} className="flex items-center space-x-2 p-2 rounded hover:bg-accent">
                            <Checkbox
                              id={topic.id}
                              checked={topic.is_relevant}
                              onCheckedChange={(checked) => {
                                toggleRelevanceMutation.mutate({
                                  topicId: topic.id,
                                  isRelevant: checked as boolean,
                                });
                              }}
                            />
                            <Label
                              htmlFor={topic.id}
                              className="flex-1 cursor-pointer"
                            >
                              {topic.topic_name}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))}
          </div>
        </div>
      )}

      <Dialog open={!!deleteSubjectId} onOpenChange={() => setDeleteSubjectId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja deletar esta matéria? Todos os assuntos e desempenhos associados serão removidos.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteSubjectId(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteSubjectId && deleteSubjectMutation.mutate(deleteSubjectId)}
              disabled={deleteSubjectMutation.isPending}
            >
              {deleteSubjectMutation.isPending ? 'Deletando...' : 'Deletar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ExamSubjectsManager;
