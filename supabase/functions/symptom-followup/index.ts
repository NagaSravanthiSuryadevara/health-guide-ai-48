import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UserProfile {
  full_name: string;
  age: number;
  health_issues: string | null;
}

interface SymptomHistoryEntry {
  symptoms: string;
  possible_conditions: any;
  urgency_level: string;
  created_at: string;
  is_cured: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, userId, uncuredSymptoms } = await req.json();
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Messages are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Fetch user profile and symptom history if userId is provided
    let userContext = '';
    let recentHistory: SymptomHistoryEntry[] = [];
    
    if (userId) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      // Fetch user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, age, health_issues')
        .eq('user_id', userId)
        .single();

      // Fetch recent symptom history (last 10 entries that are NOT cured)
      const { data: history } = await supabase
        .from('symptom_history')
        .select('symptoms, possible_conditions, urgency_level, created_at, is_cured')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (profile) {
        userContext += `\n\nUSER PROFILE:
- Name: ${profile.full_name}
- Age: ${profile.age} years old
- Known Health Issues: ${profile.health_issues || 'None reported'}`;
      }

      if (history && history.length > 0) {
        recentHistory = history;
        const uncuredHistory = history.filter(h => !h.is_cured);
        const curedHistory = history.filter(h => h.is_cured);
        
        if (uncuredHistory.length > 0) {
          userContext += `\n\nRECENT UNCURED SYMPTOMS (consider these in your assessment):`;
          uncuredHistory.forEach((entry, idx) => {
            const date = new Date(entry.created_at).toLocaleDateString();
            userContext += `\n${idx + 1}. [${date}] ${entry.symptoms} - Urgency: ${entry.urgency_level}`;
          });
        }
        
        if (curedHistory.length > 0) {
          userContext += `\n\nPREVIOUSLY CURED SYMPTOMS (do NOT include in current assessment):`;
          curedHistory.forEach((entry, idx) => {
            const date = new Date(entry.created_at).toLocaleDateString();
            userContext += `\n${idx + 1}. [${date}] ${entry.symptoms} - (CURED)`;
          });
        }
      }
    }

    // Include uncured symptoms from the frontend if provided
    let uncuredContext = '';
    if (uncuredSymptoms && uncuredSymptoms.length > 0) {
      uncuredContext = `\n\nNOTE: User has confirmed these previous symptoms are NOT yet cured and should be considered: ${uncuredSymptoms.join(', ')}`;
    }

    const systemPrompt = `You are a medical AI assistant conducting a thorough symptom assessment. Your role is to ask relevant follow-up questions to better understand the patient's condition.
${userContext}${uncuredContext}

Based on the symptoms described, you should ask about:
- Duration (How long have you had these symptoms?)
- Severity (On a scale of 1-10, how severe is the pain/discomfort?)
- Progression (Are the symptoms getting better, worse, or staying the same?)
- Associated symptoms (Do you have any other symptoms like fever, nausea, fatigue?)
- Triggers (Does anything make it better or worse?)
- Previous treatments tried (Have you taken any medications?)
- Impact on daily life (How are these symptoms affecting your daily activities?)

IMPORTANT RULES:
1. Ask only ONE question at a time
2. Be empathetic, warm, and professional
3. Keep questions short, clear, and easy to understand
4. Don't repeat questions already asked
5. Base your question on the context of the conversation AND the user's health profile
6. If the user has known health issues, ask if current symptoms might be related
7. If user has previous uncured symptoms, ask if current symptoms are related to or a continuation of those
8. Count the exchanges - after asking 5-7 meaningful questions that cover duration, severity, progression, and key details, respond with EXACTLY "[ANALYSIS_READY]" to signal the assessment is complete
9. If the user's initial description is very detailed and comprehensive (covers duration, severity, associated symptoms), you may ask fewer questions before signaling completion
10. Always be compassionate - remember you're talking to someone who isn't feeling well

Respond with just the question (or [ANALYSIS_READY] when done), no preamble.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI service requires payment. Please add credits.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error('Failed to get follow-up question');
    }

    const data = await response.json();
    const question = data.choices?.[0]?.message?.content;

    if (!question) {
      throw new Error('No question generated');
    }

    // Check if the AI signals analysis is ready
    const isComplete = question.includes('[ANALYSIS_READY]');

    return new Response(
      JSON.stringify({ 
        question: isComplete ? question.replace('[ANALYSIS_READY]', '').trim() : question,
        isComplete 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in symptom-followup function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
