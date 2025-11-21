
import React, { useState } from 'react';
import { Lock, Mail, ArrowRight, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { supabase } from '../services/supabase';

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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-100 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-100 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-[40%] h-[40%] bg-pink-100 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md z-10 border border-gray-100">
        <div className="text-center mb-8">
          {/* LOGO REPLACEMENT */}
          <img 
            src="/logo.png" 
            alt="Logo" 
            className="h-24 mx-auto mb-6 object-contain"
            onError={(e) => {
                // Fallback text if image fails
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
            }}
          />
          <div className="hidden w-12 h-12 bg-gradient-to-tr from-primary-600 to-primary-400 rounded-xl flex items-center justify-center text-white font-bold text-xl mx-auto mb-4 shadow-lg shadow-primary-500/30">
            N
          </div>

          <h2 className="text-2xl font-bold text-gray-900">
              {isSignUp ? 'Criar uma Conta' : 'Bem-vindo de volta'}
          </h2>
          <p className="text-gray-500 mt-2 text-sm">
              {isSignUp ? 'Junte-se ao NovaDesk AI para gerenciar chamados' : 'Entre com suas credenciais para acessar o NovaDesk AI'}
          </p>
        </div>

        {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg flex flex-col items-start">
                <div className="flex items-center">
                    <AlertCircle size={16} className="mr-2 mt-0.5 flex-shrink-0" />
                    {error === "Invalid login credentials" ? "Credenciais inválidas" : error}
                </div>
                {needsConfirmation && (
                    <button 
                        onClick={handleResendConfirmation}
                        disabled={isLoading}
                        className="mt-2 text-xs font-medium text-primary-600 hover:text-primary-700 flex items-center underline"
                    >
                        <RefreshCw size={12} className={`mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                        Reenviar E-mail de Confirmação
                    </button>
                )}
            </div>
        )}

        {message && (
            <div className="mb-4 p-3 bg-green-50 border border-green-100 text-green-600 text-sm rounded-lg">
                {message}
            </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {isSignUp && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome Completo</label>
                <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-gray-900 sm:text-sm"
                    placeholder="João Silva"
                />
              </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Endereço de E-mail</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors outline-none text-gray-900 sm:text-sm"
                placeholder="nome@empresa.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Senha</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors outline-none text-gray-900 sm:text-sm"
                placeholder="••••••••"
                minLength={6}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                Aguarde...
              </>
            ) : (
              <>
                {isSignUp ? 'Criar Conta' : 'Entrar'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
                {isSignUp ? 'Já tem uma conta?' : "Não tem uma conta?"}{' '}
                <button 
                    onClick={() => { setIsSignUp(!isSignUp); setError(null); setMessage(null); }}
                    className="font-medium text-primary-600 hover:text-primary-500 transition-colors"
                >
                    {isSignUp ? 'Entrar' : 'Cadastre-se'}
                </button>
            </p>
        </div>
      </div>
    </div>
  );
};
