export interface Album {
  id: string;
  name: string;
  artist: string;
  year?: string;
  cover_art_url?: string;
  track_count: number;
}
