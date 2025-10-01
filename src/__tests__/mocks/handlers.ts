import { http, HttpResponse } from 'msw'
import { Employee, CompetencyScore } from '../../../types'

// Constants for repeated strings
const CURRENT_DATASET_API = '/api/current-dataset';

interface DatasetRequestBody {
  name?: string;
  employees?: Employee[];
}

interface CurrentDatasetRequestBody {
  datasetId?: number;
  employees?: Employee[];
}

interface EmployeeSummaryRequestBody {
  summary?: string;
}

// Mock data
const mockEmployees: Employee[] = [
  {
    name: 'John Doe',
    organizational_level: 'Manager',
    performance: [
      { name: 'Communication', score: 85 },
      { name: 'Leadership', score: 78 },
      { name: 'Problem Solving', score: 92 },
    ] as CompetencyScore[],
  },
  {
    name: 'Jane Smith',
    organizational_level: 'Senior Staff',
    performance: [
      { name: 'Communication', score: 90 },
      { name: 'Leadership', score: 85 },
      { name: 'Problem Solving', score: 88 },
    ] as CompetencyScore[],
  },
]

const mockDatasets = [
  {
    id: 1,
    name: 'Q1 2024 Performance Data',
    employee_count: 25,
    created_at: '2024-01-15T10:00:00Z',
  },
  {
    id: 2,
    name: 'Q2 2024 Performance Data',
    employee_count: 28,
    created_at: '2024-04-15T10:00:00Z',
  },
]

export const handlers = [
  // Health check
  http.get('/api/health', () => {
    return HttpResponse.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    })
  }),

  // Get all datasets
  http.get('/api/datasets', () => {
    return HttpResponse.json({
      success: true,
      data: mockDatasets,
      metadata: { total: mockDatasets.length }
    })
  }),

  // Get specific dataset
  http.get('/api/datasets/:id', ({ params }) => {
    const { id } = params
    const dataset = mockDatasets.find(d => d.id === Number(id))
    
    if (!dataset) {
      return HttpResponse.json(
        { success: false, error: 'Dataset not found' },
        { status: 404 }
      )
    }

    return HttpResponse.json({
      success: true,
      data: dataset
    })
  }),

  // Save new dataset
  http.post('/api/datasets', async ({ request }) => {
    const body = await request.json() as DatasetRequestBody
    const newDataset = {
      id: mockDatasets.length + 1,
      name: body.name || 'Untitled Dataset',
      employee_count: body.employees?.length || 0,
      created_at: new Date().toISOString(),
    }
    
    return HttpResponse.json({
      success: true,
      data: newDataset
    })
  }),

  // Delete dataset
  http.delete('/api/datasets/:id', ({ params }) => {
    const { id } = params
    const exists = mockDatasets.some(d => d.id === Number(id))
    
    if (!exists) {
      return HttpResponse.json(
        { success: false, error: 'Dataset not found' },
        { status: 404 }
      )
    }

    return HttpResponse.json({
      success: true,
      message: 'Dataset deleted successfully'
    })
  }),

  // Get current dataset
  http.get(CURRENT_DATASET_API, () => {
    return HttpResponse.json({
      success: true,
      data: {
        employees: mockEmployees,
        metadata: {
          total_employees: mockEmployees.length,
          last_updated: new Date().toISOString()
        }
      }
    })
  }),

  // Save current dataset
  http.post(CURRENT_DATASET_API, async ({ request }) => {
    const body = await request.json() as CurrentDatasetRequestBody
    
    return HttpResponse.json({
      success: true,
      data: {
        employees: body.employees || [],
        metadata: {
          total_employees: body.employees?.length || 0,
          last_updated: new Date().toISOString()
        }
      }
    })
  }),

  // Clear current dataset
  http.delete(CURRENT_DATASET_API, () => {
    return HttpResponse.json({
      success: true,
      message: 'Current dataset cleared'
    })
  }),

  // Update employee summary
  http.patch(`${CURRENT_DATASET_API}/employee/:name/summary`, async ({ params, request }) => {
    const { name } = params
    const body = await request.json() as EmployeeSummaryRequestBody
    
    return HttpResponse.json({
      success: true,
      data: {
        name: decodeURIComponent(name as string),
        summary: body.summary || '',
        updated_at: new Date().toISOString()
      }
    })
  }),

  // Error handler for unhandled requests
  http.all('*', ({ request }) => {
    console.warn(`Unhandled ${request.method} request to ${request.url}`)
    return HttpResponse.json(
      { success: false, error: 'Endpoint not found' },
      { status: 404 }
    )
  })
]