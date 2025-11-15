// src/utils/questionCycleCalculator.ts
interface SubjectWithPerformance {
  id: string;
  name: string;
  unmetTargetsCount: number;
  totalTopics: number;
}

interface CycleAllocation {
  subjectId: string;
  subjectName: string;
  unmetTargetsCount: number;
  totalTopics: number;
  percentage: number;
  suggestedHours: number;
}

export const calculateQuestionCycleAllocations = (
  subjects: SubjectWithPerformance[],
  totalHours: number,
  targetPercentage: number,
  minQuestions: number
): CycleAllocation[] => {
  // Calcular o total de assuntos que não atingiram a meta
  const totalUnmetTargets = subjects.reduce((sum, subject) => sum + subject.unmetTargetsCount, 0);
  
  if (totalUnmetTargets === 0) {
    return [];
  }

  // Distribuir horas proporcionalmente aos assuntos não atingidos
  const allocations = subjects.map(subject => {
    const percentage = totalUnmetTargets > 0 
      ? (subject.unmetTargetsCount / totalUnmetTargets) * 100
      : 0;
    
    // Garantir mínimo de 1 hora por matéria com assuntos pendentes
    const baseHours = (percentage / 100) * totalHours;
    const suggestedHours = Math.max(1, Math.round(baseHours * 2) / 2); // Arredonda para 0.5

    return {
      subjectId: subject.id,
      subjectName: subject.name,
      unmetTargetsCount: subject.unmetTargetsCount,
      totalTopics: subject.totalTopics,
      percentage: Math.round(percentage),
      suggestedHours,
    };
  });

  // Ajustar para não ultrapassar o total de horas
  const totalSuggested = allocations.reduce((sum, alloc) => sum + alloc.suggestedHours, 0);
  
  if (totalSuggested > totalHours) {
    const ratio = totalHours / totalSuggested;
    allocations.forEach(alloc => {
      alloc.suggestedHours = Math.max(1, Math.round(alloc.suggestedHours * ratio * 2) / 2);
    });
  }

  return allocations;
};