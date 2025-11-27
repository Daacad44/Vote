export type Candidate = {
  id: string;
  name: string;
  party?: string | null;
  manifesto?: string | null;
  photoUrl?: string | null;
};

export type Election = {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  startTime: string;
  endTime: string;
  candidates: Candidate[];
};

export type User = {
  id: string;
  name: string;
  stdId: string;
  email: string;
  role: "ADMIN" | "STUDENT";
  faculty?: string | null;
  department?: string | null;
};

export type ElectionResult = {
  id: string;
  name: string;
  party?: string | null;
  votes: number;
};
