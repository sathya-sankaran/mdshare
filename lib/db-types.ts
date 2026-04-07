export interface DocumentRow {
  id: string;
  title: string;
  content: string;
  content_hash: string;
  created_at: string;
  updated_at: string;
}

export interface LinkRow {
  id: string;
  document_id: string;
  token_prefix: string;
  token_hash: string;
  permission: string;
  label: string | null;
  is_active: number;
  expires_at: string | null;
  created_at: string;
}

export interface CommentRow {
  id: string;
  document_id: string;
  author_name: string;
  content: string;
  anchor_text: string | null;
  anchor_start: number | null;
  anchor_end: number | null;
  resolved: number;
  created_at: string;
}

export interface VersionRow {
  id: string;
  document_id: string;
  content: string;
  content_hash: string;
  edited_via: string | null;
  created_at: string;
}
