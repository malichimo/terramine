// src/components/ErrorBoundary.jsx
import React from "react";

class ErrorBoundary extends React.Component {
  state = { error: null, errorInfo: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("🛑 ErrorBoundary caught:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ textAlign: "center", padding: "20px", color: "red" }}>
          <h1>Application Error</h1>
          <p>{this.state.error.message || "Something went wrong."}</p>
          <p>Please try again or contact support.</p>
          <button onClick={() => window.location.reload()}>Reload App</button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;