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
import { Announcement, announcementsRepo } from '../lib/announcementsRepo';
import { ShopItem, shopItemsRepo, ShopCategory as ShopCat, AccSubCat, RemodelSubCat } from '../lib/shopItemsRepo';
import { missionsRepo, MissionWithMeta } from '../lib/missionsRepo';
import { titlesRepo, TitleWithMeta } from '../lib/titlesRepo';
import { TITLES, MISSIONS, MissionCategory, Difficulty, TitleReq, TitleDifficulty } from '../lib/data';
import { signInWithEmail, signOut, useSession } from '../lib/auth';
import { useIsAdmin } from '../lib/admins';

type Tab = 'dashboard' | 'users' | 'posts' | 'rooms' | 'announcements' | 'shop' | 'missions' | 'titles';

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
      <main className="font-pretendard min-h-dvh w-full bg-[#1f1d1a] text-white grid place-items-center p-6">
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
  return (
    <div className="font-pretendard">
      <AdminInner />
    </div>
  );
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
          <TabButton active={tab === 'announcements'} onClick={() => setTab('announcements')}>공지/이벤트</TabButton>
          <TabButton active={tab === 'shop'} onClick={() => setTab('shop')}>상점 관리</TabButton>
          <TabButton active={tab === 'missions'} onClick={() => setTab('missions')}>챌린지/미션</TabButton>
          <TabButton active={tab === 'titles'} onClick={() => setTab('titles')}>칭호</TabButton>
          <TabButton active={tab === 'rooms'} onClick={() => setTab('rooms')}>수다방 관리</TabButton>
          <TabButton active={tab === 'posts'} onClick={() => setTab('posts')}>수다방 글</TabButton>
        </nav>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-6">
        {tab === 'dashboard' && <DashboardSection />}
        {tab === 'users' && <UsersSection />}
        {tab === 'announcements' && <AnnouncementsSection />}
        {tab === 'shop' && <ShopItemsSection />}
        {tab === 'missions' && <MissionsSection />}
        {tab === 'titles' && <TitlesSection />}
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

/* ============================================================
 * 공지/이벤트 관리 — announcements CRUD
 * ============================================================ */

const EMPTY_ANNOUNCEMENT: Announcement = {
  id: '',
  title: '',
  body: '',
  linkUrl: '',
  linkLabel: '',
  bgColor: '#FCE0BF',
  active: true,
  startsAt: null,
  endsAt: null,
  sortOrder: 1,
};

// HTML datetime-local input (YYYY-MM-DDTHH:MM) ↔ ISO 변환 헬퍼.
function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fromLocalInput(s: string): string | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function statusOf(a: Announcement): { label: string; tone: string } {
  if (!a.active) return { label: '비활성', tone: 'bg-black/10 text-black/55' };
  const now = Date.now();
  if (a.startsAt && new Date(a.startsAt).getTime() > now)
    return { label: '예약', tone: 'bg-blue-100 text-blue-700' };
  if (a.endsAt && new Date(a.endsAt).getTime() <= now)
    return { label: '종료', tone: 'bg-black/10 text-black/55' };
  return { label: '게시 중', tone: 'bg-emerald-100 text-emerald-700' };
}

