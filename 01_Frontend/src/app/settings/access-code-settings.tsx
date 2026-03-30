import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function AccessCodeSettings() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Access Codes</CardTitle>
        <CardDescription>
          Access code management will be added here.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-muted-foreground text-sm">
          No access code settings are available yet.
        </div>
      </CardContent>
    </Card>
  );
}
