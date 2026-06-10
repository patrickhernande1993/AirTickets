import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { supabase } from '../services/supabase';
import { BookOpen, Plus, Search, X, Tag, Eye } from 'lucide-react';

interface KBArticle {
  id: string;
  title: string;
  category: string;
  problem: string;
  solution: string;
  tags: string[];
  views: number;
  createdAt: string;
}

const STORAGE_KEY = 'kb_articles';

const loadArticles = async (): Promise<KBArticle[]> => {
  try {
    const { data, error } = await supabase.from('knowledge_base').select('*').order('created_at', { ascending: false });
    if (!error && data && data.length >= 0) {
      return data.map((a: any) => ({
        id: a.id,
        title: a.title,
        category: a.category,
        problem: a.problem,
        solution: a.solution,
        tags: a.tags || [],
        views: a.views || 0,
        createdAt: a.created_at
      }));
    }
  } catch { /* fallback */ }
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
};

const saveArticle = async (article: Omit<KBArticle, 'id' | 'views' | 'createdAt'>): Promise<void> => {
  try {
    const { error } = await supabase.from('knowledge_base').insert({
      title: article.title,
      category: article.category,
      problem: article.problem,
      solution: article.solution,
      tags: article.tags,
      views: 0
    });
    if (!error) return;
  } catch { /* fallback */ }
  const existing = localStorage.getItem(STORAGE_KEY);
  const articles: KBArticle[] = existing ? JSON.parse(existing) : [];
  articles.unshift({
    ...article,
    id: `local-${Date.now()}`,
    views: 0,
    createdAt: new Date().toISOString()
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(articles));
};

interface Props {
  currentUser: User;
}

export const KnowledgeBase: React.FC<Props> = ({ currentUser }) => {
  const [articles, setArticles] = useState<KBArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<KBArticle | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formProblem, setFormProblem] = useState('');
  const [formSolution, setFormSolution] = useState('');
  const [formTags, setFormTags] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const isAdmin = currentUser.role === 'ADMIN';

  useEffect(() => {
    loadArticles().then(data => {
      setArticles(data);
      setLoading(false);
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await saveArticle({
        title: formTitle,
        category: formCategory,
        problem: formProblem,
        solution: formSolution,
        tags: formTags.split(',').map(t => t.trim()).filter(Boolean)
      });
      const data = await loadArticles();
      setArticles(data);
      setShowForm(false);
      setFormTitle(''); setFormCategory(''); setFormProblem(''); setFormSolution(''); setFormTags('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const filtered = articles.filter(a => {
    const q = searchText.toLowerCase();
    return (
      a.title.toLowerCase().includes(q) ||
      a.problem.toLowerCase().includes(q) ||
      a.category.toLowerCase().includes(q) ||
      a.tags.some(t => t.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-white border border-slate-200 p-6 rounded-none shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BookOpen size={24} className="text-primary-600" />
          <div>
            <h2 className="text-lg font-bold text-slate-900 uppercase tracking-tight">Base de Conhecimento</h2>
            <p className="text-xs text-slate-500 font-mono">{articles.length} artigos disponíveis</p>
          </div>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-xs font-bold uppercase tracking-widest rounded-none hover:bg-primary-700 transition-colors"
          >
            <Plus size={16} />
            Criar Artigo
          </button>
        )}
      </div>

      {/* Create Form */}
      {showForm && isAdmin && (
        <div className="bg-white border border-slate-200 rounded-none shadow-sm p-6">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-4 border-b border-slate-100 pb-3">Novo Artigo</h3>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Título</label>
                <input
                  required
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-none text-sm focus:ring-1 focus:ring-primary-500 outline-none"
                  placeholder="Título do artigo"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Categoria</label>
                <input
                  required
                  value={formCategory}
                  onChange={e => setFormCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-none text-sm focus:ring-1 focus:ring-primary-500 outline-none"
                  placeholder="Ex: ERP, Rede, Acesso"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Descrição do Problema</label>
              <textarea
                required
                rows={3}
                value={formProblem}
                onChange={e => setFormProblem(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-none text-sm focus:ring-1 focus:ring-primary-500 outline-none resize-none"
                placeholder="Descreva o problema..."
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Solução</label>
              <textarea
                required
                rows={5}
                value={formSolution}
                onChange={e => setFormSolution(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-none text-sm focus:ring-1 focus:ring-primary-500 outline-none resize-none font-mono"
                placeholder="Descreva a solução passo a passo..."
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Tags (separadas por vírgula)</label>
              <input
                value={formTags}
                onChange={e => setFormTags(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-none text-sm focus:ring-1 focus:ring-primary-500 outline-none"
                placeholder="erp, login, senha"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-bold uppercase tracking-widest rounded-none hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2 bg-primary-600 text-white text-xs font-bold uppercase tracking-widest rounded-none hover:bg-primary-700 disabled:opacity-50 transition-colors"
              >
                {isSaving ? 'Salvando...' : 'Salvar Artigo'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          type="text"
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          placeholder="Buscar por título, problema ou tags..."
          className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-none bg-white text-sm focus:ring-1 focus:ring-primary-500 outline-none shadow-sm"
        />
      </div>

      {/* Article List */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 font-mono text-sm">Carregando artigos...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-none">
          <BookOpen size={40} className="text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Nenhum artigo encontrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(article => (
            <div
              key={article.id}
              className="bg-white border border-slate-200 rounded-none shadow-sm p-5 hover:border-primary-300 hover:shadow-md transition-all cursor-pointer"
              onClick={() => setSelectedArticle(article)}
            >
              <div className="flex items-start justify-between mb-2">
                <span className="px-2 py-0.5 bg-primary-50 border border-primary-200 text-primary-700 text-[10px] font-bold uppercase tracking-widest rounded-none">
                  {article.category}
                </span>
                <span className="flex items-center text-[10px] text-slate-400 font-mono">
                  <Eye size={10} className="mr-1" />
                  {article.views}
                </span>
              </div>
              <h4 className="font-bold text-slate-900 text-sm uppercase tracking-tight mb-2">{article.title}</h4>
              <p className="text-xs text-slate-500 line-clamp-2 mb-3">{article.problem}</p>
              {article.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {article.tags.map(tag => (
                    <span key={tag} className="flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-mono rounded-none border border-slate-200">
                      <Tag size={8} />
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Article Detail Modal */}
      {selectedArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-none shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-200">
            <div className="sticky top-0 bg-white border-b border-slate-100 p-4 flex items-center justify-between">
              <span className="px-2 py-0.5 bg-primary-50 border border-primary-200 text-primary-700 text-[10px] font-bold uppercase tracking-widest rounded-none">
                {selectedArticle.category}
              </span>
              <button onClick={() => setSelectedArticle(null)} className="text-slate-400 hover:text-slate-700 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <h2 className="text-xl font-bold text-slate-900 uppercase tracking-tight">{selectedArticle.title}</h2>
              <div>
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Problema</h3>
                <p className="text-sm text-slate-700 bg-slate-50 p-3 border border-slate-200 rounded-none leading-relaxed">{selectedArticle.problem}</p>
              </div>
              <div>
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Solução</h3>
                <pre className="text-sm text-slate-700 bg-green-50 p-4 border border-green-200 rounded-none leading-relaxed font-mono whitespace-pre-wrap">{selectedArticle.solution}</pre>
              </div>
              {selectedArticle.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-2 border-t border-slate-100">
                  {selectedArticle.tags.map(tag => (
                    <span key={tag} className="flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-mono rounded-none border border-slate-200">
                      <Tag size={8} />
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
