import { useState, useEffect } from 'react';
import { api, useAuth } from '../hooks/useApi';

export default function Profile() {
  const { user } = useAuth();
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone_number: '' });
  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [passwordMessage, setPasswordMessage] = useState(null);

  useEffect(() => {
    api.me().then((data) => {
      setForm({
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        email: data.email || '',
        phone_number: data.phone_number || ''
      });
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const data = await api.updateProfile(form);
      localStorage.setItem('crm_token', data.token);
      localStorage.setItem('crm_user', JSON.stringify(data.user));
      setMessage({ type: 'success', text: 'Profil mis à jour avec succès' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordMessage(null);

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordMessage({ type: 'error', text: 'Les mots de passe ne correspondent pas' });
      return;
    }
    if (passwordForm.new_password.length < 6) {
      setPasswordMessage({ type: 'error', text: 'Le mot de passe doit contenir au moins 6 caractères' });
      return;
    }

    setSaving(true);
    try {
      const data = await api.updateProfile({
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password
      });
      localStorage.setItem('crm_token', data.token);
      localStorage.setItem('crm_user', JSON.stringify(data.user));
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
      setPasswordMessage({ type: 'success', text: 'Mot de passe modifié avec succès' });
    } catch (err) {
      setPasswordMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full"></div></div>;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mon profil</h1>
        <p className="text-gray-500 text-sm mt-1">Gérer vos informations personnelles</p>
      </div>

      {/* Profile info */}
      <form onSubmit={handleSave} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <h2 className="font-semibold text-gray-900">Informations personnelles</h2>

        {message && (
          <div className={`px-4 py-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
            <input
              type="text"
              value={form.first_name}
              onChange={(e) => setForm({ ...form, first_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
            <input
              type="text"
              value={form.last_name}
              onChange={(e) => setForm({ ...form, last_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
          <input
            type="tel"
            value={form.phone_number}
            onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
            placeholder="+212..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">Rôle: <span className="font-medium text-gray-600">{user?.role}</span></span>
          <span className="flex-1" />
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </form>

      {/* Password change */}
      <form onSubmit={handlePasswordChange} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <h2 className="font-semibold text-gray-900">Changer le mot de passe</h2>

        {passwordMessage && (
          <div className={`px-4 py-3 rounded-lg text-sm ${passwordMessage.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {passwordMessage.text}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe actuel</label>
          <input
            type="password"
            value={passwordForm.current_password}
            onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nouveau mot de passe</label>
            <input
              type="password"
              value={passwordForm.new_password}
              onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirmer</label>
            <input
              type="password"
              value={passwordForm.confirm_password}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving || !passwordForm.current_password || !passwordForm.new_password}
            className="px-5 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {saving ? 'Modification...' : 'Modifier le mot de passe'}
          </button>
        </div>
      </form>
    </div>
  );
}
