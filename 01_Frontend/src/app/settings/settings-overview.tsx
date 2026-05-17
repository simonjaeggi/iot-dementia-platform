import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { PageLayout } from "@/components/page-layout";
import { useAuth } from "@/auth/use-auth";
import { SETTINGS_SECTIONS } from "./settings-sections";

export function SettingsOverview() {
  const { user } = useAuth();
  const visibleSettingsSections = SETTINGS_SECTIONS.filter(
    (section) => !section.requiredRole || section.requiredRole === user?.role,
  );

  return (
    <PageLayout title="Settings" contentClassName="flex flex-col gap-2">
      <p className="text-muted-foreground text-sm">
        Pick a section to view or change its settings.
      </p>
      <ul className="divide-y rounded-lg border">
        {visibleSettingsSections.map((section) => (
          <li key={section.path}>
            <Link
              to={section.path}
              className="hover:bg-muted/50 flex items-center justify-between gap-4 px-4 py-3 transition-colors"
            >
              <div className="space-y-0.5">
                <div className="font-medium">{section.title}</div>
                <div className="text-muted-foreground text-sm">
                  {section.description}
                </div>
              </div>
              <ChevronRight className="text-muted-foreground size-4 shrink-0" />
            </Link>
          </li>
        ))}
      </ul>
    </PageLayout>
  );
}
