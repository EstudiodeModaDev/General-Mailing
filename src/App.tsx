import React from 'react';
import './App.css'
import { AuthProvider, useAuth } from './auth/authProvider';
import { AuthPage } from './components/AuthPage/AuthPage';
import { GraphServicesProvider } from './Graph/GraphContext';
import { Step1Import } from './components/Importation/Step1Import';
import { Step2Designer } from './components/Design/Design';
import { PreviewModal } from './components/Preview/PreviewModal';
import { Step3Send, type Log } from './components/Envio/Send';
import { Step4AuditView } from './components/Log/Log';
import { useGroupGate } from "./Funcionalidades/useGroupGate";

type Step1Payload = {
  excelData: Record<string, any>[];
  excelColumns: string[];
  columnMapping: Record<string, string>;
  recipientColumn: string;
  varKeys: string[];
};

const GROUP_ID = "3a138500-8cda-44cc-9e48-6adf35714fd5";


function Shell() {
  const { ready, account, signIn, signOut } = useAuth();
  const [loadingAuth, setLoadingAuth] = React.useState(false);
  const isLogged = Boolean(account);

  const { loading: checking, allowed } = useGroupGate(GROUP_ID);

  const handleAuthClick = async () => {
    if (!ready || loadingAuth) return;
    setLoadingAuth(true);
    try {
      if (isLogged) await signOut();
      else await signIn("popup");
    } finally {
      setLoadingAuth(false);
    }
  };

  if (!ready || !isLogged) {
    return (
      <div className="page layout">
        <section className="page-view">
          <AuthPage onCorporateLogin={handleAuthClick} />
        </section>
      </div>
    );
  }

  // ya está logueado: valida grupo
  if (checking) {
    return <div className="page layout"><section className="page-view">Validando acceso…</section></div>;
  }

  if (!allowed) {
    // 🔥 como pediste: no cargar nada
    return null;
    // o muestra algo:
    // return <div className="page layout"><section className="page-view">No tienes acceso.</section></div>;
  }

  return <LoggedApp />;
}

function Stepper({ step }: { step: number }) {
  const steps = [
    { id: 1, label: "1. Datos" },
    { id: 2, label: "2. Diseño" },
    { id: 3, label: "3. Envío" },
    { id: 4, label: "4. Auditoría" },
  ];

  const pillClass = (id: number) => {
    const base =
      "stepper-pill"; // tu clase existente
    const isActive = id === step;
    const isCompleted = id < step;

    return [
      base,
      isActive ? "active" : "",
      isCompleted ? "completed" : "",
    ].join(" ").trim();
  };

  return (
    <nav className="hidden lg:flex bg-slate-100 p-1 rounded-full border border-slate-200">
      {steps.map((s) => (
        <div key={s.id} id={`step-pill-${s.id}`} className={pillClass(s.id)}>
          {s.label}
        </div>
      ))}
    </nav>
  );
}


function Header({ open, step }: { open: () => void, step: number }) {
  return (
    <header className="bg-white border-b border-slate-200 py-4 sticky top-0 z-30 shadow-sm">
      <div className="workspace-container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative flex items-center">
          {/* Left: Brand */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center justify-center w-11 h-11 bg-gradient-to-tr from-indigo-600 to-indigo-500 rounded-xl shadow-lg shadow-indigo-100 shrink-0">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
              >
                <path d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
              </svg>
            </div>

            <div className="min-w-0">
              <h1 className="text-xl font-black text-slate-800 tracking-tight leading-none truncate">
                Mailing
              </h1>
              <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">
                EDM Edition
              </span>
            </div>
          </div>

          {/* Center: Nav (true centered) */}
          <div className="hidden lg:flex absolute left-1/2 -translate-x-1/2">
            <Stepper step={step} />
          </div>

          {/* Right: Button */}
          { step === 2 ?
            <div className="ml-auto flex items-center">
              <button type="button" onClick={open} className="bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-bold border border-slate-200 hover:bg-white hover:border-indigo-300 hover:text-indigo-600 transition flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                </svg>
                Vista Previa
              </button>
            </div> : null
          }
        </div>
      </div>
    </header>
  );
}


function LoggedApp() {
  //const { role, permisos } = useUserRole(user!.mail);
  const [step, setStep] = React.useState(1);
  const [importState, setImportState] = React.useState<Step1Payload | null>(null);
  const [subject, setSubject] = React.useState("");
  const [html, setHtml] = React.useState("");
  const [preview, setPreview] = React.useState<boolean>(false)
  const [log, setLog] = React.useState<Log[]>([])

  return (
    <div className='min-h-screen flex flex-col'>
      <Header open={() => setPreview(true)} step={step}/>
      <main className="flex-grow flex flex-col py-8 px-4 overflow-hidden">
        <div className='workspace-container mb-6 hidden' id='message-container'></div>
        <div className='workspace-container flex-grow flex flex-col relative'>
          {
            step === 1 ? <Step1Import onContinue={(payload) => {setImportState(payload); setStep(2);}} /> : 
            step === 2 ? <Step2Designer 
                            varKeys={importState?.varKeys ?? []} 
                            subject={subject} 
                            html={html} 
                            onBack={() => setStep(1)} 
                            onHtmlChange={setHtml} 
                            onSubjectChange={setSubject} 
                            onNext={() => setStep(3)}
                            onOpenPreview={() => setPreview(true)}/> : 
            step === 3 ? <Step3Send 
                            excelData={importState?.excelData!} 
                            recipientColum={importState?.recipientColumn!} 
                            columMapping={importState?.columnMapping!} 
                            subject={subject} 
                            htmlTemplate={html} 
                            onBack={() => setStep(2)} 
                            onDone={() => setStep(4)}
                            setLog={setLog}/> :
            step === 4 ? <Step4AuditView logs={log} onBack={() => setStep(step-1)}></Step4AuditView>:
            null
          }
        </div>
        <PreviewModal 
          open={preview} 
          onClose={() => setPreview(false)} 
          subjectTemplate={subject} 
          htmlTemplate={html} 
          excelData={importState?.excelData!} 
          columnMapping={importState?.columnMapping!} 
          recipientColumn={importState?.recipientColumn!}/> 

          
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <GraphServicesGate>
        <Shell />
      </GraphServicesGate>
    </AuthProvider>
  )
}

function GraphServicesGate({ children }: { children: React.ReactNode }) {
  const { ready, account } = useAuth();
  if (!ready || !account) return <>{children}</>;
  return <GraphServicesProvider>{children}</GraphServicesProvider>;
}

