import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { FileText, HelpCircle, BookOpen, TrendingUp } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface DashboardData {
  totalSubjects: number;
  totalLessons: number;
  totalQuestionsResolved: number;
  averageAccuracy: number;
  topSubjects: Array<{ name: string; accuracy: number }>;
  recentActivity: Array<{ date: string; pdfs: number; questions: number }>;
}

export default function DashboardStats() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData>({
    totalSubjects: 0,
    totalLessons: 0,
    totalQuestionsResolved: 0,
    averageAccuracy: 0,
    topSubjects: [],
    recentActivity: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchDashboardData = async () => {
      try {
        // Buscar matérias e aulas
        const { data: subjects } = await supabase
          .from('subjects')
          .select('id')
          .eq('user_id', user.id);

        const { data: lessons } = await supabase
          .from('lessons')
          .select('id, subject_id')
          .in('subject_id', subjects?.map(s => s.id) || []);

        const totalSubjects = subjects?.length || 0;
        const totalLessons = lessons?.length || 0;

        // Buscar desempenho em questões
        const { data: examSubjects } = await supabase
          .from('exam_subjects')
          .select('id, subject_name')
          .eq('user_id', user.id);

        const { data: performances } = await supabase
          .from('question_performance')
          .select('exam_subject_id, notebook_id, correct_answers, answered_questions, total_questions')
          .in('exam_subject_id', examSubjects?.map(s => s.id) || []);

        const totalQuestionsResolved = performances?.reduce((acc, p) => acc + p.answered_questions, 0) || 0;
        const totalCorrect = performances?.reduce((acc, p) => acc + p.correct_answers, 0) || 0;
        const averageAccuracy = totalQuestionsResolved > 0 ? (totalCorrect / totalQuestionsResolved) * 100 : 0;

        // Top 5 assuntos com melhor desempenho
        const subjectPerformance = new Map<string, { correct: number; total: number }>();
        
        performances?.forEach(p => {
          const subject = examSubjects?.find(s => s.id === p.exam_subject_id);
          if (subject) {
            const current = subjectPerformance.get(subject.subject_name) || { correct: 0, total: 0 };
            subjectPerformance.set(subject.subject_name, {
              correct: current.correct + p.correct_answers,
              total: current.total + p.answered_questions,
            });
          }
        });

        const topSubjects = Array.from(subjectPerformance.entries())
          .map(([name, { correct, total }]) => ({
            name,
            accuracy: total > 0 ? (correct / total) * 100 : 0,
          }))
          .sort((a, b) => b.accuracy - a.accuracy)
          .slice(0, 5);

        // Atividade recente (últimos 7 dias)
        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (6 - i));
          return date.toISOString().split('T')[0];
        });

        const { data: cycles } = await supabase
          .from('study_cycles')
          .select('created_at')
          .eq('user_id', user.id)
          .gte('created_at', last7Days[0]);

        const recentActivity = last7Days.map(date => {
          const dayData = {
            date: new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
            pdfs: cycles?.filter(c => c.created_at?.startsWith(date)).length || 0,
            questions: 0, // Contagem baseada em created_at da tabela question_performance
          };
          return dayData;
        });

        setData({
          totalSubjects,
          totalLessons,
          totalQuestionsResolved,
          averageAccuracy,
          topSubjects,
          recentActivity,
        });
      } catch (error) {
        console.error('Erro ao buscar dados do dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))', 'hsl(var(--destructive))'];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Matérias</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalSubjects}</div>
            <p className="text-xs text-muted-foreground">
              {data.totalLessons} aulas cadastradas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Aulas</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalLessons}</div>
            <p className="text-xs text-muted-foreground">
              Em {data.totalSubjects} matérias
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Questões Resolvidas</CardTitle>
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalQuestionsResolved}</div>
            <p className="text-xs text-muted-foreground">
              Total de questões
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Acerto Geral</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.averageAccuracy.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Média de acertos
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Atividade Recente</CardTitle>
            <CardDescription>PDFs e Questões dos últimos 7 dias</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                pdfs: {
                  label: 'PDFs',
                  color: 'hsl(var(--primary))',
                },
                questions: {
                  label: 'Questões',
                  color: 'hsl(var(--secondary))',
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.recentActivity}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="pdfs" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="questions" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top 5 Assuntos</CardTitle>
            <CardDescription>Melhor desempenho em questões</CardDescription>
          </CardHeader>
          <CardContent>
            {data.topSubjects.length > 0 ? (
              <ChartContainer
                config={{
                  accuracy: {
                    label: 'Taxa de Acerto',
                    color: 'hsl(var(--primary))',
                  },
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.topSubjects}
                      dataKey="accuracy"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={(entry) => `${entry.name}: ${entry.accuracy.toFixed(1)}%`}
                    >
                      {data.topSubjects.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Nenhum dado disponível
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
