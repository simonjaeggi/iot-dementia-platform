import { X } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { DeviceDetailsPanel } from "./device-details-panel";
import { DeviceTable } from "./device-table";
import { PageLayout } from "@/components/page-layout";
import { Button } from "@/components/ui/button";

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
    <PageLayout title="Devices">
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
              <h2 className="text-base font-semibold">Device Details</h2>
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
    </PageLayout>
  );
}
