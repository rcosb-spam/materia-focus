import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { BookOpen, Clock, TrendingUp } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-3xl mx-auto">
          <div className="flex justify-center mb-6">
            <BookOpen className="h-16 w-16 text-primary" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Ciclos de Estudo
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Organize seus estudos de forma inteligente com ciclos personalizados baseados no seu progresso
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" onClick={() => navigate('/auth')}>
              Começar Agora
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mt-20 max-w-5xl mx-auto">
          <div className="text-center p-6 rounded-lg bg-card">
            <div className="flex justify-center mb-4">
              <BookOpen className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Importe suas Matérias</h3>
            <p className="text-muted-foreground">
              Faça upload de arquivos CSV com suas aulas e organize tudo em um só lugar
            </p>
          </div>

          <div className="text-center p-6 rounded-lg bg-card">
            <div className="flex justify-center mb-4">
              <TrendingUp className="h-10 w-10 text-accent" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Acompanhe o Progresso</h3>
            <p className="text-muted-foreground">
              Marque aulas como estudadas e veja seu progresso em tempo real
            </p>
          </div>

          <div className="text-center p-6 rounded-lg bg-card">
            <div className="flex justify-center mb-4">
              <Clock className="h-10 w-10 text-warning" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Ciclos Inteligentes</h3>
            <p className="text-muted-foreground">
              O sistema calcula automaticamente a distribuição ideal de horas para cada matéria
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
