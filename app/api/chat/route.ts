import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText } from 'ai';

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { messages, agent, topic, apiKey, aiModel } = await req.json();

    const google = createGoogleGenerativeAI({
      apiKey: apiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY || '',
    });

    const isFirstMessage = messages.length === 0;

    let system = '';

    if (agent.id === 'moderator') {
      system = `ROL: Sen bir "Toplantı Simülatörü" ve "Karakter Motoru"sun. Sen bu toplantının DİNAMİK MODERATÖRÜSÜN. Toplantı Konusu: "${topic}".

TARTIŞMA KURALLARI (Kesinlikle Uy!):
${isFirstMessage ? '1. DİKKAT: Bu, toplantının İLK mesajı. Senden önce kimse konuşmadı. Toplantının açılışını yap, konuyu kısaca özetle ve tartışmayı başlatmak için uygun bir kuruma (temsilciye) söz ver. Katiyen "sayın bakana teşekkür ederim" gibi hayali ön konuşmalara atıfta bulunma.' : '1. Devam eden konuşmalarda bir önceki konuşmacının söylediklerini kısaca özetleyip MÜZAKEREYİ DERİNLEŞTİRMEK için sözü spesifik bir Kurum Temsilcisine devret.'}
2. ASLA TOPLANTIYI BİTİRME VEYA VEDA ETME (Örn: "Desteğiniz için teşekkürler, iyi günler", "Toplantıyı kapatıyorum" ASLA DEME). Senin görevin toplantıyı SÜREKLİ canlı tutmak ve bitmek bilmeyen bu tartışmayı sürekli yeni kişilere söz vererek alevlendirmektir.
3. Bürokratik Gerçekçilik: Diğer katılımcılara "Sayın Temsilci", "Hocam", "Değerli Başkanım" gibi hitap et.
4. Sadece TÜRKÇE konuş. Çok kısa, öz ve "sözü başkasına veren" nitelikte 1 paragraf konuş.`;
    } else {
      system = `ROL: Sen bir "Toplantı Simülatörü" ve "Karakter Motoru"sun. Toplantı Konusu: "${topic}".
Senin Bilgilerin:
- İsim: ${agent.name}
- Rol: ${agent.role}
- Kişilik/Gizli Gündem: ${agent.systemPrompt}

TARTIŞMA KURALLARI (Kesinlikle Uy!):
1. Önceki Konuşmacıya Atıf: Söze doğrudan bir önceki konuşmacının kurumunu/unvanını anarak ve onun söylediği spesifik bir cümleye katılarak veya karşı çıkarak başla. (Örn: "Sayın Sanayi Genel Müdürümün veri güvenliği kaygısına katılıyorum ancak...", "TÜBİSAD Temsilcisinin maliyet öngörüsüne kesinlikle itiraz ediyorum...")
2. Paralel Reaksiyon: Sen sadece bir konuşmacı değilsin, masadaki dinamik bir karaktersin. Kendi fikirlerini önceki konuşmacıların hatalı bulduğun argümanlarını çürütmek üzerine kur.
3. Bürokratik Gerçekçilik: Diğer katılımcılara "Sayın Genel Müdürüm", "Hocam", "Değerli Başkanım" gibi hitap et. Tartışmayı, toplantının ana konusuna (${topic}) tam olarak uyan sektörel, yasal ve teknik terimlerle zenginleştir. Konuyla tamamen alakasız terimler kullanmaktan KESİNLİKLE kaçın.

AKIŞ TALİMATI:
Konuşmalar kısa, öz ve "çatışma/müzakere" nitelikte olsun. Kesinlikle uzun makaleler yazma. 1 veya en fazla 2 paragraf konuş.
Sadece TÜRKÇE konuş. Şahıs ismi ASLA kullanma, daima Kurum/Unvan ile hitap et.`;
    }

    const historyText = isFirstMessage ? '(Henüz hiç mesaj atılmadı, toplantı şimdi başlıyor.)' : messages.map((m: any) => `${m.name}: ${m.content}`).join('\n\n');
    const singleMessage = [
      { 
        role: 'user', 
        content: isFirstMessage 
          ? `Toplantı Konusu: ${topic}\n\nMedyatik, resmi ve bürokratik bir dille toplantının ilk AÇILIŞ KONUŞMASINI tam şu an yap. Senden önce kimse konuşmadı, o yüzden kimseye herhangi bir referansta bulunma veya teşekkür etme. Toplantıyı başlat ve ilk sözü vermek üzere bir kuruma pas at.`
          : `Aşağıda şu ana kadarki toplantı geçmişi verilmiştir:\n\n${historyText}\n\nToplantıdaki rolüne, kişiliğine ve gündemine uygun olarak söz sırası sende! (Medyatik, resmi ve bürokratik bir dil kullan. MUTLAKA senden bir önceki konuşan kişiye Unvanıyla hitap ederek cevap ver veya sözü uygun kişiye pasla).` 
      }
    ];

    const models = ['gemini-3.1-flash-lite-preview'];
    let result;
    let lastError;

    for (const modelName of models) {
      try {
        result = streamText({
          model: google(modelName),
          maxRetries: 0,
          system,
          messages: singleMessage as any,
        });
        break; // Success!
      } catch (err: any) {
        lastError = err;
        console.warn(`Model ${modelName} failed in chat. Error status: ${err?.statusCode || 'Unknown'}. Trying next model...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    if (!result) {
      throw lastError; // All models failed
    }

    return result.toTextStreamResponse();
  } catch (error) {
    console.error('Chat API Error:', error);
    return new Response(JSON.stringify({ error: 'Failed to stream chat' }), { status: 500 });
  }
}
