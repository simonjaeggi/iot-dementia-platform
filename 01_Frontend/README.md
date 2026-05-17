# Frontend

React + TypeScript + Vite app.

## Folder Structure

```text
.
├── src/
│   ├── app/
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── devices/
│   │   ├── events/
│   │   ├── notification-inbox/
│   │   └── settings/
│   ├── auth/
│   ├── components/
│   │   └── ui/
│   ├── lib/
│   │   └── api/
│   ├── App.tsx
│   └── main.tsx
├── Dockerfile
├── package.json
├── vite.config.ts
└── README.md
```

## Folder Notes

- `src/app`: route-level pages for the main application areas
- `src/auth`: authentication context, provider, hooks, and route guard
- `src/components`: shared layout and application components
- `src/components/ui`: shadcn UI primitives
- `src/lib`: shared helpers, formatters, and frontend utilities
- `src/lib/api`: backend API client, endpoints, Zod schemas, and enum constants

