import { loadEnvConfig } from "@next/env";
import os from "node:os";
import path from "node:path";
import {
  createAndValidateAwinLegacySnapshot,
  snapshotMetadataPath,
} from "../src/server/awin/snapshot";
import {
  createAwinImportContext,
  resolveAwinAdvertiser,
  snapshotSlug,
} from "../src/server/awin/advertisers";

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
  return (error instanceof Error ? error.message : "Legacy snapshot failed")
    .replace(/https?:\/\/\S+/gi, "[url]")
    .slice(0, 500);
}

async function main() {
  const inputPath = argumentValue("input");
  if (!inputPath) {
    throw new Error("Legacy snapshot creation requires --input=<legacy-csv-gzip-path>.");
  }
  const advertiser = resolveAwinAdvertiser(
    argumentValue("advertiser") ?? undefined,
  );
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outputPath =
    argumentValue("output") ??
    path.join(
      os.tmpdir(),
      "giftperch-awin",
      `${snapshotSlug(advertiser)}-${stamp}.csv.gz`,
    );
  const context = createAwinImportContext(
    requiredEnv("AWIN_PUBLISHER_ID"),
    advertiser,
  );
  const metadata = await createAndValidateAwinLegacySnapshot({
    context,
    sourcePath: inputPath,
    outputPath,
  });
  console.log(
    JSON.stringify(
      {
        snapshotPath: path.resolve(outputPath),
        metadataPath: snapshotMetadataPath(path.resolve(outputPath)),
        format: metadata.format,
        sha256: metadata.sha256,
        byteLength: metadata.byteLength,
        ...metadata.inspection,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(`Awin Legacy snapshot failed: ${sanitizedMessage(error)}`);
  process.exitCode = 1;
});
