// 관리자 페이지 — 대시보드 / 가입자 / 수다방 글 관리.
//
// 인증 흐름:
//  1) 비로그인 → 이메일 입력 → Supabase 매직 링크 발송
//  2) 메일 링크 클릭 → /admin 복귀, 자동 세션 설정
//  3) admins 테이블에 등록된 user_id 인지 확인
//
// 보안: 진짜 권한 검사는 Supabase RLS + security definer RPC 가 수행.
// 클라이언트의 admin 체크는 UI 가드.

import { useEffect, useMemo, useState } from 'react';
import { getSupabase, isSupabaseEnabled } from '../lib/supabase';
import { talkPostsRepo } from '../lib/talkPostsRepo';
import { TalkRoom, talkRoomsRepo } from '../lib/talkRoomsRepo';
import { useTalkRooms } from '../lib/useTalkRooms';
import { signInWithEmail, signOut, useSession } from '../lib/auth';
import { useIsAdmin } from '../lib/admins';

type Tab = 'dashboard' | 'users' | 'posts' | 'rooms';

interface RawPost {
  id: string;
  room_id: string;
  nick: string;
  body: string;
  user_id?: string | null;
  created_at?: string;
}

interface DashboardStats {
  total_auth_users: number;
  total_profiles: number;
  total_posts: number;
  active_posters: number;
  posts_24h: number;
  posts_7d: number;
}

interface UserRow {
  user_id: string;
  email: string | null;
  nickname: string | null;
  cycle: number | null;
  total_saved: number | null;
  post_count: number;
  signed_up_at: string;
  last_post_at: string | null;
}

export default function Admin() {
  if (!isSupabaseEnabled()) {
    return (
      <main className="min-h-dvh w-full bg-[#1f1d1a] text-white grid place-items-center p-6">
        <div className="max-w-md text-center">
          <h1 className="text-[20px] font-bold tracking-[2px]">자린고비 ADMIN</h1>
          <p className="mt-3 text-[13px] text-white/70">
            Supabase 환경변수(<code>VITE_SUPABASE_URL</code>, <code>VITE_SUPABASE_ANON_KEY</code>)가
            설정돼 있어야 관리자 페이지를 사용할 수 있습니다.
          </p>
        </div>
      </main>
    );
  }
  return <AdminInner />;
}

function AdminInner() {
  const session = useSession();
  const userId = session?.user?.id ?? null;
  const adminCheck = useIsAdmin(userId);

  if (session === undefined) return <FullScreenMessage>세션 확인 중…</FullScreenMessage>;
  if (session === null) return <LoginGate />;
  if (adminCheck === 'loading') return <FullScreenMessage>권한 확인 중…</FullScreenMessage>;
  if (adminCheck === 'error') {
    return (
      <FullScreenMessage>
        <p>권한을 확인할 수 없습니다.</p>
        <p className="mt-2 text-[12px] text-white/60">
          admins 테이블/정책이 올바르게 설정되었는지 확인해 주세요.
        </p>
        <LogoutButton className="mt-6" />
      </FullScreenMessage>
    );
  }
  if (adminCheck === 'not-admin') {
    return (
      <FullScreenMessage>
        <p className="text-[18px] font-bold">접근 권한이 없습니다</p>
        <p className="mt-2 text-[13px] text-white/70">
          {session.user.email} 계정은 관리자가 아닙니다.
        </p>
        <LogoutButton className="mt-6" />
      </FullScreenMessage>
    );
  }
  return <AdminPanel email={session.user.email ?? ''} />;
}

