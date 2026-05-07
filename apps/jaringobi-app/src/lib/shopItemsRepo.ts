// 관리자가 추가한 상점 아이템 (shop_items 테이블).
// 기존 하드코딩 SHOP_GROUPS 와 별개로 동작 — App 가 둘을 합쳐 노출.
//
// 이미지는 Supabase Storage 의 'shop-images' 버킷에 저장 (public read).
// 한 아이템당 두 이미지: shop(진열용) + fit(캐릭터 위 오버레이용).

import { getSupabase, isSupabaseEnabled } from './supabase';

export type ShopCategory = '사치품' | '티셔츠' | '리모델링';
export type AccSubCat = '모자' | '안경' | '소지품';
export type RemodelSubCat = '조명' | '소품' | '가구1' | '가구2' | '벽지';

export interface ShopItem {
  id: string;
  category: ShopCategory;
  subCategory: string | null;
  shopImageUrl: string;
  fitImageUrl: string;
  price: number;
  sortOrder: number;
  active: boolean;
  label: string | null;
  createdAt?: string;
}

interface ShopItemRow {
  id: string;
  category: ShopCategory;
  sub_category: string | null;
  shop_image_url: string;
  fit_image_url: string;
  price: number;
  sort_order: number;
  active: boolean;
  label: string | null;
  created_at?: string;
  updated_at?: string;
}

function rowToItem(r: ShopItemRow): ShopItem {
  return {
    id: r.id,
    category: r.category,
    subCategory: r.sub_category,
    shopImageUrl: r.shop_image_url,
    fitImageUrl: r.fit_image_url,
    price: r.price,
    sortOrder: r.sort_order,
    active: r.active,
    label: r.label,
    createdAt: r.created_at,
  };
}

function itemToRow(i: ShopItem): Partial<ShopItemRow> {
  const row: Partial<ShopItemRow> = {
    category: i.category,
    sub_category: i.subCategory,
    shop_image_url: i.shopImageUrl,
    fit_image_url: i.fitImageUrl,
    price: i.price,
    sort_order: i.sortOrder,
    active: i.active,
    label: i.label,
    updated_at: new Date().toISOString(),
  };
  if (i.id) row.id = i.id;
  return row;
}

export interface ShopItemsRepo {
  /** 사용자용 — active 항목만 */
  listActive(): Promise<ShopItem[]>;
  /** admin 용 — 전체 */
  listAll(): Promise<ShopItem[]>;
  upsert(item: ShopItem): Promise<ShopItem>;
  remove(id: string): Promise<void>;
  /** 파일 업로드 → public URL 반환 */
  uploadImage(file: File, kind: 'shop' | 'fit'): Promise<string>;
  subscribe(cb: () => void): () => void;
}

const localRepo: ShopItemsRepo = {
  async listActive() { return []; },
  async listAll() { return []; },
  async upsert(i) { return i; },
  async remove() { /* no-op */ },
  async uploadImage() { throw new Error('Storage 미설정 — Supabase 환경변수 필요'); },
  subscribe() { return () => {}; },
};

const BUCKET = 'shop-images';

const supabaseRepo: ShopItemsRepo = {
  async listActive() {
    const sb = getSupabase();
    if (!sb) return [];
    const { data, error } = await sb
      .from('shop_items')
      .select('*')
      .eq('active', true)
      .order('sort_order', { ascending: true });
    if (error) {
      console.error('[shopItemsRepo.listActive] 실패', error);
      return [];
    }
    return (data ?? []).map((r: ShopItemRow) => rowToItem(r));
  },

  async listAll() {
    const sb = getSupabase();
    if (!sb) throw new Error('Supabase not configured');
    const { data, error } = await sb
      .from('shop_items')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error) {
      console.error('[shopItemsRepo.listAll] 실패', error);
      throw error;
    }
    return (data ?? []).map((r: ShopItemRow) => rowToItem(r));
  },

  async upsert(item) {
    const sb = getSupabase();
    if (!sb) throw new Error('Supabase not configured');
    const row = itemToRow(item);
    const { data, error } = await sb
      .from('shop_items')
      .upsert(row, { onConflict: 'id' })
      .select()
      .single();
    if (error) {
      console.error('[shopItemsRepo.upsert] 실패', { row, error });
      throw error;
    }
    return rowToItem(data as ShopItemRow);
  },

  async remove(id) {
    const sb = getSupabase();
    if (!sb) throw new Error('Supabase not configured');
    const { error } = await sb.from('shop_items').delete().eq('id', id);
    if (error) {
      console.error('[shopItemsRepo.remove] 실패', { id, error });
      throw error;
    }
  },

  async uploadImage(file, kind) {
    const sb = getSupabase();
    if (!sb) throw new Error('Supabase not configured');
    // 파일명 충돌 회피: kind/timestamp_random_filename
    const ext = (file.name.split('.').pop() || 'png').toLowerCase();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 40);
    const path = `${kind}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${safeName}.${ext}`;

    const { error: uploadErr } = await sb.storage
      .from(BUCKET)
      .upload(path, file, { upsert: false, contentType: file.type || 'image/png' });
    if (uploadErr) {
      console.error('[shopItemsRepo.uploadImage] 업로드 실패', { path, uploadErr });
      throw uploadErr;
    }
    // public URL 받기
    const { data: pub } = sb.storage.from(BUCKET).getPublicUrl(path);
    if (!pub?.publicUrl) {
      throw new Error('업로드는 됐지만 public URL 을 못 받았어요. 버킷이 public 인지 확인하세요.');
    }
    return pub.publicUrl;
  },

  subscribe(cb) {
    const sb = getSupabase();
    if (!sb) return () => {};
    const channel = sb
      .channel('shop_items_changes')
      .on(
        'postgres_changes' as 'system',
        { event: '*', schema: 'public', table: 'shop_items' },
        () => cb(),
      )
      .subscribe();
    return () => { sb.removeChannel(channel); };
  },
};

export const shopItemsRepo: ShopItemsRepo = isSupabaseEnabled() ? supabaseRepo : localRepo;
