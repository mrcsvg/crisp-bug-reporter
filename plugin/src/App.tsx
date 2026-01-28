import { useState, useEffect } from 'react'

type Status = 'idle' | 'loading' | 'success' | 'error'

interface BugResult {
  issueUrl: string;
  issueNumber: number;
  title: string;
}

export default function App() {
  const [status, setStatus] = useState<Status>('idle')
  const [result, setResult] = useState<BugResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    window.$crisp.setHeight(150)
  }, [])

  const handleCreateBug = async () => {
    setStatus('loading')
    setError(null)

    try {
      window.$crisp.acquireData('conversation')

      // Wait for data to be acquired
      await new Promise<void>((resolve) => {
        window.$crisp.onDataAcquired = (namespace: string) => {
          if (namespace === 'conversation') {
            resolve()
          }
        }
      })

      const conversation = window.$crisp.data.conversation
      if (!conversation) {
        throw new Error('Não foi possível obter dados da conversa')
      }

      const response = await fetch('/api/create-bug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: conversation.session_id,
          website_id: conversation.website_id,
          messages: conversation.messages,
          meta: conversation.meta,
          device: conversation.device,
        }),
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
