const admin = require('firebase-admin')
const { PrismaClient } = require('@prisma/client')
const path = require('path')

// Initialize Firebase
const serviceAccountPath = path.join(__dirname, '../firebase-service-account.json')
const serviceAccount = require(serviceAccountPath)

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
})

const db = admin.firestore()
const prisma = new PrismaClient()

async function migrateData() {
  try {
    console.log('🔄 Starting Firestore → PostgreSQL migration...\n')

    // Step 1: Create default workspace
    console.log('📦 Creating default workspace...')
    const workspace = await prisma.workspace.upsert({
      where: { slug: 'default' },
      update: {},
      create: {
        name: 'Default Workspace',
        slug: 'default',
        is_active: true
      }
    })
    console.log(`✅ Workspace created: ${workspace.name}\n`)

    // Step 2: Migrate invoices from Firestore
    console.log('📋 Migrating invoices from Firestore...')
    const invoicesSnapshot = await db.collection('invoices').get()
    let invoiceCount = 0

    for (const doc of invoicesSnapshot.docs) {
      const firebaseInvoice = doc.data()

      try {
        // First, ensure customer exists
        let customer = await prisma.customer.findFirst({
          where: {
            primary_phone: firebaseInvoice.phoneNumber,
            workspace_id: workspace.id
          }
        })

        if (!customer) {
          customer = await prisma.customer.create({
            data: {
              workspace_id: workspace.id,
              name: firebaseInvoice.vendor || 'Unknown',
              primary_phone: firebaseInvoice.phoneNumber,
              primary_email: null,
              business_type: 'construction',
              tax_id: null,
              is_active: true
            }
          })
        }

        // Create invoice
        const invoice = await prisma.invoice.create({
          data: {
            workspace_id: workspace.id,
            invoice_number: firebaseInvoice.id || `INV-${Date.now()}`,
            customer_id: customer.id,
            issue_date: firebaseInvoice.createdAt?.toDate?.() || new Date(),
            due_date: firebaseInvoice.dueDate?.toDate?.() || new Date(),
            subtotal: firebaseInvoice.amount ? parseFloat(firebaseInvoice.amount) : 0,
            tax_rate: 20.0,
            tax_amount: firebaseInvoice.amount ? (parseFloat(firebaseInvoice.amount) * 0.20) : 0,
            total: firebaseInvoice.amount ? parseFloat(firebaseInvoice.amount) * 1.20 : 0,
            status: firebaseInvoice.status || 'pending',
            payment_status: firebaseInvoice.status === 'paid' ? 'paid' : 'unpaid',
            currency: 'MAD',
            is_draft: false
          }
        })

        // Create invoice item from description
        if (firebaseInvoice.description) {
          await prisma.invoiceItem.create({
            data: {
              invoice_id: invoice.id,
              description: firebaseInvoice.description,
              quantity: 1,
              unit_price: firebaseInvoice.amount ? parseFloat(firebaseInvoice.amount) : 0,
              line_total: firebaseInvoice.amount ? parseFloat(firebaseInvoice.amount) : 0,
              category: 'service'
            }
          })
        }

        invoiceCount++
      } catch (error) {
        console.error(`❌ Error migrating invoice ${doc.id}:`, error.message)
      }
    }
    console.log(`✅ Migrated ${invoiceCount} invoices\n`)

    // Step 3: Migrate conversations
    console.log('💬 Migrating conversations from Firestore...')
    const conversationsSnapshot = await db.collection('conversations').get()
    let conversationCount = 0

    for (const doc of conversationsSnapshot.docs) {
      const phoneNumber = doc.id
      const firestoreConversation = doc.data()

      try {
        // Find customer by phone
        const customer = await prisma.customer.findFirst({
          where: {
            primary_phone: phoneNumber,
            workspace_id: workspace.id
          }
        })

        if (!customer) continue

        // Create communications for each message
        if (firestoreConversation.messages && Array.isArray(firestoreConversation.messages)) {
          for (const msg of firestoreConversation.messages) {
            await prisma.communication.create({
              data: {
                workspace_id: workspace.id,
                customer_id: customer.id,
                platform: 'whatsapp',
                direction: msg.type === 'incoming' ? 'inbound' : 'outbound',
                message_type: msg.type,
                message_content: msg.text,
                status: 'delivered',
                entity_type: 'customer',
                entity_id: customer.id,
                created_at: msg.timestamp?.toDate?.() || new Date()
              }
            })
          }
        }
        conversationCount++
      } catch (error) {
        console.error(`❌ Error migrating conversation ${phoneNumber}:`, error.message)
      }
    }
    console.log(`✅ Migrated ${conversationCount} conversations\n`)

    console.log('✨ Migration completed successfully!')
    console.log(`\n📊 Summary:`)
    console.log(`   • Workspace: 1`)
    console.log(`   • Invoices: ${invoiceCount}`)
    console.log(`   • Conversations: ${conversationCount}`)

  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
    admin.app().delete()
  }
}

// Run migration
migrateData()
