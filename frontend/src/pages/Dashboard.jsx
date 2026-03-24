import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../hooks/useApi';

function StatCard({ label, count, amount, color, icon }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <span className={`inline-flex items-center justify-center w-10 h-10 rounded-lg ${color}`}>
          <span className="text-lg">{icon}</span>
        </span>
        <span className="text-2xl font-bold text-gray-900">{count}</span>
      </div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-lg font-semibold text-gray-900 mt-1">
        {amount.toLocaleString('fr-FR')} <span className="text-sm font-normal text-gray-500">MAD</span>
      </p>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    paid: 'bg-green-100 text-green-700',
    unpaid: 'bg-yellow-100 text-yellow-700',
    partial: 'bg-blue-100 text-blue-700',
    overdue: 'bg-red-100 text-red-700',
    pending: 'bg-yellow-100 text-yellow-700',
    sent: 'bg-blue-100 text-blue-700',
    draft: 'bg-gray-100 text-gray-700',
  };
  const labels = {
    paid: 'Payé', unpaid: 'Impayé', partial: 'Partiel', overdue: 'En retard',
    pending: 'En attente', sent: 'Envoyé', draft: 'Brouillon'
  };
  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || styles.draft}`}>
      {labels[status] || status}
    </span>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.stats().then(setStats).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full"></div></div>;
  if (!stats) return <p className="text-gray-500">Erreur de chargement</p>;

  const { overview, recent_invoices } = stats;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
          <p className="text-gray-500 text-sm mt-1">Vue d'ensemble de votre activité</p>
        </div>
        <Link to="/invoices/new" className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-sm font-medium transition-colors">
          + Nouvelle facture
        </Link>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="En attente" count={overview.pending.count} amount={overview.pending.amount} color="bg-yellow-100" icon="&#9203;" />
        <StatCard label="Payées" count={overview.paid.count} amount={overview.paid.amount} color="bg-green-100" icon="&#9989;" />
        <StatCard label="En retard" count={overview.overdue.count} amount={overview.overdue.amount} color="bg-red-100" icon="&#9888;&#65039;" />
        <StatCard label="Ce mois" count={overview.this_month.count} amount={overview.this_month.amount} color="bg-blue-100" icon="&#128200;" />
      </div>

      {/* Summary bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-3xl font-bold text-gray-900">{overview.total_invoices}</p>
            <p className="text-sm text-gray-500">Total factures</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-gray-900">{overview.total_customers}</p>
            <p className="text-sm text-gray-500">Clients</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-primary-600">{(overview.pending.amount + overview.overdue.amount).toLocaleString('fr-FR')}</p>
            <p className="text-sm text-gray-500">MAD à recevoir</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-green-600">{overview.paid.amount.toLocaleString('fr-FR')}</p>
            <p className="text-sm text-gray-500">MAD reçus</p>
          </div>
        </div>
      </div>

      {/* Recent invoices */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Factures récentes</h2>
          <Link to="/invoices" className="text-sm text-primary-500 hover:text-primary-600">Voir tout</Link>
        </div>
        <div className="divide-y divide-gray-100">
          {recent_invoices.map((inv) => (
            <Link key={inv.id} to={`/invoices/${inv.id}`} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors">
              <div>
                <p className="font-medium text-gray-900 text-sm">{inv.invoice_number}</p>
                <p className="text-xs text-gray-500">{inv.customer?.name}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900 text-sm">{Number(inv.total).toLocaleString('fr-FR')} MAD</p>
                <StatusBadge status={inv.payment_status || inv.status} />
              </div>
            </Link>
          ))}
          {recent_invoices.length === 0 && (
            <p className="px-5 py-8 text-center text-gray-400 text-sm">Aucune facture</p>
          )}
        </div>
      </div>
    </div>
  );
}
