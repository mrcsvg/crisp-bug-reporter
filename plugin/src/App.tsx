import { useState, useEffect } from 'react'

type Status = 'idle' | 'loading' | 'success' | 'error'

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

// Get plugin settings from Crisp
async function getPluginSettings(): Promise<{ github_repo?: string }> {
  return new Promise((resolve) => {
    if (!window.$crisp) {
      resolve({});
      return;
    }

    window.$crisp.onDataAcquired = (namespace: string) => {
      if (namespace === 'plugin_settings') {
        const settings = window.$crisp.data?.plugin_settings as { settings?: { github_repo?: string } } | undefined;
        resolve(settings?.settings || {});
      }
    };
    window.$crisp.acquireData('plugin_settings');

    // Timeout fallback
    setTimeout(() => resolve({}), 3000);
  });
}

export default function App() {
  const [status, setStatus] = useState<Status>('idle')
  const [result, setResult] = useState<BugResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [params] = useState(getUrlParams)

  useEffect(() => {
    if (window.$crisp) {
      window.$crisp.setHeight(150)
    }
  }, [])

  const handleCreateBug = async () => {
    setStatus('loading')
    setError(null)

    try {
      const { session_id, website_id } = params;

      console.log('URL params:', params);

      if (!session_id || !website_id) {
        throw new Error('Parâmetros da conversa não encontrados na URL')
      }

      // Get plugin settings (github_repo)
      const settings = await getPluginSettings();
      console.log('Plugin settings:', settings);

      if (!settings.github_repo) {
        throw new Error('Repositório GitHub não configurado nas settings do plugin')
      }

      const response = await fetch('/api/create-bug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id, website_id, github_repo: settings.github_repo }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erro ao criar bug')
      }

      const data = await response.json()
      setResult(data)
      setStatus('success')

      window.$crisp.showToast('success', 'Bug criado com sucesso!', {
        label: 'Ver issue',
        url: data.issueUrl,
      })
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      window.$crisp.showToast('failure', 'Erro ao criar bug')
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

      {status === 'idle' && (
        <button onClick={handleCreateBug} className="btn btn-primary">
          Criar Bug no GitHub
        </button>
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
