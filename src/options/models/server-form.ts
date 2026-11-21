import { Server } from "@/domain/server";
import { ServerIncognitoModeOptions } from "@/domain/server-incognito-mode-options";

// A server as edited in its options tab: RPC parameters are typed as "name: value" lines.
export interface ServerFormValues {
  name: string;
  host: string;
  port: number;
  secure: boolean;
  path: string;
  secret: string;
  rpcParameters: string;
  incognitoAutomaticallyPurgeDownloads: boolean;
  incognitoOverwriteRpcParameters: boolean;
  incognitoRpcParameters: string;
}

export function formatPath(path: string): string {
  return path.startsWith("/") ? path : `/${path}`;
}

export function formatRpcParameters(rpcParameters: Record<string, string>): string {
  return Object.entries(rpcParameters)
    .map(([name, value]) => `${name}: ${value}`)
    .join("\n");
}

export function parseRpcParameters(text: string): Record<string, string> {
  const rpcParameters: Record<string, string> = {};
  for (const line of text.trim().split("\n")) {
    const [name, ...values] = line.split(/\s*:+\s*/);
    // We need to join on ':' in case the parameter is, for example, proxy: http://localhost:8080
    // name = proxy, values = ["http", "localhost", "8080"]
    const value = values.join(":");
    if (value !== "") {
      rpcParameters[name.trim()] = value;
    }
  }
  return rpcParameters;
}

// The JSON-RPC URL of the server, or null while the form does not describe a valid one.
export function serverUrl(values: Pick<ServerFormValues, "secure" | "host" | "port" | "path">): URL | null {
  try {
    return new URL(`http${values.secure ? "s" : ""}://${values.host}:${values.port}${values.path}`);
  } catch {
    return null;
  }
}

export function toServerFormValues(server: Server): ServerFormValues {
  return {
    name: server.name,
    host: server.host,
    port: server.port,
    secure: server.secure,
    path: server.path,
    secret: server.secret,
    rpcParameters: formatRpcParameters(server.rpcParameters),
    incognitoAutomaticallyPurgeDownloads: server.incognitoModeOptions?.automaticallyPurgeDownloads ?? false,
    incognitoOverwriteRpcParameters: server.incognitoModeOptions?.overwriteRpcParameters ?? false,
    incognitoRpcParameters: formatRpcParameters(server.incognitoModeOptions?.rpcParameters ?? {}),
  };
}

export function fromServerFormValues(uuid: string, values: ServerFormValues): Server {
  return Server.create({
    uuid,
    name: values.name,
    secure: values.secure,
    host: values.host,
    port: values.port,
    path: values.path,
    secret: values.secret,
    rpcParameters: parseRpcParameters(values.rpcParameters),
    incognitoModeOptions: ServerIncognitoModeOptions.create({
      automaticallyPurgeDownloads: values.incognitoAutomaticallyPurgeDownloads,
      overwriteRpcParameters: values.incognitoOverwriteRpcParameters,
      rpcParameters: parseRpcParameters(values.incognitoRpcParameters),
    }),
  });
}
