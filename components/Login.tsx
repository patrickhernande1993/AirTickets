import React, { useState } from 'react';
import { Lock, Mail, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setMessage(null);
    
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
                 // Wait a moment for the DB trigger to create the profile
                 // Then update the name field
                 setTimeout(async () => {
                    try {
                        await supabase.from('profiles')
                            .update({ name: fullName })
                            .eq('id', data.user!.id);
                    } catch (err) {
                        console.warn("Could not update profile name immediately", err);
                    }
                 }, 1000);

                setMessage('Account created successfully! You can now sign in.');
                setIsSignUp(false);
            }
        } else {
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (signInError) throw signInError;
            onLoginSuccess();
        }
    } catch (err: any) {
        console.error(err);
        setError(err.message || 'An error occurred');
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
          <div className="w-12 h-12 bg-gradient-to-tr from-primary-600 to-primary-400 rounded-xl flex items-center justify-center text-white font-bold text-xl mx-auto mb-4 shadow-lg shadow-primary-500/30">
            N
          </div>
          <h2 className="text-2xl font-bold text-gray-900">
              {isSignUp ? 'Create an Account' : 'Welcome back'}
          </h2>
          <p className="text-gray-500 mt-2 text-sm">
              {isSignUp ? 'Join NovaDesk AI to manage tickets' : 'Enter your credentials to access NovaDesk AI'}
          </p>
        </div>

        {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg flex items-start">
                <AlertCircle size={16} className="mr-2 mt-0.5 flex-shrink-0" />
                {error}
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
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-gray-900 sm:text-sm"
                    placeholder="John Doe"
                />
              </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
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
                placeholder="name@company.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
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
                Please wait...
              </>
            ) : (
              <>
                {isSignUp ? 'Create Account' : 'Sign in'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
                {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
                <button 
                    onClick={() => { setIsSignUp(!isSignUp); setError(null); setMessage(null); }}
                    className="font-medium text-primary-600 hover:text-primary-500 transition-colors"
                >
                    {isSignUp ? 'Sign in' : 'Sign up'}
                </button>
            </p>
        </div>
      </div>
    </div>
  );
};