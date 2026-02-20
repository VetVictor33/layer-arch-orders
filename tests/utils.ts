// Shared test utilities for load tests (k6 and custom)
export const productIds = [
  "PROD-001",
  "PROD-002",
  "PROD-003",
  "PROD-004",
  "PROD-005",
];

export const cardNumbers = [
  "XX111111111111YY",
  "XX555555555544YY",
  "XX82822463100YY",
  "XX111111111111YY",
];

export const firstNames = ["John", "Jane", "Bob", "Alice", "Charlie", "Diana"];
export const lastNames = [
  "Smith",
  "Johnson",
  "Williams",
  "Brown",
  "Jones",
  "Garcia",
];

// IP address patterns with placeholder `X` that will be replaced with a suffix number
export const MAX_IP_SUFFIX = 3; // default upper bound
export const ipPatterns = [
  "192.168.1.X",
  "10.0.0.X",
  "172.16.0.X",
  "203.0.113.X",
];

export function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function getRandomIP(): string {
  const pattern = getRandomElement(ipPatterns);
  const suffix = Math.ceil(Math.random() * MAX_IP_SUFFIX);
  return pattern.replace("X", String(suffix));
}

export function getRandomName(): string {
  return `${getRandomElement(firstNames)} ${getRandomElement(lastNames)}`;
}

export function getEmail(name: string): string {
  return `${name.replace(/\s/g, "")}@example.com`;
}

export function getRandomCard(): string {
  const CARD_STARTS_WITH = ["40", "50"];
  const CARD_ENDS_WITH = ["00", "01", "02", "03", "04"];

  const regularNumber = getRandomElement(cardNumbers);
  return regularNumber
    .replace("XX", getRandomElement(CARD_STARTS_WITH))
    .replace("YY", getRandomElement(CARD_ENDS_WITH));
}

export interface Request {
  name: string;
  email?: string;
  productId: string;
  price: number;
  timestamp?: number;
}

export const recentRequests: Request[] = [];
export const maxRecentRequests = 20;

// Order payload type used by both scripts
export interface OrderPayload {
  product: {
    id: string;
    price: number;
  };
  customer: {
    name: string;
    email: string;
  };
  payment: {
    type: string;
    card: {
      number: string;
      holderName: string;
      cvv: string;
      expirationDate: string;
    };
  };
}
