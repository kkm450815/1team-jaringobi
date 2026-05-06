// 관리자 페이지 — 수다방 글 관리, 통계 확인.
// 인증: VITE_ADMIN_PASSWORD 환경변수가 설정돼 있으면 입력 비밀번호와 일치해야 진입.
//      미설정 시에는 누구나 진입 가능 (로컬 개발용).
// 데스크톱 풀-와이드 레이아웃으로, PhoneFrame 을 거치지 않는다.

import { useEffect, useMemo, useState } from 'react';
import { TALK_ROOMS, TalkPost } from '../lib/data';
import { getSupabase, isSupabaseEnabled } from '../lib/supabase';
import { talkPostsRepo } from '../lib/talkPostsRepo';

const AUTH_KEY = 'jaringobi.admin.auth.v1';
const ADMIN_PASSWORD = (import.meta.env.VITE_ADMIN_PASSWORD as string | undefined) ?? '';

interface RawPost {
  id: string;
  room_id: string;
  nick: string;
  body: string;
  created_at?: string;
}

function useAdminAuth() {
  const [authed, setAuthed] = useState<boolean>(() => {
    if (!ADMIN_PASSWORD) return true;
    try {
      return sessionStorage.getItem(AUTH_KEY) === '1';
    } catch {
      return false;
    }
  });
  function login(pw: string): boolean {
    if (!ADMIN_PASSWORD) {
      setAuthed(true);
      return true;
    }
    if (pw === ADMIN_PASSWORD) {
      try { sessionStorage.setItem(AUTH_KEY, '1'); } catch { /* ignore */ }
      setAuthed(true);
      return true;
    }
    return false;
  }
  function logout() {
    try { sessionStorage.removeItem(AUTH_KEY); } catch { /* ignore */ }
    setAuthed(false);
  }
  return { authed, login, logout };
}

function LoginGate({ onLogin }: { onLogin: (pw: string) => boolean }) {
  const [pw, setPw] = useState('');
  const [err, setErr] = useState<string | null>(null);
  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!onLogin(pw)) setErr('비밀번호가 올바르지 않습니다.');
  }
  return (
    <main className="min-h-dvh w-full bg-[#1f1d1a] text-white grid place-items-center p-6">
      <form onSubmit={submit} className="w-full max-w-sm bg-[#2a2723] rounded-2xl p-8 shadow-2xl">
        <h1 className="text-[20px] font-bold tracking-[2px] text-center">자린고비 관리자</h1>
        <p className="mt-2 text-[12px] text-white/60 text-center">관리자 비밀번호 입력</p>
        <input
          type="password"
          autoFocus
          value={pw}
          onChange={(e) => { setPw(e.target.value); setErr(null); }}
          placeholder="••••••••"
          className="mt-6 w-full bg-black/30 rounded-lg px-4 py-3 outline-none text-[15px] text-white placeholder:text-white/30 ring-1 ring-white/10 focus:ring-white/30"
        />
        {err && <p className="mt-2 text-[12px] text-red-400" role="alert">{err}</p>}
        <button
          type="submit"
          className="mt-5 w-full bg-amber-400 hover:bg-amber-300 text-[#1f1d1a] rounded-lg py-3 text-[14px] font-bold transition"
        >
          로그인
        </button>
      </form>
    </main>
  );
}

export default function Admin() {
  const { authed, login, logout } = useAdminAuth();

  if (!authed) return <LoginGate onLogin={login} />;
  return <AdminPanel onLogout={logout} />;
}

