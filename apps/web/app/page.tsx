'use client';
import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export default function Page(){
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Array<{role:string;content:string;id?:string;seq?:number}>>([]);
  const lastSeqRef = useRef<number>(0);
  const [text, setText] = useState('');
  const [badge, setBadge] = useState(0);
  const socketRef = useRef<Socket | null>(null);
  useEffect(()=>{
    const socket = io(process.env.NEXT_PUBLIC_API_WS || 'http://localhost:4000', { path: '/ws', reconnection: true, reconnectionAttempts: Infinity, reconnectionDelay: 300, reconnectionDelayMax: 2000 });
    socketRef.current = socket;
    socket.on('connected', async ()=>{
      try {
        let cid: string | null = null;
        try { cid = localStorage.getItem('conversationId'); } catch {}
        const wasNew = !cid;
        if (!cid) {
          const res = await fetch((process.env.NEXT_PUBLIC_API_HTTP || 'http://localhost:4000') + '/conversations', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
          const conv = await res.json();
          cid = typeof conv?.id === 'string' ? conv.id : null;
          if (cid) { try { localStorage.setItem('conversationId', cid); } catch {} }
        }
        if (cid) {
          setConversationId(cid);
          socket.emit('join', { conversationId: cid });
        }
        // Test-mode simulated push when notifications are denied and a new conversation is created
        const urlHasTest = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('test') === '1';
        if (wasNew && (process.env.NEXT_PUBLIC_TEST_PUSH === '1' || urlHasTest)) {
          const perm = (typeof Notification !== 'undefined') ? Notification.permission : 'denied';
          if (perm !== 'granted') {
            setBadge(b=> b + 1);
            setMessages(prev=>[...prev, { role: 'system', content: 'Simulated push received' }]);
          }
        }
      } catch {}
    });
    socket.on('message', (m: any)=> {
      const seq: number = typeof m?.seq === 'number' ? m.seq : (lastSeqRef.current + 1);
      if (seq <= lastSeqRef.current) return; // discard stale
      lastSeqRef.current = seq;
      setMessages(prev=>[...prev, { role: m.role, content: m.content, id: m.id, seq }]);
    });
    socket.on('route', (r: any)=> setMessages(prev=>[...prev, { role: 'system', content: `Routed: ${r.intent} (${Math.round((r.confidence||0)*100)}%)` }]));
    return ()=>{ socket.disconnect(); };
  },[]);
  useEffect(()=>{
    if (!conversationId) return;
    (async ()=>{
      try {
        const res = await fetch((process.env.NEXT_PUBLIC_API_HTTP || 'http://localhost:4000') + `/conversations/${conversationId}/messages?sinceSeq=${lastSeqRef.current}`);
        const rows = await res.json();
        const ordered = rows.sort((a:any,b:any)=> (a.seq||0)-(b.seq||0));
        for (const m of ordered) {
          if ((m.seq||0) > lastSeqRef.current) lastSeqRef.current = m.seq;
        }
        setMessages(ordered.map((m: any)=> ({ role: m.role, content: m.content, id: m.id, seq: m.seq })));
      } catch {}
    })();
  }, [conversationId]);
  async function ensurePush() {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') {
      // simple in-app fallback toast
      alert('Notifications disabled. You will see in-app alerts instead.');
      return;
    }
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '') }).catch(()=>null);
    if (sub) {
      await fetch((process.env.NEXT_PUBLIC_API_HTTP || 'http://localhost:4000') + '/push/subscribe', {
        method: 'POST', headers: { 'content-type':'application/json' }, body: JSON.stringify(sub)
      }).catch(()=>{});
    }
  }
  useEffect(()=>{ ensurePush().catch(()=>{}); },[]);
  useEffect(()=>{ if ('serviceWorker' in navigator) { navigator.serviceWorker.register('/sw.js').catch(()=>{}); } },[]);
  function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
    return outputArray;
  }
  async function send(){
    if (!text.trim() || !conversationId) return;
    const clientGeneratedId = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now());
    await fetch((process.env.NEXT_PUBLIC_API_HTTP || 'http://localhost:4000') + '/messages', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ conversationId, role: 'user', content: text, clientGeneratedId })
    }).catch(()=>{});
    setText('');
  }
  return (
    <main className="p-6 max-w-3xl mx-auto">
      <h1 className="text-xl font-semibold mb-2">Chat {badge > 0 ? <span aria-label="badge" className="inline-block text-xs bg-red-600 text-white rounded-full px-2 ml-2">{badge}</span> : null}</h1>
      {badge > 0 && <div className="mb-2 text-sm text-gray-600" data-test="fallback-alert">Notifications disabled. Showing in-app alerts.</div>}
      <div className="border rounded p-3 h-80 overflow-auto mb-3" aria-live="polite">
        {messages.map((m,i)=> <div key={i}><strong>{m.role}:</strong> {m.content}</div>)}
      </div>
      <label className="block mb-2">
        <span className="sr-only">Message</span>
        <input className="border rounded p-2 w-full" value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{ if (e.key==='Enter'){ e.preventDefault(); send(); } }} />
      </label>
      <button className="border rounded px-3 py-2" onClick={send} aria-label="Send message">Send</button>
    </main>
  );
}


