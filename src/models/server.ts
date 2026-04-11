import { v4 as uuidv4 } from "uuid";
import ServerIncognitoModeOptions from "@/models/server-incognito-mode-options";

export default class Server {
  constructor(
    public readonly uuid: string = uuidv4(),
    public readonly name: string = "Localhost",
    public readonly secure: boolean = false,
    public readonly host: string = "localhost",
    public readonly port: number = 6800,
    public readonly path: string = "/jsonrpc",
    public readonly secret: string = "",
    public readonly rpcParameters: Record<string, string> = {},
    public readonly incognitoModeOptions: ServerIncognitoModeOptions = new ServerIncognitoModeOptions(),
  ) {}
}
