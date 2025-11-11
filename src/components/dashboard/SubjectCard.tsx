import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { BookOpen, Edit2, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface Subject {
  id: string;
  name: string;
  user_id: string;
  created_at: string;
}

interface SubjectCardProps {
  subject: Subject;
}

const SubjectCard = ({ subject }: SubjectCardProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editName, setEditName] = useState(subject.name);
  const [editingLesson, setEditingLesson] = useState<string | null>(null);
  const [editLessonName, setEditLessonName] = useState('');
  const [editLessonDesc, setEditLessonDesc] = useState('');

  const { data: lessons, isLoading } = useQuery({
    queryKey: ['lessons', subject.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('subject_id', subject.id)
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });

  const updateSubjectMutation = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase
        .from('subjects')
        .update({ name })
        .eq('id', subject.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      toast({ title: 'Matéria atualizada!' });
      setIsEditOpen(false);
    },
    onError: (error: any) => {
      toast({ variant: 'destructive', title: 'Erro ao atualizar', description: error.message });
    },
  });

  const deleteSubjectMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('subjects')
        .delete()
        .eq('id', subject.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      toast({ title: 'Matéria excluída!' });
    },
    onError: (error: any) => {
      toast({ variant: 'destructive', title: 'Erro ao excluir', description: error.message });
    },
  });

  const toggleLessonMutation = useMutation({
    mutationFn: async ({ lessonId, isStudied }: { lessonId: string; isStudied: boolean }) => {
      const { error } = await supabase
        .from('lessons')
        .update({ is_studied: !isStudied })
        .eq('id', lessonId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessons', subject.id] });
    },
  });

  const updateLessonMutation = useMutation({
    mutationFn: async ({ lessonId, name, description }: { lessonId: string; name: string; description: string }) => {
      const { error } = await supabase
        .from('lessons')
        .update({ name, description })
        .eq('id', lessonId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessons', subject.id] });
      toast({ title: 'Aula atualizada!' });
      setEditingLesson(null);
    },
    onError: (error: any) => {
      toast({ variant: 'destructive', title: 'Erro ao atualizar', description: error.message });
    },
  });

  const deleteLessonMutation = useMutation({
    mutationFn: async (lessonId: string) => {
      const { error } = await supabase
        .from('lessons')
        .delete()
        .eq('id', lessonId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessons', subject.id] });
      toast({ title: 'Aula excluída!' });
    },
    onError: (error: any) => {
      toast({ variant: 'destructive', title: 'Erro ao excluir', description: error.message });
    },
  });

  const unstudiedCount = lessons?.filter(l => !l.is_studied).length || 0;
  const totalCount = lessons?.length || 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              {subject.name}
            </CardTitle>
            <CardDescription className="mt-2">
              {unstudiedCount} de {totalCount} aulas pendentes
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => setEditName(subject.name)}>
                  <Edit2 className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Editar Matéria</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name">Nome da Matéria</Label>
                    <Input
                      id="edit-name"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                  </div>
                  <Button onClick={() => updateSubjectMutation.mutate(editName)} className="w-full">
                    Salvar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => deleteSubjectMutation.mutate()}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full">
              {isOpen ? <ChevronUp className="h-4 w-4 mr-2" /> : <ChevronDown className="h-4 w-4 mr-2" />}
              {isOpen ? 'Ocultar Aulas' : 'Ver Aulas'}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4 space-y-2">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : lessons && lessons.length > 0 ? (
              lessons.map((lesson) => (
                <div key={lesson.id} className="border rounded-lg p-3 space-y-2">
                  {editingLesson === lesson.id ? (
                    <div className="space-y-2">
                      <Input
                        value={editLessonName}
                        onChange={(e) => setEditLessonName(e.target.value)}
                        placeholder="Nome da aula"
                      />
                      <Input
                        value={editLessonDesc}
                        onChange={(e) => setEditLessonDesc(e.target.value)}
                        placeholder="Descrição"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() =>
                            updateLessonMutation.mutate({
                              lessonId: lesson.id,
                              name: editLessonName,
                              description: editLessonDesc,
                            })
                          }
                        >
                          Salvar
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingLesson(null)}>
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={lesson.is_studied}
                          onCheckedChange={() =>
                            toggleLessonMutation.mutate({
                              lessonId: lesson.id,
                              isStudied: lesson.is_studied,
                            })
                          }
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium ${lesson.is_studied ? 'line-through text-muted-foreground' : ''}`}>
                            {lesson.name}
                          </p>
                          <p className="text-sm text-muted-foreground line-clamp-2">{lesson.description}</p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              setEditingLesson(lesson.id);
                              setEditLessonName(lesson.name);
                              setEditLessonDesc(lesson.description);
                            }}
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => deleteLessonMutation.mutate(lesson.id)}
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma aula cadastrada</p>
            )}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
};

export default SubjectCard;
