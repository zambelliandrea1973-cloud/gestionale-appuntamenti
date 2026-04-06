import { User as SchemaUser } from "../../shared/schema";

declare global {
  namespace Express {
    interface User extends SchemaUser {
      ownerId?: number;
      tenantId?: number;
    }
  }
}

export {};
