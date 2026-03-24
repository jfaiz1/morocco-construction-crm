import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../hooks/useApi';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', business_name: '', primary_phone: '', primary_email: '', city: '', region: '', business_type: 'contractor' });

  const loadCustomers = () => {
    setLoading(true);
    const params = search ? `search=${encodeURIComponent(search)}` : '';
    api.getCustomers(params)
      .then((data) => { setCustomers(data.customers); setTotal(data.total); })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadCustomers(); }, []);

  const handleSearch = (e) => { e.preventDefault(); loadCustomers(); };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.createCustomer(form);
      setShowCreate(false);
      setForm({ name: '', business_name: '', primary_phone: '', primary_email: '', city: '', region: '', business_type: 'contractor' });
      loadCustomers();
    } catch (err) {
      alert(err.message);
    }
  };

  const regions = ['Casablanca-Settat', 'Rabat-Salé-Kénitra', 'Fès-Meknès', 'Marrakech-Safi', 'Tanger-Tétouan-Al Hoceïma', 'Souss-Massa', 'Oriental', 'Drâa-Tafilalet', 'Béni Mellal-Khénifra', 'Laâyoune-Sakia El Hamra', 'Dakhla-Oued Ed Dahab', 'Guelmim-Oued Noun'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-500 text-sm">{total} clients</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-sm font-medium transition-colors">
          + Nouveau client
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Nouveau client</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required
              placeholder="Nom complet *" className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
            <input type="text" value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })}
              placeholder="Nom de l'entreprise" className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
            <input type="tel" value={form.primary_phone} onChange={(e) => setForm({ ...form, primary_phone: e.target.value })} required
              placeholder="Téléphone * (+212...)" className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
            <input type="email" value={form.primary_email} onChange={(e) => setForm({ ...form, primary_email: e.target.value })}
              placeholder="Email" className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
            <select value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none">
              <option value="">Région</option>
              {regions.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <input type="text" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}
              placeholder="Ville" className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
            <select value={form.business_type} onChange={(e) => setForm({ ...form, business_type: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none">
              <option value="contractor">Entrepreneur</option>
              <option value="supplier">Fournisseur</option>
              <option value="sme">PME</option>
              <option value="individual">Individuel</option>
              <option value="enterprise">Entreprise</option>
            </select>
          </div>
          <div className="flex gap-3">
            <button type="submit" className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-sm font-medium">Créer</button>
            <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium">Annuler</button>
          </div>
        </form>
      )}

      {/* Search */}
      <form onSubmit={handleSearch}>
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un client..."
          className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
      </form>

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
                  <th className="px-5 py-3 text-left font-medium text-gray-500">Client</th>
                  <th className="px-5 py-3 text-left font-medium text-gray-500">Entreprise</th>
                  <th className="px-5 py-3 text-left font-medium text-gray-500">Téléphone</th>
                  <th className="px-5 py-3 text-left font-medium text-gray-500">Ville</th>
                  <th className="px-5 py-3 text-left font-medium text-gray-500">Type</th>
                  <th className="px-5 py-3 text-right font-medium text-gray-500">Factures</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <Link to={`/customers/${c.id}`} className="font-medium text-primary-600 hover:text-primary-700">{c.name}</Link>
                    </td>
                    <td className="px-5 py-3 text-gray-600">{c.business_name || '-'}</td>
                    <td className="px-5 py-3 text-gray-600">{c.primary_phone}</td>
                    <td className="px-5 py-3 text-gray-600">{c.city || '-'}</td>
                    <td className="px-5 py-3">
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{c.business_type || '-'}</span>
                    </td>
                    <td className="px-5 py-3 text-right text-gray-600">{c._count?.invoices || 0}</td>
                  </tr>
                ))}
                {customers.length === 0 && (
                  <tr><td colSpan={6} className="px-5 py-12 text-center text-gray-400">Aucun client trouvé</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
