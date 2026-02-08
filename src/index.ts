export class SafeEnvGetter {
  public getEnv(key: string) {
    return process.env[key];
  }
}