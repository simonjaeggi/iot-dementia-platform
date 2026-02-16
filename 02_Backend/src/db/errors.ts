export class NotFoundError extends Error {
  constructor() {
    super("DB entry not found");
  }
}