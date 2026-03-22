-- CreateTable
CREATE TABLE "Workspace" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "logo_url" VARCHAR(500),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" BIGSERIAL NOT NULL,
    "workspace_id" BIGINT NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "phone_number" VARCHAR(20),
    "first_name" VARCHAR(100),
    "last_name" VARCHAR(100),
    "password_hash" VARCHAR(255),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "role" VARCHAR(50) NOT NULL DEFAULT 'user',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" BIGSERIAL NOT NULL,
    "workspace_id" BIGINT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "business_name" VARCHAR(255),
    "business_type" VARCHAR(50),
    "cnss_number" VARCHAR(50),
    "patente_number" VARCHAR(50),
    "ice_number" VARCHAR(50),
    "tax_id" VARCHAR(50),
    "primary_phone" VARCHAR(20) NOT NULL,
    "primary_email" VARCHAR(255),
    "region" VARCHAR(100),
    "city" VARCHAR(100),
    "banking_preference" VARCHAR(50),
    "preferred_payment_terms" INTEGER DEFAULT 30,
    "credit_limit" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "whatsapp_number" VARCHAR(20),
    "whatsapp_verified" BOOLEAN NOT NULL DEFAULT false,
    "assigned_user_id" BIGINT,
    "tags" JSONB,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerContact" (
    "id" BIGSERIAL NOT NULL,
    "customer_id" BIGINT NOT NULL,
    "contact_type" VARCHAR(50),
    "person_name" VARCHAR(255),
    "job_title" VARCHAR(100),
    "phone_numbers" JSONB,
    "emails" JSONB,
    "address" JSONB,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" BIGSERIAL NOT NULL,
    "workspace_id" BIGINT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(50),
    "contractor_id" BIGINT NOT NULL,
    "site_name" VARCHAR(255),
    "site_address" JSONB,
    "start_date" TIMESTAMP(3),
    "estimated_completion_date" TIMESTAMP(3),
    "actual_completion_date" TIMESTAMP(3),
    "contract_value" DECIMAL(15,2),
    "currency" VARCHAR(3) NOT NULL DEFAULT 'MAD',
    "completion_percentage" INTEGER NOT NULL DEFAULT 0,
    "status" VARCHAR(50),
    "project_manager_id" BIGINT,
    "team_members" JSONB,
    "description" TEXT,
    "notes" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" BIGSERIAL NOT NULL,
    "workspace_id" BIGINT NOT NULL,
    "invoice_number" VARCHAR(50) NOT NULL,
    "invoice_year" INTEGER,
    "customer_id" BIGINT NOT NULL,
    "project_id" BIGINT,
    "issue_date" TIMESTAMP(3) NOT NULL,
    "due_date" TIMESTAMP(3) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'MAD',
    "exchange_rate" DECIMAL(10,6) NOT NULL DEFAULT 1.0,
    "subtotal" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "tax_rate" DECIMAL(5,2) NOT NULL DEFAULT 20.0,
    "tax_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "discount_type" VARCHAR(50),
    "discount_value" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "payment_terms_days" INTEGER NOT NULL DEFAULT 30,
    "advance_required" BOOLEAN NOT NULL DEFAULT false,
    "advance_percentage" DECIMAL(5,2),
    "advance_paid" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "status" VARCHAR(50) NOT NULL DEFAULT 'draft',
    "payment_status" VARCHAR(50),
    "phase_name" VARCHAR(100),
    "completion_percentage" INTEGER NOT NULL DEFAULT 0,
    "pdf_url" VARCHAR(500),
    "pdf_generated_at" TIMESTAMP(3),
    "internal_notes" TEXT,
    "customer_notes" TEXT,
    "is_draft" BOOLEAN NOT NULL DEFAULT true,
    "version_number" INTEGER NOT NULL DEFAULT 1,
    "amended_from" BIGINT,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceItem" (
    "id" BIGSERIAL NOT NULL,
    "invoice_id" BIGINT NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "category" VARCHAR(50),
    "quantity" DECIMAL(10,2) NOT NULL,
    "unit" VARCHAR(50),
    "unit_price" DECIMAL(15,2) NOT NULL,
    "line_total" DECIMAL(15,2) NOT NULL,
    "tax_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" BIGSERIAL NOT NULL,
    "workspace_id" BIGINT NOT NULL,
    "payment_number" VARCHAR(50) NOT NULL,
    "customer_id" BIGINT NOT NULL,
    "invoice_id" BIGINT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'MAD',
    "payment_method" VARCHAR(50) NOT NULL,
    "payment_details" JSONB,
    "payment_date" TIMESTAMP(3) NOT NULL,
    "received_date" TIMESTAMP(3),
    "reconciliation_date" TIMESTAMP(3),
    "status" VARCHAR(50),
    "customer_reference" VARCHAR(255),
    "receipt_url" VARCHAR(500),
    "notes" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Communication" (
    "id" BIGSERIAL NOT NULL,
    "workspace_id" BIGINT NOT NULL,
    "entity_type" VARCHAR(50),
    "entity_id" BIGINT,
    "customer_id" BIGINT NOT NULL,
    "platform" VARCHAR(50) NOT NULL,
    "direction" VARCHAR(20) NOT NULL,
    "message_type" VARCHAR(100),
    "subject" VARCHAR(255),
    "message_content" TEXT,
    "attachment_url" VARCHAR(500),
    "attachment_type" VARCHAR(50),
    "whatsapp_message_id" VARCHAR(255),
    "whatsapp_status" VARCHAR(50),
    "email_message_id" VARCHAR(255),
    "status" VARCHAR(50) NOT NULL,
    "error_message" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Communication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationRule" (
    "id" BIGSERIAL NOT NULL,
    "workspace_id" BIGINT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "trigger_type" VARCHAR(50) NOT NULL,
    "trigger_config" JSONB,
    "action_type" VARCHAR(50) NOT NULL,
    "action_config" JSONB,
    "template_id" BIGINT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "max_executions_per_day" INTEGER,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomationRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageTemplate" (
    "id" BIGSERIAL NOT NULL,
    "workspace_id" BIGINT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "template_type" VARCHAR(50) NOT NULL,
    "subject" VARCHAR(255),
    "content" TEXT NOT NULL,
    "variables" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MessageTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_slug_key" ON "Workspace"("slug");

