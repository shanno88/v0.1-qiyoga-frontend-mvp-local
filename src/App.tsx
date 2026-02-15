import { useState } from 'react';
import { zh, en, Lang } from './translations';

type TranslationKey = keyof typeof zh;

const dictionaries: Record<Lang, typeof zh> = { zh, en };

function useTranslation(lang: Lang) {
  const dict = dictionaries[lang];
  const t = (key: TranslationKey) => dict[key];
  return { t };
}

function LanguageSwitcher({
  lang,
  setLang,
}: {
  lang: Lang;
  setLang: (l: Lang) => void;
}) {
  return (
    <select
      value={lang}
      onChange={(e) => setLang(e.target.value as Lang)}
      className="border-2 border-blue-600 bg-blue-600 text-white rounded-lg px-4 py-2 text-base font-medium cursor-pointer hover:bg-blue-700"
    >
      <option value="zh">中文</option>
      <option value="en">English</option>
    </select>
  );
}

function App() {
  const [lang, setLang] = useState<Lang>('zh');
  const { t } = useTranslation(lang);

  const features = [
    { titleKey: 'feature1_title', bodyKey: 'feature1_body' } as const,
    { titleKey: 'feature2_title', bodyKey: 'feature2_body' } as const,
    { titleKey: 'feature3_title', bodyKey: 'feature3_body' } as const,
    { titleKey: 'feature4_title', bodyKey: 'feature4_body' } as const,
  ];

  return (
    <div className="min-h-screen bg-white">
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
        <span className="text-xl font-bold text-gray-900">qiyoga</span>
        <LanguageSwitcher lang={lang} setLang={setLang} />
      </header>

      <section className="text-center py-20 px-6">
        <h1 className="text-4xl font-bold mb-4">{t('hero_title')}</h1>
        <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
          {t('hero_subtitle')}
        </p>
        <div className="flex gap-4 justify-center">
          <button className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700">
            {t('hero_cta_primary')}
          </button>
          <button className="border border-gray-300 px-6 py-3 rounded-lg font-medium hover:bg-gray-50">
            {t('hero_cta_secondary')}
          </button>
        </div>
      </section>

      <section className="py-16 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((f, i) => (
            <div key={i} className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-lg font-semibold mb-2">{t(f.titleKey)}</h3>
              <p className="text-gray-600 text-sm">{t(f.bodyKey)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="py-16 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-8">{t('steps_title')}</h2>
          <ol className="text-left space-y-4">
            <li className="p-4 bg-gray-50 rounded">{t('step1')}</li>
            <li className="p-4 bg-gray-50 rounded">{t('step2')}</li>
            <li className="p-4 bg-gray-50 rounded">{t('step3')}</li>
          </ol>
        </div>
      </section>
    </div>
  );
}

export default App;
