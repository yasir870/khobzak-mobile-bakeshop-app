
import BreadCard from "./BreadCard";
import { BreadProduct } from "./CustomerDashboard";

interface BreadMenuListProps {
  breadTypes: BreadProduct[];
  onProductClick: (product: BreadProduct) => void;
}

const BreadMenuList = ({ breadTypes, onProductClick }: BreadMenuListProps) => (
  <div className="mb-8">
    <h3 className="text-2xl font-bold text-amber-800 mb-6">أنواع الخبز المتوفرة</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {breadTypes.map((bread) => (
        <BreadCard key={bread.id} bread={bread} onClick={onProductClick} />
      ))}
    </div>
  </div>
);

export default BreadMenuList;
