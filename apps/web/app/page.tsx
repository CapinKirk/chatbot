'use client';
import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export default function Page(){
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Array<{role:string;content:string}>>([]);
  const [text, setText] = useState('');
  const socketRef = useRef<Socket | null>(null);
  useEffect(()=>{
    const socket = io(process.env.NEXT_PUBLIC_API_WS || 'http://localhost:4000', { path: '/ws' });
    socketRef.current = socket;
    socket.on('connected', async ()=>{
      try {
        const res = await fetch((process.env.NEXT_PUBLIC_API_HTTP || 'http://localhost:4000') + '/conversations', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
        const conv = await res.json();
        setConversationId(conv.id);
        socket.emit('join', { conversationId: conv.id });
      } catch {}
    });
    socket.on('message', (m: any)=> setMessages(prev=>[...prev, { role: m.role, content: m.content }]));
    socket.on('route', (r: any)=> setMessages(prev=>[...prev, { role: 'system', content: `Routed: ${r.intent} (${Math.round((r.confidence||0)*100)}%)` }]));
    return ()=>{ socket.disconnect(); };
  },[]);
  useEffect(()=>{
    if (!conversationId) return;
    (async ()=>{
      try {
        const res = await fetch((process.env.NEXT_PUBLIC_API_HTTP || 'http://localhost:4000') + `/conversations/${conversationId}/messages`);
        const rows = await res.json();
        setMessages(rows.map((m: any)=> ({ role: m.role, content: m.content })));
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
    await fetch((process.env.NEXT_PUBLIC_API_HTTP || 'http://localhost:4000') + '/messages', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ conversationId, role: 'user', content: text })
    }).catch(()=>{});
    setText('');
  }
  return (
    <main className="p-6 max-w-3xl mx-auto">
      <h1 className="text-xl font-semibold mb-4">Chat</h1>
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