function AnnouncementsSection() {
  const [items, setItems] = useState<Announcement[] | null>(null);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setErr(null);
    try {
      const data = await announcementsRepo.listAll();
      setItems(data);
    } catch (e) {
      console.error('[AnnouncementsSection.load] 실패', e);
      setErr((e as Error).message ?? '불러오기 실패');
    }
  }

  useEffect(() => { load(); }, []);

  function startNew() {
    setErr(null);
    const list = items ?? [];
    const nextOrder = list.length > 0 ? Math.max(...list.map((a) => a.sortOrder)) + 1 : 1;
    setEditing({ ...EMPTY_ANNOUNCEMENT, sortOrder: nextOrder });
  }
  function startEdit(a: Announcement) {
    setErr(null);
    setEditing({ ...a });
  }
  function cancel() {
    setEditing(null);
    setErr(null);
  }

  async function save() {
    if (!editing) return;
    const title = editing.title.trim();
    if (!title) { setErr('제목을 입력하세요.'); return; }
    if (!/^#[0-9a-fA-F]{6}$/.test(editing.bgColor)) { setErr('배경색은 #FCE0BF 형식.'); return; }
    setBusy(true);
    setErr(null);
    try {
      const saved = await announcementsRepo.upsert({ ...editing, title });
      setEditing(null);
      // 새로 만든 거면 list 에 push, 수정이면 replace
      setItems((prev) => {
        const list = prev ?? [];
        const idx = list.findIndex((a) => a.id === saved.id);
        if (idx >= 0) {
          const next = [...list];
          next[idx] = saved;
          return next.sort((a, b) => a.sortOrder - b.sortOrder);
        }
        return [...list, saved].sort((a, b) => a.sortOrder - b.sortOrder);
      });
    } catch (e) {
      console.error('[AnnouncementsSection.save] 실패', e);
      setErr((e as Error).message ?? '저장 실패');
    } finally {
      setBusy(false);
    }
  }

  async function remove(a: Announcement) {
    if (!confirm(`"${a.title}" 공지를 삭제하시겠습니까?`)) return;
    setBusy(true);
    try {
      await announcementsRepo.remove(a.id);
      setItems((prev) => (prev ?? []).filter((x) => x.id !== a.id));
    } catch (e) {
      console.error('[AnnouncementsSection.remove] 실패', e);
      setErr((e as Error).message ?? '삭제 실패');
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(a: Announcement) {
    setBusy(true);
    try {
      const saved = await announcementsRepo.upsert({ ...a, active: !a.active });
      setItems((prev) => (prev ?? []).map((x) => (x.id === saved.id ? saved : x)));
    } catch (e) {
      console.error('[AnnouncementsSection.toggleActive] 실패', e);
      setErr((e as Error).message ?? '변경 실패');
    } finally {
      setBusy(false);
    }
  }

  const list = items ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h2 className="text-[18px] font-bold">공지/이벤트 ({list.length})</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="text-[12px] font-bold bg-black/5 hover:bg-black/10 px-3 py-1.5 rounded-md"
          >새로고침</button>
          <button
            onClick={startNew}
            className="text-[12px] font-bold bg-amber-400 hover:bg-amber-300 text-[#1f1d1a] px-3 py-1.5 rounded-md"
          >+ 새 공지</button>
        </div>
      </div>

      {err && (
        <div className="mb-3 bg-red-50 border border-red-200 text-red-700 rounded-md px-3 py-2 text-[12px]">
          {err}
        </div>
      )}

      {editing && (
        <div className="mb-4 bg-white rounded-xl shadow-sm p-4">
          <h3 className="text-[14px] font-bold mb-3">{editing.id ? '공지 수정' : '새 공지 만들기'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="제목 (필수)">
              <input
                value={editing.title}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                placeholder="이번 주 절약 이벤트"
                className="w-full bg-black/5 rounded px-3 py-2 outline-none text-[13px]"
              />
            </Field>
            <Field label="정렬 순서 (작을수록 위)">
              <input
                type="number"
                value={editing.sortOrder}
                onChange={(e) => setEditing({ ...editing, sortOrder: Number(e.target.value) })}
                className="w-full bg-black/5 rounded px-3 py-2 outline-none text-[13px]"
              />
            </Field>
            <Field label="본문 (선택)">
              <textarea
                value={editing.body}
                onChange={(e) => setEditing({ ...editing, body: e.target.value })}
                rows={3}
                placeholder="자세한 안내를 적어주세요"
                className="w-full bg-black/5 rounded px-3 py-2 outline-none text-[13px] resize-y"
              />
            </Field>
            <Field label="배경색 (hex)">
              <div className="flex gap-2 items-center">
                <input
                  value={editing.bgColor}
                  onChange={(e) => setEditing({ ...editing, bgColor: e.target.value })}
                  placeholder="#FCE0BF"
                  className="flex-1 bg-black/5 rounded px-3 py-2 outline-none text-[13px] font-mono"
                />
                <span
                  className="w-10 h-10 rounded border border-black/10 shrink-0"
                  style={{ background: /^#[0-9a-fA-F]{6}$/.test(editing.bgColor) ? editing.bgColor : 'transparent' }}
                />
              </div>
            </Field>
            <Field label="링크 URL (선택, https:// 또는 /talk 같은 내부 경로)">
              <input
                value={editing.linkUrl}
                onChange={(e) => setEditing({ ...editing, linkUrl: e.target.value })}
                placeholder="https://example.com 또는 /talk/t1"
                className="w-full bg-black/5 rounded px-3 py-2 outline-none text-[13px] font-mono"
              />
            </Field>
            <Field label="링크 텍스트 (선택)">
              <input
                value={editing.linkLabel}
                onChange={(e) => setEditing({ ...editing, linkLabel: e.target.value })}
                placeholder="자세히 보기"
                className="w-full bg-black/5 rounded px-3 py-2 outline-none text-[13px]"
              />
            </Field>
            <Field label="시작 시각 (선택)">
              <input
                type="datetime-local"
                value={toLocalInput(editing.startsAt)}
                onChange={(e) => setEditing({ ...editing, startsAt: fromLocalInput(e.target.value) })}
                className="w-full bg-black/5 rounded px-3 py-2 outline-none text-[13px]"
              />
            </Field>
            <Field label="종료 시각 (선택)">
              <input
                type="datetime-local"
                value={toLocalInput(editing.endsAt)}
                onChange={(e) => setEditing({ ...editing, endsAt: fromLocalInput(e.target.value) })}
                className="w-full bg-black/5 rounded px-3 py-2 outline-none text-[13px]"
              />
            </Field>
            <Field label="활성 여부">
              <label className="flex items-center gap-2 text-[13px]">
                <input
                  type="checkbox"
                  checked={editing.active}
                  onChange={(e) => setEditing({ ...editing, active: e.target.checked })}
                />
                활성 (체크 해제 시 사용자에게 안 보임)
              </label>
            </Field>
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
              <th className="px-4 py-2 w-[100px]">상태</th>
              <th className="px-4 py-2">제목</th>
              <th className="px-4 py-2">기간</th>
              <th className="px-4 py-2 w-[200px]">작업</th>
            </tr>
          </thead>
          <tbody>
            {items === null && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-[#2a2723]/50">불러오는 중…</td></tr>
            )}
            {items !== null && list.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-[#2a2723]/50">공지가 없습니다. "+ 새 공지" 로 만들어 보세요.</td></tr>
            )}
            {list.map((a) => {
              const st = statusOf(a);
              const start = a.startsAt ? new Date(a.startsAt).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' }) : '—';
              const end = a.endsAt ? new Date(a.endsAt).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' }) : '—';
              return (
                <tr key={a.id} className="border-b border-black/5">
                  <td className="px-4 py-2 tabular-nums">{a.sortOrder}</td>
                  <td className="px-4 py-2">
                    <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${st.tone}`}>
                      {st.label}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <p className="font-bold">{a.title}</p>
                    {a.body && <p className="mt-0.5 text-[11px] text-[#2a2723]/55 line-clamp-2 max-w-md">{a.body}</p>}
                  </td>
                  <td className="px-4 py-2 text-[11px] text-[#2a2723]/65 whitespace-nowrap">
                    {start} ~ {end}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <button
                      onClick={() => toggleActive(a)}
                      disabled={busy}
                      className="text-[12px] font-bold bg-black/5 hover:bg-black/10 px-2 py-1 rounded mr-1 disabled:opacity-40"
                    >{a.active ? '비활성화' : '활성화'}</button>
                    <button
                      onClick={() => startEdit(a)}
                      className="text-[12px] font-bold bg-black/5 hover:bg-black/10 px-2 py-1 rounded mr-1"
                    >수정</button>
                    <button
                      onClick={() => remove(a)}
                      disabled={busy}
                      className="text-[12px] font-bold text-red-600 hover:bg-red-50 px-2 py-1 rounded disabled:opacity-40"
                    >삭제</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}


/* ============================================================
 * 상점 관리 — shop_items CRUD + Storage 이미지 업로드
 * ============================================================ */

const ACC_SUBS_LIST: AccSubCat[] = ['모자', '안경', '소지품'];
const REMODEL_SUBS_LIST: RemodelSubCat[] = ['조명', '소품', '가구1', '가구2', '벽지'];

const EMPTY_SHOP_ITEM: ShopItem = {
  id: '',
  category: '티셔츠',
  subCategory: null,
  shopImageUrl: '',
  fitImageUrl: '',
  price: 100,
  sortOrder: 1,
  active: true,
  label: '',
};

function ShopItemsSection() {
  const [items, setItems] = useState<ShopItem[] | null>(null);
  const [editing, setEditing] = useState<ShopItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [uploadingShop, setUploadingShop] = useState(false);
  const [uploadingFit, setUploadingFit] = useState(false);

  async function load() {
    setErr(null);
    try {
      const data = await shopItemsRepo.listAll();
      setItems(data);
    } catch (e) {
      console.error('[ShopItemsSection.load] 실패', e);
      setErr((e as Error).message ?? '불러오기 실패');
    }
  }

  useEffect(() => { load(); }, []);

  function startNew() {
    setErr(null);
    const list = items ?? [];
    const nextOrder = list.length > 0 ? Math.max(...list.map((i) => i.sortOrder)) + 1 : 1;
    setEditing({ ...EMPTY_SHOP_ITEM, sortOrder: nextOrder });
  }
  function startEdit(i: ShopItem) {
    setErr(null);
    setEditing({ ...i });
  }
  function cancel() {
    setEditing(null);
    setErr(null);
  }

  async function handleUpload(file: File, kind: 'shop' | 'fit') {
    if (!editing) return;
    if (kind === 'shop') setUploadingShop(true); else setUploadingFit(true);
    setErr(null);
    try {
      const url = await shopItemsRepo.uploadImage(file, kind);
      setEditing((prev) =>
        prev ? { ...prev, [kind === 'shop' ? 'shopImageUrl' : 'fitImageUrl']: url } : prev,
      );
    } catch (e) {
      console.error('[ShopItemsSection.handleUpload] 실패', e);
      setErr(`이미지 업로드 실패: ${(e as Error).message ?? String(e)}`);
    } finally {
      if (kind === 'shop') setUploadingShop(false); else setUploadingFit(false);
    }
  }

  async function save() {
    if (!editing) return;
    if (!editing.shopImageUrl) { setErr('상점 이미지를 업로드해주세요.'); return; }
    if (!editing.fitImageUrl) { setErr('fit 이미지를 업로드해주세요.'); return; }
    if (editing.price < 0) { setErr('가격은 0 이상.'); return; }
    if (editing.category !== '티셔츠' && !editing.subCategory) {
      setErr('서브 카테고리를 선택해주세요.');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const saved = await shopItemsRepo.upsert(editing);
      setEditing(null);
      setItems((prev) => {
        const list = prev ?? [];
        const idx = list.findIndex((i) => i.id === saved.id);
        if (idx >= 0) {
          const next = [...list];
          next[idx] = saved;
          return next;
        }
        return [...list, saved];
      });
    } catch (e) {
      console.error('[ShopItemsSection.save] 실패', e);
      setErr((e as Error).message ?? '저장 실패');
    } finally {
      setBusy(false);
    }
  }

  async function remove(i: ShopItem) {
    if (!confirm(`"${i.label || i.shopImageUrl}" 아이템을 삭제하시겠습니까?\n(이미 구매한 사용자의 옷장엔 남아있을 수 있습니다)`)) return;
    setBusy(true);
    try {
      await shopItemsRepo.remove(i.id);
      setItems((prev) => (prev ?? []).filter((x) => x.id !== i.id));
    } catch (e) {
      console.error('[ShopItemsSection.remove] 실패', e);
      setErr((e as Error).message ?? '삭제 실패');
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(i: ShopItem) {
    setBusy(true);
    try {
      const saved = await shopItemsRepo.upsert({ ...i, active: !i.active });
      setItems((prev) => (prev ?? []).map((x) => (x.id === saved.id ? saved : x)));
    } catch (e) {
      console.error('[ShopItemsSection.toggleActive] 실패', e);
      setErr((e as Error).message ?? '변경 실패');
    } finally {
      setBusy(false);
    }
  }

  const list = items ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div>
          <h2 className="text-[18px] font-bold">상점 관리 ({list.length})</h2>
          <p className="text-[11px] text-[#2a2723]/55 mt-1">
            기존 하드코딩 아이템 + 여기 추가한 항목이 함께 노출됩니다.
            추가 항목은 사용자 화면 상단에 우선 표시.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="text-[12px] font-bold bg-black/5 hover:bg-black/10 px-3 py-1.5 rounded-md"
          >새로고침</button>
          <button
            onClick={startNew}
            className="text-[12px] font-bold bg-amber-400 hover:bg-amber-300 text-[#1f1d1a] px-3 py-1.5 rounded-md"
          >+ 새 아이템</button>
        </div>
      </div>

      {err && (
        <div className="mb-3 bg-red-50 border border-red-200 text-red-700 rounded-md px-3 py-2 text-[12px]">
          {err}
        </div>
      )}

      {editing && (
        <div className="mb-4 bg-white rounded-xl shadow-sm p-4">
          <h3 className="text-[14px] font-bold mb-3">
            {editing.id ? '아이템 수정' : '새 아이템 추가'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="카테고리">
              <select
                value={editing.category}
                onChange={(e) => {
                  const c = e.target.value as ShopCat;
                  setEditing({ ...editing, category: c, subCategory: c === '티셔츠' ? null : (c === '사치품' ? '모자' : '조명') });
                }}
                className="w-full bg-black/5 rounded px-3 py-2 outline-none text-[13px]"
              >
                <option value="티셔츠">티셔츠</option>
                <option value="사치품">사치품</option>
                <option value="리모델링">리모델링</option>
              </select>
            </Field>
            {editing.category === '사치품' && (
              <Field label="서브 카테고리">
                <select
                  value={editing.subCategory ?? ''}
                  onChange={(e) => setEditing({ ...editing, subCategory: e.target.value })}
                  className="w-full bg-black/5 rounded px-3 py-2 outline-none text-[13px]"
                >
                  {ACC_SUBS_LIST.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
            )}
            {editing.category === '리모델링' && (
              <Field label="서브 카테고리">
                <select
                  value={editing.subCategory ?? ''}
                  onChange={(e) => setEditing({ ...editing, subCategory: e.target.value })}
                  className="w-full bg-black/5 rounded px-3 py-2 outline-none text-[13px]"
                >
                  {REMODEL_SUBS_LIST.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
            )}
            <Field label="표시명 (선택)">
              <input
                value={editing.label ?? ''}
                onChange={(e) => setEditing({ ...editing, label: e.target.value })}
                placeholder="기본 빨강 티셔츠 등"
                className="w-full bg-black/5 rounded px-3 py-2 outline-none text-[13px]"
              />
            </Field>
            <Field label="가격 (코인)">
              <input
                type="number"
                min={0}
                value={editing.price}
                onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })}
                className="w-full bg-black/5 rounded px-3 py-2 outline-none text-[13px]"
              />
            </Field>
            <Field label="정렬 순서 (작을수록 위)">
              <input
                type="number"
                value={editing.sortOrder}
                onChange={(e) => setEditing({ ...editing, sortOrder: Number(e.target.value) })}
                className="w-full bg-black/5 rounded px-3 py-2 outline-none text-[13px]"
              />
            </Field>
            <Field label="활성 여부">
              <label className="flex items-center gap-2 text-[13px] py-2">
                <input
                  type="checkbox"
                  checked={editing.active}
                  onChange={(e) => setEditing({ ...editing, active: e.target.checked })}
                />
                활성 (체크 해제 시 사용자에게 안 보임)
              </label>
            </Field>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <ImageUploadField
              label="상점 이미지 (썸네일)"
              hint="진열용. 약 200x200 px 권장. 투명 배경 PNG."
              url={editing.shopImageUrl}
              uploading={uploadingShop}
              onUpload={(f) => handleUpload(f, 'shop')}
              onClear={() => setEditing({ ...editing, shopImageUrl: '' })}
            />
            <ImageUploadField
              label="Fit 이미지 (캐릭터 위)"
              hint="캐릭터 좌표에 정렬된 이미지. 디자이너가 사전 제작한 PNG 업로드."
              url={editing.fitImageUrl}
              uploading={uploadingFit}
              onUpload={(f) => handleUpload(f, 'fit')}
              onClear={() => setEditing({ ...editing, fitImageUrl: '' })}
            />
          </div>

          <div className="mt-4 flex gap-2 justify-end">
            <button
              onClick={cancel}
              disabled={busy}
              className="text-[12px] font-bold bg-black/5 hover:bg-black/10 px-4 py-2 rounded-md"
            >취소</button>
            <button
              onClick={save}
              disabled={busy || uploadingShop || uploadingFit}
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
              <th className="px-4 py-2">미리보기</th>
              <th className="px-4 py-2">카테고리</th>
              <th className="px-4 py-2">표시명</th>
              <th className="px-4 py-2 text-right">가격</th>
              <th className="px-4 py-2">상태</th>
              <th className="px-4 py-2 w-[200px]">작업</th>
            </tr>
          </thead>
          <tbody>
            {items === null && (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-[#2a2723]/50">불러오는 중…</td></tr>
            )}
            {items !== null && list.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-[#2a2723]/50">추가된 아이템이 없습니다.</td></tr>
            )}
            {list.map((i) => (
              <tr key={i.id} className="border-b border-black/5">
                <td className="px-4 py-2 tabular-nums">{i.sortOrder}</td>
                <td className="px-4 py-2">
                  <img src={i.shopImageUrl} alt="" className="w-12 h-12 object-contain bg-black/5 rounded" />
                </td>
                <td className="px-4 py-2 whitespace-nowrap">
                  {i.category}
                  {i.subCategory && <span className="text-[#2a2723]/55"> / {i.subCategory}</span>}
                </td>
                <td className="px-4 py-2">{i.label || <span className="text-[#2a2723]/45 italic">미지정</span>}</td>
                <td className="px-4 py-2 text-right tabular-nums">{i.price.toLocaleString()}</td>
                <td className="px-4 py-2">
                  <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${i.active ? 'bg-emerald-100 text-emerald-700' : 'bg-black/10 text-black/55'}`}>
                    {i.active ? '활성' : '비활성'}
                  </span>
                </td>
                <td className="px-4 py-2 whitespace-nowrap">
                  <button
                    onClick={() => toggleActive(i)}
                    disabled={busy}
                    className="text-[12px] font-bold bg-black/5 hover:bg-black/10 px-2 py-1 rounded mr-1 disabled:opacity-40"
                  >{i.active ? '비활성화' : '활성화'}</button>
                  <button
                    onClick={() => startEdit(i)}
                    className="text-[12px] font-bold bg-black/5 hover:bg-black/10 px-2 py-1 rounded mr-1"
                  >수정</button>
                  <button
                    onClick={() => remove(i)}
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

function ImageUploadField({
  label, hint, url, uploading, onUpload, onClear,
}: {
  label: string;
  hint: string;
  url: string;
  uploading: boolean;
  onUpload: (file: File) => void;
  onClear: () => void;
}) {
  return (
    <div>
      <p className="text-[11px] text-[#2a2723]/55 mb-1">{label}</p>
      <p className="text-[10px] text-[#2a2723]/45 mb-2">{hint}</p>
      {url ? (
        <div className="relative inline-block">
          <img src={url} alt="" className="w-32 h-32 object-contain bg-black/5 rounded border border-black/10" />
          <button
            type="button"
            onClick={onClear}
            className="absolute -top-2 -right-2 w-6 h-6 grid place-items-center bg-white rounded-full shadow border border-black/10 text-[14px] text-red-600 hover:bg-red-50"
          >✕</button>
        </div>
      ) : (
        <label className={`block w-full border-2 border-dashed border-black/15 rounded-lg p-6 text-center cursor-pointer hover:border-black/30 transition ${uploading ? 'opacity-50 cursor-wait' : ''}`}>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUpload(f);
              e.currentTarget.value = '';
            }}
            disabled={uploading}
            className="hidden"
          />
          <p className="text-[12px] text-[#2a2723]/65">
            {uploading ? '업로드 중…' : '클릭해서 파일 선택'}
          </p>
          <p className="text-[10px] text-[#2a2723]/45 mt-1">PNG · JPG · WebP</p>
        </label>
      )}
    </div>
  );
}

/* ============================================================
 * 챌린지/미션 관리 — missions CRUD
 * ============================================================ */

const MISSION_CATEGORIES: MissionCategory[] = ['식비', '여가', '충동', '통장'];
const DIFFICULTIES: Difficulty[] = ['쉬움', '보통', '어려움'];

const EMPTY_MISSION: MissionWithMeta = {
  id: '',
  category: '식비',
  title: '',
  amount: 0,
  difficulty: '쉬움',
  iconKey: '',
  intro: '',
  tips: [],
  authMethod: '',
  sortOrder: 0,
  active: true,
};

// 칭호 reqs 에서 이 미션을 참조하는 항목 추출. 미션 삭제 경고용.
function findTitlesReferencingMission(missionId: string): string[] {
  return TITLES
    .filter((t) => t.reqs.some((r) => r.type === 'mission' && r.missionId === missionId))
    .map((t) => `${t.id} ${t.name}`);
}

function MissionsSection() {
  const [items, setItems] = useState<MissionWithMeta[] | null>(null);
  const [editing, setEditing] = useState<MissionWithMeta | null>(null);
  const [tipsText, setTipsText] = useState(''); // textarea 한 줄 = 한 tip
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setErr(null);
    try {
      const data = await missionsRepo.listAll();
      setItems(data);
    } catch (e) {
      console.error('[MissionsSection.load] 실패', e);
      setErr((e as Error).message ?? '불러오기 실패');
    }
  }

  useEffect(() => { load(); }, []);

  function startNew() {
    setErr(null);
    const list = items ?? [];
    const nextOrder = list.length > 0 ? Math.max(...list.map((m) => m.sortOrder)) + 1 : 1;
    // 신규 ID 자동 추천 — m + (현재 max 번호 + 1)
    const usedNums = list
      .map((m) => /^m(\d+)$/.exec(m.id)?.[1])
      .filter((s): s is string => !!s)
      .map((s) => parseInt(s, 10));
    const nextNum = usedNums.length > 0 ? Math.max(...usedNums) + 1 : list.length + 1;
    setEditing({ ...EMPTY_MISSION, id: `m${nextNum}`, sortOrder: nextOrder });
    setTipsText('');
  }
  function startEdit(m: MissionWithMeta) {
    setErr(null);
    setEditing({ ...m });
    setTipsText(m.tips.join('\n'));
  }
  function cancel() {
    setEditing(null);
    setErr(null);
  }

  async function save() {
    if (!editing) return;
    const id = editing.id.trim();
    const title = editing.title.trim();
    if (!id) { setErr('ID 를 입력하세요. (예: m21)'); return; }
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) { setErr('ID 는 영문/숫자/_/- 만 사용하세요.'); return; }
    if (!title) { setErr('제목을 입력하세요.'); return; }
    if (!editing.iconKey.trim()) { setErr('아이콘 키를 입력하세요.'); return; }
    const tips = tipsText.split('\n').map((s) => s.trim()).filter((s) => s.length > 0);
    setBusy(true);
    setErr(null);
    try {
      const saved = await missionsRepo.upsert({ ...editing, id, title, tips });
      setEditing(null);
      setTipsText('');
      setItems((prev) => {
        const list = prev ?? [];
        const idx = list.findIndex((m) => m.id === saved.id);
        if (idx >= 0) {
          const next = [...list];
          next[idx] = saved;
          return next.sort((a, b) => a.sortOrder - b.sortOrder);
        }
        return [...list, saved].sort((a, b) => a.sortOrder - b.sortOrder);
      });
    } catch (e) {
      console.error('[MissionsSection.save] 실패', e);
      setErr((e as Error).message ?? '저장 실패');
    } finally {
      setBusy(false);
    }
  }

  // 미션 삭제: 2단계 confirm + 칭호 참조 검사 (PLAN.md §5)
  async function remove(m: MissionWithMeta) {
    const refs = findTitlesReferencingMission(m.id);
    const refsMsg = refs.length > 0
      ? `\n\n⚠ 이 미션을 참조하는 칭호: ${refs.join(', ')}\n해당 칭호는 삭제 후 영구 미달성 상태가 됩니다.`
      : '';
    if (!confirm(`"${m.id} ${m.title}" 미션을 삭제하시겠어요?${refsMsg}`)) return;
    if (!confirm('되돌릴 수 없어요. 진짜 삭제할까요?')) return;
    setBusy(true);
    try {
      await missionsRepo.remove(m.id);
      setItems((prev) => (prev ?? []).filter((x) => x.id !== m.id));
    } catch (e) {
      console.error('[MissionsSection.remove] 실패', e);
      setErr((e as Error).message ?? '삭제 실패');
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(m: MissionWithMeta) {
    setBusy(true);
    try {
      const saved = await missionsRepo.upsert({ ...m, active: !m.active });
      setItems((prev) => (prev ?? []).map((x) => (x.id === saved.id ? saved : x)));
    } catch (e) {
      console.error('[MissionsSection.toggleActive] 실패', e);
      setErr((e as Error).message ?? '변경 실패');
    } finally {
      setBusy(false);
    }
  }

  const list = items ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h2 className="text-[18px] font-bold">챌린지/미션 ({list.length})</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="text-[12px] font-bold bg-black/5 hover:bg-black/10 px-3 py-1.5 rounded-md"
          >새로고침</button>
          <button
            onClick={startNew}
            className="text-[12px] font-bold bg-amber-400 hover:bg-amber-300 text-[#1f1d1a] px-3 py-1.5 rounded-md"
          >+ 새 미션</button>
        </div>
      </div>

      {err && (
        <div className="mb-3 bg-red-50 border border-red-200 text-red-700 rounded-md px-3 py-2 text-[12px]">
          {err}
        </div>
      )}

      {editing && (
        <div className="mb-4 bg-white rounded-xl shadow-sm p-4">
          <h3 className="text-[14px] font-bold mb-3">
            {items?.some((m) => m.id === editing.id) ? `미션 수정 — ${editing.id}` : '새 미션 만들기'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="ID (필수, m21 처럼 고유 식별자)">
              <input
                value={editing.id}
                onChange={(e) => setEditing({ ...editing, id: e.target.value })}
                disabled={items?.some((m) => m.id === editing.id)}
                placeholder="m21"
                className="w-full bg-black/5 rounded px-3 py-2 outline-none text-[13px] font-mono disabled:opacity-60"
              />
            </Field>
            <Field label="정렬 순서 (작을수록 위)">
              <input
                type="number"
                value={editing.sortOrder}
                onChange={(e) => setEditing({ ...editing, sortOrder: Number(e.target.value) })}
                className="w-full bg-black/5 rounded px-3 py-2 outline-none text-[13px]"
              />
            </Field>
            <Field label="제목 (필수)">
              <input
                value={editing.title}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                placeholder="편의점 최고의 조합"
                className="w-full bg-black/5 rounded px-3 py-2 outline-none text-[13px]"
              />
            </Field>
            <Field label="카테고리">
              <select
                value={editing.category}
                onChange={(e) => setEditing({ ...editing, category: e.target.value as MissionCategory })}
                className="w-full bg-black/5 rounded px-3 py-2 outline-none text-[13px]"
              >
                {MISSION_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="난이도">
              <select
                value={editing.difficulty}
                onChange={(e) => setEditing({ ...editing, difficulty: e.target.value as Difficulty })}
                className="w-full bg-black/5 rounded px-3 py-2 outline-none text-[13px]"
              >
                {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </Field>
            <Field label="보상 금액 (원)">
              <input
                type="number"
                value={editing.amount}
                onChange={(e) => setEditing({ ...editing, amount: Number(e.target.value) })}
                placeholder="5000"
                className="w-full bg-black/5 rounded px-3 py-2 outline-none text-[13px]"
              />
            </Field>
            <Field label="아이콘 키 (/chall/icon/chall_list_<key>.png)">
              <div className="flex gap-2 items-center">
                <input
                  value={editing.iconKey}
                  onChange={(e) => setEditing({ ...editing, iconKey: e.target.value })}
                  placeholder="cvs"
                  className="flex-1 bg-black/5 rounded px-3 py-2 outline-none text-[13px] font-mono"
                />
                {editing.iconKey && (
                  <img
                    src={`/chall/icon/chall_list_${editing.iconKey}.png`}
                    alt=""
                    className="w-10 h-10 rounded border border-black/10 shrink-0 object-contain bg-white"
                    onError={(e) => { (e.currentTarget.style.opacity = '0.3'); }}
                  />
                )}
              </div>
            </Field>
            <Field label="활성 여부">
              <label className="flex items-center gap-2 text-[13px]">
                <input
                  type="checkbox"
                  checked={editing.active}
                  onChange={(e) => setEditing({ ...editing, active: e.target.checked })}
                />
                활성 (체크 해제 시 사용자 챌린지 리스트에서 안 보임)
              </label>
            </Field>
            <div className="md:col-span-2">
              <Field label="한 줄 소개 (intro)">
                <textarea
                  value={editing.intro}
                  onChange={(e) => setEditing({ ...editing, intro: e.target.value })}
                  rows={2}
                  placeholder="편의점에서도 **영양 챙기면서 저렴하게** 먹을 수 있어요."
                  className="w-full bg-black/5 rounded px-3 py-2 outline-none text-[13px] resize-y"
                />
              </Field>
            </div>
            <div className="md:col-span-2">
              <Field label="실천 팁 (한 줄에 하나)">
                <textarea
                  value={tipsText}
                  onChange={(e) => setTipsText(e.target.value)}
                  rows={5}
                  placeholder={'든든한 한 끼 — 삼각김밥 2개 + 컵라면\n단백질 조합 — 닭가슴살 + 삶은 계란\n…'}
                  className="w-full bg-black/5 rounded px-3 py-2 outline-none text-[13px] resize-y font-mono"
                />
              </Field>
            </div>
            <div className="md:col-span-2">
              <Field label="인증 방법">
                <input
                  value={editing.authMethod}
                  onChange={(e) => setEditing({ ...editing, authMethod: e.target.value })}
                  placeholder="편의점 영수증 또는 조합 사진 업로드"
                  className="w-full bg-black/5 rounded px-3 py-2 outline-none text-[13px]"
                />
              </Field>
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
              <th className="px-4 py-2 w-[60px]">순서</th>
              <th className="px-4 py-2 w-[80px]">ID</th>
              <th className="px-4 py-2 w-[80px]">상태</th>
              <th className="px-4 py-2 w-[80px]">카테고리</th>
              <th className="px-4 py-2">제목</th>
              <th className="px-4 py-2 w-[80px] text-right">금액</th>
              <th className="px-4 py-2 w-[80px]">난이도</th>
              <th className="px-4 py-2 w-[200px]">작업</th>
            </tr>
          </thead>
          <tbody>
            {items === null && (
              <tr><td colSpan={8} className="px-4 py-6 text-center text-[#2a2723]/50">불러오는 중…</td></tr>
            )}
            {items !== null && list.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-6 text-center text-[#2a2723]/50">미션이 없습니다. SUPABASE.md 의 seed SQL 을 실행했는지 확인해 주세요.</td></tr>
            )}
            {list.map((m) => (
              <tr key={m.id} className="border-b border-black/5">
                <td className="px-4 py-2 tabular-nums">{m.sortOrder}</td>
                <td className="px-4 py-2 font-mono text-[11px]">{m.id}</td>
                <td className="px-4 py-2">
                  <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${m.active ? 'bg-emerald-100 text-emerald-700' : 'bg-black/10 text-black/55'}`}>
                    {m.active ? '활성' : '비활성'}
                  </span>
                </td>
                <td className="px-4 py-2">{m.category}</td>
                <td className="px-4 py-2">{m.title}</td>
                <td className="px-4 py-2 tabular-nums text-right">{m.amount.toLocaleString()}원</td>
                <td className="px-4 py-2">{m.difficulty}</td>
                <td className="px-4 py-2">
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => startEdit(m)}
                      disabled={busy}
                      className="text-[11px] font-bold bg-black/5 hover:bg-black/10 px-2 py-1 rounded"
                    >수정</button>
                    <button
                      onClick={() => toggleActive(m)}
                      disabled={busy}
                      className="text-[11px] font-bold bg-black/5 hover:bg-black/10 px-2 py-1 rounded"
                    >{m.active ? '숨기기' : '게시'}</button>
                    <button
                      onClick={() => remove(m)}
                      disabled={busy}
                      className="text-[11px] font-bold bg-red-50 hover:bg-red-100 text-red-700 px-2 py-1 rounded"
                    >삭제</button>
                  </div>
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
 * 칭호 관리 — titles CRUD (이미지 업로드 + reqs 동적 편집)
 * ============================================================ */

const TITLE_DIFFICULTIES: TitleDifficulty[] = ['쉬움', '보통', '어려움'];

const EMPTY_TITLE: TitleWithMeta = {
  id: '',
  name: '',
  difficulty: '쉬움',
  tagline: '',
  tip: '',
  iconKey: '',
  img: '',
  reqs: [],
  sortOrder: 0,
  active: true,
};

function reqLabel(r: TitleReq): string {
  if (r.type === 'mission') {
    const m = MISSIONS.find((x) => x.id === r.missionId);
    return `${m?.title ?? r.missionId} ${r.count}회`;
  }
  if (r.type === 'totalSaveCount') return `총 절약 ${r.count}회`;
  return '챌린지 1회 완주';
}

function TitlesSection() {
  const [items, setItems] = useState<TitleWithMeta[] | null>(null);
  const [editing, setEditing] = useState<TitleWithMeta | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setErr(null);
    try {
      const data = await titlesRepo.listAll();
      setItems(data);
    } catch (e) {
      console.error('[TitlesSection.load] 실패', e);
      setErr((e as Error).message ?? '불러오기 실패');
    }
  }

  useEffect(() => { load(); }, []);

  function startNew() {
    setErr(null);
    const list = items ?? [];
    const nextOrder = list.length > 0 ? Math.max(...list.map((t) => t.sortOrder)) + 1 : 1;
    const usedNums = list
      .map((t) => /^h(\d+)$/.exec(t.id)?.[1])
      .filter((s): s is string => !!s)
      .map((s) => parseInt(s, 10));
    const nextNum = usedNums.length > 0 ? Math.max(...usedNums) + 1 : list.length + 1;
    setEditing({ ...EMPTY_TITLE, id: `h${nextNum}`, sortOrder: nextOrder });
  }
  function startEdit(t: TitleWithMeta) {
    setErr(null);
    setEditing({ ...t, reqs: [...t.reqs] });
  }
  function cancel() {
    setEditing(null);
    setErr(null);
  }

  async function handleUploadImage(file: File) {
    if (!editing) return;
    setUploading(true);
    setErr(null);
    try {
      const url = await titlesRepo.uploadImage(file);
      setEditing({ ...editing, img: url });
    } catch (e) {
      console.error('[TitlesSection.handleUploadImage] 실패', e);
      setErr((e as Error).message ?? '업로드 실패');
    } finally {
      setUploading(false);
    }
  }

  function setReq(idx: number, next: TitleReq) {
    if (!editing) return;
    const reqs = [...editing.reqs];
    reqs[idx] = next;
    setEditing({ ...editing, reqs });
  }
  function removeReq(idx: number) {
    if (!editing) return;
    setEditing({ ...editing, reqs: editing.reqs.filter((_, i) => i !== idx) });
  }
  function addReq(type: TitleReq['type']) {
    if (!editing) return;
    let req: TitleReq;
    if (type === 'mission') {
      req = { type: 'mission', missionId: MISSIONS[0]?.id ?? 'm1', count: 5 };
    } else if (type === 'totalSaveCount') {
      req = { type: 'totalSaveCount', count: 10 };
    } else {
      req = { type: 'cycleComplete' };
    }
    setEditing({ ...editing, reqs: [...editing.reqs, req] });
  }

  async function save() {
    if (!editing) return;
    const id = editing.id.trim();
    const name = editing.name.trim();
    if (!id) { setErr('ID 를 입력하세요. (예: h12)'); return; }
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) { setErr('ID 는 영문/숫자/_/- 만 사용하세요.'); return; }
    if (!name) { setErr('이름을 입력하세요.'); return; }
    if (!editing.img.trim()) { setErr('칭호 이미지를 업로드하거나 경로를 입력하세요.'); return; }
    if (!editing.iconKey.trim()) { setErr('아이콘 키를 입력하세요.'); return; }
    for (const r of editing.reqs) {
      if (r.type === 'mission' && !MISSIONS.some((m) => m.id === r.missionId)) {
        setErr(`존재하지 않는 미션 ID: ${r.missionId}`);
        return;
      }
    }
    setBusy(true);
    setErr(null);
    try {
      const saved = await titlesRepo.upsert({ ...editing, id, name });
      setEditing(null);
      setItems((prev) => {
        const list = prev ?? [];
        const idx = list.findIndex((t) => t.id === saved.id);
        if (idx >= 0) {
          const next = [...list];
          next[idx] = saved;
          return next.sort((a, b) => a.sortOrder - b.sortOrder);
        }
        return [...list, saved].sort((a, b) => a.sortOrder - b.sortOrder);
      });
    } catch (e) {
      console.error('[TitlesSection.save] 실패', e);
      setErr((e as Error).message ?? '저장 실패');
    } finally {
      setBusy(false);
    }
  }

  async function remove(t: TitleWithMeta) {
    if (!confirm(`"${t.id} ${t.name}" 칭호를 삭제하시겠어요?\n\n사용자가 이미 획득한 칭호 ID 는 ownedTitles 에 남지만 표시 시 unknown 처리됩니다.`)) return;
    if (!confirm('되돌릴 수 없어요. 진짜 삭제할까요?')) return;
    setBusy(true);
    try {
      await titlesRepo.remove(t.id);
      setItems((prev) => (prev ?? []).filter((x) => x.id !== t.id));
    } catch (e) {
      console.error('[TitlesSection.remove] 실패', e);
      setErr((e as Error).message ?? '삭제 실패');
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(t: TitleWithMeta) {
    setBusy(true);
    try {
      const saved = await titlesRepo.upsert({ ...t, active: !t.active });
      setItems((prev) => (prev ?? []).map((x) => (x.id === saved.id ? saved : x)));
    } catch (e) {
      console.error('[TitlesSection.toggleActive] 실패', e);
      setErr((e as Error).message ?? '변경 실패');
    } finally {
      setBusy(false);
    }
  }

  const list = items ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h2 className="text-[18px] font-bold">칭호 ({list.length})</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="text-[12px] font-bold bg-black/5 hover:bg-black/10 px-3 py-1.5 rounded-md"
          >새로고침</button>
          <button
            onClick={startNew}
            className="text-[12px] font-bold bg-amber-400 hover:bg-amber-300 text-[#1f1d1a] px-3 py-1.5 rounded-md"
          >+ 새 칭호</button>
        </div>
      </div>

      {err && (
        <div className="mb-3 bg-red-50 border border-red-200 text-red-700 rounded-md px-3 py-2 text-[12px]">
          {err}
        </div>
      )}

      {editing && (
        <div className="mb-4 bg-white rounded-xl shadow-sm p-4">
          <h3 className="text-[14px] font-bold mb-3">
            {items?.some((t) => t.id === editing.id) ? `칭호 수정 — ${editing.id}` : '새 칭호 만들기'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="ID (필수, h12 처럼 고유)">
              <input
                value={editing.id}
                onChange={(e) => setEditing({ ...editing, id: e.target.value })}
                disabled={items?.some((t) => t.id === editing.id)}
                placeholder="h12"
                className="w-full bg-black/5 rounded px-3 py-2 outline-none text-[13px] font-mono disabled:opacity-60"
              />
            </Field>
            <Field label="정렬 순서">
              <input
                type="number"
                value={editing.sortOrder}
                onChange={(e) => setEditing({ ...editing, sortOrder: Number(e.target.value) })}
                className="w-full bg-black/5 rounded px-3 py-2 outline-none text-[13px]"
              />
            </Field>
            <Field label="이름 (필수)">
              <input
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                placeholder="홈 바리스타"
                className="w-full bg-black/5 rounded px-3 py-2 outline-none text-[13px]"
              />
            </Field>
            <Field label="난이도">
              <select
                value={editing.difficulty}
                onChange={(e) => setEditing({ ...editing, difficulty: e.target.value as TitleDifficulty })}
                className="w-full bg-black/5 rounded px-3 py-2 outline-none text-[13px]"
              >
                {TITLE_DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </Field>
            <div className="md:col-span-2">
              <Field label="태그라인 (한 줄 설명)">
                <input
                  value={editing.tagline}
                  onChange={(e) => setEditing({ ...editing, tagline: e.target.value })}
                  placeholder="오늘도 커피 값을 아꼈다"
                  className="w-full bg-black/5 rounded px-3 py-2 outline-none text-[13px]"
                />
              </Field>
            </div>
            <div className="md:col-span-2">
              <Field label="팁 (하단 안내)">
                <input
                  value={editing.tip}
                  onChange={(e) => setEditing({ ...editing, tip: e.target.value })}
                  placeholder="텀블러를 들고 다니면 더 쉽게 성공할 수 있어요"
                  className="w-full bg-black/5 rounded px-3 py-2 outline-none text-[13px]"
                />
              </Field>
            </div>
            <Field label="아이콘 키 (레거시 SVG)">
              <input
                value={editing.iconKey}
                onChange={(e) => setEditing({ ...editing, iconKey: e.target.value })}
                placeholder="coffee"
                className="w-full bg-black/5 rounded px-3 py-2 outline-none text-[13px] font-mono"
              />
            </Field>
            <Field label="활성 여부">
              <label className="flex items-center gap-2 text-[13px]">
                <input
                  type="checkbox"
                  checked={editing.active}
                  onChange={(e) => setEditing({ ...editing, active: e.target.checked })}
                />
                활성
              </label>
            </Field>
          </div>

          <div className="mt-4">
            <p className="text-[12px] font-bold mb-2">칭호 이미지</p>
            <div className="flex gap-3 items-start flex-wrap">
              <ImageUploadField
                label="업로드"
                hint="title-images 버킷 (public)"
                url={editing.img && !editing.img.startsWith('/') ? editing.img : ''}
                uploading={uploading}
                onUpload={handleUploadImage}
                onClear={() => setEditing({ ...editing, img: '' })}
              />
              <div className="flex-1 min-w-[240px]">
                <p className="text-[11px] text-[#2a2723]/55 mb-1">또는 정적 경로 (/title/title_NN.png)</p>
                <input
                  value={editing.img}
                  onChange={(e) => setEditing({ ...editing, img: e.target.value })}
                  placeholder="/title/title_12.png"
                  className="w-full bg-black/5 rounded px-3 py-2 outline-none text-[13px] font-mono"
                />
                {editing.img && (
                  <img
                    src={editing.img}
                    alt=""
                    className="mt-2 w-32 h-32 object-contain bg-black/5 rounded border border-black/10"
                    onError={(e) => { e.currentTarget.style.opacity = '0.3'; }}
                  />
                )}
              </div>
            </div>
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
              <p className="text-[12px] font-bold">획득 조건 (모두 만족 시 획득)</p>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => addReq('mission')}
                  className="text-[11px] font-bold bg-black/5 hover:bg-black/10 px-2 py-1 rounded"
                >+ 미션</button>
                <button
                  type="button"
                  onClick={() => addReq('totalSaveCount')}
                  className="text-[11px] font-bold bg-black/5 hover:bg-black/10 px-2 py-1 rounded"
                >+ 총 절약 횟수</button>
                <button
                  type="button"
                  onClick={() => addReq('cycleComplete')}
                  className="text-[11px] font-bold bg-black/5 hover:bg-black/10 px-2 py-1 rounded"
                >+ 챌린지 완주</button>
              </div>
            </div>
            {editing.reqs.length === 0 && (
              <p className="text-[11px] text-[#2a2723]/45 bg-black/5 rounded px-3 py-2">
                조건 없음 — 모든 사용자에게 자동 획득되는 칭호 (h0 처럼)
              </p>
            )}
            <div className="space-y-2">
              {editing.reqs.map((r, idx) => (
                <div key={idx} className="flex gap-2 items-center bg-black/5 rounded px-3 py-2 flex-wrap">
                  {r.type === 'mission' ? (
                    <>
                      <span className="text-[11px] text-[#2a2723]/55 w-12">미션</span>
                      <select
                        value={r.missionId}
                        onChange={(e) => setReq(idx, { ...r, missionId: e.target.value })}
                        className="flex-1 bg-white rounded px-2 py-1 text-[12px] min-w-[200px]"
                      >
                        {MISSIONS.map((m) => (
                          <option key={m.id} value={m.id}>{m.id} — {m.title}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        value={r.count}
                        onChange={(e) => setReq(idx, { ...r, count: Number(e.target.value) })}
                        className="w-20 bg-white rounded px-2 py-1 text-[12px]"
                      />
                      <span className="text-[11px] text-[#2a2723]/55">회</span>
                    </>
                  ) : r.type === 'totalSaveCount' ? (
                    <>
                      <span className="text-[11px] text-[#2a2723]/55 w-24">총 절약 횟수</span>
                      <input
                        type="number"
                        value={r.count}
                        onChange={(e) => setReq(idx, { ...r, count: Number(e.target.value) })}
                        className="w-20 bg-white rounded px-2 py-1 text-[12px]"
                      />
                      <span className="text-[11px] text-[#2a2723]/55">회 이상</span>
                      <span className="flex-1" />
                    </>
                  ) : (
                    <>
                      <span className="text-[11px] text-[#2a2723]/55 w-24">챌린지 완주</span>
                      <span className="flex-1 text-[11px] text-[#2a2723]/45">cycle ≥ 2</span>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => removeReq(idx)}
                    className="text-[11px] font-bold bg-red-50 hover:bg-red-100 text-red-700 px-2 py-1 rounded"
                  >제거</button>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 flex gap-2 justify-end">
            <button
              onClick={cancel}
              disabled={busy}
              className="text-[12px] font-bold bg-black/5 hover:bg-black/10 px-4 py-2 rounded-md"
            >취소</button>
            <button
              onClick={save}
              disabled={busy || uploading}
              className="text-[12px] font-bold bg-amber-400 hover:bg-amber-300 text-[#1f1d1a] px-4 py-2 rounded-md disabled:opacity-40"
            >{busy ? '저장 중…' : '저장'}</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-left text-[12px] text-[#2a2723]/55 border-b border-black/10">
              <th className="px-4 py-2 w-[60px]">순서</th>
              <th className="px-4 py-2 w-[60px]">이미지</th>
              <th className="px-4 py-2 w-[80px]">ID</th>
              <th className="px-4 py-2 w-[80px]">상태</th>
              <th className="px-4 py-2">이름</th>
              <th className="px-4 py-2 w-[80px]">난이도</th>
              <th className="px-4 py-2">획득 조건</th>
              <th className="px-4 py-2 w-[200px]">작업</th>
            </tr>
          </thead>
          <tbody>
            {items === null && (
              <tr><td colSpan={8} className="px-4 py-6 text-center text-[#2a2723]/50">불러오는 중…</td></tr>
            )}
            {items !== null && list.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-6 text-center text-[#2a2723]/50">칭호가 없습니다. SUPABASE.md 의 seed SQL 을 실행했는지 확인해 주세요.</td></tr>
            )}
            {list.map((t) => (
              <tr key={t.id} className="border-b border-black/5">
                <td className="px-4 py-2 tabular-nums">{t.sortOrder}</td>
                <td className="px-4 py-2">
                  {t.img && (
                    <img
                      src={t.img}
                      alt=""
                      className="w-10 h-10 object-contain bg-black/5 rounded"
                      onError={(e) => { e.currentTarget.style.opacity = '0.3'; }}
                    />
                  )}
                </td>
                <td className="px-4 py-2 font-mono text-[11px]">{t.id}</td>
                <td className="px-4 py-2">
                  <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${t.active ? 'bg-emerald-100 text-emerald-700' : 'bg-black/10 text-black/55'}`}>
                    {t.active ? '활성' : '비활성'}
                  </span>
                </td>
                <td className="px-4 py-2">{t.name}</td>
                <td className="px-4 py-2">{t.difficulty}</td>
                <td className="px-4 py-2 text-[11px] text-[#2a2723]/65">
                  {t.reqs.length === 0 ? '— (자동 획득)' : t.reqs.map(reqLabel).join(', ')}
                </td>
                <td className="px-4 py-2">
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => startEdit(t)}
                      disabled={busy}
                      className="text-[11px] font-bold bg-black/5 hover:bg-black/10 px-2 py-1 rounded"
                    >수정</button>
                    <button
                      onClick={() => toggleActive(t)}
                      disabled={busy}
                      className="text-[11px] font-bold bg-black/5 hover:bg-black/10 px-2 py-1 rounded"
                    >{t.active ? '숨기기' : '게시'}</button>
                    <button
                      onClick={() => remove(t)}
                      disabled={busy}
                      className="text-[11px] font-bold bg-red-50 hover:bg-red-100 text-red-700 px-2 py-1 rounded"
                    >삭제</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
