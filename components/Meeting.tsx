'use client';
import { useState, useEffect, useRef } from 'react';
import { Mic, BrainCircuit, StopCircle } from 'lucide-react';

export default function Meeting({ topic, agents, apiKey, apiTier, onEnd }: { topic: string, agents: any[], apiKey: string, apiTier: 'free' | 'paid', onEnd: (messages: any[], metrics: any) => void }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [currentSpeaker, setCurrentSpeaker] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [meetingActive, setMeetingActive] = useState(true);
  
  // Dashboard & Tracking States
  const [elapsedTime, setElapsedTime] = useState(0); // Real seconds
  const [virtualMinutes, setVirtualMinutes] = useState(0); // Simulated minutes
  const [requestLog, setRequestLog] = useState<number[]>([]); // Real world seconds
  
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentSpeaker]);

  const runMeetingTurn = async () => {
    if (!meetingActive) return;

    let nextSpeaker = { id: 'moderator', name: 'Moderatör', role: 'Toplantı Yöneticisi', systemPrompt: '' };
    let aiChoseSpecifically = false;
    
    if (messages.length > 0) {
      console.log('Fetching intents...');
      setRequestLog(prev => [...prev, Date.now()]); // Intent check uses 1 request
      const res = await fetch('/api/agent-intents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, agents, messages: messages.slice(-5), apiKey }) // Only send last 5 for context limit
      });

      if (!res.ok) {
        console.warn('API Error (Quota/Rate Limit). Toplantıyı otomatik sonlandırıyorum.');
        handleEnd();
        return;
      }

      const data = await res.json();
      
      if (data.agentId && data.agentId !== 'moderator') {
        const foundAgent = agents.find(a => a.id === data.agentId);
        if (foundAgent) {
           nextSpeaker = foundAgent;
           aiChoseSpecifically = true;
        }
      }
    }
    
    // Prevent consecutive identical speakers
    if (messages.length > 0) {
      const lastSpeakerName = messages[messages.length-1].name;
      
      // Determine how many messages have passed since the moderator last spoke
      const recentMessages = messages.slice(-4);
      const moderatorDrought = !recentMessages.some(m => m.name === 'Moderatör' || m.id === 'moderator');

      if (moderatorDrought && !aiChoseSpecifically) {
         // If moderator hasn't spoken in the last 4 messages, force them to speak (unless someone was directly addressed)
         nextSpeaker = { id: 'moderator', name: 'Moderatör', role: 'Toplantı Yöneticisi', systemPrompt: '' };
      }
      else if (lastSpeakerName === nextSpeaker.name && nextSpeaker.id !== 'moderator') {
         // If a regular agent tries to speak twice, force flow back to moderator
         nextSpeaker = { id: 'moderator', name: 'Moderatör', role: 'Toplantı Yöneticisi', systemPrompt: '' };
      } else if (lastSpeakerName === 'Moderatör' && nextSpeaker.id === 'moderator') {
         // CIRCUIT BREAKER: If the moderator tries to speak twice in a row, FORCE a random top agent
         const randomAgent = agents[Math.floor(Math.random() * Math.min(agents.length, 10))];
         if (randomAgent) nextSpeaker = randomAgent;
      }
    }

    setCurrentSpeaker(nextSpeaker);
    setIsGenerating(true);
    setRequestLog(prev => [...prev, Date.now()]); // Chat generation uses 1 request
    
    // Add 30 seconds of virtual time for "microphone handover" and thinking pauses
    setVirtualMinutes(prev => prev + 0.5);

    try {
      const chatMessages = messages.map(m => ({ role: 'user', content: `[${m.name}]: ${m.content}` }));
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: chatMessages, agent: nextSpeaker, topic, apiKey })
      });

      if (!response.ok) {
        console.warn('API Error (Quota/Rate Limit). Toplantıyı otomatik sonlandırıyorum.');
        handleEnd();
        return;
      }

      if (!response.body) throw new Error('No body');
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      let lastWordCount = 0;

      setMessages(prev => [...prev, { role: 'assistant', name: nextSpeaker.name, content: '', realTime: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) }]);

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const chunkStr = decoder.decode(value, { stream: true });

        // AI SDK stringifies text stream fragments as 0:"text" lines. We need to parse them.
        const chunkLines = chunkStr.split('\n');
        for (const line of chunkLines) {
           if (line.startsWith('0:')) {
              try {
                 const textFragment = JSON.parse(line.substring(2));
                 fullContent += textFragment;
              } catch (e) {
                 // Try parsing raw if JSON fails
                 fullContent += line.substring(2).replace(/^"|"$/g, '');
              }
           } else if (line && !line.startsWith('d:') && !line.startsWith('e:')) {
               // Fallback for non-framed raw text
               fullContent += line;
           }
        }
        
        setMessages(prev => {
            const newMessages = [...prev];
            const lastMessage = { ...newMessages[newMessages.length - 1] };
            lastMessage.content = fullContent;
            newMessages[newMessages.length - 1] = lastMessage;
            return newMessages;
        });

        // 120 WPM: Realistic human presentation rate
        const currentWordCount = fullContent.trim().split(/\s+/).length;
        if (currentWordCount > lastWordCount) {
             const newWords = currentWordCount - lastWordCount;
             setVirtualMinutes(prev => prev + (newWords / 120));
             lastWordCount = currentWordCount;
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
      setCurrentSpeaker(null);
    }
  };

  useEffect(() => {
    if (!isGenerating && meetingActive) {
      // Direct Tier Pacing
      const delayMs = apiTier === 'free' ? 8000 : 500;

      const timer = setTimeout(runMeetingTurn, delayMs);
      return () => clearTimeout(timer);
    }
  }, [messages, isGenerating, meetingActive, apiTier]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (meetingActive) {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);

        // Rolling 60-second window cleanup for RPM tracking
        setRequestLog(prev => {
           const oneMinAgo = Date.now() - 60000;
           return prev.filter(t => t > oneMinAgo);
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [meetingActive, apiTier]);

  const handleEnd = () => {
    setMeetingActive(false);
    onEnd(messages, { elapsedTime, virtualMinutes });
  };

  const formatVirtualTime = (mins: number) => {
    const m = Math.floor(mins);
    const s = Math.floor((mins - m) * 60);
    if (m === 0) return `${s} Saniye`;
    return `${m} Dakika ${s} Saniye`;
  };

  const getModelQuota = () => apiTier === 'free' ? '~15 İstek' : '~4000 İstek';

  const modelQuotaText = getModelQuota();
  const quotaLimit = parseInt(modelQuotaText.replace(/\D/g, '')) || 15;

  return (
    <div style={{ maxWidth: '1000px', margin: '5vh auto', padding: '0 1rem', display: 'flex', flexDirection: 'column', height: '90vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
           <h2 className="glow-text" style={{ margin: 0 }}>Canlı Toplantı</h2>
           <p style={{ color: 'var(--text-secondary)', margin: '0.2rem 0 0.5rem 0' }}>{topic}</p>
           <div style={{ marginBottom: '1rem', fontSize: '0.75rem', color: '#ff8888', padding: '0.4rem 0.8rem', background: 'rgba(255,60,60,0.05)', display: 'inline-block', borderRadius: '4px', border: '1px solid rgba(255,60,60,0.2)' }}>
              ⚠️ Sorumluluk Reddi: Bu ekrandaki kurumlar, makamlar ve konuşmalar tamamen yapay zeka tarafından anlık kurgulanan <strong>hayali bir simülasyondur</strong>.
           </div>
           
           <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem' }}>
              <div className="glass-panel" style={{ padding: '0.5rem 1rem', display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
                 <div>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>SIMÜLE EDİLEN SÜRE</span>
                    <strong style={{ color: '#fff', fontSize: '1rem' }}>{formatVirtualTime(virtualMinutes)}</strong>
                 </div>
                 <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)' }}></div>
                 <div>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Gerçek Çalışma Süresi</span>
                    <span style={{ color: 'var(--accent)' }}>{Math.floor(elapsedTime / 60)}m {elapsedTime % 60}s</span>
                 </div>
              </div>

              <div className="glass-panel" style={{ padding: '0.5rem 1rem', display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
                 <div>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Ağ Modeli</span>
                    <span style={{ color: '#fff' }}>{'gemini-3.1-flash-lite (Entegre)'}</span>
                 </div>
                 <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)' }}></div>
                 <div>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Son 1 Dakika Kotası (Anlık)</span>
                    <span style={{ color: requestLog.length > (quotaLimit * 0.8) ? 'var(--danger)' : 'var(--success)' }}>
                       {requestLog.length} / {modelQuotaText}
                    </span>
                 </div>
              </div>
           </div>
        </div>
        <button onClick={handleEnd} className="btn-primary" style={{ background: 'transparent', border: '1px solid var(--danger)', color: 'var(--danger)' }}>
          <StopCircle size={18} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} /> Toplantıyı Bitir & Raporla
        </button>
      </div>

      <div style={{ display: 'flex', gap: '2rem', flex: 1, overflow: 'hidden' }}>
        {/* Left Side: Agents List */}
        <div style={{ width: '300px', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', paddingRight: '1rem' }}>
           <div className="glass-panel" style={{ padding: '1rem', border: currentSpeaker?.id === 'moderator' ? '1px solid var(--primary)' : '' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <BrainCircuit size={24} color={currentSpeaker?.id === 'moderator' ? 'var(--primary)' : 'var(--text-secondary)'} />
                <div>
                   <h4 style={{ margin: 0 }}>Moderatör</h4>
                   <span style={{ fontSize: '0.8rem', color: currentSpeaker?.id === 'moderator' ? 'var(--primary)' : 'var(--text-secondary)' }}>
                     {currentSpeaker?.id === 'moderator' ? 'Konuşuyor...' : 'Dinliyor'}
                   </span>
                </div>
              </div>
           </div>
           {agents.map(a => (
              <div key={a.id} className="glass-panel" style={{ padding: '1rem', border: currentSpeaker?.id === a.id ? '1px solid var(--primary)' : '' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <Mic size={24} color={currentSpeaker?.id === a.id ? 'var(--primary)' : 'var(--text-secondary)'} />
                  <div>
                    <h4 style={{ margin: 0, fontSize: '0.95rem' }}>{a.name}</h4>
                    <span style={{ fontSize: '0.8rem', color: currentSpeaker?.id === a.id ? 'var(--primary)' : 'var(--text-secondary)' }}>
                      {currentSpeaker?.id === a.id ? 'Konuşuyor...' : 'Düşünüyor / Dinliyor'}
                    </span>
                  </div>
                </div>
              </div>
           ))}
        </div>

        {/* Right Side: Chat Feed */}
        <div className="glass-panel" style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
           {messages.length === 0 && !isGenerating && (
             <div style={{ margin: 'auto', color: 'var(--text-secondary)', textAlign: 'center' }}>
               Toplantı Başlıyor...
             </div>
           )}
           {messages.map((m, i) => (
             <div key={i} style={{ 
               padding: '1rem', 
               background: m.name === 'Moderatör' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(255,255,255,0.05)',
               borderRadius: 'var(--border-radius-md)',
               borderLeft: m.name === 'Moderatör' ? '4px solid var(--primary)' : '4px solid var(--accent)'
             }}>
               <div style={{ fontWeight: 600, marginBottom: '0.5rem', color: m.name === 'Moderatör' ? 'var(--primary)' : 'var(--accent)' }}>
                 {m.name}
               </div>
               <div style={{ lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{m.content}</div>
             </div>
           ))}
           {currentSpeaker && isGenerating && (
             <div style={{ padding: '1rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                <span className="glow-text">{currentSpeaker.name}</span> yazıyor...
             </div>
           )}
           <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
}
