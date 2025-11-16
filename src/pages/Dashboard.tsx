import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { LogOut, BookOpen, FileText, HelpCircle } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { NavLink } from '@/components/NavLink';
import DashboardStats from '@/components/dashboard/DashboardStats';

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
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Ciclos de Estudo
              </h1>
              <p className="text-sm text-muted-foreground">Sua plataforma de aprendizado</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium">{user.email}</p>
              <p className="text-xs text-muted-foreground">Online</p>
            </div>
            <ThemeToggle />
            <Button 
              variant="outline" 
              size="sm" 
              onClick={signOut}
              className="gap-2 border-destructive/20 hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-4">Dashboard</h2>
            <p className="text-muted-foreground text-lg">
              Acompanhe seu progresso em PDFs e Questões
            </p>
          </div>
          
          <nav className="flex gap-6 justify-center">
            <NavLink 
              to="/pdfs"
              className="flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-border/50 bg-card hover:border-primary/30 hover:bg-card/80 transition-all duration-300 min-w-[140px] group"
              activeClassName="border-primary bg-primary/5 shadow-lg shadow-primary/10"
            >
              <div className="p-3 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors">
                <FileText className="h-8 w-8 text-primary" />
              </div>
              <span className="font-semibold">PDFs</span>
              <p className="text-sm text-muted-foreground text-center">Gerencie seus materiais</p>
            </NavLink>
            
            <NavLink 
              to="/questions"
              className="flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-border/50 bg-card hover:border-primary/30 hover:bg-card/80 transition-all duration-300 min-w-[140px] group"
              activeClassName="border-primary bg-primary/5 shadow-lg shadow-primary/10"
            >
              <div className="p-3 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors">
                <HelpCircle className="h-8 w-8 text-primary" />
              </div>
              <span className="font-semibold">Questões</span>
              <p className="text-sm text-muted-foreground text-center">Pratique exercícios</p>
            </NavLink>
          </nav>

          <DashboardStats />
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