-- CreateIndex
CREATE INDEX "Workspace_slug_idx" ON "Workspace"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_workspace_id_idx" ON "User"("workspace_id");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "Customer_workspace_id_idx" ON "Customer"("workspace_id");

-- CreateIndex
CREATE INDEX "Customer_primary_phone_idx" ON "Customer"("primary_phone");

-- CreateIndex
CREATE INDEX "Customer_whatsapp_number_idx" ON "Customer"("whatsapp_number");

-- CreateIndex
CREATE INDEX "Customer_assigned_user_id_idx" ON "Customer"("assigned_user_id");

-- CreateIndex
CREATE INDEX "CustomerContact_customer_id_idx" ON "CustomerContact"("customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "Project_code_key" ON "Project"("code");

-- CreateIndex
CREATE INDEX "Project_workspace_id_idx" ON "Project"("workspace_id");

-- CreateIndex
CREATE INDEX "Project_contractor_id_idx" ON "Project"("contractor_id");

-- CreateIndex
CREATE INDEX "Project_project_manager_id_idx" ON "Project"("project_manager_id");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoice_number_key" ON "Invoice"("invoice_number");

-- CreateIndex
CREATE INDEX "Invoice_workspace_id_idx" ON "Invoice"("workspace_id");

-- CreateIndex
CREATE INDEX "Invoice_customer_id_idx" ON "Invoice"("customer_id");

-- CreateIndex
CREATE INDEX "Invoice_invoice_number_idx" ON "Invoice"("invoice_number");

-- CreateIndex
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");

-- CreateIndex
CREATE INDEX "Invoice_due_date_idx" ON "Invoice"("due_date");

-- CreateIndex
CREATE INDEX "Invoice_created_at_idx" ON "Invoice"("created_at");

-- CreateIndex
CREATE INDEX "InvoiceItem_invoice_id_idx" ON "InvoiceItem"("invoice_id");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_payment_number_key" ON "Payment"("payment_number");

-- CreateIndex
CREATE INDEX "Payment_workspace_id_idx" ON "Payment"("workspace_id");

-- CreateIndex
CREATE INDEX "Payment_customer_id_idx" ON "Payment"("customer_id");

-- CreateIndex
CREATE INDEX "Payment_invoice_id_idx" ON "Payment"("invoice_id");

-- CreateIndex
CREATE INDEX "Payment_payment_date_idx" ON "Payment"("payment_date");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE INDEX "Communication_workspace_id_idx" ON "Communication"("workspace_id");

-- CreateIndex
CREATE INDEX "Communication_customer_id_idx" ON "Communication"("customer_id");

-- CreateIndex
CREATE INDEX "Communication_entity_type_entity_id_idx" ON "Communication"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "Communication_created_at_idx" ON "Communication"("created_at");

-- CreateIndex
CREATE INDEX "Communication_platform_idx" ON "Communication"("platform");

-- CreateIndex
CREATE INDEX "AutomationRule_workspace_id_idx" ON "AutomationRule"("workspace_id");

-- CreateIndex
CREATE INDEX "AutomationRule_trigger_type_idx" ON "AutomationRule"("trigger_type");

-- CreateIndex
CREATE INDEX "MessageTemplate_workspace_id_idx" ON "MessageTemplate"("workspace_id");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_assigned_user_id_fkey" FOREIGN KEY ("assigned_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerContact" ADD CONSTRAINT "CustomerContact_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_contractor_id_fkey" FOREIGN KEY ("contractor_id") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_project_manager_id_fkey" FOREIGN KEY ("project_manager_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_amended_from_fkey" FOREIGN KEY ("amended_from") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Communication" ADD CONSTRAINT "Communication_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Communication" ADD CONSTRAINT "Communication_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Communication" ADD CONSTRAINT "Communication_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationRule" ADD CONSTRAINT "AutomationRule_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationRule" ADD CONSTRAINT "AutomationRule_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageTemplate" ADD CONSTRAINT "MessageTemplate_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageTemplate" ADD CONSTRAINT "MessageTemplate_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
