'use client';
import { Users, CheckCircle, XCircle } from 'lucide-react';

export default function Planner({ topic, agents, onStart, onCancel }: { topic: string, agents: any[], onStart: () => void, onCancel: () => void }) {
  return (
    <div style={{ maxWidth: '900px', margin: '5vh auto', padding: '2rem' }}>
      <h2 className="glow-text" style={{ fontSize: '2rem', textAlign: 'center', marginBottom: '1rem' }}>Katılımcılar Belirlendi</h2>
      <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '1.1rem' }}>
        Konu: <strong>{topic}</strong>
      </p>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap', marginBottom: '3rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: 'var(--border-radius-lg)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'white' }}>{agents.length}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Toplam</div>
        </div>
        <div style={{ width: '1px', background: 'var(--surface-border)' }}></div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#ef4444' }}>{agents.filter(a => a.category === 'Bakanlıklar').length}</div>
          <div style={{ fontSize: '0.8rem', color: '#ef4444', textTransform: 'uppercase' }}>Bakanlıklar</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#f97316' }}>{agents.filter(a => a.category === 'Düzenleyici Kurumlar').length}</div>
          <div style={{ fontSize: '0.8rem', color: '#f97316', textTransform: 'uppercase' }}>Düzenleyici K.</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#3b82f6' }}>{agents.filter(a => a.category === 'Akademi').length}</div>
          <div style={{ fontSize: '0.8rem', color: '#3b82f6', textTransform: 'uppercase' }}>Akademi</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#10b981' }}>{agents.filter(a => a.category === 'STK ve Odalar').length}</div>
          <div style={{ fontSize: '0.8rem', color: '#10b981', textTransform: 'uppercase' }}>STK / Odalar</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{agents.filter(a => a.category === 'Özel Sektör').length}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Özel Sektör</div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '3rem' }}>
        <button onClick={onCancel} className="btn-primary" style={{ background: 'transparent', border: '1px solid var(--danger)', color: 'var(--danger)', boxShadow: 'none' }}>
          <XCircle size={18} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} /> İptal Et
        </button>
        <button onClick={onStart} className="btn-primary" style={{ background: 'linear-gradient(135deg, var(--success) 0%, #059669 100%)', boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)' }}>
          <CheckCircle size={18} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} /> Toplantıyı Başlat
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '3rem' }}>
        {agents.map((agent, i) => (
          <div key={agent.id} className="glass-panel" style={{ padding: '1.5rem', animation: `fadeIn 0.5s ease forwards ${i * 0.1}s`, opacity: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ background: 'var(--primary-glow)', padding: '0.8rem', borderRadius: '50%' }}>
                <Users size={24} color="var(--primary)" />
              </div>
              <div>
                <h3 style={{ fontSize: '1.05rem', margin: 0, lineHeight: '1.3' }}>{agent.name}</h3>
                <span style={{ 
                  color: 
                    agent.category === 'Bakanlıklar' ? '#ef4444' : 
                    agent.category === 'Düzenleyici Kurumlar' ? '#f97316' : 
                    agent.category === 'Akademi' ? '#3b82f6' : 
                    agent.category === 'STK ve Odalar' ? '#10b981' : 
                    'var(--text-secondary)', 
                  fontSize: '0.8rem', 
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  {agent.category}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
