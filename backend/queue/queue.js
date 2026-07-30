import crypto from "node:crypto";
import { Jobs } from "../db/index.js";

export function enqueue(source, sourceType = "url") {
  const id = crypto.randomBytes(6).toString("hex");
  return Jobs.create(id, source, sourceType);
}