function FullScreenMessage({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-dvh w-full bg-[#1f1d1a] text-white grid place-items-center p-6">
      <div className="text-center max-w-md">{children}</div>
    </main>
  );
}

function LogoutButton({ className = '' }: { className?: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      onClick={async () => { setBusy(true); await signOut(); setBusy(false); }}
      disabled={busy}
      className={`text-[12px] font-bold bg-white/10 hover:bg-white/20 px-4 py-2 rounded-md ${className}`}
    >
      {busy ? '로그아웃 중…' : '로그아웃'}
    </button>
  );
}

function LoginGate() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await signInWithEmail(email);
      setSent(true);
    } catch (e2) {
      setErr((e2 as Error).message ?? String(e2));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-dvh w-full bg-[#1f1d1a] text-white grid place-items-center p-6">
      <form onSubmit={submit} className="w-full max-w-sm bg-[#2a2723] rounded-2xl p-8 shadow-2xl">
        <h1 className="text-[20px] font-bold tracking-[2px] text-center">자린고비 ADMIN</h1>
        <p className="mt-2 text-[12px] text-white/60 text-center">
          관리자 이메일로 로그인 링크를 받아 진행해주세요.
        </p>
        {sent ? (
          <div className="mt-6 bg-emerald-500/10 ring-1 ring-emerald-400/30 rounded-lg p-4 text-[13px] text-emerald-200">
            <p className="font-bold">메일을 발송했습니다.</p>
            <p className="mt-1 text-emerald-300/80">
              {email} 의 받은편지함에서 로그인 링크를 클릭해 주세요.
              스팸함도 확인해 보세요.
            </p>
          </div>
        ) : (
          <>
            <input
              type="email"
              autoFocus
              value={email}
              onChange={(e) => { setEmail(e.target.value); setErr(null); }}
              placeholder="admin@example.com"
              required
              className="mt-6 w-full bg-black/30 rounded-lg px-4 py-3 outline-none text-[15px] text-white placeholder:text-white/30 ring-1 ring-white/10 focus:ring-white/30"
            />
            {err && <p className="mt-2 text-[12px] text-red-400" role="alert">{err}</p>}
            <button
              type="submit"
              disabled={busy || !email.trim()}
              className="mt-5 w-full bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-[#1f1d1a] rounded-lg py-3 text-[14px] font-bold transition"
            >
              {busy ? '메일 발송 중…' : '매직 링크 받기'}
            </button>
            <p className="mt-4 text-[11px] text-white/40 leading-relaxed">
              ※ admins 테이블에 등록되지 않은 이메일은 로그인 후에도 접근이 거부됩니다.
            </p>
          </>
        )}
      </form>
    </main>
  );
}

/* ============================================================
 * Admin Panel — 탭 네비게이션
 * ============================================================ */

