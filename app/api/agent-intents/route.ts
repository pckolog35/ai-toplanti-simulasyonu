import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { topic, agents, messages, apiKey, aiModel } = await req.json();

    const google = createGoogleGenerativeAI({
      apiKey: apiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY || '',
    });

    // Calculate how many times each person has spoken to prevent monopolies
    const speakerCounts = messages.reduce((acc: any, m: any) => {
      acc[m.name] = (acc[m.name] || 0) + 1;
      return acc;
    }, {});
    const speakerStats = Object.entries(speakerCounts).map(([name, count]) => `${name}: ${count} kez`).join(', ');

    const models = ['gemini-3.1-flash-lite-preview'];
    let object;
    let lastError;

    for (const modelName of models) {
      try {
        const result = await generateObject({
          model: google(modelName),
          maxRetries: 0,
      schema: z.object({
        agentId: z.string().describe("The ID of the single agent who wants to speak the most right now. Use 'moderator' if the moderator should speak."),
        reason: z.string().describe("Short internal monologue reason for why they are interrupting or speaking next."),
      }),
      prompt: `ROL: Sen bir "Toplantı Simülatörü" ve "Karakter Motoru"sun.
Toplantı Konusu: "${topic}"

TARTIŞMA KURALLARI VE DİNAMİKLERİ (ÖNEMLİ):
Sen masadaki tüm katılımcıların zihinlerini aynı anda okuyorsun. Sadece kavgaları değil, yapıcı fikirleri de bulmalısın. Mevcut konuşma geçmişine bakarak, en çok "İtiraz", "Destek", "Yeni Bir Ufuk Açma" veya "Toparlama" ihtiyacı duyan TEK BİR karakteri seçmelisin.

SEÇİM KRİTERLERİ (Öncelik Sırasıyla):
1. [ŞİDDETLİ İTİRAZ]: Kendi yetki alanına/çıkarına açıkça aykırı bir şey duyarsa. (Örn: Veri güvenliği riski varsa KVKK anında devreye girmeli).
2. [YAPICI KATKI / YENİ FİKİR]: Tartışılan konuyu kendi sektörüyle bağlayıp masaya yeni bir vizyon katacak olanlar. (Örn: Akademi teknik bir çözüm önermeli, Özel Sektör hız ve finans formülü sunmalı).
3. [DÜZENİ SAĞLAMA - MODERATÖR]: Eğer aynı kişiler arka arkaya konuşuyorsa veya en az 3-4 mesajdır moderatör konuşmamışsa toparlaması için 'moderator' ID'sini seç. KESİN KURAL: Eğer konuşma geçmişindeki SON KİŞİ Moderatör ise ASLA 'moderator' seçme! Mutlaka masadaki ajanlardan (uzmanlardan) birine söz vermelisin.

ÇEŞİTLİLİK KURALI (KRİTİK): 
Masadaki bazı kişiler daha önce çok fazla konuştuysa, onlara YENİDEN SÖZ VERME. Sessiz kalan, henüz hiç konuşmamış veya az konuşmuş olan uzmanları (zihin okuyarak) seç. 
Şu ana kadarki konuşma frekansları: 
${speakerStats || 'Henüz kimse konuşmadı.'}

Mevcut Aktif Konuşma Geçmişi:
${messages.map((m: any) => `${m.name}: ${m.content}`).join('\n')}

Masadaki Ajanlar ve Gizli Gündemleri:
${agents.map((a: any) => `- ID: ${a.id}, İsim: ${a.name}, Rol: ${a.role}, Persona: ${a.systemPrompt}`).join('\n')}

SADECE ŞU AN KONUŞMASI/İTİRAZ ETMESİ GEREKEN TEK BİR AJANIN ID'SİNİ VE SEBEBİNİ DÖNDÜR. EĞER TOPARLANMASI GEREKİYORSA VEYA KİMSE İTİRAZ ETMİYORSA 'moderator' DÖNDÜR.
`,
    });

        object = result.object;
        break; // Success!
      } catch (err: any) {
        lastError = err;
        console.warn(`Model ${modelName} failed in agent-intents. Error status: ${err?.statusCode || 'Unknown'}. Trying next model...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    if (!object) {
      throw lastError; // All models failed
    }

    return Response.json(object);
  } catch (error) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({ error: 'Failed to parse intents' }), { status: 500 });
  }
}
