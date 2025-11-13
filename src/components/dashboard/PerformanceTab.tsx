import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ExamSubjectsManager from './ExamSubjectsManager';
import PerformanceTracker from './PerformanceTracker';

const PerformanceTab = () => {
  return (
    <Tabs defaultValue="subjects" className="w-full">
      <TabsList className="grid w-full grid-cols-2 max-w-md">
        <TabsTrigger value="subjects">Matérias da Prova</TabsTrigger>
        <TabsTrigger value="tracking">Acompanhamento</TabsTrigger>
      </TabsList>
      
      <TabsContent value="subjects" className="mt-6">
        <ExamSubjectsManager />
      </TabsContent>
      
      <TabsContent value="tracking" className="mt-6">
        <PerformanceTracker />
      </TabsContent>
    </Tabs>
  );
};

export default PerformanceTab;
