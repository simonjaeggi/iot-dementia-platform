import { PageLayout } from "@/components/page-layout";

export function UserRoles() {
  return (
    <PageLayout title="Users & Roles" contentClassName="flex flex-col gap-4">
      <p className="text-muted-foreground text-sm">
        User and role management will be added here.
      </p>
      <div className="text-muted-foreground text-sm">
        No user and role settings are available yet.
      </div>
    </PageLayout>
  );
}
