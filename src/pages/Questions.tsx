// src/pages/Questions.tsx (atualizado)
import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { LogOut, BookOpen, FileText, HelpCircle, Home } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { NavLink } from '@/components/NavLink';
import PerformanceTab from '@/components/dashboard/PerformanceTab';
import ExamSubjectsManager from '@/components/dashboard/ExamSubjectsManager';
import QuestionCycleTab from '@/components/dashboard/QuestionCycleTab';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

const Questions = () => {
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Ciclos de Estudo</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{user.email}</span>
            <ThemeToggle />
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Breadcrumb className="mb-4">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/dashboard" className="flex items-center gap-1">
                  <Home className="h-4 w-4" />
                  Início
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Questões</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <nav className="flex gap-4 mb-8">
          <NavLink to="/pdfs">
            <FileText className="h-4 w-4" />
            PDFs
          </NavLink>
          <NavLink to="/questions">
            <HelpCircle className="h-4 w-4" />
            Questões
          </NavLink>
        </nav>

        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold">Questões</h2>
            <p className="text-muted-foreground">Acompanhe seu desempenho e crie ciclos de estudo</p>
          </div>

          <Tabs defaultValue="performance" className="w-full">
            <TabsList className="grid w-full grid-cols-2 max-w-lg">
              <TabsTrigger value="performance">Desempenho</TabsTrigger>
              <TabsTrigger value="cycle">Ciclo Questões</TabsTrigger>
            </TabsList>
            
            <TabsContent value="performance" className="mt-6">
              <PerformanceTab />
            </TabsContent>
            
            <TabsContent value="cycle" className="mt-6">
              <QuestionCycleTab />
            </TabsContent>
          
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default Questions;