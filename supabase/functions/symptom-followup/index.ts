import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    
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

    const systemPrompt = `You are a medical AI assistant conducting a symptom assessment. Your role is to ask ONE relevant follow-up question at a time to better understand the patient's condition.

Based on the symptoms described, ask about:
- Duration (How long have you had these symptoms?)
- Severity (On a scale of 1-10, how severe is the pain/discomfort?)
- Progression (Are the symptoms getting better, worse, or staying the same?)
- Associated symptoms (Do you have any other symptoms like fever, nausea, fatigue?)
- Triggers (Does anything make it better or worse?)
- Medical history (Do you have any relevant medical conditions or allergies?)

IMPORTANT RULES:
1. Ask only ONE question at a time
2. Be empathetic and professional
3. Keep questions short and clear
4. Don't repeat questions already asked
5. Base your question on the context of the conversation
6. If the patient has answered several questions already (3-4 exchanges), you may ask a final clarifying question

Respond with just the question, no preamble.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
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

    return new Response(
      JSON.stringify({ question }),
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
