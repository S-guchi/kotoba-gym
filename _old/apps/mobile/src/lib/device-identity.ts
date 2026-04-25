import { Directory, File, Paths } from "expo-file-system";

function rootDirectory() {
  const dir = new Directory(Paths.document, "kotoba-gym");
  if (!dir.exists) {
    dir.create({ intermediates: true });
  }
  return dir;
}

function ownerKeyFile() {
  return new File(rootDirectory(), "owner-key.json");
}

function createOwnerKey() {
  return `owner-${Date.now()}-${Math.round(Math.random() * 1_000_000)}`;
}

export async function getOwnerKey() {
  const file = ownerKeyFile();
  if (file.exists) {
    const raw = JSON.parse(await file.text()) as { ownerKey?: string };
    if (typeof raw.ownerKey === "string" && raw.ownerKey.length > 0) {
      return raw.ownerKey;
    }
  }

  const ownerKey = createOwnerKey();
  await file.write(JSON.stringify({ ownerKey }, null, 2));
  return ownerKey;
}
