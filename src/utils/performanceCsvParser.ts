export interface ParsedExamSubject {
  subject: string;
  topic: string;
}

export interface ParsedNotebookPerformance {
  notebookId: string;
  subject: string;
  topic: string;
  correctAnswers: number;
  answeredQuestions: number;
  totalQuestions: number;
}

export const parseExamSubjectsCSV = (csvContent: string): ParsedExamSubject[] => {
  const lines = csvContent.split('\n').filter(line => line.trim());
  
  // Remove header
  const dataLines = lines.slice(1);
  
  const subjects: ParsedExamSubject[] = [];
  
  for (const line of dataLines) {
    const parts = line.split(';');
    
    if (parts.length >= 2) {
      const subject = parts[0].trim();
      const topic = parts[1].trim();
      
      if (subject && topic) {
        subjects.push({
          subject,
          topic,
        });
      }
    }
  }
  
  return subjects;
};

export const parseNotebookPerformanceCSV = (csvContent: string): ParsedNotebookPerformance[] => {
  const lines = csvContent.split('\n').filter(line => line.trim());
  
  // Remove header
  const dataLines = lines.slice(1);
  
  const performances: ParsedNotebookPerformance[] = [];
  
  for (const line of dataLines) {
    const parts = line.split(';');
    
    if (parts.length >= 6) {
      const notebookId = parts[0].trim();
      const subject = parts[1].trim();
      const topic = parts[2].trim();
      const correctAnswers = parseInt(parts[3].trim());
      const answeredQuestions = parseInt(parts[4].trim());
      const totalQuestions = parseInt(parts[5].trim());
      
      if (notebookId && subject && topic && !isNaN(correctAnswers) && !isNaN(answeredQuestions) && !isNaN(totalQuestions)) {
        performances.push({
          notebookId,
          subject,
          topic,
          correctAnswers,
          answeredQuestions,
          totalQuestions,
        });
      }
    }
  }
  
  return performances;
};
