# Project Overview

## Purpose
Employee Performance Analyzer Dashboard - A comprehensive dashboard for analyzing employee performance data from CSV format. Designed for Dinas Sosial (Social Department) with AI-powered performance summaries using Google's Gemini API.

## Tech Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Node.js + Express + SQLite
- **Database**: SQLite with better-sqlite3
- **UI**: Tailwind CSS + Recharts for visualization
- **AI Integration**: Google Gemini API
- **Deployment**: Web application + Electron desktop app

## Architecture
- Full-stack dashboard with React frontend and Node.js backend
- Dual deployment modes: web app (separate servers) and Electron desktop app (integrated)
- SQLite database for data persistence with automatic versioning
- CSV parsing system for employee competency data
- AI-powered performance summary generation

## Key Features
- CSV data import with drag-drop support
- Employee performance visualization (radar charts, bar charts)
- Dashboard with KPIs and team metrics
- Dataset management with versioning
- AI-generated performance summaries
- Dark mode support
- Cross-platform Electron desktop app