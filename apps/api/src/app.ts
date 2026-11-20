import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import { env } from "./env";
import { errorHandler } from "./middleware/errorHandler";
import { authRouter } from "./routes/auth";
import { clientsRouter } from "./routes/clients";
import { projectsRouter } from "./routes/projects";
import { timeEntriesRouter } from "./routes/timeEntries";
import { invoicesRouter } from "./routes/invoices";
import { reportsRouter } from "./routes/reports";
import { employeesRouter } from "./routes/employees";
import { suppliersRouter } from "./routes/suppliers";
import { articlesRouter } from "./routes/articles";
import { purchaseOrdersRouter } from "./routes/purchaseOrders";
import { purchaseInvoicesRouter } from "./routes/purchaseInvoices";
import { accountingRouter } from "./routes/accounting";
import { bankTransactionsRouter } from "./routes/bankTransactions";
import { payrollRouter } from "./routes/payroll";
import { absencesRouter } from "./routes/absences";
import { employeeDocumentsRouter } from "./routes/employeeDocuments";
import { costCentersRouter } from "./routes/costCenters";
import { billingRouter } from "./routes/billing";
import { openApiDocument } from "./openapi";

export const app = express();

app.use(cors({ origin: env.corsOrigin }));
app.use(express.json({ limit: "5mb" }));

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));

app.use("/api/auth", authRouter);
app.use("/api/clients", clientsRouter);
app.use("/api/projects", projectsRouter);
app.use("/api/time-entries", timeEntriesRouter);
app.use("/api/invoices", invoicesRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/employees", employeesRouter);
app.use("/api/suppliers", suppliersRouter);
app.use("/api/articles", articlesRouter);
app.use("/api/purchase-orders", purchaseOrdersRouter);
app.use("/api/purchase-invoices", purchaseInvoicesRouter);
app.use("/api/accounting", accountingRouter);
app.use("/api/bank-transactions", bankTransactionsRouter);
app.use("/api/payroll", payrollRouter);
app.use("/api/absences", absencesRouter);
app.use("/api/employee-documents", employeeDocumentsRouter);
app.use("/api/cost-centers", costCentersRouter);
app.use("/api/billing", billingRouter);

app.use(errorHandler);
