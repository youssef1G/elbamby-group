import { lazy, Suspense } from 'react';
import { Routes, Route, Outlet, useLocation } from 'react-router-dom';
import { useLocale } from '@/context/LocaleContext.jsx';
import { ToastProvider } from '@/components/ui/Toast.jsx';
import Navbar from '@/components/layout/Navbar.jsx';
import Footer from '@/components/layout/Footer.jsx';
import ScrollToTop from '@/components/layout/ScrollToTop.jsx';
import CartDrawer from '@/components/cart/CartDrawer.jsx';
const Home = lazy(() => import('@/pages/Home.jsx'));
const Shop = lazy(() => import('@/pages/Shop.jsx'));
const About = lazy(() => import('@/pages/About.jsx'));
const Contact = lazy(() => import('@/pages/Contact.jsx'));
const Cart = lazy(() => import('@/pages/Cart.jsx'));
const Checkout = lazy(() => import('@/pages/Checkout.jsx'));
const CheckoutSuccess = lazy(() => import('@/pages/CheckoutSuccess.jsx'));
const ProductDetail = lazy(() => import('@/pages/ProductDetail.jsx'));
const MyOrders = lazy(() => import('@/pages/MyOrders.jsx'));
const Login = lazy(() => import('@/pages/Login.jsx'));
const Register = lazy(() => import('@/pages/Register.jsx'));
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword.jsx'));
const Account = lazy(() => import('@/pages/Account.jsx'));
const NotFound = lazy(() => import('@/pages/NotFound.jsx'));
import ContactButton from '@/components/common/ContactButton.jsx';
import ErrorBoundary from '@/components/common/ErrorBoundary.jsx';

import AdminRoute from '@/components/admin/AdminRoute.jsx';
import AdminLayout from '@/pages/admin/AdminLayout.jsx';

const spinner = (
  <div className="flex items-center justify-center min-h-screen bg-bg-surface">
    <div className="animate-spin w-8 h-8 rounded-full border-2 border-bg-border border-t-bg-primary-500" />
  </div>
);

const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard.jsx'));
const AdminLogin = lazy(() => import('@/pages/AdminLogin.jsx'));
const AdminProducts = lazy(() => import('@/pages/admin/AdminProducts.jsx'));
const ProductForm = lazy(() => import('@/pages/admin/ProductForm.jsx'));
const AdminCategories = lazy(() => import('@/pages/admin/AdminCategories.jsx'));
const AdminOrders = lazy(() => import('@/pages/admin/AdminOrders.jsx'));
const AdminOrderDetail = lazy(() => import('@/pages/admin/AdminOrderDetail.jsx'));

const AdminSettings = lazy(() => import('@/pages/admin/AdminSettings.jsx'));
const AdminManage = lazy(() => import('@/pages/admin/AdminManage.jsx'));
const AdminSupport = lazy(() => import('@/pages/admin/AdminSupport.jsx'));
const AdminAnalytics = lazy(() => import('@/pages/admin/AdminAnalytics.jsx'));
const AdminCustomers = lazy(() => import('@/pages/admin/AdminCustomers.jsx'));
const AdminCustomerDetail = lazy(() => import('@/pages/admin/AdminCustomerDetail.jsx'));

function Layout() {
  const { t } = useLocale();
  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:start-2 focus:z-[100] focus:bg-bg-surface focus:px-4 focus:py-2 focus:rounded-md focus:border focus:border-bg-border focus:shadow-card"
      >
        {t('accessibility.skipToContent', { ns: 'common' })}
      </a>
      <ScrollToTop />
      <Navbar />
      <CartDrawer />
      <main id="main-content" className="flex-1">
        <Suspense fallback={spinner}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}

function ContactWrapper() {
  const { pathname } = useLocation();
  if (pathname.startsWith('/admin')) return null;
  return <ContactButton />;
}

export default function App() {
  return (
    <ToastProvider>
      <ErrorBoundary>
        <div className="min-h-screen flex flex-col bg-bg-surface text-bg-text-primary">
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Home />} />
              <Route path="/shop" element={<Shop />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/my-orders" element={<MyOrders />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/checkout/success" element={<CheckoutSuccess />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/account" element={<Account />} />
              <Route path="/product/:slug" element={<ProductDetail />} />
              <Route path="*" element={<NotFound />} />
            </Route>

            <Route path="/admin/login" element={
              <Suspense fallback={spinner}><AdminLogin /></Suspense>
            } />

            <Route path="/admin" element={
              <AdminRoute>
                <AdminLayout />
              </AdminRoute>
            }>
              <Route index element={
                <Suspense fallback={spinner}><AdminDashboard /></Suspense>
              } />
              <Route path="products" element={
                <Suspense fallback={spinner}><AdminProducts /></Suspense>
              } />
              <Route path="products/new" element={
                <Suspense fallback={spinner}><ProductForm /></Suspense>
              } />
              <Route path="products/:id/edit" element={
                <Suspense fallback={spinner}><ProductForm /></Suspense>
              } />
              <Route path="categories" element={
                <Suspense fallback={spinner}><AdminCategories /></Suspense>
              } />
              <Route path="orders" element={
                <Suspense fallback={spinner}><AdminOrders /></Suspense>
              } />
              <Route path="orders/:id" element={
                <Suspense fallback={spinner}><AdminOrderDetail /></Suspense>
              } />
              
              <Route path="customers" element={
                <Suspense fallback={spinner}><AdminCustomers /></Suspense>
              } />
              <Route path="customers/:id" element={
                <Suspense fallback={spinner}><AdminCustomerDetail /></Suspense>
              } />
              <Route path="settings" element={
                <Suspense fallback={spinner}><AdminSettings /></Suspense>
              } />
              <Route path="manage" element={
                <Suspense fallback={spinner}><AdminManage /></Suspense>
              } />
              <Route path="support" element={
                <Suspense fallback={spinner}><AdminSupport /></Suspense>
              } />
              <Route path="analytics" element={
                <Suspense fallback={spinner}><AdminAnalytics /></Suspense>
              } />
            </Route>
          </Routes>
          <ContactWrapper />
        </div>
      </ErrorBoundary>
    </ToastProvider>
  );
}