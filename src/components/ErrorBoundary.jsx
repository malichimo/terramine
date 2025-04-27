import React, { Component } from "react";

class ErrorBoundary extends Component {
  state = {
    error: null,
    errorInfo: null,
  };

  componentDidCatch(error, errorInfo) {
    console.error("🚨 ErrorBoundary caught an error:", error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo,
    });
  }

  render() {
    if (this.state.error) {
      return (
        <div>
          <h2>Something went wrong.</h2>
          <p>{this.state.error.toString()}</p>
          <details style={{ whiteSpace: "pre-wrap" }}>
            <summary>Error Details</summary>
            {this.state.errorInfo.componentStack}
          </details>
          <button onClick={() => window.location.reload()}>Reload App</button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;