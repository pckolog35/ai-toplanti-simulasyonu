'use client';
import { useState } from 'react';
import Setup from '@/components/Setup';
import Planner from '@/components/Planner';
import Meeting from '@/components/Meeting';
import Report from '@/components/Report';

export default function Home() {
  const [step, setStep] = useState<'setup' | 'planner' | 'meeting' | 'report'>('setup');
  const [topic, setTopic] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [apiTier, setApiTier] = useState<'free' | 'paid'>('free');
  const [agents, setAgents] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [reportMetrics, setReportMetrics] = useState<any>({});

  const handlePlan = async (t: string, key: string, tier: 'free' | 'paid') => {
    setTopic(t);
    setApiKey(key);
    setApiTier(tier);
    try {
      const res = await fetch('/api/plan-meeting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: t, apiKey: key, apiTier: tier })
      });
      const data = await res.json();
      
      if (data.agents) {
        setAgents(data.agents);
        setStep('planner');
        return true;
      } else {
         const errorDetail = data.details || data.error || 'Bilinmeyen Hata';
         alert(`Plan oluşturulurken bir hata oluştu: ${errorDetail}\n\nLütfen 1 dakika bekleyip tekrar deneyin veya konu metnini daraltın.`);
         return false;
      }
    } catch (e) {
      console.error(e);
      alert('Plan oluşturulurken bir hata oluştu. API bağlantısını veya key durumunu kontrol edin.');
      return false;
    }
  };

  const handleStart = () => {
    setStep('meeting');
  };

  const handleCancel = () => {
    setTopic('');
    setAgents([]);
    setStep('setup');
  };

  const handleEnd = (finalMessages: any[], metrics: any) => {
    setMessages(finalMessages);
    setReportMetrics(metrics);
    setStep('report');
  };

  const handleRestart = () => {
    setTopic('');
    setAgents([]);
    setMessages([]);
    setApiTier('free');
    setReportMetrics({});
    setStep('setup');
  };

  return (
    <main>
      {step === 'setup' && <Setup onPlan={handlePlan} />}
      {step === 'planner' && <Planner topic={topic} agents={agents} onStart={handleStart} onCancel={handleCancel} />}
      {step === 'meeting' && <Meeting topic={topic} agents={agents} apiKey={apiKey} apiTier={apiTier} onEnd={handleEnd} />}
      {step === 'report' && <Report topic={topic} messages={messages} agents={agents} apiKey={apiKey} aiModel={apiTier} metrics={reportMetrics} onRestart={handleRestart} />}
    </main>
  );
}
