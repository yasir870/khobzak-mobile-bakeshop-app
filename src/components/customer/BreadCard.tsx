
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { BreadProduct } from "./CustomerDashboard";

interface BreadCardProps {
  bread: BreadProduct;
  onClick: (bread: BreadProduct) => void;
}

const BreadCard = ({ bread, onClick }: BreadCardProps) => {
  return (
    <Card
      className="bg-card/95 backdrop-blur-sm hover:shadow-warm-lg transition-all duration-300 cursor-pointer border border-primary/20 hover:border-primary/40 hover:scale-[1.02]"
      onClick={() => onClick(bread)}
    >
      <CardHeader className="text-center flex flex-col items-center pb-3">
        <img
          src={bread.images[0]}
          alt={bread.name}
          className="h-36 w-36 object-cover rounded-xl mb-3 border-2 border-primary/20 shadow-warm transition-transform duration-300 hover:scale-105"
        />
        <CardTitle className="text-xl text-primary font-bold">{bread.name}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm text-foreground/70 mb-4 leading-relaxed">{bread.description}</p>
        <div className="space-y-2">
          <div className="flex justify-between items-center p-2 bg-accent/30 rounded-lg">
            <span className="text-sm font-medium text-primary">السعر:</span>
            <span className="text-base text-primary font-bold">{bread.price} د.ع</span>
          </div>
          <div className="flex justify-between items-center p-2 bg-muted/40 rounded-lg">
            <span className="text-sm font-medium text-primary">الكمية:</span>
            <span className="text-base text-primary font-bold">
              {bread.pieces} {bread.pieces === 1 ? "قطعة" : "قطع"}
            </span>
          </div>
          <div className="p-2 bg-primary/5 rounded-lg">
            <span className="text-xs text-foreground/60">ملاحظات: {bread.notes}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BreadCard;
