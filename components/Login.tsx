
import React, { useState } from 'react';
import { Lock, Mail, ArrowRight, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { supabase } from '../services/supabase';
import { Logo } from './Logo';

interface LoginProps {
  onLoginSuccess: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState(''); // Only for sign up
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setMessage(null);
    setNeedsConfirmation(false);
    
    try {
        if (isSignUp) {
            const { error: signUpError, data } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName, // Store in metadata as backup
                    }
                }
            });

            if (signUpError) throw signUpError;

            if (data.user) {
                 // Try to create the initial profile immediately.
                 // STRICT RULE: All new users start as 'USER'.
                 setTimeout(async () => {
                    try {
                        // We use insert instead of upsert. 
                        // If the profile already exists (e.g. user re-registering), we do NOT want to overwrite their role (e.g. if they were promoted to ADMIN).
                        // Insert will fail if ID exists, which is what we want (preserve existing data).
                        await supabase.from('profiles').insert({ 
                            id: data.user!.id, 
                            email: email,
                            name: fullName,
                            role: 'USER' // Always 'USER' for new signups
                        });
                    } catch (err) {
                        // Ignore duplicate key errors, log others
                        console.log("Criação de perfil manipulada ou ignorada (perfil provavelmente já existe).");
                    }
                 }, 500);

                if (data.session) {
                    // If Confirm Email is disabled, we get a session immediately
                    onLoginSuccess();
                } else {
                    setMessage('Conta criada! Por favor, verifique seu e-mail para confirmar.');
                    setNeedsConfirmation(true);
                    setIsSignUp(false); // Switch to login view so they can try to login after confirming
                }
            }
        } else {
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (signInError) {
                if (signInError.message.includes("Email not confirmed")) {
                    setNeedsConfirmation(true);
                }
                throw signInError;
            }
            onLoginSuccess();
        }
    } catch (err: any) {
        console.error(err);
        setError(err.message || 'Ocorreu um erro inesperado.');
    } finally {
        setIsLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
      setIsLoading(true);
      setError(null);
      setMessage(null);
      try {
          const { error } = await supabase.auth.resend({
              type: 'signup',
              email: email,
          });
          if (error) throw error;
          setMessage('E-mail de confirmação reenviado! Verifique sua caixa de spam.');
      } catch (err: any) {
          setError(err.message || 'Falha ao reenviar e-mail');
      } finally {
          setIsLoading(false);
      }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden font-sans">
      {/* Technical Grid Background Overlay */}
      <div className="absolute inset-0 z-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#0284c7 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
      
      <div className="bg-white p-10 rounded-none shadow-2xl w-full max-w-md z-10 border border-slate-200 relative">
        {/* Top Accent Line */}
        <div className="absolute top-0 left-0 w-full h-1 bg-primary-600"></div>

        <div className="text-center mb-10">
          <div className="flex justify-center mb-8">
             <div className="p-4 bg-slate-50 border border-slate-100 rounded-none">
                <Logo className="h-16 w-auto" />
             </div>
          </div>

          <h2 className="text-xl font-bold text-slate-900 uppercase tracking-widest">
              {isSignUp ? 'Criar Conta' : 'Autenticação'}
          </h2>
          <p className="text-slate-500 mt-3 text-[10px] font-bold uppercase tracking-widest opacity-60">
              {isSignUp ? 'Registro de novo operador no sistema' : 'Acesso restrito a pessoal autorizado'}
          </p>
        </div>

        {error && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs rounded-none flex flex-col items-start">
                <div className="flex items-center font-bold uppercase tracking-tight">
                    <AlertCircle size={14} className="mr-2 flex-shrink-0" />
                    {error === "Invalid login credentials" ? "Credenciais inválidas" : 
                     error === "User already registered" ? "Este e-mail já está cadastrado." :
                     error === "Email rate limit exceeded" ? "Limite de envios atingido. Tente novamente em alguns minutos." :
                     error.includes("Email not confirmed") ? "E-mail não confirmado. Verifique seu e-mail." :
                     error.includes("Error sending confirmation email") ? "Erro ao enviar e-mail de confirmação. Verifique a configuração de SMTP no Supabase." :
                     error}
                </div>
                {needsConfirmation && (
                    <button 
                        onClick={handleResendConfirmation}
                        disabled={isLoading}
                        className="mt-3 text-[10px] font-bold text-primary-700 hover:underline flex items-center uppercase tracking-wider"
                    >
                        <RefreshCw size={10} className={`mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
                        Reenviar Confirmação
                    </button>
                )}
            </div>
        )}

        {message && (
            <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 text-green-700 text-xs font-bold uppercase tracking-tight rounded-none">
                {message}
            </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {isSignUp && (
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Nome Completo</label>
                <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="block w-full px-4 py-3 border border-slate-200 rounded-none focus:border-primary-600 outline-none text-slate-900 text-sm font-medium transition-colors bg-slate-50/30"
                    placeholder="JOÃO SILVA"
                />
              </div>
          )}

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Endereço de E-mail</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Mail className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full pl-12 pr-4 py-3 border border-slate-200 rounded-none focus:border-primary-600 transition-colors outline-none text-slate-900 text-sm font-medium bg-slate-50/30"
                placeholder="NOME@EMPRESA.COM"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Senha de Acesso</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-12 pr-4 py-3 border border-slate-200 rounded-none focus:border-primary-600 transition-colors outline-none text-slate-900 text-sm font-medium bg-slate-50/30"
                placeholder="••••••••"
                minLength={6}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-none shadow-md text-xs font-bold uppercase tracking-[0.2em] text-white bg-primary-600 hover:bg-primary-700 focus:outline-none transition-all active:translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin -ml-1 mr-3 h-4 w-4" />
                PROCESSANDO...
              </>
            ) : (
              <>
                {isSignUp ? 'REGISTRAR' : 'AUTENTICAR'}
                <ArrowRight className="ml-3 h-4 w-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-10 text-center pt-6 border-t border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {isSignUp ? 'JÁ POSSUI CREDENCIAIS?' : "NÃO POSSUI ACESSO?"}{' '}
                <button 
                    onClick={() => { setIsSignUp(!isSignUp); setError(null); setMessage(null); }}
                    className="ml-2 text-primary-600 hover:text-primary-700 transition-colors underline underline-offset-4"
                >
                    {isSignUp ? 'ENTRAR' : 'SOLICITAR ACESSO'}
                </button>
            </p>
        </div>
      </div>
      
      {/* Footer Info */}
      <div className="absolute bottom-8 left-0 w-full text-center z-10">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">
              © 2026 AIRSERVICE • SISTEMA DE GESTÃO TÉCNICA
          </p>
      </div>
    </div>
  );
};
