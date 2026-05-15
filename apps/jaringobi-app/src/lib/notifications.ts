// 로컬 푸시 알림 — 아침(챌린지 등록 안내) / 저녁(완료 인증 안내) 자동 스케줄.
//
// 동작 요약
// - Native(안드로이드) 에서만 활성화. 웹/dev 환경은 no-op 으로 무해하게 통과.
// - 향후 30 일치 일일 알림을 개별 스케줄로 등록. (recurring 대신 개별로 등록해야
//   "오늘 인증 완료 → 그날 저녁 알림만 취소" 같은 세밀한 제어가 가능.)
// - reconcile() 호출 시 이전에 등록한 우리 알림(id 1xxxxxxx / 2xxxxxxx)을 모두
//   취소하고 현재 상태 기준으로 다시 짜준다.
// - "오늘 이미 챌린지 완료" 판정은 lastSavedAt 이 마지막 새벽 4시 이후인지로 검사.
//   (새벽 4시 = 미션 잠금 해제 시각. userState 의 nextMissionAvailableAt 과 동일 기준.)
//
// 스케줄 ID 규칙
// - 아침: 1{YYYYMMDD}  (예: 120260516)
// - 저녁: 2{YYYYMMDD}
//   날짜 기반 deterministic → 새로 reconcile 해도 같은 날짜는 같은 ID 라
//   "취소 후 재등록" 시 중복 등록 위험 없음.

import { Capacitor } from '@capacitor/core';

import type { UserSettings } from './userState';

const MORNING_TITLE = '오늘도 한 푼! 💰';
const MORNING_BODY = '챌린지 등록하러 가기';
const EVENING_TITLE = '오늘 절약 성공하셨나요? 💰';
const EVENING_BODY = '인증하고 하루를 마무리해요';

// 미션 잠금 해제 시각 (userState.ts 의 MISSION_UNLOCK_HOUR 와 일치)
const MISSION_UNLOCK_HOUR = 4;
// 미리 등록해 둘 일수. 사용자가 한동안 앱을 안 열어도 알림은 계속 가도록.
const SCHEDULE_DAYS_AHEAD = 30;

// 동적 import — @capacitor/local-notifications 가 dev/web 빌드 환경에 없어도
// 빌드/런타임 에러가 나지 않게. native 일 때만 실제 모듈 로드.
type LocalNotificationsModule = typeof import('@capacitor/local-notifications');
let _modulePromise: Promise<LocalNotificationsModule | null> | null = null;
async function loadModule(): Promise<LocalNotificationsModule | null> {
  if (!Capacitor.isNativePlatform()) return null;
  if (!_modulePromise) {
    _modulePromise = import('@capacitor/local-notifications').catch((err) => {
      console.warn('[notifications] @capacitor/local-notifications 로드 실패', err);
      return null;
    });
  }
  return _modulePromise;
}

function parseHM(s: string): { h: number; m: number } | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min)) return null;
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return { h, m: min };
}

