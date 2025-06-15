
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { BreadProduct } from "./CustomerDashboard";

interface BreadCardProps {
  bread: BreadProduct;
  onClick: (bread: BreadProduct) => void;
}

const BreadCard = ({ bread, onClick }: BreadCardProps) => {
  return (
    <Card
      className="bg-white hover:shadow-lg transition-all duration-300 cursor-pointer border hover:border-blue-300 hover:scale-[1.02]"
      onClick={() => onClick(bread)}
    >
      <CardHeader className="text-center flex flex-col items-center pb-3">
        <img
          src={bread.images[0]}
          alt={bread.name}
          className="h-36 w-36 object-cover rounded-xl mb-3 border shadow-md transition-transform duration-300 hover:scale-105"
        />
        <CardTitle className="text-xl text-gray-800 font-bold">{bread.name}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm text-gray-600 mb-4 leading-relaxed">{bread.description}</p>
        <div className="space-y-2">
          <div className="flex justify-between items-center p-2 bg-blue-50 rounded-lg">
            <span className="text-sm font-medium text-blue-800">السعر:</span>
            <span className="text-base text-blue-600 font-bold">{bread.price} د.ع</span>
          </div>
          <div className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
            <span className="text-sm font-medium text-gray-700">الكمية:</span>
            <span className="text-base text-gray-800 font-bold">
              {bread.pieces} {bread.pieces === 1 ? "قطعة" : "قطع"}
            </span>
          </div>
          <div className="p-2 bg-yellow-50 rounded-lg">
            <span className="text-xs text-gray-600">ملاحظات: {bread.notes}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BreadCard;
