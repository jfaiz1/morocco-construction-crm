import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../hooks/useApi';

export default function CreateInvoice() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    customer_id: '',
    vendor_name: '',
    amount: '',
    due_date: '',
    description: '',
    tax_rate: '20',
    items: []
  });
  const [newItem, setNewItem] = useState({ description: '', quantity: '1', unit_price: '', unit: 'lot', category: 'service' });
  const [useExisting, setUseExisting] = useState(true);

  useEffect(() => {
    api.getCustomers().then((data) => setCustomers(data.customers)).catch(console.error);
  }, []);

  const addItem = () => {
    if (!newItem.description || !newItem.unit_price) return;
    setForm({ ...form, items: [...form.items, { ...newItem }] });
    setNewItem({ description: '', quantity: '1', unit_price: '', unit: 'lot', category: 'service' });
  };

  const removeItem = (idx) => {
    setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = {
        amount: form.amount || form.items.reduce((sum, i) => sum + (parseFloat(i.quantity) * parseFloat(i.unit_price)), 0),
        due_date: form.due_date,
        description: form.description,
        tax_rate: form.tax_rate,
        items: form.items.length > 0 ? form.items : undefined
      };

      if (useExisting && form.customer_id) {
        data.customer_id = form.customer_id;
      } else {
        data.vendor_name = form.vendor_name;
      }

      if (!data.amount) { alert('Montant requis'); setLoading(false); return; }
      if (!data.due_date) { alert('Date d\'échéance requise'); setLoading(false); return; }

      const invoice = await api.createInvoice(data);
      navigate(`/invoices/${invoice.id}`);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Default due date to 30 days from now
  const defaultDueDate = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Nouvelle facture</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Client</h2>

          <div className="flex gap-4">
            <button type="button" onClick={() => setUseExisting(true)}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${useExisting ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
              Client existant
            </button>
            <button type="button" onClick={() => setUseExisting(false)}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${!useExisting ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
              Nouveau client
            </button>
          </div>

          {useExisting ? (
            <select value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })} required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none">
              <option value="">Sélectionner un client...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name} {c.business_name ? `(${c.business_name})` : ''}</option>
              ))}
            </select>
          ) : (
            <input type="text" value={form.vendor_name} onChange={(e) => setForm({ ...form, vendor_name: e.target.value })} required
              placeholder="Nom du client" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
          )}
        </div>

        {/* Invoice details */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Détails</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-500 mb-1">Montant HT (MAD)</label>
              <input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder={form.items.length > 0 ? 'Calculé automatiquement' : '0.00'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">TVA (%)</label>
              <input type="number" value={form.tax_rate} onChange={(e) => setForm({ ...form, tax_rate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">Date d'échéance</label>
              <input type="date" value={form.due_date || defaultDueDate} onChange={(e) => setForm({ ...form, due_date: e.target.value })} required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-500 mb-1">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2}
              placeholder="Ex: Travaux de gros oeuvre - Phase 1"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
          </div>
        </div>

        {/* Line items */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Lignes de facture (optionnel)</h2>

          {form.items.map((item, idx) => (
            <div key={idx} className="flex items-center gap-3 text-sm bg-gray-50 px-3 py-2 rounded-lg">
              <span className="flex-1">{item.description}</span>
              <span>{item.quantity} x {parseFloat(item.unit_price).toLocaleString('fr-FR')} MAD</span>
              <button type="button" onClick={() => removeItem(idx)} className="text-red-500 hover:text-red-700">x</button>
            </div>
          ))}

          <div className="grid grid-cols-4 gap-2">
            <input type="text" value={newItem.description} onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
              placeholder="Description" className="col-span-2 px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none" />
            <input type="number" value={newItem.quantity} onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
              placeholder="Qté" className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none" />
            <input type="number" step="0.01" value={newItem.unit_price} onChange={(e) => setNewItem({ ...newItem, unit_price: e.target.value })}
              placeholder="Prix unitaire" className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none" />
          </div>
          <button type="button" onClick={addItem} className="text-sm text-primary-500 hover:text-primary-600 font-medium">+ Ajouter une ligne</button>
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={loading}
            className="px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50">
            {loading ? 'Création...' : 'Créer la facture'}
          </button>
          <button type="button" onClick={() => navigate('/invoices')}
            className="px-6 py-3 bg-white border border-gray-300 text-gray-600 hover:bg-gray-50 rounded-lg font-medium transition-colors">
            Annuler
          </button>
        </div>
      </form>
    </div>
  );
}
