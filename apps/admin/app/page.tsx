"use client";
import { useEffect, useState } from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';
export default function Page(){
  const { data: session } = useSession();
  const [logs, setLogs] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  async function refresh(){
    const base = process.env.NEXT_PUBLIC_API_HTTP || 'http://localhost:4000';
    const s = await fetch(base + '/admin/directory/status').then(r=>r.json()).catch(()=>({ logs: [] }));
    const u = await fetch(base + '/admin/directory/users').then(r=>r.json()).catch(()=>({ users: [] }));
    setLogs(s.logs || []); setUsers(u.users || []);
    const conv = await fetch(base + '/admin/conversations').then(r=>r.json()).catch(()=>({ conversations: [] }));
    setConversations(conv.conversations || []);
  }
  useEffect(()=>{ refresh().catch(()=>{}); },[]);
  return (
    <main className="p-6 max-w-3xl mx-auto">
      <h1 className="text-xl font-semibold mb-4">Admin Console</h1>
      <div className="mb-4">
        {session ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Signed in as {session.user?.email}</span>
            <button className="border rounded px-3 py-1" onClick={()=> signOut()}>Sign out</button>
          </div>
        ) : (
          <button className="border rounded px-3 py-1" onClick={()=> signIn('email')}>Sign in (magic link)</button>
        )}
      </div>
      <section className="space-y-4">
        {/* Slack removed */}
        <div className="p-4 border rounded">
          <h2 className="font-medium mb-2">Web Push (VAPID)</h2>
          <form onSubmit={async (e)=>{ e.preventDefault(); const f = e.currentTarget as any; const body = { publicKey: f.pub.value, privateKey: f.priv.value }; const headers: Record<string,string> = { 'content-type':'application/json', 'x-csrf-token': process.env.NEXT_PUBLIC_CSRF || '' }; if (session?.user?.email) headers['x-admin-user'] = session.user.email; await fetch((process.env.NEXT_PUBLIC_API_HTTP || 'http://localhost:4000') + '/admin/credentials/vapid', { method: 'POST', headers, body: JSON.stringify(body) }).then(r=>r.json()).catch(()=>null); }} className="space-y-2">
            <label className="block">Public Key<input className="border p-2 w-full" name="pub" /></label>
            <label className="block">Private Key<input className="border p-2 w-full" name="priv" type="password" /></label>
            <button className="border rounded px-3 py-2" type="submit">Save</button>
          </form>
        </div>
        <div className="p-4 border rounded">
          <h2 className="font-medium mb-2">Conversations</h2>
          <ul className="text-sm space-y-1 max-h-64 overflow-auto">
            {conversations.map((c: any)=> <li key={c.id}>{c.id} — {c.status}</li>)}
          </ul>
        </div>
        <div className="p-4 border rounded">
          <div className="flex items-center justify-between">
            <h2 className="font-medium mb-2">Users</h2>
            <div className="space-x-2">
              {/* Slack sync removed */}
              <button className="border rounded px-3 py-2" onClick={async ()=>{
                const email = prompt('Email'); if (!email) return; const name = prompt('Display name') || email;
                const headers: Record<string,string> = { 'x-csrf-token': process.env.NEXT_PUBLIC_CSRF || '', 'content-type':'application/json' };
                if (session?.user?.email) headers['x-admin-user'] = session.user.email;
                await fetch((process.env.NEXT_PUBLIC_API_HTTP || 'http://localhost:4000') + '/admin/users', { method:'POST', headers, body: JSON.stringify({ email, displayName: name, active: true }) });
                await refresh();
              }}>Add user</button>
            </div>
          </div>
          <div className="text-sm text-gray-600 mb-2">Users:</div>
          <ul className="text-sm space-y-1 max-h-64 overflow-auto">
            {users.map((u: any)=> <li key={u.id} className="flex items-center justify-between">
              <span>{u.displayName} <span className="text-gray-500">({u.email})</span> — {u.active ? 'active' : 'inactive'} — {u.source}</span>
              <button className="border rounded px-2 py-1" onClick={async ()=>{
                const headers: Record<string,string> = { 'x-csrf-token': process.env.NEXT_PUBLIC_CSRF || '', 'content-type':'application/json' };
                if (session?.user?.email) headers['x-admin-user'] = session.user.email;
                await fetch((process.env.NEXT_PUBLIC_API_HTTP || 'http://localhost:4000') + `/admin/users/${u.id}`, { method:'PATCH', headers, body: JSON.stringify({ active: !u.active }) });
                await refresh();
              }}>{u.active ? 'Deactivate' : 'Activate'}</button>
            </li>)}
          </ul>
        </div>
      </section>
    </main>
  );
}


