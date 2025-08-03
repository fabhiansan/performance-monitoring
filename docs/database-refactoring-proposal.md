# Database Schema Refactoring Proposal

## Current Schema Issues

The current database schema stores performance data in a denormalized format:

```sql
CREATE TABLE employee_data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT,
  name TEXT,
  nip TEXT,
  gol TEXT,
  pangkat TEXT,
  position TEXT,
  sub_position TEXT,
  organizational_level TEXT,
  performance_data TEXT,  -- JSON string containing all competency scores
  upload_timestamp TEXT,
  FOREIGN KEY (session_id) REFERENCES upload_sessions(session_id)
);
```

### Problems with Current Approach:

1. **Data Redundancy**: Employee information is duplicated across sessions
2. **Poor Query Performance**: JSON parsing required for competency-based queries
3. **Limited Indexing**: Cannot index individual competency scores
4. **Complex Aggregations**: Difficult to calculate competency averages across employees
5. **Storage Inefficiency**: JSON overhead for each employee record

## Proposed Normalized Schema

### 1. Enhanced Employee Table
```sql
CREATE TABLE employees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  nip TEXT UNIQUE,
  gol TEXT,
  pangkat TEXT,
  position TEXT,
  sub_position TEXT,
  organizational_level TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_employees_name ON employees(name);
CREATE INDEX idx_employees_nip ON employees(nip);
CREATE INDEX idx_employees_org_level ON employees(organizational_level);
```

### 2. Competencies Reference Table
```sql
CREATE TABLE competencies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  category TEXT, -- e.g., 'perilaku_kinerja', 'kualitas_kerja', 'penilaian_pimpinan'
  weight REAL DEFAULT 1.0,
  applicable_to TEXT DEFAULT 'all', -- 'eselon', 'staff', 'all'
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_competencies_category ON competencies(category);
CREATE INDEX idx_competencies_applicable_to ON competencies(applicable_to);
```

### 3. Normalized Performance Data Table
```sql
CREATE TABLE employee_performance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL,
  competency_id INTEGER NOT NULL,
  session_id TEXT NOT NULL,
  score REAL NOT NULL,
  raw_score REAL, -- Original score before normalization
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (competency_id) REFERENCES competencies(id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES upload_sessions(session_id) ON DELETE CASCADE,
  UNIQUE(employee_id, competency_id, session_id)
);

CREATE INDEX idx_performance_employee ON employee_performance(employee_id);
CREATE INDEX idx_performance_competency ON employee_performance(competency_id);
CREATE INDEX idx_performance_session ON employee_performance(session_id);
CREATE INDEX idx_performance_score ON employee_performance(score);
CREATE INDEX idx_performance_composite ON employee_performance(employee_id, session_id);
```

### 4. Enhanced Upload Sessions
```sql
CREATE TABLE upload_sessions (
  session_id TEXT PRIMARY KEY,
  session_name TEXT NOT NULL,
  upload_timestamp TEXT NOT NULL,
  employee_count INTEGER DEFAULT 0,
  competency_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active', -- 'active', 'archived', 'deleted'
  notes TEXT
);

CREATE INDEX idx_sessions_timestamp ON upload_sessions(upload_timestamp);
CREATE INDEX idx_sessions_status ON upload_sessions(status);
```

## Migration Strategy

### Phase 1: Create New Tables
```sql
-- Add new tables alongside existing ones
-- Populate competencies table with known competency names
INSERT INTO competencies (name, category, applicable_to) VALUES
  ('orientasi pelayanan', 'perilaku_kinerja', 'all'),
  ('akuntabilitas', 'perilaku_kinerja', 'all'),
  ('kompetensi profesional', 'perilaku_kinerja', 'all'),
  ('anti korupsi', 'perilaku_kinerja', 'all'),
  ('nasionalisme', 'perilaku_kinerja', 'all'),
  ('efektivitas personal', 'kualitas_kerja', 'all'),
  ('kerjasama', 'kualitas_kerja', 'all'),
  ('komunikasi', 'kualitas_kerja', 'all'),
  ('penilaian pimpinan', 'penilaian_pimpinan', 'eselon');
```

### Phase 2: Data Migration
```sql
-- Migrate existing employee data
INSERT OR IGNORE INTO employees (name, nip, gol, pangkat, position, sub_position, organizational_level)
SELECT DISTINCT name, nip, gol, pangkat, position, sub_position, organizational_level
FROM employee_data;

-- Migrate performance data (requires JSON parsing)
-- This would be handled by a migration script in JavaScript
```

### Phase 3: Update Application Code
- Modify database service methods to use normalized schema
- Update queries to join tables instead of parsing JSON
- Implement new performance calculation methods

### Phase 4: Remove Legacy Tables
```sql
-- After successful migration and testing
DROP TABLE employee_data;
```

## Performance Benefits

### Query Performance Improvements

1. **Competency-based filtering**:
```sql
-- Current: Requires JSON parsing
SELECT * FROM employee_data WHERE JSON_EXTRACT(performance_data, '$.orientasi_pelayanan') > 80;

-- Proposed: Direct index lookup
SELECT e.*, ep.score 
FROM employees e
JOIN employee_performance ep ON e.id = ep.employee_id
JOIN competencies c ON ep.competency_id = c.id
WHERE c.name = 'orientasi pelayanan' AND ep.score > 80;
```

2. **Competency averages**:
```sql
-- Calculate average score per competency
SELECT c.name, AVG(ep.score) as avg_score, COUNT(*) as employee_count
FROM competencies c
JOIN employee_performance ep ON c.id = ep.competency_id
GROUP BY c.id, c.name
ORDER BY avg_score DESC;
```

3. **Employee performance trends**:
```sql
-- Track performance across sessions
SELECT e.name, c.name as competency, ep.score, us.upload_timestamp
FROM employees e
JOIN employee_performance ep ON e.id = ep.employee_id
JOIN competencies c ON ep.competency_id = c.id
JOIN upload_sessions us ON ep.session_id = us.session_id
WHERE e.id = ?
ORDER BY us.upload_timestamp, c.name;
```

## Storage Efficiency

- **Reduced redundancy**: Employee data stored once, referenced by ID
- **Efficient indexing**: Multiple indexes for fast lookups
- **Flexible competency management**: Easy to add/remove competencies
- **Better data integrity**: Foreign key constraints ensure consistency

## Implementation Considerations

1. **Backward Compatibility**: Maintain existing API during migration
2. **Data Validation**: Ensure all JSON performance data migrates correctly
3. **Index Strategy**: Monitor query patterns and adjust indexes accordingly
4. **Competency Management**: Implement UI for managing competency definitions
5. **Performance Monitoring**: Compare query performance before/after migration

## Estimated Impact

- **Query Performance**: 3-5x improvement for competency-based queries
- **Storage Reduction**: 20-30% reduction in database size
- **Development Efficiency**: Simplified query logic, better maintainability
- **Scalability**: Better support for large datasets and complex analytics

This normalized schema provides a solid foundation for future enhancements while significantly improving query performance and reducing data redundancy.