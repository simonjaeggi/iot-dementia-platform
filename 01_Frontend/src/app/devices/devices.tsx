import { X } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { AppSidebar } from "@/components/app-sidebar";
import { DeviceDetailsPanel } from "@/components/device-details-panel";
import { DeviceTable } from "@/components/device-table";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function Devices() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedFingerprint = searchParams.get("fingerprint");

  function setSelectedDevice(fingerprint: string | null) {
    const nextParams = new URLSearchParams(searchParams);

    if (fingerprint === null) {
      nextParams.delete("fingerprint");
    } else {
      nextParams.set("fingerprint", fingerprint);
    }

    setSearchParams(nextParams, { replace: true });
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader title="Devices" />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="px-4 lg:px-6">
                <div
                  className={
                    selectedFingerprint === null
                      ? ""
                      : "grid gap-4 xl:grid-cols-[minmax(0,1.9fr)_minmax(20rem,24rem)] xl:items-start"
                  }
                >
                  <DeviceTable
                    selectedFingerprint={selectedFingerprint}
                    onSelectDevice={setSelectedDevice}
                  />
                  {selectedFingerprint !== null ? (
                    <div className="space-y-4">
                      <div className="flex h-9 items-center justify-between gap-2">
                        <h2 className="text-base font-semibold">
                          Device Details
                        </h2>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="size-7"
                          onClick={() => setSelectedDevice(null)}
                        >
                          <X className="size-4" />
                          <span className="sr-only">Close device details</span>
                        </Button>
                      </div>
                      <DeviceDetailsPanel
                        fingerprint={selectedFingerprint}
                        onDelete={() => setSelectedDevice(null)}
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
