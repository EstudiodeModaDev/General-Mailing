export type GraphRecipient = {
  emailAddress: {
    address: string;
  };
};

export type GraphSendMailPayload = {
  message: {
    subject: string;
    body: {
      contentType: "Text" | "HTML";
      content: string;
    };
    toRecipients: GraphRecipient[];
    ccRecipients?: GraphRecipient[];
  };
  saveToSentItems?: boolean;
};

/* =========================
   Error tipado Graph
   ========================= */
export class GraphHttpError extends Error {
  status: number;
  code?: string;
  raw?: any;

  constructor(message: string, status: number, code?: string, raw?: any) {
    super(message);
    this.name = "GraphHttpError";
    this.status = status;
    this.code = code;
    this.raw = raw;
  }
}

export class GraphRest {
  private getToken: () => Promise<string>;
  private base = "https://graph.microsoft.com/v1.0";

  constructor(getToken: () => Promise<string>, baseUrl?: string) {
    this.getToken = getToken;
    if (baseUrl) this.base = baseUrl;
  }

  private async parseGraphError(res: Response): Promise<{
    message: string;
    code?: string;
    raw: any;
  }> {
    let raw: any = null;

    // Graph casi siempre responde JSON, pero a veces puede venir texto/html
    const txt = await res.text().catch(() => "");
    if (!txt) return { message: `${res.status} ${res.statusText}`, raw: txt };

    try {
      raw = JSON.parse(txt);
      const code = raw?.error?.code ?? raw?.code;
      const message =
        raw?.error?.message ??
        raw?.message ??
        `${res.status} ${res.statusText}`;
      return { message, code, raw };
    } catch {
      return { message: txt, raw: txt };
    }
  }

  // Core
  private async call<T>(
    method: "GET" | "POST" | "PATCH" | "DELETE",
    path: string,
    body?: any,
    init?: RequestInit
  ): Promise<T> {
    const token = await this.getToken();
    const hasBody = body !== undefined && body !== null;

    const res = await fetch(this.base + path, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(hasBody ? { "Content-Type": "application/json" } : {}),
        Prefer: "HonorNonIndexedQueriesWarningMayFailRandomly",
        ...(init?.headers || {}),
      },
      body: hasBody ? JSON.stringify(body) : undefined,
      ...init,
    });

    if (!res.ok) {
      const { message, code, raw } = await this.parseGraphError(res);
      throw new GraphHttpError(`${method} ${path}: ${message}`, res.status, code, raw);
    }

    if (res.status === 204) return undefined as unknown as T;

    const ct = res.headers.get("content-type") || "";
    const txt = await res.text().catch(() => "");
    if (!txt) return undefined as unknown as T;

    if (ct.includes("application/json")) return JSON.parse(txt) as T;
    return txt as unknown as T;
  }

  async getBlob(path: string) {
    const token = await this.getToken();
    const res = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const { message, code, raw } = await this.parseGraphError(res);
      throw new GraphHttpError(`GET (blob) ${path}: ${message}`, res.status, code, raw);
    }

    return await res.blob();
  }

  get<T = any>(path: string, init?: RequestInit) {
    return this.call<T>("GET", path, undefined, init);
  }

  post<T = any>(path: string, body: any, init?: RequestInit) {
    return this.call<T>("POST", path, body, init);
  }

  patch<T = any>(path: string, body: any, init?: RequestInit) {
    return this.call<T>("PATCH", path, body, init);
  }

  delete(path: string, init?: RequestInit) {
    return this.call<void>("DELETE", path, undefined, init);
  }

  async putBinary<T = any>(
    path: string,
    binary: Blob | ArrayBuffer | Uint8Array,
    contentType?: string,
    init?: RequestInit
  ): Promise<T> {
    const token = await this.getToken();

    const res = await fetch(this.base + path, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        ...(contentType ? { "Content-Type": contentType } : {}),
        ...(init?.headers || {}),
      },
      body: binary as any,
      ...init,
    });

    if (!res.ok) {
      const { message, code, raw } = await this.parseGraphError(res);
      throw new GraphHttpError(`PUT ${path}: ${message}`, res.status, code, raw);
    }

    if (res.status === 204) return undefined as unknown as T;

    const ct = res.headers.get("content-type") || "";
    const txt = await res.text().catch(() => "");
    if (!txt) return undefined as unknown as T;

    if (ct.includes("application/json")) return JSON.parse(txt) as T;
    return txt as unknown as T;
  }

  async getAbsolute<T = any>(url: string, init?: RequestInit): Promise<T> {
    const token = await this.getToken();

    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Prefer: "HonorNonIndexedQueriesWarningMayFailRandomly",
        ...(init?.headers || {}),
      },
      ...init,
    });

    if (!res.ok) {
      const { message, code, raw } = await this.parseGraphError(res);
      throw new GraphHttpError(`GET (absolute) ${url}: ${message}`, res.status, code, raw);
    }

    if (res.status === 204) return undefined as unknown as T;

    const ct = res.headers.get("content-type") ?? "";
    const txt = await res.text().catch(() => "");
    if (!txt) return undefined as unknown as T;

    return ct.includes("application/json") ? (JSON.parse(txt) as T) : (txt as unknown as T);
  }

  sendMail(fromUser: string, payload: GraphSendMailPayload) {
    const encoded = encodeURIComponent(fromUser);
    return this.post<void>(`/users/${encoded}/sendMail`, payload);
  }

  async postAbsoluteBinary<T = any>(
    url: string,
    binary: Blob | ArrayBuffer | Uint8Array,
    contentType?: string,
    init?: RequestInit
  ): Promise<T> {
    const token = await this.getToken();

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        ...(contentType ? { "Content-Type": contentType } : {}),
        ...(init?.headers || {}),
      },
      body: binary as any,
      ...init,
    });

    if (!res.ok) {
      const { message, code, raw } = await this.parseGraphError(res);
      throw new GraphHttpError(`POST (absolute) ${url}: ${message}`, res.status, code, raw);
    }

    if (res.status === 204) return undefined as unknown as T;

    const ct = res.headers.get("content-type") || "";
    const txt = await res.text().catch(() => "");
    if (!txt) return undefined as unknown as T;

    if (ct.includes("application/json")) return JSON.parse(txt) as T;
    return txt as unknown as T;
  }
}
