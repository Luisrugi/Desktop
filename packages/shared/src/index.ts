export type UserRole = "ADMIN" | "EMPLOYEE";

export type InvoiceStatus = "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "CANCELLED";

export interface CompanyDTO {
  id: string;
  name: string;
  addressLine1: string | null;
  addressLine2: string | null;
  postalCode: string | null;
  city: string | null;
  country: string | null;
  taxId: string | null;
  vatId: string | null;
  iban: string | null;
  bic: string | null;
  email: string | null;
  phone: string | null;
  logoUrl: string | null;
}

export interface UserDTO {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  companyId: string;
}

export interface ClientDTO {
  id: string;
  companyId: string;
  name: string;
  contactPerson: string | null;
  email: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  postalCode: string | null;
  city: string | null;
  country: string | null;
  vatId: string | null;
  defaultHourlyRateCents: number | null;
  notes: string | null;
}

export interface ProjectDTO {
  id: string;
  companyId: string;
  clientId: string;
  name: string;
  description: string | null;
  hourlyRateCents: number | null;
  budgetMinutes: number | null;
  isActive: boolean;
}

export interface TimeEntryDTO {
  id: string;
  userId: string;
  projectId: string;
  startTime: string;
  endTime: string | null;
  durationMinutes: number | null;
  description: string | null;
  billable: boolean;
  invoiceItemId: string | null;
}

export interface InvoiceItemDTO {
  id: string;
  invoiceId: string;
  description: string;
  quantity: number;
  unitPriceCents: number;
  taxRatePercent: number;
  lineTotalCents: number;
}

export interface InvoiceDTO {
  id: string;
  companyId: string;
  clientId: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  notes: string | null;
  items: InvoiceItemDTO[];
  totalNetCents: number;
  totalTaxCents: number;
  totalGrossCents: number;
}

export interface AuthResponse {
  token: string;
  user: UserDTO;
}

export interface ReportSummary {
  rangeStart: string;
  rangeEnd: string;
  totalMinutes: number;
  billableMinutes: number;
  revenueCents: number;
  byProject: Array<{
    projectId: string;
    projectName: string;
    minutes: number;
    billableMinutes: number;
    revenueCents: number;
  }>;
}
