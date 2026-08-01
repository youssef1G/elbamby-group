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
const OrderTracking = lazy(() => import('@/pages/OrderTracking.jsx'));
const MyOrders = lazy(() => import('@/pages/MyOrders.jsx'));
const NotFound = lazy(() => import('@/pages/NotFound.jsx'));
import ContactButton from '@/components/common/ContactButton.jsx';

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
const AdminProductForm = lazy(() => import('@/pages/admin/AdminProductForm.jsx'));
const AdminCategories = lazy(() => import('@/pages/admin/AdminCategories.jsx'));
const AdminOrders = lazy(() => import('@/pages/admin/AdminOrders.jsx'));
const AdminOrderDetail = lazy(() => import('@/pages/admin/AdminOrderDetail.jsx'));
const AdminBanners = lazy(() => import('@/pages/admin/AdminBanners.jsx'));
const AdminSettings = lazy(() => import('@/pages/admin/AdminSettings.jsx'));
const AdminAdmins = lazy(() => import('@/pages/admin/AdminAdmins.jsx'));
const AdminSupport = lazy(() => import('@/pages/admin/AdminSupport.jsx'));
const AdminAnalytics = lazy(() => import('@/pages/admin/AdminAnalytics.jsx'));

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
      <div className="min-h-screen flex flex-col bg-bg-surface text-bg-text-primary">
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/track-order" element={<OrderTracking />} />
            <Route path="/my-orders" element={<MyOrders />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/checkout/success" element={<CheckoutSuccess />} />
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
              <Suspense fallback={spinner}><AdminProductForm /></Suspense>
            } />
            <Route path="products/:id/edit" element={
              <Suspense fallback={spinner}><AdminProductForm /></Suspense>
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
            <Route path="banners" element={
              <Suspense fallback={spinner}><AdminBanners /></Suspense>
            } />
            <Route path="settings" element={
              <Suspense fallback={spinner}><AdminSettings /></Suspense>
            } />
            <Route path="admins" element={
              <Suspense fallback={spinner}><AdminAdmins /></Suspense>
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
    </ToastProvider>
  );
}