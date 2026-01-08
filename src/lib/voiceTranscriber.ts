import { supabase } from "@/integrations/supabase/client";

export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  // Convert blob to base64
  const arrayBuffer = await audioBlob.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let i = 0; i < uint8Array.length; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  const base64Audio = btoa(binary);

  const { data, error } = await supabase.functions.invoke('transcribe-voice', {
    body: { 
      audio: base64Audio,
      mimeType: audioBlob.type 
    }
  });

  if (error) {
    console.error('Transcription error:', error);
    throw new Error(error.message || 'Failed to transcribe audio');
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data?.text || '';
}