function AdminPanel({ email }: { email: string }) {
  const [tab, setTab] = useState<Tab>('dashboard');

  return (
    <main className="min-h-dvh w-full bg-[#f7f3ec] text-[#2a2723]">
      <header className="sticky top-0 z-10 bg-[#1f1d1a] text-white shadow">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="font-black tracking-[3px] text-[16px]">자린고비 ADMIN</span>
            <span className="text-[11px] text-white/55 truncate">{email}</span>
          </div>
          <LogoutButton />
        </div>
        <nav className="max-w-6xl mx-auto px-6 flex gap-1 text-[13px] flex-wrap">
          <TabButton active={tab === 'dashboard'} onClick={() => setTab('dashboard')}>대시보드</TabButton>
          <TabButton active={tab === 'users'} onClick={() => setTab('users')}>가입자</TabButton>
          <TabButton active={tab === 'rooms'} onClick={() => setTab('rooms')}>수다방 관리</TabButton>
          <TabButton active={tab === 'posts'} onClick={() => setTab('posts')}>수다방 글</TabButton>
        </nav>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-6">
        {tab === 'dashboard' && <DashboardSection />}
        {tab === 'users' && <UsersSection />}
        {tab === 'rooms' && <RoomsSection />}
        {tab === 'posts' && <PostsSection />}
      </div>
    </main>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-t-md font-bold transition ${
        active
          ? 'bg-[#f7f3ec] text-[#1f1d1a]'
          : 'text-white/60 hover:text-white hover:bg-white/5'
      }`}
    >
      {children}
    </button>
  );
}

/* ============================================================
 * 대시보드 — 통계 카드
 * ============================================================ */

function DashboardSection() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const sb = getSupabase();
      if (!sb) throw new Error('Supabase 클라이언트 없음');
      const { data, error } = await sb.rpc('admin_dashboard_stats');
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) throw new Error('빈 응답');
      setStats(row as DashboardStats);
    } catch (e) {
      console.error('[DashboardSection.load] 실패', e);
      setErr((e as Error).message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  if (loading) return <p className="text-[#2a2723]/55">불러오는 중…</p>;
  if (err) return (
    <div className="bg-red-50 border border-red-200 text-red-700 rounded-md px-4 py-3 text-[13px]">
      <p className="font-bold">통계 조회 실패</p>
      <p className="mt-1">{err}</p>
      <p className="mt-2 text-[11px] text-red-700/80">
        admin_dashboard_stats RPC 함수가 Supabase 에 생성돼 있는지 확인하세요. (docs/SUPABASE.md 참고)
      </p>
    </div>
  );
  if (!stats) return null;

  const cards: { label: string; value: number; sub?: string }[] = [
    { label: '전체 가입자', value: stats.total_auth_users, sub: '인증된 user' },
    { label: '닉네임 설정 사용자', value: stats.total_profiles, sub: '실제 활동 시작' },
    { label: '활동 작성자', value: stats.active_posters, sub: '글 1건 이상' },
    { label: '전체 글 수', value: stats.total_posts },
    { label: '24시간 글 수', value: stats.posts_24h, sub: '실시간 활동' },
    { label: '7일 글 수', value: stats.posts_7d, sub: '주간 활동' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[18px] font-bold">대시보드</h2>
        <button
          onClick={load}
          className="text-[12px] font-bold bg-black/5 hover:bg-black/10 px-3 py-1.5 rounded-md"
        >새로고침</button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-[12px] text-[#2a2723]/60">{c.label}</p>
            <p className="mt-1 text-[28px] font-black">{c.value.toLocaleString()}</p>
            {c.sub && <p className="text-[11px] text-[#2a2723]/45 mt-0.5">{c.sub}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
 * 가입자 — 사용자 목록
 * ============================================================ */

function UsersSection() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const sb = getSupabase();
      if (!sb) throw new Error('Supabase 클라이언트 없음');
      const { data, error } = await sb.rpc('admin_list_users');
      if (error) throw error;
      setUsers((data ?? []) as UserRow[]);
    } catch (e) {
      console.error('[UsersSection.load] 실패', e);
      setErr((e as Error).message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      (u.email ?? '').toLowerCase().includes(q) ||
      (u.nickname ?? '').toLowerCase().includes(q) ||
      u.user_id.toLowerCase().includes(q),
    );
  }, [users, search]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h2 className="text-[18px] font-bold">가입자 ({filtered.length})</h2>
        <div className="flex items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="이메일/닉네임/UUID 검색"
            className="bg-black/5 rounded-md px-3 py-1.5 text-[13px] outline-none w-64 focus:bg-black/10"
          />
          <button
            onClick={load}
            className="text-[12px] font-bold bg-black/5 hover:bg-black/10 px-3 py-1.5 rounded-md"
          >새로고침</button>
        </div>
      </div>

      {err && (
        <div className="mb-3 bg-red-50 border border-red-200 text-red-700 rounded-md px-3 py-2 text-[12px]">
          <p className="font-bold">가입자 목록 조회 실패</p>
          <p>{err}</p>
          <p className="mt-1 text-[11px] text-red-700/80">
            admin_list_users RPC 함수가 Supabase 에 생성돼 있는지 확인하세요.
          </p>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-left text-[12px] text-[#2a2723]/55 border-b border-black/10">
              <th className="px-4 py-2">가입일</th>
              <th className="px-4 py-2">이메일</th>
              <th className="px-4 py-2">닉네임</th>
              <th className="px-4 py-2 text-right">회차</th>
              <th className="px-4 py-2 text-right">누적 절약</th>
              <th className="px-4 py-2 text-right">글 수</th>
              <th className="px-4 py-2">마지막 활동</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-[#2a2723]/50">불러오는 중…</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-[#2a2723]/50">표시할 가입자가 없습니다.</td></tr>
            )}
            {!loading && filtered.map((u) => (
              <tr key={u.user_id} className="border-b border-black/5">
                <td className="px-4 py-2 text-[12px] text-[#2a2723]/65 whitespace-nowrap">
                  {new Date(u.signed_up_at).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' })}
                </td>
                <td className="px-4 py-2 whitespace-nowrap">
                  {u.email ? (
                    <span className="font-mono text-[12px]">{u.email}</span>
                  ) : (
                    <span className="text-[11px] text-[#2a2723]/45 italic">익명</span>
                  )}
                </td>
                <td className="px-4 py-2 font-bold whitespace-nowrap">
                  {u.nickname ?? <span className="text-[11px] text-[#2a2723]/45 font-normal italic">미설정</span>}
                </td>
                <td className="px-4 py-2 text-right tabular-nums">{u.cycle ?? '—'}</td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {u.total_saved != null ? `${u.total_saved.toLocaleString()}원` : '—'}
                </td>
                <td className="px-4 py-2 text-right tabular-nums">{u.post_count}</td>
                <td className="px-4 py-2 text-[12px] text-[#2a2723]/65 whitespace-nowrap">
                  {u.last_post_at
                    ? new Date(u.last_post_at).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' })
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ============================================================
 * 수다방 글 — 기존 기능
 * ============================================================ */

function PostsSection() {
  const [posts, setPosts] = useState<RawPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [filterRoom, setFilterRoom] = useState<string>('');
  const [search, setSearch] = useState('');
  const { rooms: roomsList } = useTalkRooms();
  const adminRooms = roomsList ?? [];
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const sb = getSupabase();
      if (!sb) throw new Error('Supabase 클라이언트 없음');
      const { data, error } = await sb
        .from('talk_posts')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setPosts((data ?? []) as RawPost[]);
    } catch (e) {
      console.error('[PostsSection.load] 실패', e);
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
      console.error('[PostsSection.deletePost] 실패', e);
      alert(`삭제 실패: ${(e as Error).message ?? String(e)}\n\nRLS 정책(talk_posts delete)이 설정돼 있는지 확인하세요.`);
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
    for (const p of posts) byRoom.set(p.room_id, (byRoom.get(p.room_id) ?? 0) + 1);
    return { byRoom };
  }, [posts]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
      <aside>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h3 className="text-[13px] font-bold text-[#2a2723]/80">방별 필터</h3>
          <ul className="mt-2 space-y-1">
            {adminRooms.map((r) => (
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
            >필터 해제</button>
          )}
        </div>
      </aside>

      <section>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-[15px] font-bold">수다방 글 ({filtered.length})</h2>
            <div className="flex items-center gap-2">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="닉/본문/ID 검색"
                className="bg-black/5 rounded-md px-3 py-1.5 text-[13px] outline-none w-64 focus:bg-black/10"
              />
              <button
                onClick={load}
                className="text-[12px] font-bold bg-black/5 hover:bg-black/10 px-3 py-1.5 rounded-md"
              >새로고침</button>
            </div>
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
                  const room = adminRooms.find((r) => r.id === p.room_id);
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
  );
}

/* ============================================================
 * 수다방 관리 — talk_rooms CRUD
 * ============================================================ */

const EMPTY_ROOM: TalkRoom = { id: '', title: '', icon: '', bg: '#FCE0BF', sortOrder: 99 };

function RoomsSection() {
  const { rooms, refresh } = useTalkRooms();
  const [editing, setEditing] = useState<TalkRoom | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const list = rooms ?? [];
  const isEdit = editing && list.find((r) => r.id === editing.id);

  function startNew() {
    setErr(null);
    const nextOrder = list.length > 0 ? Math.max(...list.map((r) => r.sortOrder)) + 1 : 1;
    setEditing({ ...EMPTY_ROOM, sortOrder: nextOrder });
  }
  function startEdit(r: TalkRoom) {
    setErr(null);
    setEditing({ ...r });
  }
  function cancel() {
    setEditing(null);
    setErr(null);
  }

  async function save() {
    if (!editing) return;
    const id = editing.id.trim();
    const title = editing.title.trim();
    if (!id) { setErr('ID 를 입력하세요. (예: t5, snack 등 영숫자)'); return; }
    if (!/^[a-zA-Z0-9_-]{1,32}$/.test(id)) { setErr('ID 는 영숫자, _, - 만 허용 (32자 이하).'); return; }
    if (!title) { setErr('방 이름을 입력하세요.'); return; }
    if (!/^#[0-9a-fA-F]{6}$/.test(editing.bg)) { setErr('배경색은 #FCE0BF 형식의 hex 6자리.'); return; }
    setBusy(true);
    setErr(null);
    try {
      await talkRoomsRepo.upsert({ ...editing, id, title });
      setEditing(null);
      refresh();
    } catch (e) {
      console.error('[RoomsSection.save] 실패', e);
      setErr((e as Error).message ?? '저장 실패');
    } finally {
      setBusy(false);
    }
  }

  async function remove(r: TalkRoom) {
    if (!confirm(`"${r.title}" 방을 정말 삭제하시겠습니까?\n\n주의: 이 방의 글들은 데이터에 남지만 화면에서 안 보이게 됩니다.`)) return;
    setBusy(true);
    setErr(null);
    try {
      await talkRoomsRepo.remove(r.id);
      refresh();
    } catch (e) {
      console.error('[RoomsSection.remove] 실패', e);
      setErr((e as Error).message ?? '삭제 실패');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h2 className="text-[18px] font-bold">수다방 관리 ({list.length})</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            className="text-[12px] font-bold bg-black/5 hover:bg-black/10 px-3 py-1.5 rounded-md"
          >새로고침</button>
          <button
            onClick={startNew}
            className="text-[12px] font-bold bg-amber-400 hover:bg-amber-300 text-[#1f1d1a] px-3 py-1.5 rounded-md"
          >+ 새 방</button>
        </div>
      </div>

      {err && (
        <div className="mb-3 bg-red-50 border border-red-200 text-red-700 rounded-md px-3 py-2 text-[12px]">
          {err}
        </div>
      )}

      {editing && (
        <div className="mb-4 bg-white rounded-xl shadow-sm p-4">
          <h3 className="text-[14px] font-bold mb-3">{isEdit ? '방 수정' : '새 방 만들기'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="ID (영숫자, 한 번 정하면 변경 권장 X)">
              <input
                value={editing.id}
                onChange={(e) => setEditing({ ...editing, id: e.target.value })}
                placeholder="t5, snack 등"
                disabled={!!isEdit}
                className="w-full bg-black/5 rounded px-3 py-2 outline-none text-[13px] disabled:opacity-50"
              />
            </Field>
            <Field label="방 이름">
              <input
                value={editing.title}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                placeholder="식비 절약, 도시락 등"
                className="w-full bg-black/5 rounded px-3 py-2 outline-none text-[13px]"
              />
            </Field>
            <Field label="아이콘 경로 (선택)">
              <input
                value={editing.icon}
                onChange={(e) => setEditing({ ...editing, icon: e.target.value })}
                placeholder="/jarin/talk_list_food.png"
                className="w-full bg-black/5 rounded px-3 py-2 outline-none text-[13px] font-mono"
              />
            </Field>
            <Field label="배경색 (hex)">
              <div className="flex gap-2 items-center">
                <input
                  value={editing.bg}
                  onChange={(e) => setEditing({ ...editing, bg: e.target.value })}
                  placeholder="#FCE0BF"
                  className="flex-1 bg-black/5 rounded px-3 py-2 outline-none text-[13px] font-mono"
                />
                <span
                  className="w-10 h-10 rounded border border-black/10 shrink-0"
                  style={{ background: /^#[0-9a-fA-F]{6}$/.test(editing.bg) ? editing.bg : 'transparent' }}
                />
              </div>
            </Field>
            <Field label="정렬 순서 (작을수록 위)">
              <input
                type="number"
                value={editing.sortOrder}
                onChange={(e) => setEditing({ ...editing, sortOrder: Number(e.target.value) })}
                className="w-full bg-black/5 rounded px-3 py-2 outline-none text-[13px]"
              />
            </Field>
          </div>

          {/* 미리보기 */}
          <div className="mt-4">
            <p className="text-[11px] text-[#2a2723]/55 mb-1">미리보기</p>
            <div
              className="rounded-[16px] px-4 py-3 inline-flex items-center gap-3 max-w-md"
              style={{ background: /^#[0-9a-fA-F]{6}$/.test(editing.bg) ? editing.bg : '#eee' }}
            >
              {editing.icon && (
                <img src={editing.icon} alt="" className="w-12 h-12 object-contain" />
              )}
              <span className="font-bold text-[16px] text-[#2a2723]">{editing.title || '방 이름'}</span>
            </div>
          </div>

          <div className="mt-4 flex gap-2 justify-end">
            <button
              onClick={cancel}
              disabled={busy}
              className="text-[12px] font-bold bg-black/5 hover:bg-black/10 px-4 py-2 rounded-md"
            >취소</button>
            <button
              onClick={save}
              disabled={busy}
              className="text-[12px] font-bold bg-amber-400 hover:bg-amber-300 text-[#1f1d1a] px-4 py-2 rounded-md disabled:opacity-40"
            >{busy ? '저장 중…' : '저장'}</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-left text-[12px] text-[#2a2723]/55 border-b border-black/10">
              <th className="px-4 py-2 w-[80px]">순서</th>
              <th className="px-4 py-2">ID</th>
              <th className="px-4 py-2">방 이름</th>
              <th className="px-4 py-2">미리보기</th>
              <th className="px-4 py-2 w-[160px]">작업</th>
            </tr>
          </thead>
          <tbody>
            {rooms === null && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-[#2a2723]/50">불러오는 중…</td></tr>
            )}
            {rooms !== null && list.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-[#2a2723]/50">방이 없습니다. "+ 새 방" 으로 추가하세요.</td></tr>
            )}
            {list.map((r) => (
              <tr key={r.id} className="border-b border-black/5">
                <td className="px-4 py-2 tabular-nums">{r.sortOrder}</td>
                <td className="px-4 py-2 font-mono text-[12px]">{r.id}</td>
                <td className="px-4 py-2 font-bold">{r.title}</td>
                <td className="px-4 py-2">
                  <span
                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-bold"
                    style={{ background: r.bg }}
                  >
                    {r.icon && <img src={r.icon} alt="" className="w-4 h-4 object-contain" />}
                    # {r.title}
                  </span>
                </td>
                <td className="px-4 py-2">
                  <button
                    onClick={() => startEdit(r)}
                    className="text-[12px] font-bold bg-black/5 hover:bg-black/10 px-2 py-1 rounded mr-1"
                  >수정</button>
                  <button
                    onClick={() => remove(r)}
                    disabled={busy}
                    className="text-[12px] font-bold text-red-600 hover:bg-red-50 px-2 py-1 rounded disabled:opacity-40"
                  >삭제</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] text-[#2a2723]/55 mb-1">{label}</span>
      {children}
    </label>
  );
}
