const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...\n');

  // 1. Create default workspace
  const workspace = await prisma.workspace.upsert({
    where: { slug: 'default' },
    update: {},
    create: {
      name: 'Morocco Construction CRM',
      slug: 'default',
      description: 'Default workspace for Morocco WhatsApp CRM',
      is_active: true
    }
  });
  console.log(`✅ Workspace: ${workspace.name} (ID: ${workspace.id})`);

  // 2. Create admin user
  const passwordHash = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@moroccocrm.ma' },
    update: {},
    create: {
      workspace_id: workspace.id,
      email: 'admin@moroccocrm.ma',
      password_hash: passwordHash,
      first_name: 'Faiz',
      last_name: 'Jalal',
      phone_number: '+212600000000',
      role: 'admin',
      is_active: true
    }
  });
  console.log(`✅ Admin user: ${admin.email} (password: admin123)`);

  // 3. Create sample customers
  const customers = [
    {
      workspace_id: workspace.id,
      name: 'Ahmed Ben Hassan',
      business_name: 'Hassan Construction SARL',
      business_type: 'contractor',
      primary_phone: '+212661234567',
      primary_email: 'ahmed@hassanconstruction.ma',
      region: 'Casablanca-Settat',
      city: 'Casablanca',
      whatsapp_number: '+212661234567',
      whatsapp_verified: true,
      banking_preference: 'bank',
      is_active: true,
      created_by: admin.id
    },
    {
      workspace_id: workspace.id,
      name: 'Karim El Amrani',
      business_name: 'El Amrani BTP',
      business_type: 'contractor',
      primary_phone: '+212662345678',
      primary_email: 'karim@elamranibtp.ma',
      region: 'Rabat-Salé-Kénitra',
      city: 'Rabat',
      whatsapp_number: '+212662345678',
      whatsapp_verified: true,
      banking_preference: 'mixed',
      is_active: true,
      created_by: admin.id
    },
    {
      workspace_id: workspace.id,
      name: 'Fatima Zahra Bennani',
      business_name: 'Bennani Matériaux',
      business_type: 'supplier',
      primary_phone: '+212663456789',
      primary_email: 'fatima@bennanimat.ma',
      region: 'Fès-Meknès',
      city: 'Fès',
      whatsapp_number: '+212663456789',
      whatsapp_verified: true,
      banking_preference: 'mobilemoney',
      is_active: true,
      created_by: admin.id
    },
    {
      workspace_id: workspace.id,
      name: 'Omar Tazi',
      business_name: 'Tazi Électricité',
      business_type: 'sme',
      primary_phone: '+212664567890',
      region: 'Marrakech-Safi',
      city: 'Marrakech',
      whatsapp_number: '+212664567890',
      whatsapp_verified: true,
      banking_preference: 'cash',
      is_active: true,
      created_by: admin.id
    },
    {
      workspace_id: workspace.id,
      name: 'Youssef Idrissi',
      business_name: 'Idrissi Plomberie',
      business_type: 'individual',
      primary_phone: '+212665678901',
      region: 'Tanger-Tétouan-Al Hoceïma',
      city: 'Tanger',
      whatsapp_number: '+212665678901',
      whatsapp_verified: true,
      is_active: true,
      created_by: admin.id
    }
  ];

  const createdCustomers = [];
  for (const c of customers) {
    const customer = await prisma.customer.upsert({
      where: { id: BigInt(createdCustomers.length + 1) },
      update: {},
      create: c
    });
    createdCustomers.push(customer);
    console.log(`✅ Customer: ${customer.name} (${customer.city})`);
  }

  // 4. Create sample invoices
  const now = new Date();
  const invoiceData = [
    {
      workspace_id: workspace.id,
      invoice_number: 'INV-2026-001',
      invoice_year: 2026,
      customer_id: createdCustomers[0].id,
      issue_date: new Date(now - 45 * 86400000),
      due_date: new Date(now - 15 * 86400000),
      subtotal: 85000,
      tax_rate: 20,
      tax_amount: 17000,
      total: 102000,
      status: 'overdue',
      payment_status: 'unpaid',
      currency: 'MAD',
      is_draft: false,
      customer_notes: 'Travaux de gros œuvre - Phase 1',
      created_by: admin.id
    },
    {
      workspace_id: workspace.id,
      invoice_number: 'INV-2026-002',
      invoice_year: 2026,
      customer_id: createdCustomers[1].id,
      issue_date: new Date(now - 20 * 86400000),
      due_date: new Date(now + 10 * 86400000),
      subtotal: 45000,
      tax_rate: 20,
      tax_amount: 9000,
      total: 54000,
      status: 'pending',
      payment_status: 'unpaid',
      currency: 'MAD',
      is_draft: false,
      customer_notes: 'Fourniture et pose carrelage',
      created_by: admin.id
    },
    {
      workspace_id: workspace.id,
      invoice_number: 'INV-2026-003',
      invoice_year: 2026,
      customer_id: createdCustomers[2].id,
      issue_date: new Date(now - 60 * 86400000),
      due_date: new Date(now - 30 * 86400000),
      subtotal: 125000,
      tax_rate: 20,
      tax_amount: 25000,
      total: 150000,
      status: 'paid',
      payment_status: 'paid',
      currency: 'MAD',
      is_draft: false,
      customer_notes: 'Livraison matériaux - Ciment, fer, sable',
      created_by: admin.id
    },
    {
      workspace_id: workspace.id,
      invoice_number: 'INV-2026-004',
      invoice_year: 2026,
      customer_id: createdCustomers[3].id,
      issue_date: new Date(now - 10 * 86400000),
      due_date: new Date(now + 20 * 86400000),
      subtotal: 32000,
      tax_rate: 20,
      tax_amount: 6400,
      total: 38400,
      status: 'sent',
      payment_status: 'unpaid',
      currency: 'MAD',
      is_draft: false,
      customer_notes: 'Installation électrique - Villa Marrakech',
      created_by: admin.id
    },
    {
      workspace_id: workspace.id,
      invoice_number: 'INV-2026-005',
      invoice_year: 2026,
      customer_id: createdCustomers[0].id,
      issue_date: new Date(now - 5 * 86400000),
      due_date: new Date(now + 25 * 86400000),
      subtotal: 67000,
      tax_rate: 20,
      tax_amount: 13400,
      total: 80400,
      status: 'pending',
      payment_status: 'partial',
      currency: 'MAD',
      is_draft: false,
      customer_notes: 'Travaux de finition - Phase 2',
      created_by: admin.id
    },
    {
      workspace_id: workspace.id,
      invoice_number: 'INV-2026-006',
      invoice_year: 2026,
      customer_id: createdCustomers[4].id,
      issue_date: new Date(now - 90 * 86400000),
      due_date: new Date(now - 60 * 86400000),
      subtotal: 28000,
      tax_rate: 20,
      tax_amount: 5600,
      total: 33600,
      status: 'overdue',
      payment_status: 'unpaid',
      currency: 'MAD',
      is_draft: false,
      customer_notes: 'Plomberie sanitaire - Appartement Tanger',
      created_by: admin.id
    }
  ];

  for (const inv of invoiceData) {
    await prisma.invoice.upsert({
      where: { invoice_number: inv.invoice_number },
      update: {},
      create: inv
    });
    console.log(`✅ Invoice: ${inv.invoice_number} - ${inv.total.toLocaleString()} MAD (${inv.payment_status})`);
  }

  // 5. Create a sample payment for the paid invoice
  const paidInvoice = await prisma.invoice.findUnique({ where: { invoice_number: 'INV-2026-003' } });
  if (paidInvoice) {
    await prisma.payment.upsert({
      where: { payment_number: 'PAY-2026-001' },
      update: {},
      create: {
        workspace_id: workspace.id,
        payment_number: 'PAY-2026-001',
        customer_id: createdCustomers[2].id,
        invoice_id: paidInvoice.id,
        amount: 150000,
        currency: 'MAD',
        payment_method: 'bank_transfer',
        payment_date: new Date(now - 25 * 86400000),
        received_date: new Date(now - 24 * 86400000),
        status: 'confirmed',
        notes: 'Virement bancaire reçu',
        created_by: admin.id
      }
    });
    console.log('✅ Payment: PAY-2026-001 - 150,000 MAD (bank_transfer)');
  }

  // Partial payment for INV-2026-005
  const partialInvoice = await prisma.invoice.findUnique({ where: { invoice_number: 'INV-2026-005' } });
  if (partialInvoice) {
    await prisma.payment.upsert({
      where: { payment_number: 'PAY-2026-002' },
      update: {},
      create: {
        workspace_id: workspace.id,
        payment_number: 'PAY-2026-002',
        customer_id: createdCustomers[0].id,
        invoice_id: partialInvoice.id,
        amount: 40000,
        currency: 'MAD',
        payment_method: 'cash',
        payment_date: new Date(now - 3 * 86400000),
        status: 'confirmed',
        notes: 'Acompte espèces',
        created_by: admin.id
      }
    });
    console.log('✅ Payment: PAY-2026-002 - 40,000 MAD (cash - partial)');
  }

  // 6. Create message templates
  const templates = [
    {
      workspace_id: workspace.id,
      name: 'Rappel de paiement',
      template_type: 'whatsapp',
      subject: 'Rappel - Facture {{invoice_number}}',
      content: 'Bonjour {{customer_name}},\n\nCeci est un rappel pour la facture {{invoice_number}} de {{amount}} MAD, échue le {{due_date}}.\n\nMerci de procéder au paiement.\n\nCordialement,\nMorocco CRM',
      variables: JSON.stringify([
        { name: 'customer_name', type: 'string' },
        { name: 'invoice_number', type: 'string' },
        { name: 'amount', type: 'number' },
        { name: 'due_date', type: 'date' }
      ]),
      is_active: true,
      created_by: admin.id
    },
    {
      workspace_id: workspace.id,
      name: 'Confirmation de paiement',
      template_type: 'whatsapp',
      subject: 'Paiement reçu - {{invoice_number}}',
      content: 'Bonjour {{customer_name}},\n\nNous confirmons la réception de votre paiement de {{amount}} MAD pour la facture {{invoice_number}}.\n\nMerci!\n\nMorocco CRM',
      variables: JSON.stringify([
        { name: 'customer_name', type: 'string' },
        { name: 'invoice_number', type: 'string' },
        { name: 'amount', type: 'number' }
      ]),
      is_active: true,
      created_by: admin.id
    }
  ];

  for (const t of templates) {
    await prisma.messageTemplate.create({ data: t });
    console.log(`✅ Template: ${t.name}`);
  }

  console.log('\n🎉 Seed complete!');
  console.log('\n📋 Login credentials:');
  console.log('   Email: admin@moroccocrm.ma');
  console.log('   Password: admin123\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
