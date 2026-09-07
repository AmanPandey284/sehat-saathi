import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { doctorLogin } from '../../services/api';
import { useAuth } from './AuthContext';


export default function DoctorLogin() {

  const navigate = useNavigate();

  const {
    setSession,
  } = useAuth();

  const [email, setEmail] =
    useState('');

  const [password, setPassword] =
    useState('');

  const [registrationId, setRegistrationId] =
    useState('');

  const [error, setError] =
    useState('');

  const [loading, setLoading] =
    useState(false);


  async function handleSubmit(
    e: React.FormEvent
  ) {

    e.preventDefault();

    setError('');
    setLoading(true);

    try {

      const data = await doctorLogin({
        email,
        password,
        registration_id: registrationId,
      });

      setSession(
        data.access_token,
        data.user
      );

      navigate('/doctor');

    } catch (err) {

      setError(
        err instanceof Error
          ? err.message
          : 'Login failed'
      );

    } finally {

      setLoading(false);

    }
  }


  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-6">

      <div className="w-full max-w-md rounded-2xl border border-clinic-100 bg-white p-8 shadow-sm">

        <p className="text-xs font-semibold uppercase tracking-wide text-clinic-500">
          Sehat Saathi
        </p>

        <h1 className="mt-2 font-display text-2xl font-semibold text-ink">
          Doctor Login
        </h1>

        <p className="mt-2 text-sm text-muted">
          Authorized doctors only.
        </p>


        <form
          onSubmit={handleSubmit}
          className="mt-6 space-y-4"
        >

          <input
            type="email"
            placeholder="Doctor email"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
            required
            className="w-full rounded-lg border border-clinic-200 p-3 text-sm"
          />


          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
            required
            className="w-full rounded-lg border border-clinic-200 p-3 text-sm"
          />


          <input
            type="text"
            placeholder="Doctor Registration ID"
            value={registrationId}
            onChange={(e) =>
              setRegistrationId(e.target.value)
            }
            required
            className="w-full rounded-lg border border-clinic-200 p-3 text-sm"
          />


          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}


          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-clinic-600 px-4 py-3 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading
              ? 'Verifying...'
              : 'Sign in'}
          </button>

        </form>


        <div className="mt-6 rounded-lg bg-clinic-50 p-4">

          <p className="text-xs font-semibold text-ink">
            Demo access
          </p>

          <p className="mt-1 text-xs text-muted">
            Use one of the authorized demo
            doctor accounts provided for testing.
          </p>

        </div>

      </div>

    </div>
  );
}