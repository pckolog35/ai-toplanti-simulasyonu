import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { topic, apiKey, apiTier } = await req.json();

    const google = createGoogleGenerativeAI({
      apiKey: apiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY || '',
    });

    // Use the fastest model (3.1-flash-lite) for premium testing/demos, 
    // and the high-context stable model (2.5-flash) for free tier to prevent rate limit crashes.
    const models = [apiTier === 'paid' ? 'gemini-3.1-flash-lite-preview' : 'gemini-2.5-flash'];
    let object;
    let lastError;

    for (const modelName of models) {
      try {
        const result = await generateObject({
          model: google(modelName),
          maxRetries: 2,
          schema: z.object({
            agents: z.array(
              z.object({
                id: z.string(),
                institution: z.string().describe("The real-world institution or organization, e.g. 'T.C. Tarım Bakanlığı', 'TEMA Vakfı'"),
                title: z.string().describe("The exact role or title, e.g. 'Bakan', 'Genel Müdür', 'Başkan'"),
                category: z.string().describe("Categorize this institution into one of the 5 main sectors: Bakanlıklar, Düzenleyici Kurumlar, Akademi, Özel Sektör, STK ve Odalar"),
                systemPrompt: z.string().describe("The agent's specific persona, core beliefs, and instructions on how to behave in the meeting. Give them strong, sometimes conflicting viewpoints to make the meeting dynamic and realistic. They should use data and facts in their arguments."),
              })
            ).min(20).max(120),
          }),
          prompt: `ROL: Sen "Yüksek Kapasiteli Stratejik Paydaş Analisti" ve "Türkiye Kamu-Özel Sektör Hiyerarşi Uzmanı"sın. Görevin, verilen konu için Türkiye'nin en büyük ve en teknik katılımlı sanal toplantı heyetini kurmaktır.

HEDEF: Tam 100 farklı makam/kişi belirlemek.

GENİŞLEME ALGORİTMASI (Step-by-Step):

Google Search Kullanımı: İnterneti tara ve verilen KONU'YA ÖZEL (${topic}) Türkiye'nin ulusal eylem planlarındaki paydaşları, ilgili Bakanlıkların Organizasyon Şemalarını, İlgili Genel Müdürlükleri ve Daire Başkanlıklarını tespit et.

Dikey Derinlik Kuralı (Zorunlu): Sadece "Bakan" veya "Başkan" seviyesinde kalma. Bir kurumu listeye aldığında mutlaka o kurumun konuya özgü "Daire Başkanı", "Saha Operasyon Müdürü" veya "İhtisas Uzmanı" gibi mutfaktaki isimleri de listeye ekle.

Sektörel Dağılım Kotası (100 Kişi İçin):
- Bakanlıklar ve Bağlı Genel Müdürlükler: Sadece Bakanlar değil; Konuyla doğrudan veya dolaylı ilgili Genel Müdürlüklerin ve Strateji Geliştirme birimlerinin Daire Başkanları.
- Düzenleyici Kurullar ve Ofisler: Konuyu regüle eden EPDK, Rekabet Kurumu, BDDK, RTÜK, SPK, Kalkınma Ajansları vb. teknik birim yöneticileri.
- Akademi ve Araştırma: Üniversite Rektörleri + Uzman Enstitü Müdürleri + Konuyla İlgili Kürsü Başkanları + Saha Uzmanı Akademisyenler.
- STK ve Odalar: Konuyla doğrudan ilgili Mühendis/Mimar/Meslek Odaları, Baroların İhtisas Komisyonları, Sendikalar (TÜRK-İŞ, DİSK), Çevre ve Sektör Vakıfları.
- Özel Sektör: İlgili sektörün ulusal pazar liderlerinin CEO/Teknik Yöneticileri + Yatırım Fonları + KOBİ temsilcileri ve Girişimciler.

DETAYLI TALİMATLAR:
Temsil Nedeni: Her katılımcı için neden orada olduğunu (Örn: "Bölgesel Kalkınma Planındaki istihdam hedeflerini savunmak") belirt.

Çıktı Formatı: SADECE JSON. Çıktıdaki JSON array'i (katılımcı listesi) KESİNLİKLE EN AZ 80 KİŞİDEN OLUŞMALIDIR. DİKKAT: Kelime limitine takılmamak için 'systemPrompt' verisini MAKSİMUM 1 KISA CÜMLE (10 kelimeyi geçmeyecek şekilde) yazmalısın. Aksi takdirde liste yarıda kesilir ve sistem çöker! 'institution' verisi 'Kurum/Kuruluş', 'title' verisi 'Makam/Birim', 'category' verisi 'Sektör', 'systemPrompt' verisi de 'Çok kısa Katılım Gerekçesi' olarak doldurulacaktır.
KONU: "${topic}"`,
        });

        object = result.object;
        break; // Success!
      } catch (err: any) {
        lastError = err;
        console.warn(`Model ${modelName} failed in plan-meeting. Error status: ${err?.statusCode || 'Unknown'}. Trying next model...`);
        // Add a 1 second delay to allow rate limits to cool off slightly before hitting another potentially rate-limited model
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    if (!object) {
      throw lastError; // All models failed
    }

    const sortedAgents = object.agents.map((a: any) => ({
      id: a.id,
      name: `${a.institution} ${a.title}`.trim(),
      role: a.category,
      category: a.category,
      systemPrompt: a.systemPrompt
    })).sort((a, b) => {
      const order: Record<string, number> = {
        "Bakanlıklar": 1,
        "Düzenleyici Kurumlar": 2,
        "Akademi": 3,
        "STK ve Odalar": 4,
        "Özel Sektör": 5
      };
      return (order[a.category] || 99) - (order[b.category] || 99);
    });

    return Response.json({ agents: sortedAgents });
  } catch (error) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to plan meeting',
      details: (error as any).message || String(error)
    }), { status: 500 });
  }
}
