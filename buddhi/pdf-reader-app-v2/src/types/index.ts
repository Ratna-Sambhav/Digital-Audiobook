// src/types/index.ts

export type User = {
  id: string;
  email: string;
  name: string;
  picture?: string;
};

export type Session = {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type UploadedFile = {
  id: string;
  sessionId: string;
  userId: string;
  fileName: string;
  fileType: string;
  s3Key: string;
  s3Url: string;
  uploadedAt: string;
  size: number;
  temp_url: string;
  notes: boolean;
};

export type AuthContextType = {
  user: User | null;
  login: (credential: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
};

export type FileType = 'pdf' | 'image';

// NEW TEST TYPES
export type Test = {
  id: string;
  sessionId: string;
  userId: string;
  test_name: string;
  num_questions: number;
  source_file_name: string;
  source_pages: string;
  attempted_number: number | null;
  correct_responses: number | null;
  created_at: string;
};

export type TestQuestion = {
  id: string;
  sessionId: string;
  userId: string;
  test_name: string;
  question: string;
  options: string[];
  correct_option: number;
  user_response: number | null;
  created_at: string;
};


