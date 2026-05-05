import { z } from "zod";
import { db } from "../db/db";
import { softwareVersions } from "../db/schema";
import { StoredSoftwareVersion } from "../db/types";
import { validatedEnv } from "../env-validation";
import { gitlabReleaseSchema } from "./zod/gitlab-release.schema";
import { logUpdateAvailableEvent } from "../api/event/event.logger";

function getCurrentAppVersion(): string | null {
  const version = validatedEnv.APP_VERSION?.trim();
  if (!version || version === "dev") return null;
  return version;
}

/**
 * Fetches gitlab releases.
 * @returns Latest release returned from gitlab.
 */
async function fetchLatestGitLabRelease(): Promise<{
  availableVersion: string;
}> {
  const url = new URL(
    `projects/${encodeURIComponent(validatedEnv.GITLAB_PROJECT_ID)}/releases`,
    validatedEnv.GITLAB_API_BASE_URL,
  );

  const headers = new Headers({
    Accept: "application/json",
    "PRIVATE-TOKEN": validatedEnv.GITLAB_TOKEN,
  });

  const response = await fetch(url, { headers });

  if (!response.ok) {
    const responseBody = await response.text();

    console.error("GitLab releases request failed", {
      url: url.toString(),
      projectId: validatedEnv.GITLAB_PROJECT_ID,
      status: response.status,
      statusText: response.statusText,
      body: responseBody,
    });

    throw new Error(`Failed to fetch releases with HTTP ${response.status}.`);
  }

  const parsedReleases = z
    .array(gitlabReleaseSchema)
    .parse(await response.json());

  const latestRelease = parsedReleases[0];

  if (!latestRelease) {
    throw new Error("No software releases available.");
  }
  return {
    availableVersion: latestRelease.tag_name,
  };
}

/**
 * Polls gitlab for the latest current release and updates the software version table.
 * If a new update is available, a UpdateAvailable event is created.
 * @returns {Promise<StoredSoftwareVersion} Updated version information from db.
 */
export async function pollSoftwareVersion(): Promise<StoredSoftwareVersion> {
  const latestRelease = await fetchLatestGitLabRelease();
  const lastCheckedAt = new Date();
  const currentVersion = getCurrentAppVersion();
  const updateAvailable =
    currentVersion !== null &&
    currentVersion !== latestRelease.availableVersion;

  const [row] = await db
    .insert(softwareVersions)
    .values({
      id: 1,
      currentVersion,
      availableVersion: latestRelease.availableVersion,
      updateAvailable,
      lastCheckedAt,
    })
    .onConflictDoUpdate({
      target: softwareVersions.id,
      set: {
        currentVersion,
        availableVersion: latestRelease.availableVersion,
        updateAvailable,
        lastCheckedAt,
      },
    })
    .returning();

  if (updateAvailable) {
    logUpdateAvailableEvent(latestRelease.availableVersion);
  }
  return row;
}
