import * as React from "react";
import { getAccessToken } from "../auth/msal";

type GroupGateState = {
  loading: boolean;
  allowed: boolean;
  error?: string;
};

async function checkMemberGroups(accessToken: string, groupIds: string[]) {
  const res = await fetch("https://graph.microsoft.com/v1.0/me/checkMemberGroups", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ groupIds }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Graph /me/checkMemberGroups failed (${res.status}): ${text}`);
  }

  // Respuesta: array de groupIds en los que SÍ pertenece
  const data = (await res.json()) as { value: string[] };
  return data.value ?? [];
}

/**
 * Valida si el usuario logueado pertenece a un grupo.
 * - Si falla por permisos, intenta pedir consentimiento extra con silentExtraScopesToConsent.
 */
export function useGroupGate(groupId: string) {
  const [state, setState] = React.useState<GroupGateState>({
    loading: true,
    allowed: false,
  });

  React.useEffect(() => {
    let cancelled = false;

    async function run() {
      setState({ loading: true, allowed: false });

      try {
        // 1) Token con tus scopes base
        let token = await getAccessToken({ interactionMode: "popup" });

        // 2) checkMemberGroups
        let ids = await checkMemberGroups(token, [groupId]);
        let ok = ids.includes(groupId);

        // 3) Si NO ok pero la llamada falló antes por permisos, aquí no entra.
        //    Si te llega 403 en catch, pedimos consentimiento extra y reintentamos.
        if (!cancelled) setState({ loading: false, allowed: ok });
      } catch (e: any) {
        const msg = String(e?.message ?? e);

        // Si te da 403/insufficient privileges, intenta con consentimiento extra
        const looksLikePermission =
          msg.includes("403") ||
          msg.toLowerCase().includes("insufficient") ||
          msg.toLowerCase().includes("privilege");

        if (looksLikePermission) {
          try {
            const token = await getAccessToken({
              interactionMode: "popup",
              silentExtraScopesToConsent: ["GroupMember.Read.All"], // puede requerir admin consent
            });

            const ids = await checkMemberGroups(token, [groupId]);
            const ok = ids.includes(groupId);

            if (!cancelled) setState({ loading: false, allowed: ok });
            return;
          } catch (e2: any) {
            if (!cancelled)
              setState({
                loading: false,
                allowed: false,
                error: String(e2?.message ?? e2),
              });
            return;
          }
        }

        if (!cancelled)
          setState({
            loading: false,
            allowed: false,
            error: msg,
          });
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [groupId]);

  return state;
}
