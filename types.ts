

export interface CompetencyScore {
  name: string;
  score: number;
}

export interface Employee {
  id: number;
  name: string;
  nip: string;
  gol: string;
  pangkat: string;
  position: string;
  sub_position: string;
  organizational_level: string;
  performance: CompetencyScore[];
  created_at?: string;
  updated_at?: string;
}


export interface EmployeeWithSummary extends Employee {
  summary?: string;
}

export interface Dataset {
  id: number;
  name: string;
  createdAt: string;
  employeeCount: number;
}

