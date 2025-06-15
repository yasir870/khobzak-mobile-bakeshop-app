
import { useTranslation } from "@/context/LanguageContext";

const Privacy = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center px-4">
      <div className="bg-white rounded-xl shadow-lg max-w-lg w-full p-8 text-center space-y-4">
        <h1 className="text-3xl font-bold text-amber-800 mb-3">{t('privacyTitle')}</h1>
        <p
          className="text-amber-700 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: t('privacyText') }}
        />
      </div>
    </div>
  );
};

export default Privacy;
