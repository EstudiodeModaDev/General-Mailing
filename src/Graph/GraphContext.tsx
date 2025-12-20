import * as React from "react";
import { useAuth } from "../auth/authProvider";
import { GraphRest } from "./graphRest";
import { MailService } from "../services/Mail.Service";


/* ================== Tipos de config ================== */
export type SiteConfig = {
  hostname: string;
  sitePath: string; 
};

export type UnifiedConfig = {
  ch: SiteConfig;    // sitio principal (CH)
  test: SiteConfig;  // sitio de pruebas (Paz y salvos)
  lists: {
    // CH


    // Paz Salvos

    // TEST
  };
};

/* ================== Tipos del contexto ================== */
export type GraphServices = {
  graph: GraphRest;

  email: MailService
};

/* ================== Contexto ================== */
const GraphServicesContext = React.createContext<GraphServices | null>(null);

/* ================== Default config (puedes cambiar paths) ================== */
const DEFAULT_CONFIG: UnifiedConfig = {
  ch: {
    hostname: "estudiodemoda.sharepoint.com",
    sitePath: "/sites/TransformacionDigital/IN/CH",
  },
  test: {
    hostname: "estudiodemoda.sharepoint.com",
    sitePath: "/sites/TransformacionDigital/IN/Test",
  },
  lists: {
    // CH
    // TEST
  },
};

/* ================== Provider ================== */
type ProviderProps = {
  children: React.ReactNode;
  config?: Partial<UnifiedConfig>;
};

export const GraphServicesProvider: React.FC<ProviderProps> = ({ children, config }) => {
  const { getToken } = useAuth();

  // Mergeo de config
  const cfg: UnifiedConfig = React.useMemo(() => {
    const base = DEFAULT_CONFIG;

    const normPath = (p: string) => (p.startsWith("/") ? p : `/${p}`);

    const ch: SiteConfig = {
      hostname: config?.ch?.hostname ?? base.ch.hostname,
      sitePath: normPath(config?.ch?.sitePath ?? base.ch.sitePath),
    };

    const test: SiteConfig = {
      hostname: config?.test?.hostname ?? base.test.hostname,
      sitePath: normPath(config?.test?.sitePath ?? base.test.sitePath),
    };

    const lists = { ...base.lists, ...(config?.lists ?? {}) };

    return { ch, test, lists };
  }, [config]);

  // Cliente Graph
  const graph = React.useMemo(() => new GraphRest(getToken), [getToken]);

  const services = React.useMemo<GraphServices>(() => {
    //const { ch, lists } = cfg;

    // CH

    const email =  new MailService(graph) 

    return {
      graph, email
        
      //CH
      // TEST

    };
  }, [graph, cfg]);

  return (
    <GraphServicesContext.Provider value={services}>
      {children}
    </GraphServicesContext.Provider>
  );
};

/* ================== Hook de consumo ================== */
export function useGraphServices(): GraphServices {
  const ctx = React.useContext(GraphServicesContext);
  if (!ctx) throw new Error("useGraphServices debe usarse dentro de <GraphServicesProvider>.");
  return ctx;
}
