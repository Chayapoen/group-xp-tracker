export interface TempUserRow {
  id: string;
  username: string;
  password_hash: string;
  group_name: string;
  is_active: boolean;
  created_at: string;
}

export interface ScoreCategoryRow {
  id: string;
  title: string;
  sort_order: number;
  created_at: string;
}

export interface ScoreItemRow {
  id: string;
  category_id: string;
  title: string;
  xp: number;
  sort_order: number;
  created_at?: string;
}

export interface UserScoreRow {
  id?: string;
  user_id: string;
  item_id: string;
  passed: boolean;
  updated_at?: string;
}

export interface ScoreHistoryRow {
  id: string;
  user_id: string;
  item_id: string | null;
  category_title: string;
  item_title: string;
  xp: number;
  passed: boolean;
  changed_by: string;
  created_at: string;
}

export interface EvidencePhotoRow {
  id: string;
  user_id: string;
  category_id: string | null;
  title: string;
  storage_path: string;
  public_url: string;
  created_at: string;
}
