import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { TopBar } from '../components/UI';
import { TALK_ROOMS } from '../lib/data';

interface Post { id: string; nick: string; body: string; bookmarked: boolean }

const SEED: Post[] = [
  { id: 'p1', nick: '짠돌이새싹',  body: '편의점 1+1 도시락 두 끼 가능... 진짜 가성비 갑이에요!', bookmarked: false },
  { id: 'p2', nick: '집순이 9년차', body: '레토르트 + 계란 + 김치 = 1식 1500원으로 해결', bookmarked: true },
  { id: 'p3', nick: '하루무지출',  body: '도서관에서 노트북 하루종일 사용, 카페비 0원', bookmarked: false },
  { id: 'p4', nick: '재테크초보',  body: '당근 정리해서 8만원 추가 수입 했어요', bookmarked: false },
];

export default function TalkRoom() {
  const { id } = useParams();
  const room = TALK_ROOMS.find((r) => r.id === id) ?? TALK_ROOMS[0];
  const [posts, setPosts] = useState(SEED);
  const [input, setInput] = useState('');

  function send() {
    if (!input.trim()) return;
    setPosts((p) => [{ id: crypto.randomUUID(), nick: '나', body: input, bookmarked: false }, ...p]);
    setInput('');
  }

  function toggleMark(pid: string) {
    setPosts((p) => p.map((x) => (x.id === pid ? { ...x, bookmarked: !x.bookmarked } : x)));
  }

  return (
    <main className="min-h-full pb-24">
      <TopBar
        back="/talk"
        title={<span>{room.title}</span>}
        right={
          <button aria-label="스크랩 보관함" className="text-pink text-[18px]">
            <img src="/jarin/talk_bookmark.png" alt="" className="w-6 h-6 object-contain inline-block" />
          </button>
        }
      />

      {/* 입력 폼 */}
      <section className="mx-5 bg-white rounded-2xl shadow-soft p-3 flex items-start gap-2.5">
        <div className="w-9 h-9 rounded-full bg-primary text-white grid place-items-center font-bold text-[12px]">나</div>
        <textarea
          rows={2}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="하고 싶은 말이 있나요?"
          className="flex-1 resize-none outline-none text-[13px] placeholder:text-text/40"
        />
        <button onClick={send} className="text-accent text-[12px] font-bold whitespace-nowrap">올리기</button>
      </section>

      {/* 피드 */}
      <ul className="mt-3 px-5 space-y-3">
        {posts.map((p) => (
          <li key={p.id} className="flex items-start gap-2.5 bg-bg/0">
            <div className="w-9 h-9 rounded-full bg-text/15 grid place-items-center text-[12px] font-bold">
              {p.nick.slice(0, 1)}
            </div>
            <div className="flex-1">
              <p className="text-[12px] font-bold">{p.nick}</p>
              <p className="text-[13px] mt-0.5 leading-relaxed">{p.body}</p>
            </div>
            <button onClick={() => toggleMark(p.id)} aria-label="스크랩" className="text-[18px] leading-none">
              {p.bookmarked ? <span className="text-pink">★</span> : <span className="text-text/30">☆</span>}
            </button>
          </li>
        ))}
      </ul>

      <Link to="/talk" className="block text-center mt-6 text-[12px] text-text/50 underline">목록으로</Link>
    </main>
  );
}
