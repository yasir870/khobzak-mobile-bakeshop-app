
import BreadCard from "./BreadCard";
import { BreadProduct } from "./CustomerDashboard";
import { Separator } from "@/components/ui/separator";

interface BreadMenuListProps {
  breadTypes: BreadProduct[];
  onProductClick: (product: BreadProduct) => void;
}

const BreadMenuList = ({ breadTypes, onProductClick }: BreadMenuListProps) => {
  return (
    <div className="mb-8">
      <h3 className="text-base font-bold text-foreground mb-2 px-4">أنواع الخبز المتوفرة</h3>
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {breadTypes.map((bread, index) => (
          <div key={bread.id}>
            <BreadCard bread={bread} onClick={onProductClick} />
            {index < breadTypes.length - 1 && <Separator className="mx-4" />}
          </div>
        ))}
      </div>
    </div>
  );
};

export default BreadMenuList;
