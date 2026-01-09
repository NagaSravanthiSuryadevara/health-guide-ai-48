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
    const { symptoms, conversationHistory } = await req.json();
    
    // Support both direct symptoms string and conversation history
    const symptomsText = symptoms || (conversationHistory ? 
      conversationHistory.map((m: { role: string; content: string }) => 
        `${m.role === 'user' ? 'Patient' : 'Assistant'}: ${m.content}`
      ).join('\n') : null);
    
    if (!symptomsText) {
      return new Response(
        JSON.stringify({ error: 'Symptoms or conversation history are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = `You are a medical AI assistant that helps analyze symptoms. You should:
1. Analyze the described symptoms carefully
2. Suggest possible conditions (not diagnoses) based on the symptoms
3. Provide helpful recommendations
4. Assess the urgency level

IMPORTANT: Always remind users that this is not a medical diagnosis and they should consult a healthcare professional.

You must respond with a valid JSON object in this exact format:
{
  "possibleConditions": [
    {
      "name": "Condition Name",
      "description": "Brief description of the condition and how it relates to the symptoms",
      "likelihood": "High" | "Medium" | "Low"
    }
  ],
  "recommendations": [
    "Recommendation 1",
    "Recommendation 2"
  ],
  "urgencyLevel": "Emergency" | "Urgent" | "Non-urgent"
}

Guidelines for urgency:
- Emergency: Chest pain, difficulty breathing, severe bleeding, signs of stroke, severe allergic reactions
- Urgent: High fever, persistent vomiting, severe pain, symptoms worsening rapidly
- Non-urgent: Mild symptoms, common cold symptoms, minor aches`;

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
          { role: 'user', content: `Please analyze this patient consultation and provide your assessment:\n\n${symptomsText}` }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'analyze_symptoms',
              description: 'Analyze symptoms and return structured health assessment',
              parameters: {
                type: 'object',
                properties: {
                  possibleConditions: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        name: { type: 'string' },
                        description: { type: 'string' },
                        likelihood: { type: 'string', enum: ['High', 'Medium', 'Low'] }
                      },
                      required: ['name', 'description', 'likelihood']
                    }
                  },
                  recommendations: {
                    type: 'array',
                    items: { type: 'string' }
                  },
                  urgencyLevel: {
                    type: 'string',
                    enum: ['Emergency', 'Urgent', 'Non-urgent']
                  }
                },
                required: ['possibleConditions', 'recommendations', 'urgencyLevel']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'analyze_symptoms' } }
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
      throw new Error('Failed to analyze symptoms');
    }

    const data = await response.json();
    
    // Extract the function call arguments
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== 'analyze_symptoms') {
      throw new Error('Invalid response from AI');
    }

    const analysisResult = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify(analysisResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in analyze-symptoms function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
