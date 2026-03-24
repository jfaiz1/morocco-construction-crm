import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../hooks/useApi';

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentData, setPaymentData] = useState({ amount: '', payment_method: 'bank_transfer', notes: '' });

  useEffect(() => {
    api.getInvoice(id).then(setInvoice).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  const handleStatusUpdate = async (status, payment_status) => {
    try {
      const data = {};
      if (status) data.status = status;
      if (payment_status) data.payment_status = payment_status;
      const updated = await api.updateInvoice(id, data);
      setInvoice(updated);
    } catch (err) {
      alert(err.message);
    }
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    try {
      await api.createPayment({ invoice_id: id, ...paymentData });
      const updated = await api.getInvoice(id);
      setInvoice(updated);
      setShowPayment(false);
      setPaymentData({ amount: '', payment_method: 'bank_transfer', notes: '' });
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Supprimer cette facture ?')) return;
    try {
      await api.deleteInvoice(id);
      navigate('/invoices');
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full"></div></div>;
  if (!invoice) return <p className="text-gray-500">Facture introuvable</p>;

  const statusColors = {
    paid: 'bg-green-100 text-green-700', unpaid: 'bg-yellow-100 text-yellow-700',
    partial: 'bg-blue-100 text-blue-700', overdue: 'bg-red-100 text-red-700',
    pending: 'bg-yellow-100 text-yellow-700', sent: 'bg-blue-100 text-blue-700'
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link to="/invoices" className="text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{invoice.invoice_number}</h1>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[invoice.payment_status] || statusColors[invoice.status] || 'bg-gray-100 text-gray-700'}`}>
          {invoice.payment_status || invoice.status}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Détails de la facture</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-gray-500">Client</p><p className="font-medium">{invoice.customer?.name || '-'}</p></div>
              <div><p className="text-gray-500">Téléphone</p><p className="font-medium">{invoice.customer?.primary_phone || '-'}</p></div>
              <div><p className="text-gray-500">Date d'émission</p><p className="font-medium">{new Date(invoice.issue_date).toLocaleDateString('fr-FR')}</p></div>
              <div><p className="text-gray-500">Date d'échéance</p><p className="font-medium">{new Date(invoice.due_date).toLocaleDateString('fr-FR')}</p></div>
              <div><p className="text-gray-500">Devise</p><p className="font-medium">{invoice.currency}</p></div>
              <div><p className="text-gray-500">Statut</p><p className="font-medium">{invoice.status}</p></div>
            </div>
            {invoice.customer_notes && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-gray-500 text-sm">Notes</p>
                <p className="text-gray-700 mt-1">{invoice.customer_notes}</p>
              </div>
            )}
          </div>

          {/* Line items */}
          {invoice.items && invoice.items.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Lignes de facture</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 text-gray-500 font-medium">Description</th>
                    <th className="text-right py-2 text-gray-500 font-medium">Qté</th>
                    <th className="text-right py-2 text-gray-500 font-medium">Prix unitaire</th>
                    <th className="text-right py-2 text-gray-500 font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {invoice.items.map((item) => (
                    <tr key={item.id}>
                      <td className="py-2">{item.description}</td>
                      <td className="text-right py-2">{Number(item.quantity)} {item.unit || ''}</td>
                      <td className="text-right py-2">{Number(item.unit_price).toLocaleString('fr-FR')} MAD</td>
                      <td className="text-right py-2 font-medium">{Number(item.line_total).toLocaleString('fr-FR')} MAD</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Payments */}
          {invoice.payments && invoice.payments.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Paiements reçus</h2>
              <div className="space-y-3">
                {invoice.payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div>
                      <p className="font-medium text-sm">{p.payment_number}</p>
                      <p className="text-xs text-gray-500">{new Date(p.payment_date).toLocaleDateString('fr-FR')} - {p.payment_method}</p>
                    </div>
                    <p className="font-semibold text-green-600">{Number(p.amount).toLocaleString('fr-FR')} MAD</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Totals */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Sous-total</span><span>{Number(invoice.subtotal).toLocaleString('fr-FR')} MAD</span></div>
              <div className="flex justify-between"><span className="text-gray-500">TVA ({Number(invoice.tax_rate)}%)</span><span>{Number(invoice.tax_amount).toLocaleString('fr-FR')} MAD</span></div>
              <div className="flex justify-between pt-3 border-t border-gray-200">
                <span className="font-semibold text-gray-900">Total TTC</span>
                <span className="text-xl font-bold text-gray-900">{Number(invoice.total).toLocaleString('fr-FR')} MAD</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
            <h3 className="font-semibold text-gray-900 text-sm">Actions</h3>

            {invoice.payment_status !== 'paid' && (
              <button onClick={() => setShowPayment(!showPayment)}
                className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors">
                Enregistrer un paiement
              </button>
            )}

            {invoice.status !== 'paid' && invoice.status !== 'sent' && (
              <button onClick={() => handleStatusUpdate('sent')}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
                Marquer comme envoyé
              </button>
            )}

            <button onClick={handleDelete}
              className="w-full py-2 bg-white border border-red-300 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors">
              Supprimer
            </button>
          </div>

          {/* Payment form */}
          {showPayment && (
            <form onSubmit={handlePayment} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <h3 className="font-semibold text-gray-900 text-sm">Nouveau paiement</h3>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Montant (MAD)</label>
                <input type="number" step="0.01" required value={paymentData.amount}
                  onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                  placeholder={Number(invoice.total).toString()}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Méthode</label>
                <select value={paymentData.payment_method}
                  onChange={(e) => setPaymentData({ ...paymentData, payment_method: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none">
                  <option value="bank_transfer">Virement bancaire</option>
                  <option value="cash">Espèces</option>
                  <option value="cheque">Chèque</option>
                  <option value="mobilemoney">Orange Money</option>
                  <option value="card">Carte bancaire</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Notes</label>
                <input type="text" value={paymentData.notes}
                  onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
              </div>
              <button type="submit" className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors">
                Confirmer le paiement
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
