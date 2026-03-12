'use client';
import { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';

export default function Setup({ onPlan }: { onPlan: (topic: string, apiKey: string, tier: 'free' | 'paid') => Promise<boolean> | void }) {
  const [topic, setTopic] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [apiTier, setApiTier] = useState<'free' | 'paid'>('free');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [availableModels, setAvailableModels] = useState<any[]>([]);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [checkingKey, setCheckingKey] = useState(false);
  const [keyError, setKeyError] = useState('');
  const [billingTier, setBillingTier] = useState('free');

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
      setProgress(0);
      interval = setInterval(() => {
        setProgress(p => {
          // Asymptotically approach 95 so it slows down as it gets closer
          const increment = Math.max(1, Math.floor((95 - p) * 0.05));
          return p < 95 ? p + increment : 95;
        });
      }, 800);
    }
    return () => clearInterval(interval);
  }, [loading]);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const checkKey = async () => {
      if (apiKey.length < 30) {
        setAvailableModels([]);
        setKeyError('');
        return;
        return;
      }

      setCheckingKey(true);
      setKeyError('');
      try {
        const res = await fetch('/api/models', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiKey })
        });
        const data = await res.json();
        
        if (data.models && data.models.length > 0) {
          setAvailableModels(data.models);
          if (data.tier) setBillingTier(data.tier);
          
          setModelsLoaded(true); // Helper to trigger re-renders if needed
        } else {
          setAvailableModels([]);
          setKeyError(data.error || 'Bu anahtar ile model bulunamadı.');
        }
      } catch (e) {
        setKeyError('API bağlanılamadı.');
      } finally {
        setCheckingKey(false);
      }
    };

    // Debounce the API call so it doesn't spam on every keystroke
    timeoutId = setTimeout(checkKey, 1000);
    return () => clearTimeout(timeoutId);
  }, [apiKey]);

  const getLoadingText = (p: number) => {
    if (p < 25) return "Konu Kapsamı Analiz Ediliyor...";
    if (p < 50) return "Muhatap Kurumlar Taranıyor...";
    if (p < 75) return "Devlet Protokolü Listeleniyor...";
    if (p < 90) return "Özel Sektör ve STK'lar Ekleniyor...";
    return "Simülasyon Dosyaları Hazırlanıyor...";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;
    setLoading(true);
    const success = await onPlan(topic, apiKey, apiTier);
    if (success === false) {
      setLoading(false);
      setProgress(0);
    }
  };

  return (
    <div className="glass-panel" style={{ maxWidth: '600px', margin: '10vh auto', padding: '3rem', textAlign: 'center' }}>
      <Sparkles size={48} color="var(--primary)" style={{ marginBottom: '1rem' }} />
      <h1 className="glow-text" style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>AI Toplantı Simülasyonu</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
        Yapay zeka ajanlarından oluşan dinamik bir toplantı başlatmak için konuyu belirleyin.
      </p>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Örn: Bölgesel Kalkınma Planı veya Tarım İhracat Stratejisi..."
          style={{
            padding: '1rem 1.5rem',
            borderRadius: 'var(--border-radius-md)',
            border: '1px solid var(--surface-border)',
            background: 'rgba(0,0,0,0.2)',
            color: 'white',
            fontSize: '1.1rem',
            outline: 'none'
          }}
          disabled={loading}
        />
        
        <div style={{ textAlign: 'left' }}>
          <label style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>
            Google Gemini API Key (Zorunlu)
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="AIzaSyA..."
            style={{
              width: '100%',
              padding: '1rem 1.5rem',
              borderRadius: 'var(--border-radius-md)',
              border: '1px solid var(--surface-border)',
              background: 'rgba(0,0,0,0.2)',
              color: 'white',
              fontSize: '1rem',
              outline: 'none'
            }}
            disabled={loading}
          />
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
            Bilgi: Sizin ve şirketinizin bilgilerinin güvende kalması adına, kendi Google AI Studio hesabınızdan aldığınız şahsi API anahtarınızı girmeniz zorunludur. Program hiçbir şekilde kendi içerisinde gizli bir anahtar barındırmaz.
          </p>
        </div>

        <div style={{ textAlign: 'left' }}>
          <label style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>API Anahtarı Türü (Hız & Kota Belirler)</span>
            {checkingKey && <span style={{ fontSize: '0.8rem', color: 'var(--primary)' }}>Anahtar Kontrol Ediliyor...</span>}
            {keyError && <span style={{ fontSize: '0.8rem', color: '#ff6b6b' }}>{keyError}</span>}
          </label>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={() => setApiTier('free')}
              style={{
                flex: 1,
                padding: '1rem',
                borderRadius: 'var(--border-radius-md)',
                border: `2px solid ${apiTier === 'free' ? 'var(--primary)' : 'var(--surface-border)'}`,
                background: apiTier === 'free' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(0,0,0,0.2)',
                color: 'white',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: '0.2rem' }}>Ücretsiz (Free Tier)</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Dakikada maks 15 İstek. Simülasyon gerçekçi/yavaş ilerler (8 sn bekleme).</div>
            </button>
            <button
              type="button"
              onClick={() => setApiTier('paid')}
              style={{
                flex: 1,
                padding: '1rem',
                borderRadius: 'var(--border-radius-md)',
                border: `2px solid ${apiTier === 'paid' ? 'var(--primary)' : 'var(--surface-border)'}`,
                background: apiTier === 'paid' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(0,0,0,0.2)',
                color: 'white',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: '0.2rem', color: '#ffd700' }}>⚡ Ücretli (Premium Tier)</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Dakikada 4000 İstek. Simülasyon bekleme yapmadan roket hızında ilerler.</div>
            </button>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '1rem' }}>
            Sistem artık en iyi sonuç için <strong>2.5 Flash</strong> ile <strong>3.1 Flash-Lite</strong> motorlarını otomatik kullanır. Lütfen sadece anahtarınızın kotasını seçin.
          </p>
        </div>

        <button type="submit" className="btn-primary" disabled={loading || checkingKey || !topic.trim() || !apiKey.trim() || !apiTier} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: loading ? '0.7rem' : '1rem' }}>
          {loading ? (
            <>
              <span style={{ fontSize: '0.9rem', marginBottom: '0.2rem' }}>{getLoadingText(progress)}</span>
              <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>%{progress}</span>
            </>
          ) : (
            'Toplantıyı Planla'
          )}
        </button>
      </form>
    </div>
  );
}
