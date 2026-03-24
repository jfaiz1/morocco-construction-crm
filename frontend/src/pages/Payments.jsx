import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../hooks/useApi';

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getPayments()
      .then((data) => { setPayments(data.payments); setTotal(data.total); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const methodLabels = {
    bank_transfer: 'Virement bancaire', cash: 'Espèces', cheque: 'Chèque',
    mobilemoney: 'Orange Money', card: 'Carte bancaire'
  };

  const statusColors = {
    confirmed: 'bg-green-100 text-green-700', pending: 'bg-yellow-100 text-yellow-700',
    reconciled: 'bg-blue-100 text-blue-700', disputed: 'bg-red-100 text-red-700'
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Paiements</h1>
        <p className="text-gray-500 text-sm">{total} paiements enregistrés</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-5 py-3 text-left font-medium text-gray-500">Référence</th>
                  <th className="px-5 py-3 text-left font-medium text-gray-500">Facture</th>
                  <th className="px-5 py-3 text-left font-medium text-gray-500">Client</th>
                  <th className="px-5 py-3 text-left font-medium text-gray-500">Montant</th>
                  <th className="px-5 py-3 text-left font-medium text-gray-500">Méthode</th>
                  <th className="px-5 py-3 text-left font-medium text-gray-500">Date</th>
                  <th className="px-5 py-3 text-left font-medium text-gray-500">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 font-medium text-gray-900">{p.payment_number}</td>
                    <td className="px-5 py-3">
                      <Link to={`/invoices/${p.invoice_id || p.invoice?.id}`} className="text-primary-600 hover:text-primary-700">
                        {p.invoice?.invoice_number || '-'}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-gray-600">{p.customer?.name || '-'}</td>
                    <td className="px-5 py-3 font-semibold text-green-600">{Number(p.amount).toLocaleString('fr-FR')} MAD</td>
                    <td className="px-5 py-3 text-gray-600">{methodLabels[p.payment_method] || p.payment_method}</td>
                    <td className="px-5 py-3 text-gray-600">{new Date(p.payment_date).toLocaleDateString('fr-FR')}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[p.status] || 'bg-gray-100 text-gray-700'}`}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {payments.length === 0 && (
                  <tr><td colSpan={7} className="px-5 py-12 text-center text-gray-400">Aucun paiement enregistré</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
