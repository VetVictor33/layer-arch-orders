export default abstract class Service {
  public abstract execute(input: unknown): Promise<unknown>;
}
