import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { toBlob } from 'html-to-image';
import { getTitleProgress, Title, TITLES } from '../lib/data';
import { BackButton } from '../components/UI';
import { RoomPreview } from '../components/RoomPreview';
import { ProfileCharacterBox } from '../components/ProfileCharacterBox';
import { TitleIcon } from '../components/TitleIcon';
import { useUser } from '../lib/userState';
import { profilesRepo } from '../lib/profilesRepo';
import { useEscape } from '../lib/useEscape';
import { playDeniedSfx, playSuccessSfx } from '../lib/feedback';
import { isNative, nativeSaveImage, nativeShareImage } from '../lib/nativeShare';

const MAX_NICK = 10;

export default function MyPage() {
  const u = useUser();
  const [editing, setEditing] = useState(false);
  const [nickDraft, setNickDraft] = useState(u.nickname);
  const [nickError, setNickError] = useState<string | null>(null);
  const [titleModal, setTitleModal] = useState(false);
  const [detailTitleId, setDetailTitleId] = useState<string | null>(null);
  const [roomOpen, setRoomOpen] = useState(false);
  useEscape(roomOpen, () => setRoomOpen(false));

  // 노트 카드 영역 — 공유 시 이 영역만 이미지로 캡쳐
  const noteRef = useRef<HTMLElement>(null);
  const [capturing, setCapturing] = useState(false);
  // 캡쳐 결과 미리보기 모달 — { dataUrl(미리보기용 blob URL), blob(공유용 File 변환용) }
  const [sharePreview, setSharePreview] = useState<{ dataUrl: string; blob: Blob } | null>(null);
  const [shareSending, setShareSending] = useState(false);
  // 모달 닫을 때 ObjectURL 메모리 해제까지 같이.
  const closeSharePreview = () => {
    if (sharePreview?.dataUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(sharePreview.dataUrl);
    }
    setSharePreview(null);
  };
  useEscape(sharePreview !== null, closeSharePreview);

  // 사진 줌 모달 — RECORD 그리드에서 사진 클릭 시
  const [zoomPhoto, setZoomPhoto] = useState<{ day: number; src: string } | null>(null);
  useEscape(zoomPhoto !== null, () => setZoomPhoto(null));

  // 다른 기기에서 올린 인증샷 / 로컬 write 누락분을 서버에서 받아 머지.
  // 로컬에 이미 있는 day 는 건드리지 않음 (mergeRemotePhotos 안에서 처리).
  // 닉네임/사이클 바뀌면 다시 fetch — 회차 종료 후 새 회차 사진 동기화 대응.
  useEffect(() => {
    if (!u.nickname || u.nickname === '자린이') return;
    let alive = true;
    profilesRepo.getByNick(u.nickname).then((p) => {
      if (!alive || !p?.photos) return;
      u.mergeRemotePhotos(p.photos);
    }).catch(() => { /* best-effort */ });
    return () => { alive = false; };
  }, [u.nickname, u.cycle, u.mergeRemotePhotos]);

  async function commitNick() {
    const trimmed = nickDraft.trim();
    if (!trimmed) {
      setNickError('닉네임은 비울 수 없어요');
      setNickDraft(u.nickname);
      setEditing(false);
      setTimeout(() => setNickError(null), 2500);
      return;
    }
    if (trimmed === u.nickname) {
      setEditing(false);
      return;
    }
    const result = await u.tryRenameNickname(trimmed);
    if (!result.ok) {
      setNickError(result.message);
      setNickDraft(u.nickname);
      setEditing(false);
      setTimeout(() => setNickError(null), 3000);
      return;
    }
    playSuccessSfx();
    setEditing(false);
  }

  const activeTitle = TITLES.find((t) => t.id === u.activeTitleId) ?? TITLES[0];
  const days = Array.from({ length: 30 }, (_, i) => i + 1);

  function closeTitleModal() {
    setTitleModal(false);
    setDetailTitleId(null);
  }
  useEscape(titleModal, () => {
    if (detailTitleId !== null) setDetailTitleId(null);
    else closeTitleModal();
  });

  const titleCtx = {
    missionWinDays: u.missionWinDays,
    totalSaveCount: u.totalSaveCount,
    cycle: u.cycle,
  };
  const detailTitle = detailTitleId
    ? TITLES.find((t) => t.id === detailTitleId) ?? null
    : null;

  // 공유 텍스트 + 파일명 — 미리보기 모달 / 실제 share 단계 모두에서 동일하게 사용
  const shareText = `자린고비 ${u.cycle}회차 ${u.day}일차 · 누적 절약 ${u.totalSaved.toLocaleString()}원`;
  const shareFileName = `jaringobi_${u.nickname}_${u.cycle}회차.png`;

  // 공유 버튼 → 노트 카드 캡쳐만 수행 → 미리보기 모달 띄움
  async function prepareShare() {
    if (capturing || !noteRef.current) return;
    setCapturing(true);
    try {
      const el = noteRef.current;
      // 이전 미리보기의 ObjectURL 메모리 누수 방지
      if (sharePreview?.dataUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(sharePreview.dataUrl);
      }
      // pixelRatio 2 면 인스타용으로 충분. 그 이상은 캡쳐만 느려지고 결과는 비슷.
      const pixelRatio = 2;
      // section 안쪽에 'absolute -top-2' 로 위로 벗어난 바인딩 구멍이 있어서
      // bounding rect 가 그걸 포함 못함. 캡쳐 중에는 잠시 숨겨서 측정 왜곡·잘림 방지.
      // 안드로이드 WebView 처럼 sub-pixel 반올림 더 보수적인 환경에선 +1 로도 모자라
      // 우/하단이 잘림 → 버퍼를 4px 까지 키움.
      const dots = el.querySelector<HTMLElement>('[data-share-hide]');
      const prevDotsDisplay = dots?.style.display;
      if (dots) dots.style.display = 'none';
      const rect = el.getBoundingClientRect();
      const width = Math.ceil(rect.width) + 4;
      const height = Math.ceil(rect.height) + 4;
      let blob: Blob | null = null;
      try {
        blob = await toBlob(el, {
          pixelRatio,
          backgroundColor: '#FAF5E9', // 노트 종이색
          // cacheBust: true 는 dataURL 끝에 ?t= 를 붙여 RECORD 사진을 망가뜨림 → 끔
          cacheBust: false,
          // skipFonts: true 면 캡쳐는 빠르지만 안드로이드 WebView 에서 시스템 폰트로
          // 폴백되며 한글이 깨져 보이는 이슈 → false 로 두고 Pretendard 임베드.
          skipFonts: false,
          width,
          height,
        });
      } finally {
        if (dots) dots.style.display = prevDotsDisplay ?? '';
      }
      if (!blob) throw new Error('blob 변환 실패');
      // 미리보기는 ObjectURL — base64 dataURL 대비 즉시·메모리 효율적
      const dataUrl = URL.createObjectURL(blob);
      setSharePreview({ dataUrl, blob });
    } catch (e) {
      console.error('[MyPage.prepareShare] 캡쳐 실패', e);
      // 캡쳐 실패 시 텍스트 share 폴백
      if (typeof navigator !== 'undefined' && navigator.share) {
        try { await navigator.share({ title: '자린고비', text: shareText }); } catch { /* ignore */ }
      } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(shareText);
          alert('이미지 캡쳐에 실패했어요. 대신 텍스트를 클립보드에 복사했어요.');
        } catch { /* ignore */ }
      }
    } finally {
      setCapturing(false);
    }
  }

  // 미리보기 모달에서 "공유하기" 클릭
  // 안드로이드 Capacitor: Filesystem 으로 파일 만들고 Share 플러그인으로 시스템 시트 호출.
  // 웹: navigator.share files → 폴백 다운로드 순.
  async function doShare() {
    if (!sharePreview || shareSending) return;
    setShareSending(true);
    try {
      // 1) 네이티브(Android) — Capacitor Share 사용
      if (isNative()) {
        try {
          await nativeShareImage(sharePreview.blob, shareFileName, shareText);
          playSuccessSfx();
          closeSharePreview();
          return;
        } catch (e) {
          console.error('[MyPage.doShare] native share 실패', e);
          // 아래 웹 폴백으로 떨어짐
        }
      }
      // 2) 웹 — navigator.share files
      const file = new File([sharePreview.blob], shareFileName, { type: 'image/png' });
      if (typeof navigator !== 'undefined' && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ title: '자린고비', text: shareText, files: [file] });
          playSuccessSfx();
          closeSharePreview();
          return;
        } catch {
          return; // 사용자 취소
        }
      }
      // 3) 마지막 폴백 — 다운로드
      const a = document.createElement('a');
      a.href = sharePreview.dataUrl;
      a.download = shareFileName;
      a.click();
      playSuccessSfx();
    } finally {
      setShareSending(false);
    }
  }

  // "이미지 저장" — 안드로이드: Capacitor Filesystem 으로 Documents 에 저장
  //              웹: <a download> 다운로드
  async function downloadShareImage() {
    if (!sharePreview) return;
    if (isNative()) {
      try {
        await nativeSaveImage(sharePreview.blob, shareFileName);
        playSuccessSfx();
        alert(`이미지를 Documents 폴더에 저장했어요\n파일: ${shareFileName}`);
        return;
      } catch (e) {
        console.error('[MyPage.downloadShareImage] native save 실패', e);
        // 웹 폴백으로 진행
      }
    }
    const a = document.createElement('a');
    a.href = sharePreview.dataUrl;
    a.download = shareFileName;
    a.click();
    playSuccessSfx();
  }

  return (
    <main className="min-h-full pb-10">
      {/* 상단바 */}
      <header className="relative pt-10 pb-3">
        <BackButton className="absolute left-3 top-8 w-14 h-14 grid place-items-center text-text/80" fallback="/main" />
        <div className="flex justify-center">
          <Link to="/main" aria-label="홈으로">
            <img
              src="/jarin/logo_nobg.png"
              alt="자린고비"
              className="w-[72px] h-[72px] object-contain"
              draggable={false}
            />
          </Link>
        </div>
        <Link
          to="/settings"
          aria-label="설정"
          className="absolute right-4 top-11 w-9 h-9 grid place-items-center text-text/80"
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" />
          </svg>
        </Link>
      </header>

      {/* 진행 안내 배너 — 오늘 챌린지 진행 상태 + 메인으로 빠른 이동 */}
      <div className="mx-4 mb-3 bg-accent/10 ring-1 ring-accent/30 rounded-2xl px-4 py-2.5 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-bold text-text">
            {u.day === 1 ? '챌린지 시작!' : `${u.day}일차 진행 중`} · D-{Math.max(0, 31 - u.day)}
          </p>
          <p className="text-[11px] text-text/65 mt-0.5 truncate">
            누적 {u.totalSaved.toLocaleString()}원 · 코인 {u.coins.toLocaleString()}P · 인증 시 +100P
          </p>
        </div>
        <Link
          to="/main"
          className="text-[12px] font-bold bg-accent text-white px-3 py-1.5 rounded-full whitespace-nowrap shrink-0"
        >
          메인으로
        </Link>
      </div>

      {/* 노트 카드 — 공유 시 이 section 영역만 캡쳐 */}
      <section ref={noteRef} className="mx-4 bg-grid-paper rounded-[18px] shadow-soft px-4 pt-3 pb-6 relative">
        {/* 노트 바인딩 구멍 — 공유 캡쳐 시엔 section 바운드 위로 벗어나 잘리니까 잠시 숨김 */}
        <div data-share-hide className="absolute -top-2 left-0 right-0 flex justify-around px-6 pointer-events-none">
          {Array.from({ length: 6 }).map((_, i) => (
            <span key={i} className="w-3.5 h-3.5 rounded-full bg-text/20" />
          ))}
        </div>

        {/* 공유 */}
        <div className="flex justify-end pt-2">
          <button
            onClick={prepareShare}
            disabled={capturing}
            aria-label={capturing ? '이미지 만드는 중' : '공유'}
            className="w-7 h-7 grid place-items-center text-text/70 active:scale-[.95] transition disabled:opacity-50"
          >
            {capturing ? (
              <svg width="20" height="20" viewBox="0 0 24 24" className="animate-spin">
                <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" strokeOpacity="0.25" />
                <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 4v12" />
                <path d="M7 9l5-5 5 5" />
                <path d="M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" />
              </svg>
            )}
          </button>
        </div>

        {/* 프로필 영역 */}
        <div className="grid grid-cols-[140px_1fr] gap-4 items-start mt-1">
          <button
            onClick={() => setRoomOpen(true)}
            aria-label="내 방 보기"
            className="aspect-square bg-white rounded-2xl shadow-soft overflow-hidden relative active:scale-[.98] transition"
          >
            <ProfileCharacterBox
              characterSrc="/jarin/main_character.png"
              alt={`${u.nickname} 캐릭터`}
              equipped={u.equipped.filter(
                (s) => s.startsWith('/shop/clothes/') || s.startsWith('/shop/acc/'),
              )}
            />
            <span className="absolute right-1.5 bottom-1.5 bg-text/70 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              방 보기
            </span>
          </button>
          <div>
            <p className="text-[14px] font-bold text-text">
              거지탈출 {u.day}일차
            </p>
            <div className="mt-2">
              {editing ? (
                <input
                  autoFocus
                  value={nickDraft}
                  onChange={(e) => setNickDraft(e.target.value.slice(0, MAX_NICK))}
                  onBlur={commitNick}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitNick();
                    if (e.key === 'Escape') { setNickDraft(u.nickname); setEditing(false); }
                  }}
                  className="bg-primary/70 rounded-full px-4 py-1.5 text-[16px] font-bold text-text outline-none w-full max-w-[160px] text-center"
                />
              ) : (
                <button
                  onClick={() => { setNickDraft(u.nickname); setEditing(true); }}
                  className="bg-primary/70 rounded-full px-5 py-1.5 text-[16px] font-bold text-text active:scale-[.98]"
                  aria-label="닉네임 편집"
                >
                  {u.nickname}
                </button>
              )}
              {nickError && (
                <p className="mt-1 text-[11px] text-pink font-bold" role="alert">
                  ⚠ {nickError}
                </p>
              )}
            </div>
            <p className="mt-3 text-[15px] font-bold text-text">
              {u.totalSaved.toLocaleString()}
              <span className="text-text/60"> / {u.goal.toLocaleString()}</span>
            </p>
            <div className="mt-2 flex items-center gap-3">
              <Link to="/bookmarks" aria-label="북마크 보관함" className="p-1">
                <svg width="22" height="26" viewBox="0 0 22 26" aria-hidden>
                  <path
                    d="M3 2 H19 A1 1 0 0 1 20 3 V24 L11 18 L2 24 V3 A1 1 0 0 1 3 2 Z"
                    fill="#E96B6E"
                  />
                </svg>
              </Link>
              <Link to="/shop" aria-label="상점" className="p-1">
                <span
                  className="inline-grid place-items-center w-7 h-7 rounded-full text-white text-[12px] font-black"
                  style={{ background: 'radial-gradient(circle at 35% 30%, #FFD56A 0%, #E8AB2A 70%)' }}
                >
                  ₩
                </span>
              </Link>
              <Link to="/honor" aria-label="명예의 전당" className="p-1">
                <span
                  className="inline-grid place-items-center w-7 h-7 rounded-full"
                  style={{ background: '#F4C430' }}
                >
                  <svg width="16" height="14" viewBox="0 0 24 20" aria-hidden>
                    <path d="M2 6 L7 11 L12 3 L17 11 L22 6 L20 17 H4 Z" fill="#FFFCDC" stroke="#3D3833" strokeWidth="1.5" strokeLinejoin="round" />
                  </svg>
                </span>
              </Link>
            </div>
          </div>
        </div>

        {/* 하단 라벨들 */}
        <div className="mt-3 flex items-center justify-between">
          <button
            onClick={() => setTitleModal(true)}
            className="bg-primary/70 rounded-full pl-1 pr-3 py-0.5 text-[12px] font-bold text-text inline-flex items-center gap-1.5 active:scale-[.98]"
            aria-label="칭호 변경"
          >
            {u.ownedTitles.includes(u.activeTitleId) ? (
              <TitleIcon src={activeTitle.img} size={22} alt={activeTitle.name} />
            ) : (
              <span aria-hidden className="w-[22px] h-[22px] grid place-items-center text-[14px]">🔒</span>
            )}
            <span>{u.ownedTitles.includes(u.activeTitleId) ? activeTitle.name : '칭호 미획득'}</span>
          </button>
          <span className="text-[14px] font-bold text-text">챌린지 {u.cycle}회차</span>
        </div>

        {/* RECORD */}
        <div className="mt-5">
          <h3 className="font-bold tracking-[3px] text-[15px] text-text">RECORD</h3>
          <ul className="mt-2 grid grid-cols-6 gap-x-2 gap-y-3">
            {days.map((d) => {
              const photo = u.photos[d];
              const cellCls = `w-full aspect-square rounded-md overflow-hidden ${photo ? 'bg-white' : 'bg-text/65'}`;
              return (
                <li key={d} className="flex flex-col items-center">
                  {photo ? (
                    <button
                      type="button"
                      onClick={() => setZoomPhoto({ day: d, src: photo })}
                      aria-label={`${d}일차 인증 사진 크게 보기`}
                      className={`${cellCls} active:scale-[.97] transition`}
                    >
                      <img src={photo} alt="" className="w-full h-full object-cover" />
                    </button>
                  ) : (
                    <div className={cellCls} aria-label={`${d}일차 인증 없음`} />
                  )}
                  <span className="mt-1 text-[12px] font-bold text-text">{d}</span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* 워터마크 — 공유 이미지 캡쳐 시 같이 잡히도록 노트 카드 안에 배치.
            평소 화면에서도 작게 보이지만 디자인을 해치진 않는 톤. */}
        <div className="mt-5 pt-3 border-t border-text/10 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <img src="/jarin/logo_nobg.png" alt="" className="w-5 h-5 object-contain" draggable={false} />
            <span className="text-[11px] font-bold text-text/55 tracking-[1px]">자 린 고 비</span>
          </div>
          <span className="text-[10px] text-text/40">@4poor_project</span>
        </div>
      </section>

      {/* 칭호 모달 — 그리드 / 상세 두 화면 */}
      {titleModal && (
        <div
          className="fixed inset-0 z-50 bg-black/45 grid place-items-center px-5"
          onClick={closeTitleModal}
        >
          {detailTitle ? (
            <TitleDetail
              title={detailTitle}
              owned={u.ownedTitles.includes(detailTitle.id)}
              active={u.activeTitleId === detailTitle.id}
              ctx={titleCtx}
              onActivate={() => {
                u.update({ activeTitleId: detailTitle.id });
                playSuccessSfx();
                closeTitleModal();
              }}
              onChangeToThis={() => {
                u.update({ activeTitleId: detailTitle.id });
                playSuccessSfx();
                setDetailTitleId(null);
              }}
              onBackToGrid={() => setDetailTitleId(null)}
              onClose={() => setDetailTitleId(null)}
            />
          ) : (
            <TitleGrid
              activeTitleId={u.activeTitleId}
              ownedIds={u.ownedTitles}
              onPick={(id) => setDetailTitleId(id)}
              onClose={closeTitleModal}
            />
          )}
        </div>
      )}

      {/* 공유 미리보기 모달 — 캡쳐된 노트 카드 이미지를 보여주고 사용자에게
          "공유하기" / "이미지 저장" / "닫기" 액션 선택지를 줌. 인스타그램으로
          바로 공유하려면 navigator.share files 가 시스템 share sheet 를 띄워
          거기서 인스타·카톡 등 앱 선택. */}
      {sharePreview && (
        <div
          className="fixed inset-0 z-[60] bg-black/70 grid place-items-center px-5 py-6"
          onClick={() => !shareSending && closeSharePreview()}
        >
          <div
            className="w-full max-w-[300px] bg-bg rounded-3xl p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative">
              <p className="text-center font-bold text-[16px] text-text">공유 미리보기</p>
              <button
                onClick={closeSharePreview}
                disabled={shareSending}
                aria-label="닫기"
                className="absolute -right-1 -top-1 w-10 h-10 grid place-items-center text-[26px] leading-none text-text/70 font-bold disabled:opacity-50"
              >×</button>
            </div>

            {/* 미리보기 — 노트가 길어도 한 화면에 다 보이도록 object-contain + 화면 높이 제한.
                상세는 작아 보일 수 있지만 잘리지 않게 보여줘 사용자가 전체 모양 확인 가능. */}
            <div className="mt-3 bg-text/5 rounded-2xl p-2 grid place-items-center">
              <img
                src={sharePreview.dataUrl}
                alt="공유 미리보기"
                style={{ maxHeight: '48vh' }}
                className="max-w-full w-auto h-auto object-contain rounded-xl bg-white shadow-soft block"
              />
            </div>

            <p className="mt-3 text-center text-[12px] text-text/70 leading-relaxed">
              <span className="font-bold text-text">공유하기</span> 버튼을 누르면 인스타·카톡 등<br />
              앱을 골라 이미지를 그대로 올릴 수 있어요.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                onClick={downloadShareImage}
                disabled={shareSending}
                className="rounded-full py-3 text-[14px] font-bold bg-text/10 text-text active:scale-[.98] disabled:opacity-50"
              >
                이미지 저장
              </button>
              <button
                onClick={doShare}
                disabled={shareSending}
                className="rounded-full py-3 text-[14px] font-bold bg-accent text-white active:scale-[.98] disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
              >
                {shareSending ? (
                  <>여는 중…</>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M12 4v12" />
                      <path d="M7 9l5-5 5 5" />
                      <path d="M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" />
                    </svg>
                    공유하기
                  </>
                )}
              </button>
            </div>

            {/* 인스타 안내 — files share 미지원 환경(데스크톱 Safari 등) 사용자는 이미지 저장 후 직접 업로드 */}
            <p className="mt-3 text-[11px] text-text/45 text-center leading-relaxed">
              팁: 인스타그램 스토리에 올리고 싶다면 공유하기 → Instagram → 스토리 선택하세요.
              미지원 브라우저면 '이미지 저장' 후 갤러리에서 직접 업로드해 주세요.
            </p>
          </div>
        </div>
      )}

      {/* 인증샷 줌 모달 — RECORD 그리드의 사진 클릭 시. 사진은 카메라에서
          downscaleImage 로 줄여 저장되므로 원본 화질로 보이진 않음 — 안내 문구 함께. */}
      {zoomPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/85 grid place-items-center px-4 py-8"
          onClick={() => setZoomPhoto(null)}
        >
          <div
            className="w-full max-w-[420px] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between text-white px-1 mb-3">
              <span className="text-[14px] font-bold">{u.cycle}회차 · {zoomPhoto.day}일차</span>
              <button
                onClick={() => setZoomPhoto(null)}
                aria-label="닫기"
                className="w-9 h-9 grid place-items-center text-[24px] leading-none"
              >×</button>
            </div>
            <img
              src={zoomPhoto.src}
              alt={`${zoomPhoto.day}일차 인증`}
              className="w-full rounded-xl bg-white object-contain"
              style={{ maxHeight: '70vh', imageRendering: 'auto' }}
            />
            <p className="mt-3 text-[11px] text-white/55 text-center leading-relaxed">
              저장 공간 절약을 위해 사진은 작은 크기로 보관돼요. 더 크게 봐도 흐려질 수 있어요.
            </p>
          </div>
        </div>
      )}

      {/* 내 방 모달 */}
      {roomOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/55 grid place-items-center px-5"
          onClick={() => setRoomOpen(false)}
        >
          <div
            className="w-full max-w-[340px] bg-bg rounded-3xl p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative">
              <p className="text-center font-bold text-[16px] text-text">{u.nickname} 의 방</p>
              <button
                onClick={() => setRoomOpen(false)}
                aria-label="닫기"
                className="absolute right-0 top-0 w-9 h-9 grid place-items-center text-[24px] leading-none text-text/70 font-bold"
              >×</button>
            </div>
            <div className="mt-4">
              <RoomPreview equipped={u.equipped} className="mx-auto w-full" />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

/* ---------- 획득 칭호 그리드 ---------- */
function TitleGrid({
  activeTitleId, ownedIds, onPick, onClose,
}: {
  activeTitleId: string;
  ownedIds: string[];
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="w-full max-w-[340px] bg-bg rounded-3xl p-5 shadow-2xl max-h-[80vh] overflow-y-auto thin-scrollbar"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="relative">
        <p className="text-center font-bold text-[16px] text-text">획득 칭호</p>
        <button
          onClick={onClose}
          aria-label="닫기"
          className="absolute -right-1 -top-1 text-text/70 text-[26px] leading-none w-10 h-10 grid place-items-center font-bold"
        >
          ×
        </button>
      </div>
      <ul className="mt-4 grid grid-cols-3 gap-x-2 gap-y-4">
        {TITLES.map((t) => {
          const owned = ownedIds.includes(t.id);
          const active = t.id === activeTitleId;
          return (
            <li key={t.id} className="flex flex-col items-center">
              <button
                onClick={() => onPick(t.id)}
                className="relative w-[78px] h-[78px] grid place-items-center rounded-full active:scale-[.98] transition"
                aria-label={`${t.name} ${owned ? '획득' : '미획득'}`}
              >
                {active && (
                  <span className="absolute -top-1 -left-1 z-10 bg-pink text-white text-[10px] font-bold rounded-full px-2 py-0.5 shadow">
                    사용 중
                  </span>
                )}
                <TitleIcon src={t.img} size={78} locked={!owned} alt={t.name} />
                {!owned && (
                  <span className="absolute right-0 bottom-0 z-10 bg-white rounded-full p-1 text-text/70 shadow" aria-hidden>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="4" y="11" width="16" height="10" rx="2" />
                      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                    </svg>
                  </span>
                )}
              </button>
              <span className={`mt-1.5 text-[12px] font-bold text-center ${owned ? 'text-text' : 'text-text/45'}`}>
                {t.name}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ---------- 칭호 상세 ---------- */
function TitleDetail({
  title, owned, active, ctx, onActivate, onChangeToThis, onBackToGrid, onClose,
}: {
  title: Title;
  owned: boolean;
  active: boolean;
  ctx: { missionWinDays: Record<string, string[]>; totalSaveCount: number; cycle: number };
  onActivate: () => void;        // 활성화 + 모달 닫기
  onChangeToThis: () => void;    // 활성화 + 그리드로
  onBackToGrid: () => void;      // 그리드로 (활성화 X)
  onClose: () => void;
}) {
  const [lockAlert, setLockAlert] = useState(false);
  const prog = getTitleProgress(title, ctx);
  const totalCur = prog.entries.reduce((s, e) => s + e.cur, 0);
  const totalMax = prog.entries.reduce((s, e) => s + e.max, 0);
  // reqs가 비어있는 기본 칭호(초보 절약가 등)는 항상 100%
  const ratio = prog.entries.length === 0
    ? 1
    : totalMax > 0 ? Math.min(1, totalCur / totalMax) : 0;

  return (
    <div
      className="w-full max-w-[340px] bg-bg rounded-3xl p-5 shadow-2xl max-h-[85vh] overflow-y-auto thin-scrollbar"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="relative">
        <p className="text-center font-bold text-[16px] text-text">칭호</p>
        <button
          onClick={onClose}
          aria-label="닫기"
          className="absolute -right-1 -top-1 text-text/70 text-[26px] leading-none w-10 h-10 grid place-items-center font-bold"
        >
          ×
        </button>
      </div>

      {/* 아이콘 + 이름 + 진행도 */}
      <div className="mt-3 flex items-center gap-3">
        <div className="w-[64px] h-[64px] grid place-items-center shrink-0">
          <TitleIcon src={title.img} size={64} locked={!owned} alt={title.name} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[16px] font-bold text-text">{title.name}</p>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="text-[11px] font-bold text-text/55 shrink-0">진행도</span>
            <div className="flex-1 h-3 bg-white rounded-full overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-[width]"
                style={{ width: `${ratio * 100}%` }}
              />
            </div>
            <span className="text-[11px] font-bold text-text/70 shrink-0">{totalCur} / {totalMax}</span>
          </div>
        </div>
      </div>

      {/* 한 줄 설명 */}
      <p className="mt-4 text-center text-[14px] font-bold text-text">{title.tagline}</p>

      {/* 노트 카드 — 획득 방법 + tip */}
      <div className="mt-4 bg-grid-paper rounded-2xl px-4 py-4 shadow-soft">
        <p className="text-[13px] font-bold text-text">획득 방법</p>
        {prog.entries.length === 0 ? (
          <p className="mt-1.5 text-[12px] text-text/80 leading-relaxed">기본 보유 칭호</p>
        ) : (
          <ul className="mt-1.5 space-y-1">
            {prog.entries.map((e, i) => (
              <li key={i} className="text-[12px] text-text/80 leading-relaxed flex items-start gap-1.5">
                <span className={`shrink-0 ${e.met ? 'text-accent' : 'text-text/40'}`}>{e.met ? '✓' : '·'}</span>
                <span>{e.label} <span className="text-text/55">({e.cur}/{e.max})</span></span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-[13px] font-bold text-text">tip!</p>
        <p className="mt-1 text-[12px] text-text/80 leading-relaxed">{title.tip}</p>
        {!owned && prog.entries.length > 0 && (
          <p className="mt-3 text-[11px] text-text/55 leading-relaxed text-center">
            ※ 모든 조건을 만족하면 자동으로 획득됩니다.
          </p>
        )}
      </div>

      {/* 하단 버튼 — 둘 다 '이 칭호로 변경' 액션. 좌(획득): 모달 닫기, 우(변경): 그리드로 */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        {owned ? (
          <button
            onClick={active ? onClose : onActivate}
            className={`rounded-full py-3 text-[14px] font-bold transition ${
              active
                ? 'bg-accent/40 text-text/60'
                : 'bg-accent text-accent-soft active:scale-[.98]'
            }`}
          >
            {active ? '사용 중' : '칭호 획득'}
          </button>
        ) : (
          <button
            onClick={() => { setLockAlert(true); playDeniedSfx(); }}
            className="rounded-full py-3 text-[14px] font-bold bg-text/15 text-text/55 active:scale-[.98]"
          >
            칭호 미획득
          </button>
        )}
        <button
          onClick={owned && !active ? onChangeToThis : onBackToGrid}
          className="rounded-full py-3 text-[14px] font-bold bg-accent text-accent-soft active:scale-[.98]"
        >
          칭호 변경
        </button>
      </div>

      {/* 잠긴 칭호 클릭 시 안내 */}
      {lockAlert && (
        <div
          className="fixed inset-0 z-[60] bg-black/45 grid place-items-center px-7"
          onClick={() => setLockAlert(false)}
        >
          <div
            className="w-full max-w-[300px] bg-bg rounded-3xl p-5 text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[16px] font-bold text-text">아직 획득하지 못한 칭호입니다</p>
            <p className="mt-2 text-[12px] text-text/65 leading-relaxed">
              아래 획득 방법을 모두 만족하면<br />
              자동으로 칭호를 받을 수 있어요.
            </p>
            <button
              onClick={() => setLockAlert(false)}
              className="mt-4 w-full bg-accent text-white font-bold rounded-2xl py-3 text-[14px] active:scale-[.98]"
            >
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
