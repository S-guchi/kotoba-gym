import type { SessionRecord } from "@kotoba-gym/core";
import { useEffect, useState } from "react";
import { fetchSession } from "./api";
import { getOwnerKey } from "./owner-key";

export function useSession(sessionId: string | undefined) {
  const [session, setSession] = useState<SessionRecord | null>(null);
  const [ownerKey, setOwnerKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (!sessionId) {
      setError("整理IDが見つかりません");
      setLoading(false);
      return;
    }

    setLoading(true);
    getOwnerKey()
      .then(async (key) => {
        const item = await fetchSession(sessionId, key);
        return { key, item };
      })
      .then(({ key, item }) => {
        if (active) {
          setOwnerKey(key);
          setSession(item);
          setError(null);
        }
      })
      .catch((e) => {
        if (active) {
          setError(
            e instanceof Error ? e.message : "整理を取得できませんでした",
          );
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [sessionId]);

  return { session, ownerKey, error, loading, setSession };
}
