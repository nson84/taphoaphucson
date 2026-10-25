import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './features/auth/AuthContext'
import LoginPage from './features/auth/LoginPage'
import SettingsPage from './features/auth/SettingsPage'
import CustomerDetailPage from './features/customers/CustomerDetailPage'
import CustomerListPage from './features/customers/CustomerListPage'
import DebtFormPage from './features/debts/DebtFormPage'
import DebtListPage from './features/debts/DebtListPage'
import SummaryPage from './features/summary/SummaryPage'
import CardShopPage from './features/cards/CardShopPage'
import CardOrderPage from './features/cards/CardOrderPage'
import CardDemoPayPage from './features/cards/CardDemoPayPage'
import CardAdminPage from './features/cards/CardAdminPage'
import Layout from './shared/Layout'

function PrivateRoute({ children }) {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }
          >
            <Route index element={<SummaryPage />} />
            <Route path="debts" element={<DebtListPage />} />
            <Route path="debts/new" element={<DebtFormPage />} />
            <Route path="debts/:id/edit" element={<DebtFormPage />} />
            <Route path="customers" element={<CustomerListPage />} />
            <Route path="customers/:id" element={<CustomerDetailPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="cards" element={<CardShopPage />} />
            <Route path="cards/admin" element={<CardAdminPage />} />
            <Route path="cards/demo-pay/:reference" element={<CardDemoPayPage />} />
            <Route path="cards/orders/:reference" element={<CardOrderPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
