import { useState, useEffect } from 'react'

type Status = 'idle' | 'loading' | 'success' | 'error' | 'config'

interface BugResult {
  issueUrl: string;
  issueNumber: number;
  title: string;
}

// Get URL parameters passed by Crisp
function getUrlParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    session_id: params.get('session_id'),
    website_id: params.get('website_id'),
    token: params.get('token'),
  };
}

// LocalStorage key for settings (per website)
function getStorageKey(websiteId: string) {
  return `crisp-bug-reporter-${websiteId}`;
}

export default function App() {
  const [status, setStatus] = useState<Status>('idle')
  const [result, setResult] = useState<BugResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [params] = useState(getUrlParams)
  const [githubRepo, setGithubRepo] = useState<string>('')
  const [repoInput, setRepoInput] = useState<string>('')

  useEffect(() => {
    if (window.$crisp) {
      window.$crisp.setHeight(180)
    }

    // Load saved repo from localStorage
    if (params.website_id) {
      const saved = localStorage.getItem(getStorageKey(params.website_id));
      if (saved) {
        setGithubRepo(saved);
      }
    }
  }, [params.website_id])

  const handleSaveConfig = () => {
    if (!repoInput || !repoInput.includes('/')) {
      setError('Formato inválido. Use: owner/repo')
      return
    }
    if (params.website_id) {
      localStorage.setItem(getStorageKey(params.website_id), repoInput);
      setGithubRepo(repoInput);
      setStatus('idle');
      setError(null);
    }
  }

  const handleCreateBug = async () => {
    setStatus('loading')
    setError(null)

    try {
      const { session_id, website_id } = params;

      if (!session_id || !website_id) {
        throw new Error('Parâmetros da conversa não encontrados')
      }

      if (!githubRepo) {
        setStatus('config')
        return
      }

      const response = await fetch('/api/create-bug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id, website_id, github_repo: githubRepo }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erro ao criar bug')
      }

      const data = await response.json()
      setResult(data)
      setStatus('success')

      if (window.$crisp) {
        window.$crisp.showToast('success', 'Bug criado com sucesso!', {
          label: 'Ver issue',
          url: data.issueUrl,
        })
      }
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      if (window.$crisp) {
        window.$crisp.showToast('failure', 'Erro ao criar bug')
      }
    }
  }

  const handleReset = () => {
    setStatus('idle')
    setResult(null)
    setError(null)
  }

  const handleOpenConfig = () => {
    setRepoInput(githubRepo)
    setStatus('config')
    setError(null)
  }

  return (
    <div className="container">
      <div className="header">
        <h1>Bug Reporter</h1>
        {status !== 'config' && githubRepo && (
          <button onClick={handleOpenConfig} className="btn-icon" title="Configurações">
            ⚙️
          </button>
        )}
      </div>

      {status === 'config' && (
        <div className="config">
          <label>Repositório GitHub:</label>
          <input
            type="text"
            value={repoInput}
            onChange={(e) => setRepoInput(e.target.value)}
            placeholder="owner/repo"
            className="input"
          />
          {error && <p className="error-text">{error}</p>}
          <button onClick={handleSaveConfig} className="btn btn-primary">
            Salvar
          </button>
          {githubRepo && (
            <button onClick={() => setStatus('idle')} className="btn btn-secondary">
              Cancelar
            </button>
          )}
        </div>
      )}

      {status === 'idle' && !githubRepo && (
        <div className="config">
          <p>Configure o repositório GitHub:</p>
          <input
            type="text"
            value={repoInput}
            onChange={(e) => setRepoInput(e.target.value)}
            placeholder="owner/repo"
            className="input"
          />
          <button onClick={handleSaveConfig} className="btn btn-primary">
            Salvar
          </button>
        </div>
      )}

      {status === 'idle' && githubRepo && (
        <>
          <p className="repo-info">📁 {githubRepo}</p>
          <button onClick={handleCreateBug} className="btn btn-primary">
            Criar Bug no GitHub
          </button>
        </>
      )}

      {status === 'loading' && (
        <div className="loading">
          <div className="spinner" />
          <p>Analisando conversa...</p>
        </div>
      )}

      {status === 'success' && result && (
        <div className="success">
          <p>Bug #{result.issueNumber} criado!</p>
          <p className="title">{result.title}</p>
          <a href={result.issueUrl} target="_blank" rel="noopener noreferrer" className="btn btn-link">
            Ver no GitHub
          </a>
          <button onClick={handleReset} className="btn btn-secondary">
            Criar outro
          </button>
        </div>
      )}

      {status === 'error' && (
        <div className="error">
          <p>{error}</p>
          <button onClick={handleReset} className="btn btn-secondary">
            Tentar novamente
          </button>
        </div>
      )}
    </div>
  )
}
