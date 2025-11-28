import { Component, ReactNode } from "react";
import { Page, Card, Banner, Button } from "@shopify/polaris";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: unknown) {
    console.error("Error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Page title="エラーが発生しました">
          <Card>
            <Banner status="critical">
              <p>予期しないエラーが発生しました。</p>
              {this.state.error && (
                <p style={{ fontSize: "12px", marginTop: "8px" }}>
                  {this.state.error.message}
                </p>
              )}
            </Banner>
            <div style={{ marginTop: "16px" }}>
              <Button onClick={() => window.location.reload()}>
                ページを再読み込み
              </Button>
            </div>
          </Card>
        </Page>
      );
    }

    return this.props.children;
  }
}

