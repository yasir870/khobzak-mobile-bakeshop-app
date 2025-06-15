
const About = () => (
  <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center px-4">
    <div className="bg-white rounded-xl shadow-lg max-w-lg w-full p-8 text-center space-y-4">
      <img
        src="https://lakvfrohnlinfcqfwkqq.supabase.co/storage/v1/object/public/photos//A_logo_on_a_grid-patterned_beige_background_featur.png"
        alt="Logo"
        className="mx-auto w-16 h-16 md:w-24 md:h-24 rounded-full border-amber-200 border-4 mb-3 transition-all duration-300 hover:scale-125 hover:w-32 hover:h-32"
      />
      <h1 className="text-3xl font-bold text-amber-800 mb-2">من نحن - خبزك</h1>
      <p className="text-amber-700 leading-relaxed">
        خبزك هو مشروع توصيل الخبز الطازج للمنازل في العراق بخيارات متنوعة من أفضل المخبوزات. نحرص على جودة الإنتاج والوصول السريع لنوفر الراحة والطعام الشهي لكل عائلة.<br />
        فريقنا مهتم براحة الزبائن وتجربة تسوق سهلة ومريحة.<br />
        لأي استفسار أو اقتراح <span className="underline">لا تتردد بالتواصل معنا!</span>
      </p>
    </div>
  </div>
);

export default About;
