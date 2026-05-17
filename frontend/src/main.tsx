import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { ConfigProvider } from './context/ConfigContext'
import { WebSocketProvider } from './context/WebSocketContext'
import { EmotionProvider } from './context/EmotionContext'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      refetchOnWindowFocus: true,
      retry: 2,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <WebSocketProvider>
      <ConfigProvider>
        <EmotionProvider>
          <App />
        </EmotionProvider>
      </ConfigProvider>
    </WebSocketProvider>
  </QueryClientProvider>,
)
