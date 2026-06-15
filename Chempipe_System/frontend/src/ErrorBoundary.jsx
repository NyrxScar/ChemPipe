import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '50px', color: 'red', whiteSpace: 'pre-wrap', backgroundColor: '#000', height: '100vh', width: '100vw' }}>
          <h1>Error:</h1>
          {this.state.error.toString()}
          <br />
          {this.state.error.stack}
        </div>
      );
    }
    return this.props.children;
  }
}
