import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import SliderPage from './SliderPage'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SliderPage />
  </StrictMode>,
)
