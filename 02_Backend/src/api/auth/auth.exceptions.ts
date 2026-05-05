export class InvalidAccessCodeError extends Error {
  constructor() {
    super("Invalid access code");
    this.name = "InvalidAccessCodeError";
  }
}

export class EmailAlreadyInUseError extends Error {
  constructor() {
    super("Email already in use");
    this.name = "EmailAlreadyInUseError";
  }
}

export class CreateUserFailedError extends Error {
  constructor() {
    super("Failed to create user");
    this.name = "CreateUserFailedError";
  }
}

export class CreateInitialAccessCodeError extends Error {
  constructor(message = "Failed to create initial access code") {
    super(message);
    this.name = "CreateInitialAccessCodeError";
  }
}
