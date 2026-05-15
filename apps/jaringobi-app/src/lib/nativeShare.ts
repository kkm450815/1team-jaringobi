// 안드로이드 Capacitor 환경에서 이미지를 갤러리에 저장하거나 시스템 공유 시트로
// 보내기 위한 헬퍼. 웹(브라우저)에서는 navigator.share / <a download> 폴백.
//
// Capacitor 미설치 또는 웹 환경에서는 throw — 호출자가 catch 후 웹 폴백 처리.

import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export function isNative(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/** Blob 을 base64 (data: 접두어 제외 순수 base64) 로 변환 */
async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('blob to base64 변환 실패'));
        return;
      }
      const idx = result.indexOf(',');
      resolve(idx >= 0 ? result.slice(idx + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error('FileReader 에러'));
    reader.readAsDataURL(blob);
  });
}

/**
 * 안드로이드: 외부 저장소(Documents)에 파일로 저장 후 경로 반환.
 * 사용자는 갤러리/파일 앱에서 확인 가능.
 */
export async function nativeSaveImage(blob: Blob, fileName: string): Promise<string> {
  const data = await blobToBase64(blob);
  const result = await Filesystem.writeFile({
    path: fileName,
    data,
    directory: Directory.Documents,
    recursive: true,
  });
  return result.uri;
}

/**
 * 안드로이드: Documents 에 임시 저장 후 시스템 공유 시트 호출 (인스타·카톡 등 선택).
 */
export async function nativeShareImage(blob: Blob, fileName: string, text: string): Promise<void> {
  const uri = await nativeSaveImage(blob, fileName);
  await Share.share({
    title: '자린고비',
    text,
    url: uri,
    dialogTitle: '자린고비 공유',
  });
}
