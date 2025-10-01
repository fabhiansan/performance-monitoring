# Project Overview

This is a desktop application for monitoring employee performance, built with Electron, React, and Node.js. The application allows for importing employee data, viewing performance metrics, and managing employee information.

**Key Technologies:**

*   **Frontend:** React, TypeScript, Vite, Tailwind CSS
*   **Backend:** Node.js, Express.js, TypeScript
*   **Database:** SQLite (using `better-sqlite3`)
*   **Desktop Framework:** Electron
*   **Testing:** Vitest
*   **Linting:** ESLint

**Architecture:**

The application is composed of three main parts:

1.  **Electron Main Process (`main.ts`):** This is the entry point of the application. It creates the main browser window and starts the backend server.
2.  **React Frontend (`App.tsx`, `components/`):** This is the user interface of the application, built with React and rendered in the Electron browser window.
3.  **Node.js Backend (`server/server.ts`):** This is an Express.js server that provides a RESTful API for the frontend to interact with the SQLite database.

# Building and Running

**Prerequisites:**

*   Node.js >= 20.0.0
*   npm >= 8.0.0

**Development:**

To run the application in development mode, use the following command:

```bash
npm run dev
```

This will start the Vite development server for the frontend and the Electron application with the backend server.

**Building for Production:**

To build the application for production, use the following command:

```bash
npm run build
```

This will create a production-ready build of the frontend and backend.

**Packaging for Distribution:**

To package the application for distribution (e.g., creating an installer), use the following command:

```bash
npm run dist
```

This will create distributable packages for the current operating system in the `release` directory.

**Testing:**

To run the test suite, use the following command:

```bash
npm test
```

**Linting:**

To check the code for linting errors, use the following command:

```bash
npm run lint:check
```

# Development Conventions

*   **Code Style:** The project uses ESLint to enforce a consistent code style.
*   **Testing:** The project uses Vitest for unit and integration testing.
*   **API:** The backend provides a RESTful API for the frontend. The API endpoints are defined in `server/server.ts`.
*   **Database:** The application uses a SQLite database to store data. The database schema is managed by the `server/database.ts` file.
