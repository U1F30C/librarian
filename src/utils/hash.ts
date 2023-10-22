import crypto from "crypto";

export const hash = (str: Buffer): string => {
  return crypto.createHash("md5").update(str).digest("hex");
};
