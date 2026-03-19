
import { BreadProduct } from "./CustomerDashboard";

interface BreadCardProps {
  bread: BreadProduct;
  onClick: (bread: BreadProduct) => void;
}

const BreadCard = ({ bread, onClick }: BreadCardProps) => {
  return (
    <button
      onClick={() => onClick(bread)}
      className="w-full flex items-start gap-3 px-4 py-3.5 text-right transition-colors hover:bg-secondary/40 active:bg-secondary/60"
    >
      {/* Thumbnail */}
      <div className="relative shrink-0 w-[72px] h-[72px] rounded-xl overflow-hidden bg-secondary">
        <img
          src={bread.images[0]}
          alt={bread.name}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 space-y-1.5">
        <h3 className="text-sm font-bold text-foreground truncate">{bread.name}</h3>
        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">{bread.description}</p>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold text-[10px]">
            السعر: {bread.price} د.ع
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary text-foreground font-medium text-[10px]">
            الكمية: {bread.pieces} {bread.pieces === 1 ? "قطعة" : "قطع"}
          </span>
        </div>
      </div>
    </button>
  );
};

export default BreadCard;
