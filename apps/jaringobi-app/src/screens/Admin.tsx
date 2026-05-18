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
import { TITLES, MISSIONS, MissionCategory, Difficulty, TitleReq, TitleDifficulty, SHOP_GROUPS, REMODEL_FILES, REMODEL_SUBS, accSubOf, priceFor } from '../lib/data';
import { signInWithEmail, signOut, useSession } from '../lib/auth';
import { useIsAdmin } from '../lib/admins';
import {
  ACTION_LABELS, AdminInfo, AuditLogEntry, TABLE_LABELS,
  listAdmins, listAuditLog, logAdminAction, updateMyAdminName,
} from '../lib/adminAudit';

type Tab = 'dashboard' | 'users' | 'posts' | 'rooms' | 'announcements' | 'shop' | 'missions' | 'titles' | 'admins';

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

/* ============================================================
 * 공통 UI 헬퍼 — 모든 섹션이 같은 스타일을 쓰도록 통합.
 * 이전엔 인라인 className 이 섹션마다 미묘하게 달랐음.
 * ============================================================ */

function SectionHeader({
  title, count, actions,
}: { title: string; count?: number; actions?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-3 flex-wrap mb-5">
      <h2 className="text-[22px] font-black tracking-tight flex items-baseline gap-2">
        {title}
        {count != null && (
          <span className="text-[14px] font-bold text-[#2a2723]/45 tabular-nums">
            {count.toLocaleString()}
          </span>
        )}
      </h2>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}

function PrimaryButton({
  children, className = '', ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={`text-[13px] font-bold bg-[#1f1d1a] hover:bg-[#2a2723] text-white px-4 py-2 rounded-lg transition disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

function GhostButton({
  children, className = '', ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={`text-[13px] font-bold bg-white hover:bg-black/5 ring-1 ring-black/10 px-3.5 py-2 rounded-lg transition disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

function SearchInput({
  value, onChange, placeholder,
}: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative">
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#2a2723]/40 pointer-events-none" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="M21 21l-4.3-4.3M11 19a8 8 0 100-16 8 8 0 000 16z" />
      </svg>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="bg-white ring-1 ring-black/10 rounded-lg pl-9 pr-3 py-2 text-[13px] outline-none w-64 focus:ring-[#1f1d1a]/30 transition"
      />
    </div>
  );
}

function ErrorBox({
  title, message, hint,
}: { title: string; message: string; hint?: string }) {
  return (
    <div className="mb-4 bg-red-50 ring-1 ring-red-200 text-red-700 rounded-xl px-4 py-3 text-[13px]">
      <p className="font-bold flex items-center gap-2">
        <span aria-hidden>⚠</span>
        {title}
      </p>
      <p className="mt-1">{message}</p>
      {hint && <p className="mt-2 text-[11px] text-red-700/80">{hint}</p>}
    </div>
  );
}

function EmptyState({
  icon, title, hint,
}: { icon?: string; title: string; hint?: string }) {
  return (
    <div className="text-center py-14">
      {icon && <div className="text-[44px] mb-2 opacity-40 select-none" aria-hidden>{icon}</div>}
      <p className="text-[14px] font-bold text-[#2a2723]/60">{title}</p>
      {hint && <p className="mt-1.5 text-[12px] text-[#2a2723]/40">{hint}</p>}
    </div>
  );
}

function LoadingBox({ children = '불러오는 중…' }: { children?: string }) {
  return (
    <div className="text-center py-14">
      <div className="inline-block w-5 h-5 border-2 border-[#2a2723]/15 border-t-[#1f1d1a] rounded-full animate-spin" />
      <p className="mt-3 text-[12px] text-[#2a2723]/55">{children}</p>
    </div>
  );
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
    <main className="min-h-dvh w-full bg-gradient-to-br from-[#1f1d1a] via-[#2a2723] to-[#1f1d1a] text-white grid place-items-center p-6">
      <form onSubmit={submit} className="w-full max-w-sm bg-[#2a2723]/80 backdrop-blur rounded-3xl p-8 shadow-2xl ring-1 ring-white/5">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-400 grid place-items-center text-[28px] shadow-lg">
            🐟
          </div>
        </div>
        <h1 className="mt-4 text-[22px] font-black tracking-[2px] text-center">자린고비 ADMIN</h1>
        <p className="mt-2 text-[12px] text-white/55 text-center">
          관리자 이메일로 매직 링크를 받아 로그인해 주세요
        </p>
        {sent ? (
          <div className="mt-7 bg-emerald-500/10 ring-1 ring-emerald-400/30 rounded-xl p-4 text-[13px] text-emerald-200">
            <p className="font-bold flex items-center gap-2">
              <span aria-hidden>✓</span> 메일 발송 완료
            </p>
            <p className="mt-1.5 text-emerald-300/80 leading-relaxed">
              <span className="font-mono">{email}</span> 의 받은편지함에서 로그인 링크를 클릭해 주세요. 스팸함도 확인해 보세요.
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
              className="mt-7 w-full bg-black/40 rounded-xl px-4 py-3.5 outline-none text-[15px] text-white placeholder:text-white/25 ring-1 ring-white/10 focus:ring-amber-400/50 transition"
            />
            {err && (
              <p className="mt-2 text-[12px] text-red-300 font-bold" role="alert">⚠ {err}</p>
            )}
            <button
              type="submit"
              disabled={busy || !email.trim()}
              className="mt-5 w-full bg-amber-400 hover:bg-amber-300 disabled:opacity-40 disabled:cursor-not-allowed text-[#1f1d1a] rounded-xl py-3.5 text-[14px] font-black tracking-wide transition active:scale-[.98]"
            >
              {busy ? '메일 발송 중…' : '매직 링크 받기'}
            </button>
            <p className="mt-5 text-[11px] text-white/40 leading-relaxed text-center">
              admins 테이블에 등록되지 않은 이메일은<br />로그인 후에도 접근이 거부됩니다.
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

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'dashboard',     label: '대시보드',    icon: '📊' },
  { id: 'users',         label: '가입자',      icon: '👥' },
  { id: 'announcements', label: '공지/이벤트', icon: '📣' },
  { id: 'shop',          label: '상점',        icon: '🛍' },
  { id: 'missions',      label: '챌린지/미션', icon: '🎯' },
  { id: 'titles',        label: '칭호',        icon: '🏆' },
  { id: 'rooms',         label: '수다방',      icon: '💬' },
  { id: 'posts',         label: '수다방 글',   icon: '📝' },
  { id: 'admins',        label: '관리자/기록', icon: '🛡' },
];

function AdminPanel({ email }: { email: string }) {
  const [tab, setTab] = useState<Tab>('dashboard');

  return (
    <main className="min-h-dvh w-full bg-[#f7f3ec] text-[#2a2723]">
      <header className="sticky top-0 z-20 bg-[#1f1d1a] text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-400 grid place-items-center text-[20px] shadow-md shrink-0">
              🐟
            </div>
            <div className="min-w-0">
              <p className="font-black tracking-[3px] text-[15px] leading-none">자린고비 ADMIN</p>
              <p className="text-[10.5px] text-white/55 mt-1.5 tracking-wide truncate">{email}</p>
            </div>
          </div>
          <LogoutButton />
        </div>
        <nav className="max-w-6xl mx-auto px-6 pb-3 -mb-px flex gap-1.5 text-[13px] flex-wrap">
          {TABS.map((t) => (
            <TabButton key={t.id} active={tab === t.id} onClick={() => setTab(t.id)}>
              <span className="mr-1.5" aria-hidden>{t.icon}</span>
              {t.label}
            </TabButton>
          ))}
        </nav>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {tab === 'dashboard' && <DashboardSection onJump={setTab} />}
        {tab === 'users' && <UsersSection />}
        {tab === 'announcements' && <AnnouncementsSection />}
        {tab === 'shop' && <ShopItemsSection />}
        {tab === 'missions' && <MissionsSection />}
        {tab === 'titles' && <TitlesSection />}
        {tab === 'rooms' && <RoomsSection />}
        {tab === 'posts' && <PostsSection />}
        {tab === 'admins' && <AdminsSection />}
      </div>
    </main>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-full font-bold transition whitespace-nowrap ${
        active
          ? 'bg-amber-400 text-[#1f1d1a] shadow-md'
          : 'text-white/60 hover:text-white hover:bg-white/8'
      }`}
    >
      {children}
    </button>
  );
}

/* ============================================================
 * 대시보드 — 통계 카드
 * ============================================================ */

function DashboardSection({ onJump }: { onJump: (tab: Tab) => void }) {
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

  if (loading) {
    return (
      <div>
        <SectionHeader title="대시보드" actions={<GhostButton disabled>↻ 새로고침</GhostButton>} />
        <LoadingBox>통계 불러오는 중…</LoadingBox>
      </div>
    );
  }
  if (err) {
    return (
      <div>
        <SectionHeader title="대시보드" actions={<GhostButton onClick={load}>↻ 새로고침</GhostButton>} />
        <ErrorBox
          title="통계 조회 실패"
          message={err}
          hint="admin_dashboard_stats RPC 함수가 Supabase 에 생성돼 있는지 확인하세요. (docs/SUPABASE.md 참고)"
        />
      </div>
    );
  }
  if (!stats) return null;

  // 톤은 시각적 그룹화 — 사용자(주황) / 활동(녹) / 글 수(보라/하늘/사이안/장미).
  // 시간 단위 카드(24h, 7d) 는 따뜻한 톤으로 묶어 시선이 다른 카드로 쉽게 이동.
  // jumpTo: 카드 클릭 시 이동할 탭. 클릭 가능한 카드만 명시.
  type Tone = 'amber' | 'emerald' | 'violet' | 'sky' | 'cyan' | 'rose';
  const cards: {
    label: string; value: number; sub?: string; tone: Tone; icon: string; jumpTo?: Tab;
  }[] = [
    { label: '전체 가입자',     value: stats.total_auth_users, sub: '인증된 user',     tone: 'amber',   icon: '👤', jumpTo: 'users' },
    { label: '닉네임 설정',     value: stats.total_profiles,   sub: '실제 활동 시작',  tone: 'emerald', icon: '✏️', jumpTo: 'users' },
    { label: '활동 작성자',     value: stats.active_posters,   sub: '글 1건 이상',     tone: 'violet',  icon: '✨', jumpTo: 'posts' },
    { label: '전체 글 수',       value: stats.total_posts,                              tone: 'sky',     icon: '📝', jumpTo: 'posts' },
    { label: '24시간 글 수',     value: stats.posts_24h,        sub: '실시간 활동',     tone: 'cyan',    icon: '⚡', jumpTo: 'posts' },
    { label: '7일 글 수',        value: stats.posts_7d,         sub: '주간 활동',       tone: 'rose',    icon: '📈', jumpTo: 'posts' },
  ];
  const iconClass: Record<Tone, string> = {
    amber:   'bg-amber-100 text-amber-700 ring-amber-200',
    emerald: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
    violet:  'bg-violet-100 text-violet-700 ring-violet-200',
    sky:     'bg-sky-100 text-sky-700 ring-sky-200',
    cyan:    'bg-cyan-100 text-cyan-700 ring-cyan-200',
    rose:    'bg-rose-100 text-rose-700 ring-rose-200',
  };
  const barClass: Record<Tone, string> = {
    amber:   'from-amber-400 to-amber-300',
    emerald: 'from-emerald-400 to-emerald-300',
    violet:  'from-violet-400 to-violet-300',
    sky:     'from-sky-400 to-sky-300',
    cyan:    'from-cyan-400 to-cyan-300',
    rose:    'from-rose-400 to-rose-300',
  };

  return (
    <div>
      <SectionHeader
        title="대시보드"
        actions={<GhostButton onClick={load}>↻ 새로고침</GhostButton>}
      />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {cards.map((c) => {
          const clickable = !!c.jumpTo;
          const Tag = clickable ? 'button' : 'div';
          return (
            <Tag
              key={c.label}
              onClick={clickable ? () => onJump(c.jumpTo!) : undefined}
              className={`relative overflow-hidden bg-white rounded-2xl ring-1 ring-black/5 shadow-sm p-5 text-left ${
                clickable
                  ? 'hover:shadow-md hover:-translate-y-0.5 hover:ring-black/10 active:scale-[.98] cursor-pointer transition'
                  : 'transition'
              }`}
            >
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${barClass[c.tone]}`} />
              <div className="flex items-center justify-between">
                <p className="text-[12px] font-bold text-[#2a2723]/65 uppercase tracking-wider">{c.label}</p>
                <span
                  className={`w-9 h-9 grid place-items-center rounded-xl ring-1 text-[16px] ${iconClass[c.tone]}`}
                  aria-hidden
                >
                  {c.icon}
                </span>
              </div>
              <p className="mt-3 text-[34px] font-black tracking-tight tabular-nums leading-none">
                {c.value.toLocaleString()}
              </p>
              <div className="mt-2 flex items-center justify-between gap-2">
                {c.sub && <p className="text-[11px] text-[#2a2723]/45">{c.sub}</p>}
                {clickable && (
                  <span className="text-[11px] text-[#2a2723]/40 font-bold ml-auto">상세 →</span>
                )}
              </div>
            </Tag>
          );
        })}
      </div>
      <p className="mt-5 text-[11px] text-[#2a2723]/45">
        카드를 누르면 해당 상세 페이지로 이동해요.
      </p>
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
      <SectionHeader
        title="가입자"
        count={filtered.length}
        actions={
          <>
            <SearchInput value={search} onChange={setSearch} placeholder="이메일/닉네임/UUID 검색" />
            <GhostButton onClick={load}>↻ 새로고침</GhostButton>
          </>
        }
      />

      {err && (
        <ErrorBox
          title="가입자 목록 조회 실패"
          message={err}
          hint="admin_list_users RPC 함수가 Supabase 에 생성돼 있는지 확인하세요."
        />
      )}

      <div className="bg-white rounded-2xl ring-1 ring-black/5 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left text-[11px] font-bold text-[#2a2723]/55 uppercase tracking-wider bg-[#2a2723]/[0.03] border-b border-black/5">
                <th className="px-4 py-3">가입일</th>
                <th className="px-4 py-3">이메일</th>
                <th className="px-4 py-3">닉네임</th>
                <th className="px-4 py-3 text-right">회차</th>
                <th className="px-4 py-3 text-right">누적 절약</th>
                <th className="px-4 py-3 text-right">글 수</th>
                <th className="px-4 py-3">마지막 활동</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={7}><LoadingBox /></td></tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={7}>
                  <EmptyState
                    icon={search ? '🔍' : '👥'}
                    title={search ? '검색 결과가 없어요' : '표시할 가입자가 없어요'}
                    hint={search ? '다른 키워드로 다시 시도해 보세요' : undefined}
                  />
                </td></tr>
              )}
              {!loading && filtered.map((u, i) => (
                <tr
                  key={u.user_id}
                  className={`border-b border-black/5 last:border-b-0 hover:bg-amber-50/40 transition-colors ${
                    i % 2 === 1 ? 'bg-[#2a2723]/[0.015]' : ''
                  }`}
                >
                  <td className="px-4 py-3 text-[12px] text-[#2a2723]/65 whitespace-nowrap">
                    {new Date(u.signed_up_at).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {u.email ? (
                      <span className="font-mono text-[12px]">{u.email}</span>
                    ) : (
                      <span className="text-[11px] text-[#2a2723]/45 italic">익명</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-bold whitespace-nowrap">
                    {u.nickname ?? <span className="text-[11px] text-[#2a2723]/45 font-normal italic">미설정</span>}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{u.cycle ?? '—'}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-bold">
                    {u.total_saved != null
                      ? <><span>{u.total_saved.toLocaleString()}</span><span className="text-[10px] text-[#2a2723]/45 ml-0.5">원</span></>
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {u.post_count > 0 ? (
                      <span className="inline-block bg-violet-100 text-violet-700 rounded-full px-2 py-0.5 text-[11px] font-bold">
                        {u.post_count}
                      </span>
                    ) : (
                      <span className="text-[#2a2723]/30">0</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[12px] text-[#2a2723]/65 whitespace-nowrap">
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
      const target = posts.find((p) => p.id === id);
      await talkPostsRepo.remove(id);
      setPosts((prev) => prev.filter((p) => p.id !== id));
      void logAdminAction('delete', 'talk_posts', id, target?.nick ?? null, {
        body_excerpt: (target?.body ?? '').slice(0, 80),
      });
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
    <div>
      <SectionHeader
        title="수다방 글"
        count={filtered.length}
        actions={
          <>
            <SearchInput value={search} onChange={setSearch} placeholder="닉/본문/ID 검색" />
            <GhostButton onClick={load}>↻ 새로고침</GhostButton>
          </>
        }
      />
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-5">
      <aside>
        <div className="bg-white rounded-2xl ring-1 ring-black/5 shadow-sm p-4 sticky top-[160px]">
          <h3 className="text-[11px] font-bold text-[#2a2723]/55 uppercase tracking-wider mb-3">방별 필터</h3>
          <ul className="space-y-0.5">
            {adminRooms.map((r) => {
              const count = stats.byRoom.get(r.id) ?? 0;
              const isActive = filterRoom === r.id;
              return (
                <li key={r.id}>
                  <button
                    onClick={() => setFilterRoom(isActive ? '' : r.id)}
                    className={`w-full flex items-center justify-between gap-2 text-left px-3 py-2 rounded-lg text-[13px] transition ${
                      isActive
                        ? 'bg-amber-400 text-[#1f1d1a] font-bold shadow-sm'
                        : 'text-[#2a2723]/80 hover:bg-black/5'
                    }`}
                  >
                    <span className="truncate">#&nbsp;{r.title}</span>
                    <span className={`tabular-nums text-[11px] ${isActive ? 'text-[#1f1d1a]/70' : 'text-[#2a2723]/45'}`}>
                      {count}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {filterRoom && (
            <button
              onClick={() => setFilterRoom('')}
              className="mt-3 text-[11px] text-amber-700 hover:underline font-bold"
            >× 필터 해제</button>
          )}
        </div>
      </aside>

      <section>
        <div className="bg-white rounded-2xl ring-1 ring-black/5 shadow-sm overflow-hidden">
          {err && (
            <div className="p-4">
              <ErrorBox title="불러오기 실패" message={err} />
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left text-[11px] font-bold text-[#2a2723]/55 uppercase tracking-wider bg-[#2a2723]/[0.03] border-b border-black/5">
                  <th className="px-4 py-3">작성일</th>
                  <th className="px-4 py-3">방</th>
                  <th className="px-4 py-3">닉네임</th>
                  <th className="px-4 py-3">본문</th>
                  <th className="px-4 py-3 w-[80px] text-right">작업</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={5}><LoadingBox /></td></tr>
                )}
                {!loading && filtered.length === 0 && (
                  <tr><td colSpan={5}>
                    <EmptyState
                      icon={search || filterRoom ? '🔍' : '💬'}
                      title={search || filterRoom ? '조건에 맞는 글이 없어요' : '아직 글이 없어요'}
                      hint={search || filterRoom ? '필터를 해제하거나 검색어를 바꿔보세요' : undefined}
                    />
                  </td></tr>
                )}
                {!loading && filtered.map((p, i) => {
                  const room = adminRooms.find((r) => r.id === p.room_id);
                  return (
                    <tr
                      key={p.id}
                      className={`border-b border-black/5 last:border-b-0 align-top hover:bg-amber-50/40 transition-colors ${
                        i % 2 === 1 ? 'bg-[#2a2723]/[0.015]' : ''
                      }`}
                    >
                      <td className="px-4 py-3 text-[12px] text-[#2a2723]/65 whitespace-nowrap">
                        {p.created_at
                          ? new Date(p.created_at).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' })
                          : '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className="inline-block px-2.5 py-1 rounded-full text-[11px] font-bold ring-1 ring-black/10"
                          style={{ background: room?.bg ?? '#eee' }}
                        >
                          #&nbsp;{room?.title ?? p.room_id}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold whitespace-nowrap">{p.nick}</td>
                      <td className="px-4 py-3 whitespace-pre-wrap break-words max-w-[520px] leading-relaxed">{p.body}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => deletePost(p.id)}
                          disabled={busyId === p.id}
                          className="text-[12px] font-bold text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg disabled:opacity-40 transition"
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
    </div>
  );
}

/* ============================================================
 * 관리자 / 기록 — 관리자 목록 + 감사 로그
 * 사전 적용: docs/SUPABASE_AUDIT_LOG.sql (RPC + audit table)
 * ============================================================ */

function AdminsSection() {
  const session = useSession();
  const currentUserId = session && session !== null ? session.user.id : null;

  const [admins, setAdmins] = useState<AdminInfo[] | null>(null);
  const [logs, setLogs] = useState<AuditLogEntry[] | null>(null);
  const [adminsErr, setAdminsErr] = useState<string | null>(null);
  const [logsErr, setLogsErr] = useState<string | null>(null);
  const [filterTable, setFilterTable] = useState<string>('');
  const [filterAdmin, setFilterAdmin] = useState<string>('');

  // 이름 편집 상태 — 본인 row 만 편집 가능
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [nameBusy, setNameBusy] = useState(false);
  const [nameErr, setNameErr] = useState<string | null>(null);

  async function loadAll() {
    setAdminsErr(null);
    setLogsErr(null);
    setAdmins(null);
    setLogs(null);
    try {
      setAdmins(await listAdmins());
    } catch (e) {
      console.error('[AdminsSection] listAdmins 실패', e);
      setAdminsErr((e as Error).message ?? String(e));
      setAdmins([]);
    }
    try {
      setLogs(await listAuditLog(300));
    } catch (e) {
      console.error('[AdminsSection] listAuditLog 실패', e);
      setLogsErr((e as Error).message ?? String(e));
      setLogs([]);
    }
  }
  useEffect(() => { loadAll(); }, []);

  function startEditName(currentName: string | null) {
    setEditingName(true);
    setNameDraft(currentName ?? '');
    setNameErr(null);
  }
  function cancelEditName() {
    setEditingName(false);
    setNameDraft('');
    setNameErr(null);
  }
  async function saveName() {
    if (nameBusy) return;
    const trimmed = nameDraft.trim();
    if (trimmed.length > 32) {
      setNameErr('이름은 32자 이하로 입력해 주세요.');
      return;
    }
    setNameBusy(true);
    setNameErr(null);
    try {
      await updateMyAdminName(trimmed);
      // 로컬 admin 목록도 즉시 갱신
      setAdmins((prev) =>
        prev?.map((a) =>
          a.user_id === currentUserId ? { ...a, name: trimmed || null } : a,
        ) ?? null,
      );
      setEditingName(false);
      setNameDraft('');
    } catch (e) {
      console.error('[AdminsSection.saveName] 실패', e);
      setNameErr((e as Error).message ?? '이름 저장 실패');
    } finally {
      setNameBusy(false);
    }
  }

  // 감사 로그 표시용 — user_id → 현재 이름 매핑
  const nameByUserId = useMemo(() => {
    const map = new Map<string, string>();
    (admins ?? []).forEach((a) => { if (a.name) map.set(a.user_id, a.name); });
    return map;
  }, [admins]);

  const filteredLogs = useMemo(() => {
    if (!logs) return [];
    return logs.filter((l) => {
      if (filterTable && l.target_table !== filterTable) return false;
      if (filterAdmin && l.admin_email !== filterAdmin) return false;
      return true;
    });
  }, [logs, filterTable, filterAdmin]);

  const tableOptions = useMemo(() => {
    const set = new Set<string>();
    (logs ?? []).forEach((l) => set.add(l.target_table));
    return Array.from(set).sort();
  }, [logs]);
  const adminOptions = useMemo(() => {
    const set = new Set<string>();
    (logs ?? []).forEach((l) => { if (l.admin_email) set.add(l.admin_email); });
    return Array.from(set).sort();
  }, [logs]);

  const actionPill: Record<string, string> = {
    create: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
    update: 'bg-sky-100 text-sky-700 ring-sky-200',
    toggle: 'bg-violet-100 text-violet-700 ring-violet-200',
    delete: 'bg-rose-100 text-rose-700 ring-rose-200',
  };

  return (
    <div className="space-y-8">
      {/* 관리자 목록 */}
      <div>
        <SectionHeader
          title="관리자 목록"
          count={admins?.length}
          actions={<GhostButton onClick={loadAll}>↻ 새로고침</GhostButton>}
        />
        {adminsErr && (
          <ErrorBox
            title="관리자 목록 조회 실패"
            message={adminsErr}
            hint="docs/SUPABASE_AUDIT_LOG.sql 의 admin_list_admins() 함수가 Supabase 에 생성돼 있는지 확인하세요."
          />
        )}
        <div className="bg-white rounded-2xl ring-1 ring-black/5 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left text-[11px] font-bold text-[#2a2723]/55 uppercase tracking-wider bg-[#2a2723]/[0.03] border-b border-black/5">
                  <th className="px-4 py-3">이름</th>
                  <th className="px-4 py-3">이메일</th>
                  <th className="px-4 py-3">등록일</th>
                  <th className="px-4 py-3">user_id</th>
                </tr>
              </thead>
              <tbody>
                {admins === null && (
                  <tr><td colSpan={4}><LoadingBox /></td></tr>
                )}
                {admins && admins.length === 0 && !adminsErr && (
                  <tr><td colSpan={4}>
                    <EmptyState icon="🛡" title="관리자가 없어요" />
                  </td></tr>
                )}
                {admins && admins.map((a, i) => {
                  const isMe = a.user_id === currentUserId;
                  const inEdit = isMe && editingName;
                  return (
                    <tr key={a.user_id} className={`border-b border-black/5 last:border-b-0 hover:bg-amber-50/40 transition-colors ${i % 2 === 1 ? 'bg-[#2a2723]/[0.015]' : ''}`}>
                      <td className="px-4 py-3 min-w-[200px]">
                        {inEdit ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              autoFocus
                              value={nameDraft}
                              onChange={(e) => { setNameDraft(e.target.value.slice(0, 32)); setNameErr(null); }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') { e.preventDefault(); saveName(); }
                                if (e.key === 'Escape') { e.preventDefault(); cancelEditName(); }
                              }}
                              placeholder="표시할 이름"
                              maxLength={32}
                              className="bg-amber-50 ring-1 ring-amber-300 rounded-lg px-2.5 py-1.5 text-[13px] outline-none focus:ring-amber-500 flex-1 min-w-0"
                            />
                            <button
                              onClick={saveName}
                              disabled={nameBusy}
                              className="text-[12px] font-bold bg-amber-400 hover:bg-amber-300 text-[#1f1d1a] px-2.5 py-1.5 rounded-lg disabled:opacity-50 whitespace-nowrap"
                            >
                              {nameBusy ? '저장 중…' : '저장'}
                            </button>
                            <button
                              onClick={cancelEditName}
                              disabled={nameBusy}
                              className="text-[12px] font-bold text-[#2a2723]/65 hover:bg-black/5 px-2 py-1.5 rounded-lg disabled:opacity-50"
                            >
                              취소
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            {a.name ? (
                              <span className="font-bold flex items-center gap-1.5">
                                {a.name}
                                {isMe && (
                                  <span className="inline-block bg-amber-400 text-[#1f1d1a] text-[10px] font-black px-1.5 py-0.5 rounded-full">
                                    나
                                  </span>
                                )}
                              </span>
                            ) : (
                              <span className="text-[#2a2723]/40 italic text-[12px] flex items-center gap-1.5">
                                미설정
                                {isMe && (
                                  <span className="inline-block bg-amber-400 text-[#1f1d1a] text-[10px] font-black px-1.5 py-0.5 rounded-full">
                                    나
                                  </span>
                                )}
                              </span>
                            )}
                            {isMe && (
                              <button
                                onClick={() => startEditName(a.name)}
                                className="text-[11px] font-bold text-amber-700 hover:text-amber-900 hover:underline ml-1"
                                title="내 이름 수정"
                              >
                                ✎ 수정
                              </button>
                            )}
                          </div>
                        )}
                        {inEdit && nameErr && (
                          <p className="mt-1.5 text-[11px] text-red-600 font-bold">⚠ {nameErr}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-[12px]">{a.email}</td>
                      <td className="px-4 py-3 text-[12px] text-[#2a2723]/65 whitespace-nowrap">
                        {new Date(a.created_at).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-[#2a2723]/45">
                        {a.user_id.slice(0, 8)}…
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-[#2a2723]/45">
          ※ 본인 row 의 <span className="font-bold">✎ 수정</span> 버튼으로 자기 이름만 변경 가능해요. 빈 값으로 저장하면 미설정으로 돌아갑니다.
        </p>
      </div>

      {/* 감사 로그 */}
      <div>
        <SectionHeader
          title="수정 기록 (감사 로그)"
          count={filteredLogs.length}
          actions={
            <>
              <select
                value={filterTable}
                onChange={(e) => setFilterTable(e.target.value)}
                className="bg-white ring-1 ring-black/10 rounded-lg px-3 py-2 text-[13px] outline-none focus:ring-[#1f1d1a]/30"
              >
                <option value="">전체 항목</option>
                {tableOptions.map((t) => (
                  <option key={t} value={t}>{TABLE_LABELS[t] ?? t}</option>
                ))}
              </select>
              <select
                value={filterAdmin}
                onChange={(e) => setFilterAdmin(e.target.value)}
                className="bg-white ring-1 ring-black/10 rounded-lg px-3 py-2 text-[13px] outline-none focus:ring-[#1f1d1a]/30 max-w-[200px]"
              >
                <option value="">전체 관리자</option>
                {adminOptions.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
              <GhostButton onClick={loadAll}>↻ 새로고침</GhostButton>
            </>
          }
        />
        {logsErr && (
          <ErrorBox
            title="감사 로그 조회 실패"
            message={logsErr}
            hint="docs/SUPABASE_AUDIT_LOG.sql 을 Supabase SQL Editor 에서 실행해 admin_audit_log 테이블을 생성하세요."
          />
        )}
        <div className="bg-white rounded-2xl ring-1 ring-black/5 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left text-[11px] font-bold text-[#2a2723]/55 uppercase tracking-wider bg-[#2a2723]/[0.03] border-b border-black/5">
                  <th className="px-4 py-3">시각</th>
                  <th className="px-4 py-3">관리자</th>
                  <th className="px-4 py-3">작업</th>
                  <th className="px-4 py-3">대상</th>
                  <th className="px-4 py-3">이름/제목</th>
                </tr>
              </thead>
              <tbody>
                {logs === null && (
                  <tr><td colSpan={5}><LoadingBox /></td></tr>
                )}
                {logs && filteredLogs.length === 0 && !logsErr && (
                  <tr><td colSpan={5}>
                    <EmptyState
                      icon={filterTable || filterAdmin ? '🔍' : '📜'}
                      title={filterTable || filterAdmin ? '조건에 맞는 기록이 없어요' : '아직 기록이 없어요'}
                      hint={
                        filterTable || filterAdmin
                          ? '필터를 해제하거나 다른 값을 선택해 보세요'
                          : '관리자가 작업을 하면 여기에 자동으로 쌓여요'
                      }
                    />
                  </td></tr>
                )}
                {logs && filteredLogs.map((l, i) => {
                  const displayName = l.admin_user_id ? nameByUserId.get(l.admin_user_id) : undefined;
                  return (
                  <tr key={l.id} className={`border-b border-black/5 last:border-b-0 hover:bg-amber-50/40 transition-colors ${i % 2 === 1 ? 'bg-[#2a2723]/[0.015]' : ''}`}>
                    <td className="px-4 py-3 text-[12px] text-[#2a2723]/65 whitespace-nowrap">
                      {new Date(l.created_at).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="px-4 py-3 text-[12px] whitespace-nowrap">
                      {displayName ? (
                        <div className="flex flex-col leading-tight">
                          <span className="font-bold">{displayName}</span>
                          <span className="font-mono text-[10.5px] text-[#2a2723]/55">{l.admin_email}</span>
                        </div>
                      ) : l.admin_email ? (
                        <span className="font-mono">{l.admin_email}</span>
                      ) : (
                        <span className="text-[#2a2723]/40 italic">알 수 없음</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold ring-1 ${actionPill[l.action] ?? 'bg-black/5 ring-black/10 text-[#2a2723]/70'}`}>
                        {ACTION_LABELS[l.action] ?? l.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[12px] whitespace-nowrap font-bold">
                      {TABLE_LABELS[l.target_table] ?? l.target_table}
                    </td>
                    <td className="px-4 py-3 text-[12px] max-w-[320px] truncate" title={l.target_name ?? ''}>
                      {l.target_name ?? <span className="text-[#2a2723]/40 italic">—</span>}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
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
      const wasEdit = !!isEdit;
      await talkRoomsRepo.upsert({ ...editing, id, title });
      setEditing(null);
      refresh();
      void logAdminAction(wasEdit ? 'update' : 'create', 'talk_rooms', id, title);
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
      void logAdminAction('delete', 'talk_rooms', r.id, r.title);
    } catch (e) {
      console.error('[RoomsSection.remove] 실패', e);
      setErr((e as Error).message ?? '삭제 실패');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <SectionHeader
        title="수다방 관리"
        count={list.length}
        actions={
          <>
            <GhostButton onClick={refresh}>↻ 새로고침</GhostButton>
            <button
              onClick={startNew}
              className="text-[13px] font-bold bg-amber-400 hover:bg-amber-300 text-[#1f1d1a] px-4 py-2 rounded-lg shadow-sm transition active:scale-[.98]"
            >+ 새 방</button>
          </>
        }
      />

      {err && (
        <div className="mb-4 bg-red-50 ring-1 ring-red-200 text-red-700 rounded-xl px-4 py-3 text-[13px] font-bold flex items-center gap-2">
          <span aria-hidden>⚠</span>
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
      const wasEdit = !!(editing.id && (items ?? []).some((a) => a.id === editing.id));
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
      void logAdminAction(wasEdit ? 'update' : 'create', 'announcements', saved.id, title);
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
      void logAdminAction('delete', 'announcements', a.id, a.title);
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
      void logAdminAction('toggle', 'announcements', saved.id, saved.title, { active: saved.active });
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
      <SectionHeader
        title="공지/이벤트"
        count={list.length}
        actions={
          <>
            <GhostButton onClick={load}>↻ 새로고침</GhostButton>
            <button
              onClick={startNew}
              className="text-[13px] font-bold bg-amber-400 hover:bg-amber-300 text-[#1f1d1a] px-4 py-2 rounded-lg shadow-sm transition active:scale-[.98]"
            >+ 새 공지</button>
          </>
        }
      />

      {err && (
        <div className="mb-4 bg-red-50 ring-1 ring-red-200 text-red-700 rounded-xl px-4 py-3 text-[13px] font-bold flex items-center gap-2">
          <span aria-hidden>⚠</span>
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

// 코드에 박힌 기본 상점 아이템 (src/lib/data.ts 의 SHOP_GROUPS) 을 표 형식으로 펼친다.
// 관리자가 전체 라인업을 한눈에 확인할 수 있도록 읽기 전용으로 노출.
interface BuiltinShopRow {
  src: string;
  category: '사치품' | '티셔츠' | '리모델링';
  subCategory: string | null;
  price: number;
}
function getBuiltinShopRows(): BuiltinShopRow[] {
  const rows: BuiltinShopRow[] = [];
  for (const src of SHOP_GROUPS.사치품) {
    rows.push({ src, category: '사치품', subCategory: accSubOf(src), price: priceFor(src) });
  }
  for (const src of SHOP_GROUPS.티셔츠) {
    rows.push({ src, category: '티셔츠', subCategory: null, price: priceFor(src) });
  }
  for (const sub of REMODEL_SUBS) {
    for (const src of REMODEL_FILES[sub]) {
      rows.push({ src, category: '리모델링', subCategory: sub, price: priceFor(src) });
    }
  }
  return rows;
}

function ShopItemsSection() {
  const [items, setItems] = useState<ShopItem[] | null>(null);
  const [editing, setEditing] = useState<ShopItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [uploadingShop, setUploadingShop] = useState(false);
  const [uploadingFit, setUploadingFit] = useState(false);
  // 기본(빌트인) 아이템 표는 양이 많아 기본 접힘 상태. 토글로 펼침.
  const [showBuiltins, setShowBuiltins] = useState(false);
  const builtinRows = useMemo(() => getBuiltinShopRows(), []);
  const builtinByCategory = useMemo(() => {
    const grouped: Record<string, BuiltinShopRow[]> = { 사치품: [], 티셔츠: [], 리모델링: [] };
    for (const r of builtinRows) grouped[r.category].push(r);
    return grouped;
  }, [builtinRows]);

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
      const wasEdit = !!(editing.id && (items ?? []).some((i) => i.id === editing.id));
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
      void logAdminAction(wasEdit ? 'update' : 'create', 'shop_items', saved.id, saved.label || saved.shopImageUrl);
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
      void logAdminAction('delete', 'shop_items', i.id, i.label || i.shopImageUrl);
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
      void logAdminAction('toggle', 'shop_items', saved.id, saved.label || saved.shopImageUrl, { active: saved.active });
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
      <div className="flex items-end justify-between mb-5 gap-3 flex-wrap">
        <div>
          <h2 className="text-[22px] font-black tracking-tight flex items-baseline gap-2">
            상점 관리
            <span className="text-[14px] font-bold text-[#2a2723]/45 tabular-nums">
              {list.length.toLocaleString()}
            </span>
          </h2>
          <p className="text-[12px] text-[#2a2723]/55 mt-1.5 leading-relaxed">
            기존 하드코딩 아이템 + 여기 추가한 항목이 함께 노출돼요.
            추가 항목은 사용자 화면 상단에 우선 표시.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <GhostButton onClick={load}>↻ 새로고침</GhostButton>
          <button
            onClick={startNew}
            className="text-[13px] font-bold bg-amber-400 hover:bg-amber-300 text-[#1f1d1a] px-4 py-2 rounded-lg shadow-sm transition active:scale-[.98]"
          >+ 새 아이템</button>
        </div>
      </div>

      {err && (
        <div className="mb-4 bg-red-50 ring-1 ring-red-200 text-red-700 rounded-xl px-4 py-3 text-[13px] font-bold flex items-center gap-2">
          <span aria-hidden>⚠</span>
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

      <div className="mt-8">
        <div className="flex items-end justify-between gap-3 flex-wrap mb-3">
          <div>
            <h3 className="text-[16px] font-bold flex items-baseline gap-2">
              기본 아이템 (코드 내장)
              <span className="text-[13px] font-bold text-[#2a2723]/45 tabular-nums">
                {builtinRows.length.toLocaleString()}
              </span>
            </h3>
            <p className="text-[12px] text-[#2a2723]/55 mt-1 leading-relaxed">
              <code className="bg-black/5 px-1 py-0.5 rounded text-[11px]">src/lib/data.ts</code> 의 SHOP_GROUPS 에 정의된 기본 아이템들. 읽기 전용 — 수정/삭제하려면 코드를 직접 변경해야 해요.
            </p>
          </div>
          <button
            onClick={() => setShowBuiltins((v) => !v)}
            className="text-[13px] font-bold bg-black/5 hover:bg-black/10 px-4 py-2 rounded-lg"
          >
            {showBuiltins ? '▲ 접기' : '▼ 펼치기'}
          </button>
        </div>

        {showBuiltins && (
          <div className="space-y-5">
            {(['사치품', '티셔츠', '리모델링'] as const).map((cat) => {
              const rows = builtinByCategory[cat] ?? [];
              if (rows.length === 0) return null;
              return (
                <div key={cat} className="bg-white rounded-xl shadow-sm overflow-x-auto">
                  <div className="px-4 pt-3 pb-2 text-[13px] font-bold flex items-baseline gap-2 border-b border-black/5">
                    {cat}
                    <span className="text-[12px] font-bold text-[#2a2723]/45 tabular-nums">
                      {rows.length.toLocaleString()}
                    </span>
                  </div>
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="text-left text-[12px] text-[#2a2723]/55 border-b border-black/10">
                        <th className="px-4 py-2">미리보기</th>
                        <th className="px-4 py-2">서브</th>
                        <th className="px-4 py-2">파일 경로</th>
                        <th className="px-4 py-2 text-right">가격</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.src} className="border-b border-black/5">
                          <td className="px-4 py-2">
                            <img src={r.src} alt="" className="w-12 h-12 object-contain bg-black/5 rounded" />
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap">
                            {r.subCategory ?? <span className="text-[#2a2723]/40">—</span>}
                          </td>
                          <td className="px-4 py-2 text-[11px] text-[#2a2723]/60 break-all font-mono">{r.src}</td>
                          <td className="px-4 py-2 text-right tabular-nums">{r.price.toLocaleString()}P</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        )}
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
  // 카테고리 필터 — 한 화면에 미션이 많을 때 카테고리별로 분리해서 보기.
  // null = 전체. 표시할 카테고리 칩이 활성화되면 list 가 그 카테고리만으로 필터됨.
  const [categoryFilter, setCategoryFilter] = useState<MissionCategory | null>(null);

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
      const wasEdit = !!(editing.id && (items ?? []).some((m) => m.id === editing.id));
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
      void logAdminAction(wasEdit ? 'update' : 'create', 'missions', saved.id, title);
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
      void logAdminAction('delete', 'missions', m.id, m.title);
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
      void logAdminAction('toggle', 'missions', saved.id, saved.title, { active: saved.active });
    } catch (e) {
      console.error('[MissionsSection.toggleActive] 실패', e);
      setErr((e as Error).message ?? '변경 실패');
    } finally {
      setBusy(false);
    }
  }

  const allList = items ?? [];
  const list = categoryFilter ? allList.filter((m) => m.category === categoryFilter) : allList;

  // 각 카테고리별 개수 — 칩 옆에 표시.
  const countByCategory = useMemo(() => {
    const map: Record<MissionCategory, number> = { 식비: 0, 여가: 0, 충동: 0, 통장: 0 };
    for (const m of allList) map[m.category] = (map[m.category] ?? 0) + 1;
    return map;
  }, [allList]);

  // 카테고리 칩 색상 (대시보드 톤과 통일)
  const catTone: Record<MissionCategory, string> = {
    식비: 'bg-rose-100 text-rose-700 ring-rose-200',
    여가: 'bg-sky-100 text-sky-700 ring-sky-200',
    충동: 'bg-violet-100 text-violet-700 ring-violet-200',
    통장: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
  };

  return (
    <div>
      <SectionHeader
        title="챌린지/미션"
        count={list.length}
        actions={
          <>
            <GhostButton onClick={load}>↻ 새로고침</GhostButton>
            <button
              onClick={startNew}
              className="text-[13px] font-bold bg-amber-400 hover:bg-amber-300 text-[#1f1d1a] px-4 py-2 rounded-lg shadow-sm transition active:scale-[.98]"
            >+ 새 미션</button>
          </>
        }
      />

      {/* 카테고리 필터 칩 — "전체" + 4개 카테고리. 활성화 시 amber 강조. */}
      <div className="mb-5 flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setCategoryFilter(null)}
          className={`px-3.5 py-1.5 rounded-full text-[12px] font-bold transition ${
            categoryFilter === null
              ? 'bg-[#1f1d1a] text-white shadow-sm'
              : 'bg-white ring-1 ring-black/10 text-[#2a2723]/70 hover:bg-black/5'
          }`}
        >
          전체 <span className="ml-1 opacity-70 tabular-nums">{allList.length}</span>
        </button>
        {MISSION_CATEGORIES.map((c) => {
          const active = categoryFilter === c;
          return (
            <button
              key={c}
              onClick={() => setCategoryFilter(active ? null : c)}
              className={`px-3.5 py-1.5 rounded-full text-[12px] font-bold transition ring-1 ${
                active
                  ? `${catTone[c]} ring-current shadow-sm`
                  : 'bg-white ring-black/10 text-[#2a2723]/70 hover:bg-black/5'
              }`}
            >
              {c} <span className="ml-1 opacity-70 tabular-nums">{countByCategory[c] ?? 0}</span>
            </button>
          );
        })}
      </div>

      {err && (
        <div className="mb-4 bg-red-50 ring-1 ring-red-200 text-red-700 rounded-xl px-4 py-3 text-[13px] font-bold flex items-center gap-2">
          <span aria-hidden>⚠</span>
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
      const wasEdit = !!(editing.id && (items ?? []).some((t) => t.id === editing.id));
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
      void logAdminAction(wasEdit ? 'update' : 'create', 'titles', saved.id, name);
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
      void logAdminAction('delete', 'titles', t.id, t.name);
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
      void logAdminAction('toggle', 'titles', saved.id, saved.name, { active: saved.active });
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
      <SectionHeader
        title="칭호"
        count={list.length}
        actions={
          <>
            <GhostButton onClick={load}>↻ 새로고침</GhostButton>
            <button
              onClick={startNew}
              className="text-[13px] font-bold bg-amber-400 hover:bg-amber-300 text-[#1f1d1a] px-4 py-2 rounded-lg shadow-sm transition active:scale-[.98]"
            >+ 새 칭호</button>
          </>
        }
      />

      {err && (
        <div className="mb-4 bg-red-50 ring-1 ring-red-200 text-red-700 rounded-xl px-4 py-3 text-[13px] font-bold flex items-center gap-2">
          <span aria-hidden>⚠</span>
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
