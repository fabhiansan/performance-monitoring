
export interface CompetencyScore {
  name: string;
  score: number;
}

export interface Employee {
  name: string;
  job: string;
  performance: CompetencyScore[];
}
