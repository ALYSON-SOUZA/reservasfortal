export interface ParsedAiReservation {
  dia: string;
  sala: string;
  horaInicial: string;
  horaFinal: string;
  solicitante: string;
  setor: string;
  glpi: string;
  observacoes?: string;
}

export interface AiParseResponse {
  success: boolean;
  summary?: string;
  reservations: ParsedAiReservation[];
  source?: 'gemini' | 'fallback';
  message?: string;
  error?: string;
}

export async function parseReservationWithAi(params: {
  text?: string;
  imageBase64?: string;
  mimeType?: string;
}): Promise<AiParseResponse> {
  try {
    const response = await fetch('/api/ai/parse-reservation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    const data = await response.json();

    if (!response.ok) {
      let errorMsg = data.error || 'Falha ao processar com a IA.';
      try {
        if (typeof errorMsg === 'string' && errorMsg.startsWith('{') && errorMsg.endsWith('}')) {
          const parsed = JSON.parse(errorMsg);
          if (parsed.error && parsed.error.message) {
            errorMsg = parsed.error.message;
          }
        }
      } catch (_) {}

      if (typeof errorMsg === 'string' && (errorMsg.includes('503') || errorMsg.includes('high demand') || errorMsg.includes('experiencing high demand'))) {
        errorMsg = 'O serviço de IA do Gemini está com alta demanda momentânea na nuvem. Por favor, aguarde alguns instantes e tente novamente.';
      }

      throw new Error(errorMsg);
    }

    return {
      success: true,
      summary: data.summary,
      reservations: data.reservations || [],
      source: data.source,
      message: data.message,
    };
  } catch (error: any) {
    console.error('Erro no aiService:', error);
    let msg = error.message || 'Erro de conexão com o servidor de IA.';
    if (typeof msg === 'string' && (msg.includes('503') || msg.includes('high demand') || msg.includes('experiencing high demand'))) {
      msg = 'O serviço de IA do Gemini está com alta demanda momentânea na nuvem. Por favor, aguarde alguns instantes e tente novamente.';
    }
    return {
      success: false,
      reservations: [],
      error: msg,
    };
  }
}
