'use client';
import { useState, useEffect } from 'react';
import { FileText, Download, CheckCircle, Home } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function Report({ topic, messages, agents, apiKey, aiModel, metrics, onRestart }: { topic: string, messages: any[], agents: any[], apiKey: string, aiModel: string, metrics?: any, onRestart?: () => void }) {
  const [reportText, setReportText] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'summary' | 'transcript'>('transcript');

  useEffect(() => {
    const generate = async () => {
      try {
        const res = await fetch('/api/generate-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic, messages, agents, apiKey, aiModel, metrics })
        });
        const data = await res.json();
        setReportText(data.report || 'Rapor oluşturulamadı.');
      } catch (e) {
        console.error(e);
        setReportText('Rapor oluşturulurken bir hata oluştu.');
      } finally {
        setLoading(false);
      }
    };
    generate();
  }, [topic, messages]);

  const handleDownload = () => {
    // Native browser print yields superior vector PDFs compared to html2canvas screenshots
    window.print();
  };

  return (
    <div style={{ maxWidth: '800px', margin: '5vh auto', padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', margin: 0 }} className="glow-text">
          <FileText size={28} /> Ham Konuşma Dökümü ve Toplantı Tutanağı
        </h2>
        {loading ? (
           <span style={{ color: 'var(--text-secondary)' }}>Rapor Yazılıyor...</span>
        ) : (
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button onClick={onRestart} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--surface)', border: '1px solid var(--surface-border)', color: 'var(--text)' }}>
               <Home size={18} /> Ana Sayfa
            </button>
          </div>
        )}
      </div>

      <div className="glass-panel" style={{ padding: '2rem', minHeight: '400px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', flexDirection: 'column', gap: '1rem' }}>
             <div style={{ width: '40px', height: '40px', border: '3px solid var(--surface-border)', borderTop: '3px solid var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
             <p style={{ color: 'var(--text-secondary)' }}>Simülasyon transkripti inceliyor ve raporluyor...</p>
             <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--surface-border)', paddingBottom: '0.5rem' }}>
               <div style={{ display: 'flex', gap: '1rem' }}>
                  <button 
                     onClick={() => setActiveTab('transcript')}
                     style={{ 
                        background: activeTab === 'transcript' ? 'rgba(99, 102, 241, 0.15)' : 'transparent', 
                        border: activeTab === 'transcript' ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid transparent', 
                        color: activeTab === 'transcript' ? 'var(--primary)' : 'var(--text-secondary)', 
                        fontWeight: activeTab === 'transcript' ? '600' : 'normal', 
                        cursor: 'pointer', 
                        padding: '0.6rem 1.2rem',
                        borderRadius: '20px',
                        transition: 'all 0.2s ease'
                     }}
                     onMouseEnter={(e) => { if(activeTab !== 'transcript') e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                     onMouseLeave={(e) => { if(activeTab !== 'transcript') e.currentTarget.style.background = 'transparent' }}
                  >
                     Ham Konuşma Dökümü
                  </button>
                  <button 
                     onClick={() => setActiveTab('summary')}
                     style={{ 
                        background: activeTab === 'summary' ? 'rgba(99, 102, 241, 0.15)' : 'transparent', 
                        border: activeTab === 'summary' ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid transparent', 
                        color: activeTab === 'summary' ? 'var(--primary)' : 'var(--text-secondary)', 
                        fontWeight: activeTab === 'summary' ? '600' : 'normal', 
                        cursor: 'pointer', 
                        padding: '0.6rem 1.2rem',
                        borderRadius: '20px',
                        transition: 'all 0.2s ease'
                     }}
                     onMouseEnter={(e) => { if(activeTab !== 'summary') e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                     onMouseLeave={(e) => { if(activeTab !== 'summary') e.currentTarget.style.background = 'transparent' }}
                  >
                     Toplantı Tutanağı
                  </button>
               </div>
               
               <button onClick={handleDownload} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}>
                 <Download size={16} /> {activeTab === 'transcript' ? 'Dökümü İndir' : 'Raporu İndir'}
               </button>
            </div>

            <div id="report-content" style={{ padding: '1rem', background: 'white', color: 'black', borderRadius: '8px', fontFamily: 'sans-serif' }}>
              <style>{`
                @media print {
                  body * { visibility: hidden; }
                  #report-content, #report-content * { visibility: visible; }
                  #report-content { position: absolute; left: 0; top: 0; width: 100%; padding: 0; margin: 0; min-height: 100vh; }
                  
                  #report-content::before {
                    content: 'AI TOPLANTI SİMÜLASYONU \\A (HAYALİ SENARYO)';
                    white-space: pre-wrap;
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%) rotate(-45deg);
                    font-size: 6rem;
                    color: rgba(0, 0, 0, 0.08); /* Faded but visible gray */
                    z-index: -1;
                    line-height: 1.2;
                    text-align: center;
                    font-weight: bold;
                    pointer-events: none;
                    width: 150vw;
                  }
                }
              `}</style>

              <div style={{ marginBottom: '2rem', padding: '1rem', border: '2px dashed #ef4444', backgroundColor: '#fef2f2', color: '#b91c1c', borderRadius: '8px', fontSize: '0.85rem', lineHeight: '1.5' }}>
                 <strong style={{ display: 'block', marginBottom: '0.5rem', fontSize: '1rem' }}>⚠️ YASAL UYARI VE SORUMLULUK REDDİ</strong>
                 Bu belge, tamamen kurgusal ve deneysel bir yapay zeka (AI) simülasyonu tarafından algoritmik olarak üretilmiş "hayali" bir toplantı tutanağı/özetidir. Raporda adı geçen makam, unvan, kurum, kişi, demeç ve kararların <strong>gerçek dünya kişi veya resmi hükümet kuruluşlarıyla hiçbir hukuki, ticari veya fiili bağı yoktur</strong>. Tamamen açık kaynaklı bir projenin senaryo çıktısı olup, gerçekliği beyan ve yansıtmaz.
              </div>
              
              {activeTab === 'summary' ? (
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h2: ({node, ...props}) => <h2 style={{ color: '#111827', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem', marginTop: '2rem' }} {...props} />,
                    h3: ({node, ...props}) => <h3 style={{ marginTop: '1.5rem', color: '#111827' }} {...props} />,
                    p: ({node, ...props}) => <p style={{ marginBottom: '1rem', lineHeight: '1.7' }} {...props} />,
                    li: ({node, ...props}) => <li style={{ marginBottom: '0.5rem', lineHeight: '1.6', marginLeft: '1rem' }} {...props} />,
                    ul: ({node, ...props}) => <ul style={{ marginBottom: '1rem' }} {...props} />,
                    strong: ({node, ...props}) => <strong style={{ color: '#000', fontWeight: 'bold' }} {...props} />
                  }}
                >
                  {reportText}
                </ReactMarkdown>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                   {messages.map((msg, idx) => {
                      const agent = msg.role === 'assistant' ? agents.find(a => a.id === msg.name) : null;
                      const speakerName = msg.name === 'moderator' ? 'Moderatör' : (agent ? `${agent.title} (${agent.institution})` : msg.name);
                      
                      return (
                         <div key={idx} style={{ paddingLeft: '1rem', borderLeft: '3px solid ' + (msg.name === 'moderator' ? '#2563eb' : '#9ca3af'), paddingBottom: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
                            <strong style={{ color: msg.name === 'moderator' ? '#2563eb' : '#111827', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                               {speakerName}
                               {msg.realTime && <span style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: 'normal' }}>• {msg.realTime}</span>}
                            </strong>
                            <p style={{ margin: 0, lineHeight: 1.6, color: '#374151' }}>{msg.content}</p>
                         </div>
                      );
                   })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
