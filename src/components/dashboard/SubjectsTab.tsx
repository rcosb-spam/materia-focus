import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Upload, Plus, Trash2, Edit2 } from 'lucide-react';
import { parseCSV } from '@/utils/csvParser';
import SubjectCard from './SubjectCard';

const SubjectsTab = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [subjectName, setSubjectName] = useState('');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: subjects, isLoading } = useQuery({
    queryKey: ['subjects', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const uploadSubjectMutation = useMutation({
    mutationFn: async () => {
      if (!csvFile || !subjectName.trim()) {
        throw new Error('Por favor, preencha todos os campos');
      }

      const fileContent = await csvFile.text();
      const lessons = parseCSV(fileContent);

      if (lessons.length === 0) {
        throw new Error('Nenhuma aula válida encontrada no CSV');
      }

      // Create subject
      const { data: subject, error: subjectError } = await supabase
        .from('subjects')
        .insert({ user_id: user!.id, name: subjectName.trim() })
        .select()
        .single();

      if (subjectError) throw subjectError;

      // Create lessons
      const lessonsToInsert = lessons.map(lesson => ({
        subject_id: subject.id,
        name: lesson.name,
        description: lesson.description,
        is_studied: false,
      }));

      const { error: lessonsError } = await supabase
        .from('lessons')
        .insert(lessonsToInsert);

      if (lessonsError) throw lessonsError;

      return subject;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      toast({
        title: 'Sucesso!',
        description: 'Matéria importada com sucesso.',
      });
      setIsUploadOpen(false);
      setSubjectName('');
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

  const handleUpload = async () => {
    setUploading(true);
    await uploadSubjectMutation.mutateAsync();
    setUploading(false);
  };

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
          <h2 className="text-2xl font-bold">Minhas Matérias</h2>
          <p className="text-muted-foreground">Gerencie suas matérias e aulas</p>
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
              <DialogTitle>Importar Matéria do CSV</DialogTitle>
              <DialogDescription>
                Faça upload de um arquivo CSV com as aulas. Formato esperado: Aula;Descrição
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="subject-name">Nome da Matéria</Label>
                <Input
                  id="subject-name"
                  placeholder="Ex: Direito Administrativo"
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="csv-file">Arquivo CSV</Label>
                <Input
                  id="csv-file"
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                />
              </div>
              <Button
                onClick={handleUpload}
                disabled={!csvFile || !subjectName.trim() || uploading}
                className="w-full"
              >
                {uploading ? 'Importando...' : 'Importar'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {subjects && subjects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Upload className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma matéria cadastrada</h3>
            <p className="text-muted-foreground text-center mb-4">
              Importe um arquivo CSV para começar a gerenciar suas matérias
            </p>
            <Button onClick={() => setIsUploadOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Importar Primeira Matéria
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {subjects?.map((subject) => (
            <SubjectCard key={subject.id} subject={subject} />
          ))}
        </div>
      )}
    </div>
  );
};

export default SubjectsTab;
