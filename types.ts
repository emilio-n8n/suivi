
export interface Comment {
  id: string;
  timestamp: number;
  text: string;
  audioUrl?: string;
}

export interface Student {
  id: string;
  name: string;
  className: string;
  notes: string;
  comments: Comment[];
  createdAt: number;
}

export type ViewState = 'list' | 'detail' | 'summary';
