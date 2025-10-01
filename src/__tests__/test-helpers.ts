// Helper functions for common test scenarios
export const mockEmployee = {
  name: 'Test Employee',
  organizational_level: 'Staff',
  performance: [
    { name: 'Communication', score: 85 },
    { name: 'Leadership', score: 78 },
    { name: 'Problem Solving', score: 92 },
  ],
}

export const mockCompetencyScore = {
  name: 'Test Competency',
  score: 85,
}

export const createMockEmployee = (overrides = {}) => ({
  ...mockEmployee,
  ...overrides,
})

export const createMockCompetencyScore = (overrides = {}) => ({
  ...mockCompetencyScore,
  ...overrides,
})
