'use client'
import React from 'react'
import { Icon } from './ui/index'

interface Props { children: React.ReactNode }
interface State { hasError: boolean; error: Error | null }

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }
  render() {
    if (this.state.hasError) return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 40 }}>
        <span style={{ color: 'var(--neg)' }}><Icon name="warning" size={32} /></span>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, color: 'var(--ink)' }}>Algo correu mal.</div>
        <div style={{ fontSize: 12, color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)' }}>{this.state.error?.message}</div>
        <button className="btn" onClick={() => this.setState({ hasError: false, error: null })}>Tentar novamente</button>
      </div>
    )
    return this.props.children
  }
}
