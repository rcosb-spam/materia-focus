export interface ParsedLesson {
  name: string;
  description: string;
}

export const parseCSV = (csvContent: string): ParsedLesson[] => {
  const lines = csvContent.split('\n').filter(line => line.trim());
  
  // Remove header
  const dataLines = lines.slice(1);
  
  const lessons: ParsedLesson[] = [];
  
  for (const line of dataLines) {
    // Split by semicolon
    const parts = line.split(';');
    
    if (parts.length >= 2) {
      const name = parts[0].trim();
      const description = parts.slice(1).join(';').trim();
      
      if (name && description) {
        lessons.push({
          name,
          description,
        });
      }
    }
  }
  
  return lessons;
};
