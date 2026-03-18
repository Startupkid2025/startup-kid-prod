import React from 'react';

export default class PageErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // DOM mutation errors (insertBefore/removeChild) are typically caused by
    // browser extensions interfering with React's DOM — log but don't crash
    const isDomError = error?.message?.includes('insertBefore') ||
                       error?.message?.includes('removeChild');
    if (!isDomError) {
      console.error('PageErrorBoundary caught:', error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8" dir="rtl">
          <div className="text-5xl mb-4">😵</div>
          <h2 className="text-xl font-bold mb-2 text-white">משהו השתבש</h2>
          <p className="text-white/70 mb-4">נסה לרענן את הדף</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="bg-white/20 px-6 py-2 rounded-lg hover:bg-white/30 text-white"
          >
            נסה שוב
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
