import { createBrowserRouter, Navigate, Outlet, RouterProvider } from 'react-router-dom'
import { AuthProvider, useAuth } from './features/auth/AuthContext'
import LoginPage from './features/auth/LoginPage'
import SettingsPage from './features/auth/SettingsPage'
import CustomerDetailPage from './features/customers/CustomerDetailPage'
import CustomerListPage from './features/customers/CustomerListPage'
import DebtFormPage from './features/debts/DebtFormPage'
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
import PosPage from './features/pos/PosPage'
import ProductListPage from './features/products/ProductListPage'
import ProductFormPage from './features/products/ProductFormPage'
import SaleListPage from './features/sales/SaleListPage'
import SaleDetailPage from './features/sales/SaleDetailPage'
import SaleReportPage from './features/sales/SaleReportPage'
import ExitBackupDialog from './shared/ExitBackupDialog'
import Layout from './shared/Layout'
import { ToastProvider } from './shared/ToastContext'

function PrivateRoute() {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <Outlet />
}

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/error/401', element: <UnauthorizedPage /> },
  { path: '/error/403', element: <ForbiddenPage /> },
  { path: '/error/404', element: <NotFoundPage /> },
  { path: '/error/500', element: <ServerErrorPage /> },
  {
    path: '/',
    element: <PrivateRoute />,
    children: [
      {
        element: <Layout />,
        children: [
          { index: true, element: <SummaryPage /> },
          { path: 'pos', element: <PosPage /> },
          { path: 'trash', element: <TrashPage /> },
          { path: 'debts', element: <Navigate to="/" replace /> },
          { path: 'debts/new', element: <DebtFormPage /> },
          { path: 'debts/:id/edit', element: <DebtFormPage /> },
          { path: 'customers', element: <CustomerListPage /> },
          { path: 'customers/:id', element: <CustomerDetailPage /> },
          { path: 'products', element: <ProductListPage /> },
          { path: 'products/new', element: <ProductFormPage /> },
          { path: 'products/:id/edit', element: <ProductFormPage /> },
          { path: 'sales', element: <SaleListPage /> },
          { path: 'sales/report', element: <SaleReportPage /> },
          { path: 'sales/:id', element: <SaleDetailPage /> },
          { path: 'settings', element: <SettingsPage /> },
          {
            path: 'cards',
            element: <CardsPinGate />,
            children: [
              { index: true, element: <CardShopPage /> },
              { path: 'admin', element: <CardAdminPage /> },
              { path: 'demo-pay/:reference', element: <CardDemoPayPage /> },
              { path: 'orders/:reference', element: <CardOrderPage /> },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
])

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <RouterProvider router={router} />
        <ExitBackupDialog />
      </ToastProvider>
    </AuthProvider>
  )
}
