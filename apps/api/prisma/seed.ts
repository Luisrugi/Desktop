import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  await prisma.plan.upsert({
    where: { tier: "STARTER" },
    update: {},
    create: {
      tier: "STARTER",
      name: "Starter",
      priceMonthlyCents: 0,
      maxUsers: 2,
      maxEmployees: 5,
      featuresJson: JSON.stringify(["time-tracking", "invoicing"]),
    },
  });
  await prisma.plan.upsert({
    where: { tier: "BUSINESS" },
    update: {},
    create: {
      tier: "BUSINESS",
      name: "Business",
      priceMonthlyCents: 2900,
      maxUsers: 15,
      maxEmployees: 50,
      featuresJson: JSON.stringify([
        "time-tracking",
        "invoicing",
        "xinvoicing",
        "purchasing",
        "accounting",
        "absences",
      ]),
    },
  });
  await prisma.plan.upsert({
    where: { tier: "ENTERPRISE" },
    update: {},
    create: {
      tier: "ENTERPRISE",
      name: "Enterprise",
      priceMonthlyCents: 9900,
      maxUsers: 999,
      maxEmployees: 999,
      featuresJson: JSON.stringify([
        "time-tracking",
        "invoicing",
        "xinvoicing",
        "purchasing",
        "accounting",
        "absences",
        "payroll",
        "controlling",
        "bank-import",
      ]),
    },
  });

  const existingCompany = await prisma.company.findFirst({ where: { name: "Demo GmbH" } });
  if (existingCompany) {
    console.log("Demo-Firma existiert bereits, überspringe Seed der Beispieldaten.");
    return;
  }

  const company = await prisma.company.create({
    data: {
      name: "Demo GmbH",
      addressLine1: "Musterstraße 1",
      postalCode: "10115",
      city: "Berlin",
      country: "DE",
      taxId: "12/345/67890",
      vatId: "DE123456789",
      iban: "DE89370400440532013000",
      email: "info@demo-gmbh.de",
    },
  });

  const passwordHash = await bcrypt.hash("demo1234", 10);
  await prisma.user.create({
    data: {
      email: "admin@demo-gmbh.de",
      name: "Admin Demo",
      passwordHash,
      role: "ADMIN",
      companyId: company.id,
    },
  });

  const client = await prisma.client.create({
    data: {
      companyId: company.id,
      name: "Musterkunde AG",
      email: "buchhaltung@musterkunde.de",
      addressLine1: "Kundenweg 5",
      postalCode: "80331",
      city: "München",
      country: "DE",
      defaultHourlyRateCents: 9000,
    },
  });

  await prisma.project.create({
    data: {
      companyId: company.id,
      clientId: client.id,
      name: "Website Relaunch",
      hourlyRateCents: 9500,
    },
  });

  console.log("Seed abgeschlossen. Login: admin@demo-gmbh.de / demo1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
