import { getEnv } from "@/env.js";
import * as jose from "jose";

export type JWTPayload = jose.JWTPayload;

interface SignArgs<T> {
  data: T;
  expiresIn: number | string | Date;
}

export class JWT {
  private secret: Uint8Array;

  constructor() {
    this.secret = jose.base64url.decode(getEnv().JWT_SECRET);
  }

  public async encrypt<T>(args: SignArgs<T>): Promise<string> {
    const token = await new jose.EncryptJWT({ ...(args.data as object) })
      .setExpirationTime(args.expiresIn)
      .setProtectedHeader({ alg: "dir", enc: "A128CBC-HS256" })
      .encrypt(this.secret);
    await this.decrypt(token);
    return token;
  }

  public async decrypt<T>(encryptedJwt: string): Promise<T> {
    const decrypted = await jose.jwtDecrypt(encryptedJwt, this.secret);
    return decrypted as T;
  }
}