function ymdKey(d: Date): number {
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

function morningId(d: Date): number {
  // 1 + YYYYMMDD → 안전하게 32bit signed int 범위 안
  return 100000000 + ymdKey(d);
}
function eveningId(d: Date): number {
  return 200000000 + ymdKey(d);
}

/** 가장 최근에 지난 새벽 4시 시각 (오늘 4시 또는 어제 4시). */
function lastUnlockBoundary(now: Date): Date {
  const b = new Date(now);
  b.setHours(MISSION_UNLOCK_HOUR, 0, 0, 0);
  if (b > now) b.setDate(b.getDate() - 1);
  return b;
}

/** 오늘(=마지막 새벽 4시 이후) 챌린지 인증을 이미 완료했는지. */
export function isCompletedToday(lastSavedAt: string | null, now: Date = new Date()): boolean {
  if (!lastSavedAt) return false;
  const t = new Date(lastSavedAt).getTime();
  if (Number.isNaN(t)) return false;
  return t >= lastUnlockBoundary(now).getTime();
}

/** Android 13+ 알림 권한 요청. 거부돼도 앱 흐름은 계속. */
export async function requestNotificationPermission(): Promise<boolean> {
  const mod = await loadModule();
  if (!mod) return false;
  try {
    const { LocalNotifications } = mod;
    const status = await LocalNotifications.checkPermissions();
    if (status.display === 'granted') return true;
    const req = await LocalNotifications.requestPermissions();
    return req.display === 'granted';
  } catch (err) {
    console.warn('[notifications] 권한 요청 실패', err);
    return false;
  }
}

/**
 * 우리 앱이 등록한 모든 알림 + 향후 30 일치 후보 ID 를 취소.
 * (현재 pending 만 가져와 우리 ID 패턴만 골라 취소 — 다른 알림 영향 X.)
 */
async function cancelAllOurs(): Promise<void> {
  const mod = await loadModule();
  if (!mod) return;
  const { LocalNotifications } = mod;
  try {
    const pending = await LocalNotifications.getPending();
    const ours = pending.notifications
      .map((n) => Number(n.id))
      .filter((id) => Number.isFinite(id) && (Math.floor(id / 100000000) === 1 || Math.floor(id / 100000000) === 2));
    if (ours.length > 0) {
      await LocalNotifications.cancel({ notifications: ours.map((id) => ({ id })) });
    }
  } catch (err) {
    console.warn('[notifications] 기존 알림 취소 실패', err);
  }
}

/**
 * 현재 설정과 사용자 상태(lastSavedAt) 기준으로 향후 30 일치 알림 재등록.
 *
 * 동작:
 * 1. 우리 앱이 등록했던 모든 pending 알림 취소.
 * 2. settings.notifyMorning / notifyEvening 가 ON 인 항목에 대해 30 일치 스케줄.
 *    - 이미 지난 시각은 스킵 (특히 오늘분).
 *    - 오늘 저녁 알림: lastSavedAt 기준 이미 완료라면 스킵 (스마트).
 *
 * Web/iOS·권한 미허용 등에서는 무해하게 통과.
 */
export async function reconcileNotifications(
  settings: UserSettings,
  lastSavedAt: string | null,
  now: Date = new Date(),
): Promise<void> {
  const mod = await loadModule();
  if (!mod) return;
  const { LocalNotifications } = mod;

  // 권한 미허용 상태면 스케줄해도 표시 안 됨 → 권한부터 확인 (한 번만 prompt).
  const perm = await LocalNotifications.checkPermissions();
  if (perm.display !== 'granted') {
    // 첫 진입 시 권한 요청은 NotificationsBootstrap 에서 별도로 호출.
    // 여기서는 sliently skip — 다음 reconcile 때 자연스럽게 처리.
    await cancelAllOurs();
    return;
  }

  await cancelAllOurs();

  const morning = parseHM(settings.notifyMorningTime);
  const evening = parseHM(settings.notifyEveningTime);
  const completedToday = isCompletedToday(lastSavedAt, now);

  const toSchedule: {
    id: number;
    title: string;
    body: string;
    schedule: { at: Date; allowWhileIdle: true };
    smallIcon: string;
  }[] = [];

  for (let i = 0; i < SCHEDULE_DAYS_AHEAD; i++) {
    const day = new Date(now);
    day.setDate(day.getDate() + i);
    day.setHours(0, 0, 0, 0);

    if (settings.notifyMorning && morning) {
      const at = new Date(day);
      at.setHours(morning.h, morning.m, 0, 0);
      if (at.getTime() > now.getTime()) {
        toSchedule.push({
          id: morningId(day),
          title: MORNING_TITLE,
          body: MORNING_BODY,
          schedule: { at, allowWhileIdle: true },
          smallIcon: 'ic_stat_icon_config_sample',
        });
      }
    }

    if (settings.notifyEvening && evening) {
      const at = new Date(day);
      at.setHours(evening.h, evening.m, 0, 0);
      if (at.getTime() > now.getTime()) {
        // 오늘분 저녁 알림: 이미 인증 완료라면 스킵
        const isToday = i === 0;
        if (!(isToday && completedToday)) {
          toSchedule.push({
            id: eveningId(day),
            title: EVENING_TITLE,
            body: EVENING_BODY,
            schedule: { at, allowWhileIdle: true },
            smallIcon: 'ic_stat_icon_config_sample',
          });
        }
      }
    }
  }

  if (toSchedule.length === 0) return;
  try {
    await LocalNotifications.schedule({ notifications: toSchedule });
  } catch (err) {
    console.warn('[notifications] 알림 스케줄 실패', err);
  }
}
