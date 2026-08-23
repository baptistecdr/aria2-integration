import { v4 as uuidv4 } from "uuid";
import * as z from "zod/mini";
import { ServerIncognitoModeOptions, ServerIncognitoModeOptionsSchema } from "@/models/server-incognito-mode-options";

export const ServerSchema = z.object({
  uuid: z._default(z.string(), () => uuidv4()),
  name: z._default(z.string(), "Localhost"),
  secure: z._default(z.boolean(), false),
  host: z._default(z.string(), "localhost"),
  port: z._default(z.number(), 6800),
  path: z._default(z.string(), "/jsonrpc"),
  secret: z._default(z.string(), ""),
  rpcParameters: z._default(z.record(z.string(), z.string()), () => ({})),
  incognitoModeOptions: z._default(ServerIncognitoModeOptionsSchema, () => ServerIncognitoModeOptions.create()),
});

export type Server = z.infer<typeof ServerSchema>;

export const Server = {
  create(data: Partial<Server> = {}): Server {
    return ServerSchema.parse(data);
  },
};
