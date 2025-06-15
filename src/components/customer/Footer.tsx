
import { Mail, Phone } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => (
  <footer className="w-full mt-20 bg-amber-100 text-amber-900 border-t border-amber-200 px-4 py-6">
    <div className="max-w-4xl mx-auto flex flex-col md:flex-row md:justify-between items-center gap-3 text-sm">
      <div className="flex items-center gap-2 mb-2 md:mb-0">
        <span>© {new Date().getFullYear()} خبزك</span>
        <span className="mx-2 text-amber-400">|</span>
        <Link to="/about" className="hover:underline">من نحن</Link>
        <span className="mx-1 text-amber-400">|</span>
        <Link to="/privacy" className="hover:underline">سياسة الخصوصية</Link>
      </div>
      <div className="flex gap-3 items-center">
        <a href="https://wa.me/9647515497130" target="_blank" className="hover:underline" rel="noopener">
          واتساب الدعم
        </a>
        <a href="mailto:yh62731@gmail.com" className="flex items-center gap-1 hover:underline">
          <Mail className="w-4 h-4" />
          yh62731@gmail.com
        </a>
        <a href="tel:07515497130" className="flex items-center gap-1 hover:underline">
          <Phone className="w-4 h-4" />
          07515497130
        </a>
      </div>
    </div>
  </footer>
);

export default Footer;
