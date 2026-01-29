import { useState, useEffect } from 'react'

type Status = 'idle' | 'loading' | 'success' | 'error' | 'no-config'

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

export default function App() {
  const [status, setStatus] = useState<Status>('loading')
  const [result, setResult] = useState<BugResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [params] = useState(getUrlParams)
  const [githubRepo, setGithubRepo] = useState<string | null>(null)

  useEffect(() => {
    if (window.$crisp) {
      window.$crisp.setHeight(150)
    }

    // Load settings from API
    async function loadSettings() {
      if (!params.website_id) {
        setStatus('error')
        setError('Website ID não encontrado')
        return
      }

      try {
        const response = await fetch(`/api/get-settings?website_id=${params.website_id}`)
        const data = await response.json()

        if (data.settings?.github_repo) {
          setGithubRepo(data.settings.github_repo)
          setStatus('idle')
        } else {
          setStatus('no-config')
        }
      } catch (err) {
        setStatus('no-config')
      }
    }

    loadSettings()
  }, [params.website_id])

  const handleCreateBug = async () => {
    setStatus('loading')
    setError(null)

    try {
      const { session_id, website_id } = params;

      if (!session_id || !website_id) {
        throw new Error('Parâmetros da conversa não encontrados')
      }

      if (!githubRepo) {
        setStatus('no-config')
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

  return (
    <div className="container">
      <h1>Bug Reporter</h1>

      {status === 'loading' && (
        <div className="loading">
          <div className="spinner" />
          <p>Carregando...</p>
        </div>
      )}

      {status === 'no-config' && (
        <div className="no-config">
          <p>Configure o repositório GitHub nas configurações do plugin.</p>
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
