import * as React from "react";
import "./AuthPage.css";

type AuthPageProps = {
  appName?: string;
  editionLabel?: string;
  onCorporateLogin: () => Promise<void> | void;
  corporateDomainHint?: string;
  footerNote?: string;
};

export const AuthPage: React.FC<AuthPageProps> = ({appName = "MailPro", editionLabel = "Enterprise Edition", onCorporateLogin, corporateDomainHint = "@estudiodemoda.com.co", footerNote = "Acceso restringido a usuarios corporativos autorizados.",}) => {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleCorporateLogin() {
    setError(null);
    try {
      setLoading(true);
      await onCorporateLogin();
    } catch (err: any) {
      setError(err?.message ?? "No fue posible iniciar sesión con la cuenta corporativa.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col auth-bg">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur border-b border-slate-200 py-4 px-6 sm:px-8 sticky top-0 z-30 shadow-sm">
        <div className="workspace-container flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-11 h-11 bg-gradient-to-tr from-indigo-600 to-indigo-500 rounded-xl shadow-lg shadow-indigo-100">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                <path d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-800 tracking-tight leading-none">{appName}</h1>
              <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">{editionLabel}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-grow flex items-center justify-center px-4 py-10">
        <div className="workspace-container grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Left: Welcome */}
          <section className="lg:col-span-7 glass-card p-10 sm:p-12 overflow-hidden relative">
            <div className="auth-orb auth-orb-1" />
            <div className="auth-orb auth-orb-2" />

            <div className="relative z-10">
              <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-full px-4 py-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500" />Inicio de sesión corporativo (Microsoft 365)</span>

              <h2 className="mt-6 text-4xl sm:text-5xl font-black text-slate-900 tracking-tight">
                Accede con tus{" "}<span className="text-indigo-600">credenciales corporativas</span>{" "}para gestionar campañas.
              </h2>

              <p className="mt-5 text-slate-600 font-medium leading-relaxed max-w-2xl">
                El acceso se realiza mediante Microsoft (Outlook) usando tu cuenta corporativa{" "}
                <span className="font-black text-slate-800">{corporateDomainHint}</span>.
              </p>

              <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4">


                <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-lg shadow-slate-200">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                        <path d="M12 11c1.657 0 3-1.343 3-3S13.657 5 12 5 9 6.343 9 8s1.343 3 3 3z" />
                        <path d="M6 19c0-3.314 2.686-6 6-6s6 2.686 6 6" />
                      </svg>
                    </div>
                    <h3 className="text-sm font-black text-slate-800">Control corporativo</h3>
                  </div>
                  <p className="text-sm text-slate-600 font-medium">El acceso depende de permisos y políticas de tu organización.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Right: Corporate Login */}
          <section className="lg:col-span-5 glass-card p-8 sm:p-10">
            <div className="mb-8">
              <h3 className="text-2xl font-black text-slate-900">Iniciar sesión</h3>
              <p className="text-slate-500 text-sm font-medium mt-1">Debes ingresar con tus <b>credenciales corporativas</b>. Si no tienes acceso, solicita permisos al administrador.</p>
            </div>

            {error && (
              <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-700 text-sm font-bold">
                {error}
              </div>
            )}

            <button type="button" onClick={handleCorporateLogin} disabled={loading} className="w-full bg-indigo-600 text-white py-5 rounded-2xl text-lg font-black hover:bg-indigo-700 transition shadow-2xl shadow-indigo-100 active:scale-[0.99] disabled:opacity-60 disabled:cursor-wait flex items-center justify-center gap-3">            
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-9Z" stroke="currentColor" strokeWidth="2"/>
                    <path d="M6.5 7.5 12 12l5.5-4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              {loading ? "Conectando con Microsoft..." : "Iniciar sesión con cuenta corporativa"}
            </button>

            <div className="mt-6 p-5 rounded-2xl bg-indigo-50 border border-indigo-100 flex gap-4">
              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0 text-indigo-700">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                  <path d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-xs text-indigo-900 leading-relaxed font-medium">
                <p className="font-black mb-1">Importante</p>
                <p> 
                    Usa tu correo corporativo{" "}
                    <span className="font-black">{corporateDomainHint}</span>. No se aceptan cuentas personales.
                </p>
              </div>
            </div>

            <div className="mt-6 text-xs text-slate-500 font-medium">
              <p className="font-black text-slate-700 mb-1">¿Problemas para ingresar?</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Verifica que estás conectado a tu cuenta corporativa en Microsoft.</li>
                <li>Si tu organización usa MFA, completa la verificación.</li>
                <li>Si el sistema niega acceso, solicita habilitación al administrador.</li>
              </ul>
            </div>
          </section>
        </div>
      </main>

      <footer className="py-6 text-center text-xs text-slate-400 font-bold">
        © {new Date().getFullYear()} {appName}. {footerNote}
      </footer>

      {/* Loading overlay */}
      {loading && (
        <div className="fixed inset-0 modal-backdrop flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl shadow-2xl p-10 w-full max-w-sm text-center">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 mx-auto flex items-center justify-center shadow-lg shadow-indigo-100 mb-4">
              <svg className="w-6 h-6 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            </div>
            <p className="text-sm font-black text-slate-800">Redirigiendo a Microsoft…</p>
            <p className="text-xs font-bold text-slate-500 mt-1">
              Se abrirá el inicio de sesión corporativo.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
