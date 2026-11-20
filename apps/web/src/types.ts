export type UserRole = "ADMIN" | "EMPLOYEE";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  companyId: string;
}

export interface Client {
  id: string;
  name: string;
  contactPerson: string | null;
  email: string | null;
  addressLine1: string | null;
  postalCode: string | null;
  city: string | null;
  country: string | null;
  vatId: string | null;
  defaultHourlyRateCents: number | null;
  notes: string | null;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  hourlyRateCents: number | null;
  isActive: boolean;
  clientId: string;
  client?: Client;
}

export interface TimeEntry {
  id: string;
  startTime: string;
  endTime: string | null;
  durationMinutes: number | null;
  description: string | null;
  billable: boolean;
  projectId: string;
  invoiceItemId: string | null;
  project?: Project & { client?: Client };
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPriceCents: number;
  taxRatePercent: number;
}

export type InvoiceStatus = "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "CANCELLED";

export interface Invoice {
  id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  notes: string | null;
  clientId: string;
  client?: Client;
  items: InvoiceItem[];
  totalNetCents: number;
  totalTaxCents: number;
  totalGrossCents: number;
  reminderLevel: number;
}

export interface Employee {
  id: string;
  personnelNumber: string;
  firstName: string;
  lastName: string;
  hireDate: string;
  exitDate: string | null;
  position: string | null;
  department: string | null;
  employmentType: string | null;
  status: "ACTIVE" | "ON_LEAVE" | "TERMINATED";
  monthlyGrossCents: number | null;
  iban: string | null;
  taxIdNumber: string | null;
  socialSecurityNo: string | null;
}

export type AbsenceType =
  | "URLAUB"
  | "KRANK"
  | "KIND_KRANK"
  | "SONDERURLAUB"
  | "UNBEZAHLT"
  | "MUTTERSCHUTZ"
  | "ELTERNZEIT"
  | "BILDUNGSURLAUB"
  | "DIENSTREISE"
  | "HOMEOFFICE";

export interface Absence {
  id: string;
  type: AbsenceType;
  status: "BEANTRAGT" | "GENEHMIGT" | "ABGELEHNT" | "STORNIERT";
  startDate: string;
  endDate: string;
  halfDay: boolean;
  note: string | null;
  employeeId: string;
  employee?: Employee;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string | null;
  email: string | null;
  vatId: string | null;
}

export interface Article {
  id: string;
  sku: string;
  name: string;
  unit: string;
  salesPriceCents: number | null;
  purchasePriceCents: number | null;
  stockQuantity: number;
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

export interface Plan {
  id: string;
  tier: "STARTER" | "BUSINESS" | "ENTERPRISE";
  name: string;
  priceMonthlyCents: number;
  maxUsers: number;
  maxEmployees: number;
  features: string[];
}
