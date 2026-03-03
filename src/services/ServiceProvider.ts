import { IDatabaseProvider } from "@/services/IDatabaseProvider";
import { IMailProvider } from "@/services/IMailProvider";

/**
 * ServiceProvider is a simple dependency injection container.
 * It holds references to the current implementations of our service interfaces.
 * The rest of the app should only interact with services through this provider,
 * never importing specific implementations directly.
 */
class ServiceProvider {
  private static instance: ServiceProvider;

  private _database: IDatabaseProvider | null = null;
  private _mail: IMailProvider | null = null;

  private constructor() {}

  static getInstance(): ServiceProvider {
    if (!ServiceProvider.instance) {
      ServiceProvider.instance = new ServiceProvider();
    }
    return ServiceProvider.instance;
  }

  /**
   * Register a database provider implementation.
   */
  registerDatabaseProvider(provider: IDatabaseProvider): void {
    this._database = provider;
  }

  /**
   * Register a mail provider implementation.
   */
  registerMailProvider(provider: IMailProvider): void {
    this._mail = provider;
  }

  /**
   * Get the registered database provider.
   * Throws if no provider has been registered.
   */
  get database(): IDatabaseProvider {
    if (!this._database) {
      throw new Error(
        "No database provider registered. Call registerDatabaseProvider() first."
      );
    }
    return this._database;
  }

  /**
   * Get the registered mail provider.
   * Throws if no provider has been registered.
   */
  get mail(): IMailProvider {
    if (!this._mail) {
      throw new Error(
        "No mail provider registered. Call registerMailProvider() first."
      );
    }
    return this._mail;
  }
}

export const serviceProvider = ServiceProvider.getInstance();
