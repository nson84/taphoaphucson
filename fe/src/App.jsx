import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './features/auth/AuthContext'
import LoginPage from './features/auth/LoginPage'
import SettingsPage from './features/auth/SettingsPage'
import CustomerDetailPage from './features/customers/CustomerDetailPage'
import CustomerListPage from './features/customers/CustomerListPage'
import DebtFormPage from './features/debts/DebtFormPage'
import DebtListPage from './features/debts/DebtListPage'
import SummaryPage from './features/summary/SummaryPage'
import TrashPage from './features/trash/TrashPage'
import CardShopPage from './features/cards/CardShopPage'
import CardOrderPage from './features/cards/CardOrderPage'
import CardDemoPayPage from './features/cards/CardDemoPayPage'
import CardAdminPage from './features/cards/CardAdminPage'
import CardsPinGate from './features/cards/CardsPinGate'
import ForbiddenPage from './features/error/ForbiddenPage'
import NotFoundPage from './features/error/NotFoundPage'
import ServerErrorPage from './features/error/ServerErrorPage'
import UnauthorizedPage from './features/error/UnauthorizedPage'
import ExitBackupDialog from './shared/ExitBackupDialog'
import Layout from './shared/Layout'
import { ToastProvider } from './shared/ToastContext'

function PrivateRoute({ children }) {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) return <Navigate to="/error/401" replace />
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/error/401" element={<UnauthorizedPage />} />
            <Route path="/error/403" element={<ForbiddenPage />} />
            <Route path="/error/404" element={<NotFoundPage />} />
            <Route path="/error/500" element={<ServerErrorPage />} />
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <Layout />
                </PrivateRoute>
              }
            >
              <Route index element={<SummaryPage />} />
              <Route path="trash" element={<TrashPage />} />
              <Route path="debts" element={<DebtListPage />} />
              <Route path="debts/new" element={<DebtFormPage />} />
              <Route path="debts/:id/edit" element={<DebtFormPage />} />
              <Route path="customers" element={<CustomerListPage />} />
              <Route path="customers/:id" element={<CustomerDetailPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="cards" element={<CardsPinGate />}>
                <Route index element={<CardShopPage />} />
                <Route path="admin" element={<CardAdminPage />} />
                <Route path="demo-pay/:reference" element={<CardDemoPayPage />} />
                <Route path="orders/:reference" element={<CardOrderPage />} />
              </Route>
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          <ExitBackupDialog />
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  )
}
