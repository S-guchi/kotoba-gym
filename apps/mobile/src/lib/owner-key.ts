import { File, Paths } from "expo-file-system";

const ownerFile = new File(Paths.document, "kotoba-gym-owner-key.txt");

function createOwnerKey() {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `owner-${random}`;
}

export async function getOwnerKey() {
  if (ownerFile.exists) {
    const value = await ownerFile.text();
    if (value.trim()) {
      return value.trim();
    }
  }

  const ownerKey = createOwnerKey();
  ownerFile.create({ overwrite: true });
  ownerFile.write(ownerKey);
  return ownerKey;
}
