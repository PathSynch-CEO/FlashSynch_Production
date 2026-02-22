import { Routes, Route } from 'react-router-dom'
import CardPage from './pages/CardPage'
import NotFound from './pages/NotFound'

function App() {
  return (
    <Routes>
      <Route path="/c/:slug" element={<CardPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default App
