export default class ServerIncognitoModeOptions {
  constructor(
    public readonly automaticallyPurgeDownloads: boolean = false,
    public readonly overwriteRpcParameters: boolean = false,
    public readonly rpcParameters: Record<string, string> = {},
  ) {}
}
