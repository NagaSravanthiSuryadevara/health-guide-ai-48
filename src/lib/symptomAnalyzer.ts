export interface Condition {
  name: string;
  description: string;
  likelihood: 'High' | 'Medium' | 'Low';
}

export interface AnalysisResult {
  possibleConditions: Condition[];
  recommendations: string[];
  urgencyLevel: 'Emergency' | 'Urgent' | 'Non-urgent';
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-symptoms`;

export async function analyzeSymptoms(symptoms: string): Promise<AnalysisResult> {
  const response = await fetch(CHAT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ symptoms }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to analyze symptoms');
  }

  const data = await response.json();
  return data;
}
