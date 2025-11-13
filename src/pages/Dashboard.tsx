import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogOut, BookOpen } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import SubjectsTab from '@/components/dashboard/SubjectsTab';
import CycleTab from '@/components/dashboard/CycleTab';
import PerformanceTab from '@/components/dashboard/PerformanceTab';

const Dashboard = () => {
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
        <Tabs defaultValue="subjects" className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-2xl">
            <TabsTrigger value="subjects">Matérias</TabsTrigger>
            <TabsTrigger value="cycle">Ciclo de Estudos</TabsTrigger>
            <TabsTrigger value="performance">Desempenho</TabsTrigger>
          </TabsList>
          
          <TabsContent value="subjects" className="mt-6">
            <SubjectsTab />
          </TabsContent>
          
          <TabsContent value="cycle" className="mt-6">
            <CycleTab />
          </TabsContent>
          
          <TabsContent value="performance" className="mt-6">
            <PerformanceTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Dashboard;
