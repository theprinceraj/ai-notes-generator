/** Text spoken during one minute of the class. */
export interface TranscriptLine {
  minute: number;
  text: string;
}

/** A contact sheet image and the span of video time (in seconds) its frames cover. */
export interface Sheet {
  path: string;
  start: number;
  end: number;
}

/** A slice of the class sent to Claude in one request. */
export interface Part {
  start: number;
  end: number;
  lines: TranscriptLine[];
  images: Sheet[];
}

export type Language = 'hindi' | 'english' | 'hinglish';

/** What we keep about a video in work/<id>/meta.json. */
export interface VideoMeta {
  id: string;
  title: string;
  /** YYYY-MM-DD */
  date: string;
  episode: string | null;
  teacher: string | null;
  /** Unix seconds */
  startedAt: number | null;
  duration: number | null;
}

/** The subset of yt-dlp's video JSON that we read. */
export interface VideoInfo {
  id: string;
  title: string;
  upload_date?: string;
  release_timestamp?: number;
  timestamp?: number;
  duration?: number;
  live_status?: string;
}
