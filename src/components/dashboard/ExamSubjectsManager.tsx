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
import { Upload, FileSpreadsheet, ChevronDown } from 'lucide-react';
import { parseExamSubjectsCSV } from '@/utils/performanceCsvParser';

const ExamSubjectsManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [openSubjects, setOpenSubjects] = useState<Record<string, boolean>>({});

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
      for (const [subjectName, topics] of subjectMap) {
        // Create or get subject
        const { data: subject, error: subjectError } = await supabase
          .from('exam_subjects')
          .upsert({ 
            user_id: user!.id, 
            subject_name: subjectName 
          }, {
            onConflict: 'user_id,subject_name',
            ignoreDuplicates: false
          })
          .select()
          .single();

        if (subjectError) throw subjectError;

        // Insert topics
        const topicsToInsert = topics.map(topic => ({
          exam_subject_id: subject.id,
          topic_name: topic,
          is_relevant: true,
        }));

        const { error: topicsError } = await supabase
          .from('exam_topics')
          .upsert(topicsToInsert, {
            onConflict: 'exam_subject_id,topic_name',
            ignoreDuplicates: true
          });

        if (topicsError) throw topicsError;
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
                Faça upload de um arquivo CSV com as colunas: Materia;Subtopico
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

      {!examSubjects || examSubjects.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Nenhuma matéria cadastrada</CardTitle>
            <CardDescription>
              Importe um arquivo CSV para começar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <FileSpreadsheet className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Clique no botão "Importar CSV" para adicionar suas matérias e assuntos
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {examSubjects.map((subject) => (
            <Card key={subject.id}>
              <CardHeader>
                <Collapsible
                  open={openSubjects[subject.id] !== false}
                  onOpenChange={(open) => setOpenSubjects({ ...openSubjects, [subject.id]: open })}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{subject.subject_name}</CardTitle>
                      <CardDescription>
                        {subject.exam_topics.length} assuntos cadastrados
                      </CardDescription>
                    </div>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <ChevronDown className={`h-4 w-4 transition-transform ${openSubjects[subject.id] !== false ? 'rotate-180' : ''}`} />
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                  <CollapsibleContent>
                    <CardContent className="pt-4 px-0">
                      <div className="space-y-3">
                        {subject.exam_topics.map((topic: any) => (
                          <div key={topic.id} className="flex items-center space-x-2">
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
                            <label
                              htmlFor={topic.id}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                            >
                              {topic.topic_name}
                            </label>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ExamSubjectsManager;
