export interface SubjectAllocation {
  subjectId: string;
  subjectName: string;
  unstudiedCount: number;
  suggestedHours: number;
  percentage: number;
}

export const calculateCycleAllocations = (
  subjects: Array<{ id: string; name: string; unstudiedCount: number }>,
  totalHours: number
): SubjectAllocation[] => {
  // Filter out subjects with no unstudied lessons
  const activeSubjects = subjects.filter(s => s.unstudiedCount > 0);
  
  if (activeSubjects.length === 0) {
    return [];
  }
  
  // Calculate total unstudied lessons
  const totalUnstudied = activeSubjects.reduce((sum, s) => sum + s.unstudiedCount, 0);
  
  // Calculate proportional hours for each subject
  const allocations: SubjectAllocation[] = activeSubjects.map(subject => {
    const percentage = (subject.unstudiedCount / totalUnstudied) * 100;
    const proportionalHours = (subject.unstudiedCount / totalUnstudied) * totalHours;
    
    // Minimum 1 hour per subject
    const suggestedHours = Math.max(1, Math.round(proportionalHours * 10) / 10);
    
    return {
      subjectId: subject.id,
      subjectName: subject.name,
      unstudiedCount: subject.unstudiedCount,
      suggestedHours,
      percentage: Math.round(percentage * 10) / 10,
    };
  });
  
  // Adjust to ensure total doesn't exceed totalHours
  const totalSuggested = allocations.reduce((sum, a) => sum + a.suggestedHours, 0);
  
  if (totalSuggested > totalHours) {
    // Reduce proportionally, maintaining minimum 1h per subject
    const excess = totalSuggested - totalHours;
    const adjustableSubjects = allocations.filter(a => a.suggestedHours > 1);
    
    if (adjustableSubjects.length > 0) {
      const reductionPerSubject = excess / adjustableSubjects.length;
      
      allocations.forEach(allocation => {
        if (allocation.suggestedHours > 1) {
          allocation.suggestedHours = Math.max(
            1,
            Math.round((allocation.suggestedHours - reductionPerSubject) * 10) / 10
          );
        }
      });
    }
  }
  
  return allocations;
};
