import { loadEnvConfig } from "@next/env";
import os from "node:os";
import path from "node:path";
import { downloadAndValidateAwinSnapshot, snapshotMetadataPath } from "../src/server/awin/snapshot";
import {
  createAwinImportContext,
  resolveAwinAdvertiser,
  snapshotSlug,
} from "../src/server/awin/advertisers";

const REQUEST_TIMEOUT_MS = 120_000;

loadEnvConfig(process.cwd());

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

function argumentValue(name: string): string | null {
  const prefix = `--${name}=`;
  const argument = process.argv.slice(2).find((value) => value.startsWith(prefix));
  return argument ? argument.slice(prefix.length) : null;
}

function sanitizedMessage(error: unknown): string {
  let message = error instanceof Error ? error.message : "Snapshot download failed";
  const token = process.env.AWIN_API_TOKEN;
  if (token) message = message.replaceAll(token, "[redacted]");
  return message
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .replace(/https?:\/\/\S+/gi, "[url]")
    .slice(0, 500);
}

async function main() {
  const advertiser = resolveAwinAdvertiser(
    argumentValue("advertiser") ?? undefined,
  );
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outputPath =
    argumentValue("output") ??
    path.join(
      os.tmpdir(),
      "giftperch-awin",
      `${snapshotSlug(advertiser)}-${stamp}.jsonl`,
    );
  const context = createAwinImportContext(
    requiredEnv("AWIN_PUBLISHER_ID"),
    advertiser,
  );
  const metadata = await downloadAndValidateAwinSnapshot({
    context,
    apiToken: requiredEnv("AWIN_API_TOKEN"),
    outputPath,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  console.log(
    JSON.stringify(
      {
        snapshotPath: path.resolve(outputPath),
        metadataPath: snapshotMetadataPath(path.resolve(outputPath)),
        sha256: metadata.sha256,
        byteLength: metadata.byteLength,
        httpStatus: metadata.httpStatus,
        ...metadata.inspection,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(`Awin snapshot failed: ${sanitizedMessage(error)}`);
  process.exitCode = 1;
});
