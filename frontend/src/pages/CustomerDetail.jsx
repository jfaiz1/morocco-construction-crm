import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../hooks/useApi';

export default function CustomerDetail() {
  const { id } = useParams();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getCustomer(id).then(setCustomer).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full"></div></div>;
  if (!customer) return <p className="text-gray-500">Client introuvable</p>;

  const totalInvoiced = customer.invoices?.reduce((sum, inv) => sum + Number(inv.total), 0) || 0;
  const totalPaid = customer.invoices?.filter(inv => inv.payment_status === 'paid').reduce((sum, inv) => sum + Number(inv.total), 0) || 0;
  const totalUnpaid = totalInvoiced - totalPaid;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link to="/customers" className="text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{customer.name}</h1>
          {customer.business_name && <p className="text-gray-500">{customer.business_name}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3 text-sm">
            <h2 className="font-semibold text-gray-900">Informations</h2>
            <div><p className="text-gray-500">Téléphone</p><p className="font-medium">{customer.primary_phone}</p></div>
            {customer.whatsapp_number && <div><p className="text-gray-500">WhatsApp</p><p className="font-medium">{customer.whatsapp_number} {customer.whatsapp_verified ? '(vérifié)' : ''}</p></div>}
            {customer.primary_email && <div><p className="text-gray-500">Email</p><p className="font-medium">{customer.primary_email}</p></div>}
            {customer.region && <div><p className="text-gray-500">Région</p><p className="font-medium">{customer.region}</p></div>}
            {customer.city && <div><p className="text-gray-500">Ville</p><p className="font-medium">{customer.city}</p></div>}
            <div><p className="text-gray-500">Type</p><p className="font-medium">{customer.business_type || '-'}</p></div>
            {customer.banking_preference && <div><p className="text-gray-500">Paiement préféré</p><p className="font-medium">{customer.banking_preference}</p></div>}
          </div>

          {/* Financial summary */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3 text-sm">
            <h2 className="font-semibold text-gray-900">Résumé financier</h2>
            <div className="flex justify-between"><span className="text-gray-500">Total facturé</span><span className="font-semibold">{totalInvoiced.toLocaleString('fr-FR')} MAD</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Total payé</span><span className="font-semibold text-green-600">{totalPaid.toLocaleString('fr-FR')} MAD</span></div>
            <div className="flex justify-between pt-2 border-t"><span className="text-gray-500">Solde impayé</span><span className="font-bold text-red-600">{totalUnpaid.toLocaleString('fr-FR')} MAD</span></div>
          </div>
        </div>

        {/* Invoices and communications */}
        <div className="lg:col-span-2 space-y-6">
          {/* Invoices */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-5 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="font-semibold text-gray-900">Factures ({customer.invoices?.length || 0})</h2>
              <Link to="/invoices/new" className="text-sm text-primary-500 hover:text-primary-600">+ Nouvelle</Link>
            </div>
            <div className="divide-y divide-gray-100">
              {customer.invoices?.map((inv) => (
                <Link key={inv.id} to={`/invoices/${inv.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                  <div>
                    <p className="font-medium text-sm">{inv.invoice_number}</p>
                    <p className="text-xs text-gray-500">{new Date(inv.due_date).toLocaleDateString('fr-FR')}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm">{Number(inv.total).toLocaleString('fr-FR')} MAD</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${inv.payment_status === 'paid' ? 'bg-green-100 text-green-700' : inv.payment_status === 'partial' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {inv.payment_status || inv.status}
                    </span>
                  </div>
                </Link>
              ))}
              {(!customer.invoices || customer.invoices.length === 0) && (
                <p className="px-5 py-8 text-center text-gray-400 text-sm">Aucune facture</p>
              )}
            </div>
          </div>

          {/* Recent communications */}
          {customer.communications && customer.communications.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="px-5 py-4 border-b border-gray-200">
                <h2 className="font-semibold text-gray-900">Communications récentes</h2>
              </div>
              <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
                {customer.communications.map((comm) => (
                  <div key={comm.id} className="px-5 py-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded ${comm.direction === 'inbound' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                        {comm.direction === 'inbound' ? 'Reçu' : 'Envoyé'}
                      </span>
                      <span className="text-xs text-gray-400">{new Date(comm.created_at).toLocaleString('fr-FR')}</span>
                    </div>
                    <p className="text-sm text-gray-700 line-clamp-2">{comm.message_content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
