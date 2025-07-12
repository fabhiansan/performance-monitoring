# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Start frontend only**: `npm run dev`
- **Start backend server**: `npm run server`
- **Start both frontend and backend**: `npm run dev:full`
- **Build for production**: `npm run build`
- **Preview production build**: `npm run preview`
- **Install dependencies**: `npm install`

## Environment Setup

- Create `.env.local` file with `GEMINI_API_KEY` for AI-powered performance summaries
- The app uses Vite's environment loading to inject the API key at build time
- Backend server runs on port 3001 and creates a SQLite database for data persistence

## Architecture Overview

This is a full-stack dashboard application with React + TypeScript frontend and Node.js + SQLite backend that analyzes employee performance data from CSV format and generates AI-powered summaries using Google's Gemini API.

### Backend Components

- **server/server.js**: Express API server with RESTful endpoints
- **server/database.js**: SQLite database service using better-sqlite3
- **Database**: SQLite database with tables for datasets, employees, and performance scores

### API Endpoints

- `GET /api/health` - Health check
- `GET /api/datasets` - Get all saved datasets
- `GET /api/datasets/:id` - Get specific dataset
- `POST /api/datasets` - Save new dataset
- `DELETE /api/datasets/:id` - Delete dataset
- `GET /api/current-dataset` - Get current active dataset
- `POST /api/current-dataset` - Save current dataset
- `DELETE /api/current-dataset` - Clear current dataset
- `PATCH /api/current-dataset/employee/:name/summary` - Update employee summary

### Frontend Components

- **App.tsx**: Main dashboard application with sidebar navigation and view routing
- **Sidebar.tsx**: Navigation sidebar with dashboard sections
- **DashboardOverview.tsx**: Overview dashboard with KPIs, charts, and team metrics
- **EmployeeAnalytics.tsx**: Employee list view with filtering, search, and sorting
- **DataManagement.tsx**: Data import/export and dataset management interface
- **EmployeeCard.tsx**: Individual employee performance visualization with radar charts and AI summary generation
- **services/api.ts**: API client for backend communication
- **services/parser.ts**: CSV parsing logic that handles quoted fields and extracts employee competency scores
- **services/geminiService.ts**: Google Gemini AI integration for generating performance summaries
- **types.ts**: TypeScript interfaces for Employee and CompetencyScore data structures

### Data Flow

1. **Data Import**: Users import CSV data via drag-drop or paste in Data Management section
2. **Parsing**: Parser extracts employee names from bracketed headers and aggregates competency scores
3. **Storage**: Data is automatically saved to SQLite database with versioning
4. **Visualization**: Dashboard displays data as:
   - Overview KPIs and team metrics with bar/pie charts
   - Individual employee radar charts
   - Filterable employee analytics view
5. **AI Integration**: Users can generate AI-powered performance summaries via Gemini API
6. **Persistence**: All data persists across sessions with dataset management

### Key Technical Details

**Frontend:**
- React 19 with TypeScript and modern hooks
- Vite for fast development and building
- Tailwind CSS for styling with dark mode support
- Recharts for data visualization (radar charts, bar charts, pie charts)
- Custom CSV parser that handles quoted fields and escaped quotes

**Backend:**
- Node.js with Express server
- SQLite database with better-sqlite3 for performance
- RESTful API design with proper error handling
- Automatic data persistence and versioning
- CORS enabled for frontend communication

**Database Schema:**
- `datasets` table: Dataset metadata
- `employees` table: Employee information
- `performance_scores` table: Individual competency scores
- `current_dataset` table: Active dataset tracking

## Getting Started

1. **Install dependencies**: `npm install`
2. **Start the backend server**: `npm run server` (runs on port 3001)
3. **Start the frontend**: `npm run dev` (runs on port 5173)
4. **Or start both**: `npm run dev:full` (requires concurrently package)
5. **Import your CSV data** in the Data Management section
6. **Explore the dashboard** with Overview, Analytics, and Employee views

## Dashboard Features

- **Overview Dashboard**: Team KPIs, performance distribution, competency averages
- **Employee Analytics**: Searchable/filterable employee list with performance levels
- **Data Management**: CSV import/export, dataset saving/loading, drag-drop support
- **Persistent Storage**: SQLite database saves all data automatically
- **AI Summaries**: Generate performance summaries using Gemini API
- **Dark Mode**: Full dark mode support across all components