
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { BreadProduct } from "./CustomerDashboard";

interface BreadCardProps {
  bread: BreadProduct;
  onClick: (bread: BreadProduct) => void;
}

const BreadCard = ({ bread, onClick }: BreadCardProps) => {
  return (
    <Card
      className="bg-white/90 backdrop-blur-sm hover:shadow-lg transition-shadow cursor-pointer"
      onClick={() => onClick(bread)}
    >
      <CardHeader className="text-center flex flex-col items-center">
        <img
          src={bread.images[0]}
          alt={bread.name}
          className="h-32 w-32 object-cover rounded-lg mb-2 border shadow"
        />
        <CardTitle className="text-lg text-amber-800">{bread.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600 mb-3">{bread.description}</p>
        <div className="flex justify-between items-center mb-1">
          <span className="text-base text-amber-700 font-semibold">السعر: {bread.price} د.ع</span>
          <span className="text-base text-amber-700 font-semibold">
            الكمية: {bread.pieces} {bread.pieces === 1 ? "قطعة" : "قطع"}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-base text-gray-600">ملاحظات: {bread.notes}</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default BreadCard;
