# ScenarijPro

A full-stack collaborative screenwriting application. ScenarijPro lets users create and edit structured screenplays while protecting concurrent changes through line-level and character-level locking.

## Features

- Create, list, open, and delete screenplay projects
- Edit a screenplay as an ordered set of linked lines
- Lock individual lines while a user is editing them
- Lock and rename characters consistently across a screenplay
- Automatically wrap long text into screenplay lines
- Track changes as deltas
- Create checkpoints and restore an earlier screenplay state
- Serve the frontend and REST API from the same Express application
- Persist scenarios, lines, deltas, and checkpoints in MySQL

## Tech stack

- **Frontend:** Vanilla JavaScript, HTML, CSS
- **Backend:** Node.js, Express
- **Database:** MySQL with Sequelize ORM
- **Testing:** Mocha, Chai, Supertest
- **Deployment:** Docker and Docker Compose

## Architecture

```text
ScenarijPro/
├── backend/
│   ├── models/       Sequelize models and relationships
│   ├── server.js     Express API and static file server
│   ├── storage.js    Persistence operations
│   ├── locks.js      In-memory concurrency locks
│   └── wrap.js       Screenplay line wrapping utilities
├── public/
│   ├── html/         Projects, user, and writing screens
│   ├── js/           UI behavior and API integration
│   └── css/          Page-specific styles
├── testovi/          API and concurrency tests
├── Dockerfile
└── docker-compose.yml
```

## Getting started with Docker

### Prerequisites

- Docker
- Docker Compose

Build and start the application and MySQL database:

```bash
docker compose up --build
```

Open [http://localhost:3000](http://localhost:3000). The default page is the project list.

Stop the services with:

```bash
docker compose down
```

Add `-v` only when you also want to remove the local database volume.

## Run without Docker

1. Start a MySQL database named `wt26`.
2. Update the Sequelize connection in `backend/db.js` for your local environment.
3. Install dependencies and start the server:

```bash
cd backend
npm install
node server.js
```

## Testing

The API tests expect the application to be running on port `3000`.

```bash
npm install
npx mocha testovi/testS3.js
```

The tests cover locking conflicts, automatic line wrapping, character renaming, delta retrieval, checkpoints, and restoration.

## Main API areas

- `POST /api/scenarios` - create a screenplay
- `GET /api/scenarios/:id` - retrieve ordered screenplay content
- `POST /api/scenarios/:id/lines/:lineId/lock` - acquire a line lock
- `PUT /api/scenarios/:id/lines/:lineId` - update a locked line
- `POST /api/scenarios/:id/characters/lock` - acquire a character lock
- `POST /api/scenarios/:id/characters/update` - rename a character
- `GET /api/scenarios/:id/deltas` - retrieve changes after a timestamp
- `POST /api/scenarios/:id/checkpoint` - create a checkpoint
- `GET /api/scenarios/:id/restore/:checkpointId` - reconstruct an earlier state

## Current limitations

- Locks are stored in memory and are reset when the server restarts.
- The development database configuration is currently defined in code and should be moved to environment variables before production use.
- Authentication and multi-instance lock coordination are outside the current project scope.

## What this project demonstrates

- Designing a REST API for collaborative editing
- Handling concurrency conflicts with explicit locking
- Modeling version history with deltas and checkpoints
- Integrating Express, Sequelize, and MySQL
- Containerizing a multi-service application with Docker Compose
