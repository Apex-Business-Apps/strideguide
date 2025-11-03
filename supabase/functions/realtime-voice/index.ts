import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 204, headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] Realtime voice connection request`);

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const upgrade = req.headers.get("upgrade") || "";
    if (upgrade.toLowerCase() !== "websocket") {
      return new Response("Expected WebSocket upgrade", { 
        status: 426,
        headers: corsHeaders 
      });
    }

    const { socket: clientSocket, response } = Deno.upgradeWebSocket(req);
    let openaiSocket: WebSocket | null = null;

    clientSocket.onopen = async () => {
      console.log(`[${requestId}] Client WebSocket opened`);
      
      try {
        // Connect to OpenAI Realtime API
        openaiSocket = new WebSocket(
          "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17",
          {
            headers: {
              "Authorization": `Bearer ${OPENAI_API_KEY}`,
              "OpenAI-Beta": "realtime=v1"
            }
          }
        );

        openaiSocket.onopen = () => {
          console.log(`[${requestId}] OpenAI WebSocket connected`);
        };

        openaiSocket.onmessage = (event) => {
          const data = JSON.parse(event.data);
          console.log(`[${requestId}] OpenAI message:`, data.type);

          // Send session.update after receiving session.created
          if (data.type === 'session.created') {
            const sessionUpdate = {
              type: 'session.update',
              session: {
                modalities: ['text', 'audio'],
                instructions: `You are Alex, a caring AI companion for StrideGuide - an accessibility app helping seniors and visually impaired users navigate safely. 

Your role:
- Describe surroundings clearly and concisely
- Alert users to hazards (obstacles, stairs, curbs, ice, uneven surfaces)
- Guide navigation with simple directions (left, right, forward, stop)
- Help find lost items
- Provide encouraging, patient support
- Use everyday language, avoid technical jargon
- Keep responses brief (1-3 sentences max)
- Prioritize safety above all

When describing scenes, mention:
1. Immediate hazards first
2. Navigation path
3. Notable landmarks or objects

Be warm, reassuring, and actionable.`,
                voice: 'alloy',
                input_audio_format: 'pcm16',
                output_audio_format: 'pcm16',
                input_audio_transcription: {
                  model: 'whisper-1'
                },
                turn_detection: {
                  type: 'server_vad',
                  threshold: 0.5,
                  prefix_padding_ms: 300,
                  silence_duration_ms: 1000
                },
                tools: [
                  {
                    type: 'function',
                    name: 'alert_hazard',
                    description: 'Alert the user about a detected hazard. Tell the user you are alerting them about a hazard.',
                    parameters: {
                      type: 'object',
                      properties: {
                        hazard_type: {
                          type: 'string',
                          enum: ['obstacle', 'stairs', 'curb', 'ice', 'uneven_surface', 'other']
                        },
                        severity: {
                          type: 'string',
                          enum: ['low', 'medium', 'high']
                        },
                        description: { type: 'string' }
                      },
                      required: ['hazard_type', 'severity', 'description']
                    }
                  },
                  {
                    type: 'function',
                    name: 'find_item',
                    description: 'Help the user locate a lost item. Tell them you are searching.',
                    parameters: {
                      type: 'object',
                      properties: {
                        item_name: { type: 'string' }
                      },
                      required: ['item_name']
                    }
                  }
                ],
                tool_choice: 'auto',
                temperature: 0.8,
                max_response_output_tokens: 500
              }
            };
            openaiSocket?.send(JSON.stringify(sessionUpdate));
            console.log(`[${requestId}] Sent session.update`);
          }

          // Forward all messages to client
          if (clientSocket.readyState === WebSocket.OPEN) {
            clientSocket.send(event.data);
          }
        };

        openaiSocket.onerror = (error) => {
          console.error(`[${requestId}] OpenAI WebSocket error:`, error);
          clientSocket.close(1011, "OpenAI connection error");
        };

        openaiSocket.onclose = () => {
          console.log(`[${requestId}] OpenAI WebSocket closed`);
          clientSocket.close();
        };

      } catch (error) {
        console.error(`[${requestId}] Error connecting to OpenAI:`, error);
        clientSocket.close(1011, "Failed to connect to OpenAI");
      }
    };

    clientSocket.onmessage = (event) => {
      // Forward client messages to OpenAI
      if (openaiSocket?.readyState === WebSocket.OPEN) {
        openaiSocket.send(event.data);
      }
    };

    clientSocket.onerror = (error) => {
      console.error(`[${requestId}] Client WebSocket error:`, error);
    };

    clientSocket.onclose = () => {
      console.log(`[${requestId}] Client WebSocket closed`);
      if (openaiSocket?.readyState === WebSocket.OPEN) {
        openaiSocket.close();
      }
    };

    return response;

  } catch (error) {
    console.error(`[${requestId}] Error:`, error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
