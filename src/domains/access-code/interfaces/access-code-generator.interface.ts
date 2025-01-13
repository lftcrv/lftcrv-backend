export interface IAccessCodeGenerator {
  generateCode(): string;
  hashCode(code: string): string;
}
