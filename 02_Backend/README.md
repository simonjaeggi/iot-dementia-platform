# Backend Setup

## Requirements
- Bun
- Docker + Docker Compose

## Environment
Create `.env` in the project root (see [`.env.example`](.env.example)).

## Install dependencies

```bash
bun install
```

## Database (Postgres + Drizzle)

Start the database:

```bash
bun run db:up
```

Apply migrations:

```bash
bunx drizzle-kit migrate
```

Stop the database:

```bash
bun run db:down
```

Delete the DB volume (deletes all data):

```bash
bun run db:delete
```

## Run the server

```bash
bun run dev
```
