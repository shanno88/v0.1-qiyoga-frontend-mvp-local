import React, { useState, useEffect, useCallback } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import Refund from './pages/Refund';
import Success from './pages/Success';
import BillingSuccess from './pages/BillingSuccess';
import { initPaddle } from './src/config/paddle';
import { zh, en, Lang } from './src/translations';

type TranslationKey = keyof typeof zh;

const dictionaries: Record<Lang, typeof zh> = { zh, en };

declare global {
  interface Window {
    Paddle: {
      Initialize: (options: { token: string }) => void;
      Checkout: {
        open: (options: { items: { price_id: string; quantity: number }[] }) => void;
      };
    };
  }
}

const App: React.FC = () => {
  const [lang, setLangState] = useState<Lang>(() => {
    const stored = localStorage.getItem('lang');
    return (stored === 'zh' || stored === 'en') ? stored : 'zh';
  });

  useEffect(() => {
    initPaddle();
  }, []);

  useEffect(() => {
    localStorage.setItem('lang', lang);
  }, [lang]);

  const setLang = useCallback((newLang: Lang) => {
    setLangState(newLang);
  }, []);

  const dict = dictionaries[lang];
  const t = useCallback((key: TranslationKey): string => {
    return dict[key];
  }, [dict]);

  return (
    <Router>
      <Layout lang={lang} setLang={setLang} t={t}>
        <Routes>
          <Route path="/" element={<Home t={t} lang={lang} />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/refund" element={<Refund />} />
          <Route path="/success" element={<Success />} />
          <Route path="/billing/success" element={<BillingSuccess />} />
        </Routes>
      </Layout>
    </Router>
  );
};

export default App;
