import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { topic, messages, agents, apiKey, aiModel, metrics } = await req.json();

    const google = createGoogleGenerativeAI({
      apiKey: apiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY || '',
    });

    const transcript = messages
      .filter((m: any) => m.role !== 'system')
      .map((m: any) => `${m.name || m.role}: ${m.content}`)
      .join('\n\n');

    const participantList = (agents || [])
      .map((a: any) => `- ${a.name} (${a.category})`)
      .join('\n');

    // ALWAYS use gemini-2.5-flash for the report generation phase.
    // While 3.1-lite is faster, it sacrifices analytical depth and produces superficial reports.
    // 2.5-flash guarantees profound, highly detailed, and structured meeting minutes.
    const models = ['gemini-2.5-flash'];
    let text;
    let lastError;

    const realDate = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
    const realTime = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    const elapsedSecs = metrics?.elapsedTime || 0;
    const realDuration = `${Math.floor(elapsedSecs / 60)} dakika ${elapsedSecs % 60} saniye`;
    const virtualDuration = `${Math.floor(metrics?.virtualMinutes || 0)} dakika`;

    for (const modelName of models) {
      try {
        const result = await generateText({
          model: google(modelName),
          maxRetries: 0,
      prompt: `GÖREV: Gerçekleşen simülasyonun tüm loglarını analiz et ve resmi bir "Toplantı Tutanağı" hazırla.

BAŞLIK VE BİLGİ ETİKETLERİ:
Raporun en üstüne sadece "# Toplantı Tutanağı" yaz. Hemen altına şu üç metrik bilgisini kalın yazılarla liste olarak (bullet point) ekle:
- **Program Çalıştırma Tarihi/Saati:** ${realDate} ${realTime}
- **Simüle Edilen Toplantı Süresi:** ${virtualDuration}
- **Gerçek Program Çalışma Süresi (Hesaplama Süresi):** ${realDuration}

ASLA "[Tarih Belirtilecektir]" gibi doldurulmamış taslak (placeholder) ifadeleri KULLANMA. Zaten yukarıda sana verdiğim gerçek tarih ve süreleri kullan.

RAPOR YAPISI:
Gündem Özeti: Toplantının ana amacı ve tartışılan temel başlıklar.
Katılımcı Listesi: Sana aşağıda "Tüm Katılımcılar" olarak liste halinde verdiğim kişilerin tamamını (sadece toplantıda konuşanları DEĞİL, sessiz dinleyenler dahil hepsini) kurum ve ünvan bazlı madde madde yaz. Gerçek kişi ismi ASLA KULLANMA.
Tartışma Özeti: Hangi kurum/makam neyi savundu? Kurum ünvanlarını KALIN yazarak, her bir konuşmacıyı YENİ BİR SATIRDA (bullet point) madde madde belirt. (ÖNEMLİ: "Bakanlık Temsilcisi" gibi yuvarlak kelimeler ASLA KULLANMA. Aşağıdaki Katılımcılar Listesi'ndeki tam adları kullan. Örn: 
- **İlgili Bakanlık Genel Müdürü**: Bütçe tahsisinin artırılmasını talep etti.
- **İlgili Sektör Kuruluşu Başkanı**: Mevzuat uyumunun ön şart olmasını savundu.)
Alınan Kararlar ve Stratejik Aksiyon Planı: Transkripti derinlemesine analiz ederek, toplantı sonunda hangi kurumların ortak bir noktada buluştuğunu tespit et. Alınan kararları, uygulanabilir aksiyon adımları olarak ve mutlaka (sorumlu kurumları kalın yazarak) madde madde yaz. Sadece vizyon ifadeleri değil, somut anlaşmalar çıkar.
Muhalefet Şerhleri ve Kırmızı Çizgiler: Kurumlar arasındaki temel uyuşmazlık noktalarını analiz et. Hangi kurum, hangi başlıkta (bütçe, etik, yasal uyum, verimlilik vb.) diğerlerinin önerisine resmen itiraz etti veya çekince koydu? Gerekçeleriyle birlikte net olarak raporla.
Sonuç ve Entegrasyon Vizyonu: Tartışılan farklı görüşlerin Türkiye'nin ekosistemine nihai katkısını tek bir güçlü paragraf ile özetle.

FORMAT: Resmi yazı dili (Resmi Gazete veya Kurumsal Rapor dili) kullan ve Markdown formatında ver.
Toplantı Konusu: "${topic}"

Tüm Katılımcılar Listesi (Hepsini Rapora Ekle):
${participantList}

Transkript (Tartışma özetini buradan çıkar):
${transcript}
`,
    });

        text = result.text;
        break; // Success!
      } catch (err: any) {
        lastError = err;
        console.warn(`Model ${modelName} failed in generate-report. Error status: ${err?.statusCode || 'Unknown'}. Trying next model...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    if (!text) {
      throw lastError; // All models failed
    }

    return Response.json({ report: text });
  } catch (error) {
    console.error('Report API Error:', error);
    return new Response(JSON.stringify({ error: 'Failed to generate report' }), { status: 500 });
  }
}
