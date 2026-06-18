export interface Playlist {
  id: string;
  name: string;
  description: string;
  cover_art?: string;
  created_at: number;
  updated_at: number;
  track_count?: number;
  cover_art_grid?: string[];
}
