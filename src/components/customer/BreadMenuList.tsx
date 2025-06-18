
import BreadCard from "./BreadCard";
import { BreadProduct } from "./CustomerDashboard";

interface BreadMenuListProps {
  breadTypes: BreadProduct[];
  onProductClick: (product: BreadProduct) => void;
}

const BreadMenuList = ({ breadTypes, onProductClick }: BreadMenuListProps) => {
  // عرض أول منتجين فقط
  const featuredProducts = breadTypes.slice(0, 2);
  
  return (
    <div className="mb-8">
      <h3 className="text-xl font-bold text-amber-800 mb-4">أنواع الخبز المتوفرة</h3>
      <div className="grid grid-cols-2 gap-4">
        {featuredProducts.map((bread) => (
          <BreadCard key={bread.id} bread={bread} onClick={onProductClick} />
        ))}
      </div>
    </div>
  );
};

export default BreadMenuList;
