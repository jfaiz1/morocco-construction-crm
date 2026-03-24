import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../hooks/useApi';

function StatusBadge({ status }) {
  const styles = {
    paid: 'bg-green-100 text-green-700', unpaid: 'bg-yellow-100 text-yellow-700',
    partial: 'bg-blue-100 text-blue-700', overdue: 'bg-red-100 text-red-700',
    pending: 'bg-yellow-100 text-yellow-700', sent: 'bg-blue-100 text-blue-700', draft: 'bg-gray-100 text-gray-700',
  };
  const labels = { paid: 'Payé', unpaid: 'Impayé', partial: 'Partiel', overdue: 'En retard', pending: 'En attente', sent: 'Envoyé', draft: 'Brouillon' };
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || styles.draft}`}>{labels[status] || status}</span>;
}

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');

  const loadInvoices = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter) params.set('payment_status', filter);
    if (search) params.set('search', search);
    api.getInvoices(params.toString())
      .then((data) => { setInvoices(data.invoices); setTotal(data.total); })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadInvoices(); }, [filter]);

  const handleSearch = (e) => {
    e.preventDefault();
    loadInvoices();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Factures</h1>
          <p className="text-gray-500 text-sm">{total} factures au total</p>
        </div>
        <Link to="/invoices/new" className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-sm font-medium transition-colors">
          + Nouvelle facture
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex-1">
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher facture ou client..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none" />
        </form>
        <div className="flex gap-2">
          {['', 'unpaid', 'partial', 'paid'].map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${filter === f ? 'bg-primary-500 text-white' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
              {f === '' ? 'Tous' : f === 'unpaid' ? 'Impayé' : f === 'partial' ? 'Partiel' : 'Payé'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
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
                  <th className="px-5 py-3 text-left font-medium text-gray-500">Facture</th>
                  <th className="px-5 py-3 text-left font-medium text-gray-500">Client</th>
                  <th className="px-5 py-3 text-left font-medium text-gray-500">Montant</th>
                  <th className="px-5 py-3 text-left font-medium text-gray-500">Échéance</th>
                  <th className="px-5 py-3 text-left font-medium text-gray-500">Statut</th>
                  <th className="px-5 py-3 text-left font-medium text-gray-500">Paiement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <Link to={`/invoices/${inv.id}`} className="font-medium text-primary-600 hover:text-primary-700">
                        {inv.invoice_number}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-gray-600">{inv.customer?.name || '-'}</td>
                    <td className="px-5 py-3 font-semibold text-gray-900">{Number(inv.total).toLocaleString('fr-FR')} MAD</td>
                    <td className="px-5 py-3 text-gray-600">{new Date(inv.due_date).toLocaleDateString('fr-FR')}</td>
                    <td className="px-5 py-3"><StatusBadge status={inv.status} /></td>
                    <td className="px-5 py-3"><StatusBadge status={inv.payment_status} /></td>
                  </tr>
                ))}
                {invoices.length === 0 && (
                  <tr><td colSpan={6} className="px-5 py-12 text-center text-gray-400">Aucune facture trouvée</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
