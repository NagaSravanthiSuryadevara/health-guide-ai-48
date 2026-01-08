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
    const { image, mimeType } = await req.json();

    if (!image) {
      return new Response(
        JSON.stringify({ error: 'No image/report data provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Analyzing medical report with Gemini Vision...');

    const systemPrompt = `You are an expert medical report analyzer. Analyze the uploaded medical report/document and provide a comprehensive analysis.

Your response MUST be a valid JSON object with this exact structure:
{
  "reportType": "Type of report (e.g., Blood Test, X-Ray, MRI, Prescription, etc.)",
  "summary": "Brief 2-3 sentence summary of the report",
  "keyFindings": ["Array of key findings from the report"],
  "possibleConditions": ["Array of possible health conditions or concerns based on the findings"],
  "medicalTermsExplained": [{"term": "medical term", "explanation": "simple explanation"}],
  "recommendations": ["Array of recommendations or next steps"],
  "urgencyLevel": "low | medium | high | critical"
}

Guidelines:
- Use simple, patient-friendly language in explanations
- Be accurate but avoid causing unnecessary alarm
- If values are abnormal, explain what that might mean
- Always recommend consulting with a healthcare provider for proper diagnosis
- If the image is not a medical report, indicate that in the summary`;

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
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Please analyze this medical report and provide a detailed breakdown:'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${image}`
                }
              }
            ]
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'analyze_medical_report',
              description: 'Analyze a medical report and return structured findings',
              parameters: {
                type: 'object',
                properties: {
                  reportType: { type: 'string', description: 'Type of medical report' },
                  summary: { type: 'string', description: 'Brief summary of the report' },
                  keyFindings: { 
                    type: 'array', 
                    items: { type: 'string' },
                    description: 'Key findings from the report'
                  },
                  possibleConditions: { 
                    type: 'array', 
                    items: { type: 'string' },
                    description: 'Possible health conditions based on findings'
                  },
                  medicalTermsExplained: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        term: { type: 'string' },
                        explanation: { type: 'string' }
                      },
                      required: ['term', 'explanation']
                    },
                    description: 'Medical terms with simple explanations'
                  },
                  recommendations: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Recommendations or next steps'
                  },
                  urgencyLevel: {
                    type: 'string',
                    enum: ['low', 'medium', 'high', 'critical'],
                    description: 'Urgency level of the findings'
                  }
                },
                required: ['reportType', 'summary', 'keyFindings', 'possibleConditions', 'recommendations', 'urgencyLevel']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'analyze_medical_report' } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Usage limit reached. Please try again later.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`Analysis failed: ${errorText}`);
    }

    const result = await response.json();
    console.log('Gemini response:', JSON.stringify(result, null, 2));

    // Extract the analysis from tool call
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const analysis = JSON.parse(toolCall.function.arguments);
      return new Response(
        JSON.stringify(analysis),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fallback to parsing content if no tool call
    const content = result.choices?.[0]?.message?.content;
    if (content) {
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const analysis = JSON.parse(jsonMatch[0]);
          return new Response(
            JSON.stringify(analysis),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } catch (e) {
        console.error('Failed to parse content as JSON:', e);
      }
    }

    throw new Error('Failed to parse analysis response');

  } catch (error: unknown) {
    console.error('Report analysis error:', error);
    const message = error instanceof Error ? error.message : 'Analysis failed';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
