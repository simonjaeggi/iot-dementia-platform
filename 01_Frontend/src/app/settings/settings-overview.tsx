import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { PageLayout } from "@/components/page-layout";

const SETTINGS_SECTIONS = [
  {
    title: "Notification Subscriptions",
    description: "Choose which event types should create notifications.",
    path: "/settings/notifications",
  },
  {
    title: "Location Beacons",
    description:
      "Manage room labels for indoor location detection.",
    path: "/settings/location-beacons",
  },
  {
    title: "Users & Roles",
    description: "Manage users and their roles.",
    path: "/settings/users",
  },
  {
    title: "Access Codes",
    description: "Issue and revoke registration access codes.",
    path: "/settings/access-codes",
  },
  {
    title: "Patient Information",
    description: "Manage the information of the patient.",
    path: "/settings/patient",
  },
];

export function SettingsOverview() {
  return (
    <PageLayout title="Settings" contentClassName="flex flex-col gap-2">
      <p className="text-muted-foreground text-sm">
        Pick a section to view or change its settings.
      </p>
      <ul className="divide-y rounded-lg border">
        {SETTINGS_SECTIONS.map((section) => (
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
