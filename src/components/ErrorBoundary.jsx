// src/components/ErrorBoundary.jsx
import React from "react";

class ErrorBoundary extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ textAlign: "center", padding: "20px", color: "red" }}>
          <h1>Error</h1>
          <p>{this.state.error.message}</p>
          <button onClick={() => window.location.reload()}>Reload App</button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;