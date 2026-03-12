# AI Toplantı Simülasyonu 🚀
> Çoklu-Ajan (Multi-Agent) Orkestrasyonu ile Otonom Müzakere Motoru

Bu proje, girilen **HERHANGİ BİR KONUYA** göre saniyeler içinde 100 farklı Yapay Zeka Ajanı (Sub-Agent) doğuran, onlara spesifik kurum/unvan, karakter ve gizli misyonlar yükleyen, ardından da bu ajanları kendi aralarında otonom bir şekilde tartıştıran bir simülasyon motorudur.

![Next.js](https://img.shields.io/badge/Frontend-Next.js_14-black?style=for-the-badge&logo=next.js)
![Gemini](https://img.shields.io/badge/AI_Engine-Google_Gemini-blue?style=for-the-badge&logo=google)

## 🌟 Sistem Nasıl Çalışıyor? (Multi-Agent Mimarisi)

Uygulama arka planda güçlü bir hibrit LLM mimarisi kullanmaktadır:

1. **Karakter Fabrikası (Gemini 2.5 Flash):** Sisteme verdiğiniz konu başlığını analiz eder. O konuyla Türkiye'de ve dünyada ilgili olabilecek 100 kurumu, STK başkanı, CEO ve akademisyeni tespit edip masaya oturtur. Hepsine savunacakları argümanları (Gizli Ajanda) önceden yükler.
2. **Canlı Müzakere Motoru (Gemini 3.1 Flash-Lite):** İnsan müdahalesi olmadan, sadece "Moderatör" ajanının yönlendirmesiyle bu 100 karakter canlı yayında birbirleriyle bürokratik dilde tartışır, itiraz sunar ve müzakere eder.
3. **Müfettiş (Gemini 2.5 Flash):** Toplantı bitiminde tüm transkripti okur, kurumlar arası muhalefet şerhlerini, alınan ortak kararları ve aksiyon planlarını **resmi devlet tutanağı** üslubuyla raporlar.

## 💻 Kendi Bilgisayarında Çalıştır (Local Development)

Uygulamanın gücü, **herkesin kendi bilgisayarında ve kendi yapay zeka anahtarıyla** tamamen bağımsız ve limitsiz çalışabilmesinden gelir. 

Projede arka planda aynı anda 100 yapay zeka ajanı doğurulduğu için standart ücretsiz bulut sunucularında limitlere (Timeout) takılabilirsiniz. Bu devasa işlem gücünü kesintisiz deneyimlemek için uygulamayı kendi bilgisayarınızda (localhost) çalıştırmalısınız.

Projeyi bilgisayarınızda çalıştırmak için:

```bash
# Projeyi klonlayın
git clone https://github.com/KULLANICI_ADINIZ/ai-toplanti-simulasyonu.git

# Klasöre girin
cd ai-toplanti-simulasyonu

# Bağımlılıkları yükleyin
npm install

# Geliştirici sunucusunu başlatın
npm run dev
```

Tarayıcınızda `http://localhost:3000` adresini açarak uygulamayı görebilirsiniz.

## 🤖 Nasıl Kodlandı?
Bu projenin yazılım mimarisi, tasarım kararları ve kodlamasının tamamı "AI (Yapay Zeka)" destekli olarak inşa edilmiştir! Yani Yapay Zekaların kendi aralarında ne konuştuğunu izlediğimiz bu sistemi, yine Yapay Zeka ile (birlikte çalışarak) kodladık. 🤫

## 📜 Lisans
Bu proje açık kaynaklıdır ve tüm geliştiricilere açıktır.
