const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase with service account
let db = null;

function initializeFirestore() {
  try {
    let serviceAccount;

    // Try to get Firebase credentials from environment variable first (for deployed apps)
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    } else {
      // Fall back to file (for local development)
      const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
        path.join(__dirname, 'firebase-service-account.json');
      serviceAccount = require(serviceAccountPath);
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id
    });

    db = admin.firestore();
    console.log('✅ Firestore connected');
    return db;
  } catch (error) {
    console.error('❌ Firestore init failed:', error.message);
    console.log('💡 Set FIREBASE_SERVICE_ACCOUNT_JSON environment variable or create firebase-service-account.json file');
    throw error;
  }
}

class FirestoreDB {
  constructor() {
    this.invoices = new InvoicesCollection();
    this.conversations = new ConversationsCollection();
  }
}

class InvoicesCollection {
  async getAll() {
    try {
      const snapshot = await db.collection('invoices')
        .orderBy('createdAt', 'desc')
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting invoices:', error);
      return [];
    }
  }

  async getByPhone(phoneNumber) {
    try {
      const snapshot = await db.collection('invoices')
        .where('phoneNumber', '==', phoneNumber)
        .orderBy('createdAt', 'desc')
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting invoices by phone:', error);
      return [];
    }
  }

  async getById(id) {
    try {
      const doc = await db.collection('invoices').doc(id).get();
      if (doc.exists) {
        return {
          id: doc.id,
          ...doc.data()
        };
      }
      return null;
    } catch (error) {
      console.error('Error getting invoice:', error);
      return null;
    }
  }

  async create(invoice) {
    try {
      const invoiceId = `INV-${Date.now()}`;
      const now = new Date().toISOString();

      const newInvoice = {
        ...invoice,
        id: invoiceId,
        createdAt: now,
        updatedAt: now,
        status: invoice.status || 'pending'
      };

      await db.collection('invoices').doc(invoiceId).set(newInvoice);

      return newInvoice;
    } catch (error) {
      console.error('Error creating invoice:', error);
      throw error;
    }
  }

  async update(id, updates) {
    try {
      const now = new Date().toISOString();
      await db.collection('invoices').doc(id).update({
        ...updates,
        updatedAt: now
      });

      return this.getById(id);
    } catch (error) {
      console.error('Error updating invoice:', error);
      throw error;
    }
  }

  async delete(id) {
    try {
      await db.collection('invoices').doc(id).delete();
      return true;
    } catch (error) {
      console.error('Error deleting invoice:', error);
      throw error;
    }
  }

  async push(invoice) {
    // For compatibility with old code
    return this.create(invoice);
  }
}

class ConversationsCollection {
  async getByPhone(phoneNumber) {
    try {
      const doc = await db.collection('conversations').doc(phoneNumber).get();
      if (doc.exists) {
        return {
          phoneNumber: doc.id,
          ...doc.data()
        };
      }
      return null;
    } catch (error) {
      console.error('Error getting conversation:', error);
      return null;
    }
  }

  async saveConversation(phoneNumber, conversationData) {
    try {
      await db.collection('conversations').doc(phoneNumber).set(
        conversationData,
        { merge: true }
      );
      return conversationData;
    } catch (error) {
      console.error('Error saving conversation:', error);
      throw error;
    }
  }

  async addMessage(phoneNumber, message) {
    try {
      const messagesRef = db.collection('conversations')
        .doc(phoneNumber)
        .collection('messages');

      await messagesRef.add({
        ...message,
        timestamp: new Date().toISOString()
      });

      return true;
    } catch (error) {
      console.error('Error adding message:', error);
      throw error;
    }
  }

  async getMessages(phoneNumber, limit = 50) {
    try {
      const snapshot = await db.collection('conversations')
        .doc(phoneNumber)
        .collection('messages')
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).reverse();
    } catch (error) {
      console.error('Error getting messages:', error);
      return [];
    }
  }
}

// Export initialization and database
module.exports = {
  initializeFirestore,
  FirestoreDB
};
