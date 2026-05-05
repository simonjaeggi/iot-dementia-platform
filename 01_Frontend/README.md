# Frontend

React + TypeScript + Vite app.

## Folder structure

```
src/
├── app/          # route-level pages (dashboard, devices, events, notification-inbox, settings)
├── auth/         # auth context, provider, and route guard
├── components/   # shared components (+ ui/ for shadcn primitives)
├── hooks/        # shared React hooks
└── lib/
    ├── api/      # backend contract — endpoints, Zod schemas, enum constants
    │             #   import everything from "@/lib/api" (barrel)
    ├── detail-formatters.ts
    └── utils.ts
```

