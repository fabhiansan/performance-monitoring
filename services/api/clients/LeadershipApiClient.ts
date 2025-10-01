import { createValidationError } from '../../errorHandler';
import { BaseApiClient } from '../core/ApiClient';
import { ApiClientConfig } from '../interfaces/ApiInterfaces';

export class LeadershipApiClient extends BaseApiClient {
  constructor(config: ApiClientConfig) {
    super(config);
  }

  async getManualLeadershipScores(): Promise<Record<string, number>> {
    return this.get<Record<string, number>>('/current-dataset/leadership-scores', {
      operation: 'getManualLeadershipScores'
    });
  }

  async setManualLeadershipScore(employeeName: string, score: number): Promise<void> {
    if (!employeeName || employeeName.trim() === '') {
      throw createValidationError(
        'Employee name is required',
        { operation: 'setManualLeadershipScore' }
      );
    }

    if (typeof score !== 'number' || score < 0 || score > 100) {
      throw createValidationError(
        'Score must be a number between 0 and 100',
        { operation: 'setManualLeadershipScore' }
      );
    }

    await this.put<void>(
      `/current-dataset/leadership-scores/${encodeURIComponent(employeeName)}`,
      { score },
      { operation: 'setManualLeadershipScore' }
    );
  }

  async bulkUpdateManualLeadershipScores(scores: Record<string, number>): Promise<void> {
    if (!scores || typeof scores !== 'object') {
      throw createValidationError(
        'Scores must be an object with employee names as keys and scores as values',
        { operation: 'bulkUpdateManualLeadershipScores' }
      );
    }

    // Validate all scores
    for (const [employeeName, score] of Object.entries(scores)) {
      if (!employeeName || employeeName.trim() === '') {
        throw createValidationError(
          'Employee name is required',
          { operation: 'bulkUpdateManualLeadershipScores' }
        );
      }

      if (typeof score !== 'number' || score < 0 || score > 100) {
        throw createValidationError(
          `Score for ${employeeName} must be a number between 0 and 100`,
          { operation: 'bulkUpdateManualLeadershipScores' }
        );
      }
    }

    await this.put<void>('/current-dataset/leadership-scores/bulk', {
      scores
    }, {
      operation: 'bulkUpdateManualLeadershipScores'
    });
  }
}