function AdminPanel({ onLogout }: { onLogout: () => void }) {
  const [posts, setPosts] = useState<RawPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [filterRoom, setFilterRoom] = useState<string>('');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      if (!isSupabaseEnabled()) {
        // Supabase 미설정 — localStorage 폴백 모드
        const all = await talkPostsRepo.list();
        setPosts(
          all.map((p: TalkPost) => ({
            id: p.id, room_id: p.roomId, nick: p.nick, body: p.body,
          })),
        );
        return;
      }
      const sb = getSupabase();
      if (!sb) throw new Error('Supabase 클라이언트를 만들 수 없습니다.');
      const { data, error } = await sb
        .from('talk_posts')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setPosts((data ?? []) as RawPost[]);
    } catch (e) {
      console.error('[Admin.load] 실패', e);
      setErr((e as Error).message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function deletePost(id: string) {
    if (!confirm('이 글을 정말 삭제하시겠습니까? (되돌릴 수 없습니다)')) return;
    setBusyId(id);
    try {
      await talkPostsRepo.remove(id);
      setPosts((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      console.error('[Admin.deletePost] 실패', e);
      alert(`삭제 실패: ${(e as Error).message ?? String(e)}`);
    } finally {
      setBusyId(null);
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return posts.filter((p) => {
      if (filterRoom && p.room_id !== filterRoom) return false;
      if (!q) return true;
      return (
        (p.nick ?? '').toLowerCase().includes(q) ||
        (p.body ?? '').toLowerCase().includes(q) ||
        (p.id ?? '').toLowerCase().includes(q)
      );
    });
  }, [posts, filterRoom, search]);

  const stats = useMemo(() => {
    const byRoom = new Map<string, number>();
    const byNick = new Map<string, number>();
    for (const p of posts) {
      byRoom.set(p.room_id, (byRoom.get(p.room_id) ?? 0) + 1);
      byNick.set(p.nick, (byNick.get(p.nick) ?? 0) + 1);
    }
    const topNicks = Array.from(byNick.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
    return { byRoom, topNicks, total: posts.length };
  }, [posts]);

  return (
    <main className="min-h-dvh w-full bg-[#f7f3ec] text-[#2a2723]">
      <header className="sticky top-0 z-10 bg-[#1f1d1a] text-white shadow">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-black tracking-[3px] text-[16px]">자린고비 ADMIN</span>
            <span className="text-[11px] text-white/55">
              {isSupabaseEnabled() ? 'Supabase 모드' : '로컬 모드 (Supabase 미설정)'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              className="text-[12px] font-bold bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-md"
            >
              새로고침
            </button>
            {ADMIN_PASSWORD && (
              <button
                onClick={onLogout}
                className="text-[12px] font-bold bg-amber-400 text-[#1f1d1a] hover:bg-amber-300 px-3 py-1.5 rounded-md"
              >
                로그아웃
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        <aside className="space-y-4">
          <section className="bg-white rounded-xl shadow-sm p-4">
            <h2 className="text-[13px] font-bold text-[#2a2723]/80">전체 통계</h2>
            <p className="mt-2 text-[28px] font-black">
              {stats.total.toLocaleString()}<span className="text-[14px] font-bold text-[#2a2723]/50 ml-1">건</span>
            </p>
          </section>
          <section className="bg-white rounded-xl shadow-sm p-4">
            <h2 className="text-[13px] font-bold text-[#2a2723]/80">방별 글 수</h2>
            <ul className="mt-2 space-y-1.5">
              {TALK_ROOMS.map((r) => (
                <li key={r.id} className="flex items-center justify-between text-[13px]">
                  <button
                    onClick={() => setFilterRoom(filterRoom === r.id ? '' : r.id)}
                    className={`text-left flex-1 px-2 py-1 rounded ${filterRoom === r.id ? 'bg-amber-100 font-bold' : 'hover:bg-black/5'}`}
                  >
                    # {r.title}
                  </button>
                  <span className="text-[#2a2723]/60 tabular-nums">{stats.byRoom.get(r.id) ?? 0}</span>
                </li>
              ))}
            </ul>
            {filterRoom && (
              <button
                onClick={() => setFilterRoom('')}
                className="mt-2 text-[11px] text-amber-700 hover:underline"
              >
                필터 해제
              </button>
            )}
          </section>
          <section className="bg-white rounded-xl shadow-sm p-4">
            <h2 className="text-[13px] font-bold text-[#2a2723]/80">활동 TOP 8</h2>
            <ul className="mt-2 space-y-1.5">
              {stats.topNicks.length === 0 && (
                <li className="text-[12px] text-[#2a2723]/50">데이터 없음</li>
              )}
              {stats.topNicks.map(([nick, count]) => (
                <li key={nick} className="flex items-center justify-between text-[13px]">
                  <span className="truncate pr-2">{nick}</span>
                  <span className="text-[#2a2723]/60 tabular-nums">{count}</span>
                </li>
              ))}
            </ul>
          </section>
        </aside>

        <section>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="text-[15px] font-bold">수다방 글 목록 ({filtered.length})</h2>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="닉네임/본문/ID 검색"
                className="bg-black/5 rounded-md px-3 py-1.5 text-[13px] outline-none w-64 focus:bg-black/10"
              />
            </div>

            {err && (
              <div className="mt-3 bg-red-50 border border-red-200 text-red-700 rounded-md px-3 py-2 text-[12px]">
                불러오기 실패: {err}
              </div>
            )}

            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="text-left text-[12px] text-[#2a2723]/55 border-b border-black/10">
                    <th className="py-2 pr-3">작성일</th>
                    <th className="py-2 pr-3">방</th>
                    <th className="py-2 pr-3">닉네임</th>
                    <th className="py-2 pr-3">본문</th>
                    <th className="py-2 pr-3 w-[80px]">작업</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr><td colSpan={5} className="py-6 text-center text-[#2a2723]/50">불러오는 중…</td></tr>
                  )}
                  {!loading && filtered.length === 0 && (
                    <tr><td colSpan={5} className="py-6 text-center text-[#2a2723]/50">표시할 글이 없습니다.</td></tr>
                  )}
                  {!loading && filtered.map((p) => {
                    const room = TALK_ROOMS.find((r) => r.id === p.room_id);
                    return (
                      <tr key={p.id} className="border-b border-black/5 align-top">
                        <td className="py-2 pr-3 text-[12px] text-[#2a2723]/65 whitespace-nowrap">
                          {p.created_at
                            ? new Date(p.created_at).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' })
                            : '—'}
                        </td>
                        <td className="py-2 pr-3 whitespace-nowrap">
                          <span
                            className="inline-block px-2 py-0.5 rounded text-[11px] font-bold"
                            style={{ background: room?.bg ?? '#eee' }}
                          >
                            # {room?.title ?? p.room_id}
                          </span>
                        </td>
                        <td className="py-2 pr-3 font-bold whitespace-nowrap">{p.nick}</td>
                        <td className="py-2 pr-3 whitespace-pre-wrap break-words max-w-[520px]">{p.body}</td>
                        <td className="py-2 pr-3">
                          <button
                            onClick={() => deletePost(p.id)}
                            disabled={busyId === p.id}
                            className="text-[12px] font-bold text-red-600 hover:bg-red-50 px-2 py-1 rounded disabled:opacity-40"
                          >
                            {busyId === p.id ? '삭제 중…' : '삭제'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
