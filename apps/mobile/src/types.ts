export type Profile = {
  id: string;
  name: string;
  role: 'teacher' | 'student';
  school_id: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  student_number?: string | null;
  employee_number?: string | null;
  school_name?: string;
  department?: string;
  faculty_id?: string;
  student_id?: string;
  course?: string;
  year_level?: string;
  avatar_url?: string | null;
};
export type Classroom = {
  id: string;
  name: string;
  subject: string;
  description: string;
  teacher_id: string;
  teacher_name: string;
  member_count: number;
  code_expires_at: string | null;
};
export type Option = { id: string; text: string };
export type Question = {
  id: string;
  prompt: string;
  options: Option[];
  correctOptionId?: string;
  explanation?: string;
  sourceParagraph?: number;
};
export type Assessment = {
  id: string;
  class_id: string;
  class_name?: string;
  title: string;
  lesson?: string;
  questions?: Question[];
  announcement: string;
  announce_at: string;
  opens_at: string;
  closes_at: string;
  duration_minutes: number;
  version: number;
  state: string;
  source?: string;
  digest?: string;
};
export type Slot = { starts_at: string; ends_at: string; location: string; timezone: string };
export type Booking = Slot & {
  id: string;
  teacher_name: string;
  student_name: string;
  status: string;
};
export type Teacher = { id: string; name: string };
export type CalendarEvent = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  kind: string;
};
export type Notice = {
  id: string;
  title: string;
  body: string;
  created_at: string;
  read_at: string | null;
};
export type Attempt = {
  id: string;
  assessment_id: string;
  responses: Record<string, string>;
  submitted_at: string | null;
  deadline: string;
  student_name?: string;
  version: number;
};
export type Rules = {
  timezone: 'Asia/Manila';
  enabled: boolean;
  duration: number;
  buffer: number;
  noticeHours: number;
  horizonDays: number;
  location: string;
  windows: { weekday: number; start: string; end: string }[];
  blockedDates: string[];
};
export type Job = {
  id: string;
  title: string;
  kind: string;
  state: string;
  last_error: string | null;
  due_at: string;
};
export type Config = {
  supabaseUrl: string;
  supabaseKey: string;
  aiConfigured: boolean;
  sampleEnabled: boolean;
  timezone: string;
};
