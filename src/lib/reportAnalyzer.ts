import { supabase } from "@/integrations/supabase/client";

export interface ReportAnalysis {
  reportType: string;
  summary: string;
  keyFindings: string[];
  possibleConditions: string[];
  medicalTermsExplained?: { term: string; explanation: string }[];
  recommendations: string[];
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
}

export async function analyzeReport(file: File): Promise<ReportAnalysis> {
  // Convert file to base64
  const arrayBuffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let i = 0; i < uint8Array.length; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  const base64Image = btoa(binary);

  const { data, error } = await supabase.functions.invoke('analyze-report', {
    body: { 
      image: base64Image,
      mimeType: file.type 
    }
  });

  if (error) {
    console.error('Report analysis error:', error);
    throw new Error(error.message || 'Failed to analyze report');
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data as ReportAnalysis;
}
