
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Mail, Phone, icons } from "lucide-react";
import React from "react";

interface ContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const whatsappNumber = "07515497130";
const email = "yh62731@gmail.com";

// Get the WhatsApp Lucide icon dynamically
const Whatsapp = icons.whatsapp;

const ContactDialog: React.FC<ContactDialogProps> = ({ open, onOpenChange }) => {
  const handleCopyEmail = () => {
    navigator.clipboard.writeText(email);
    toast({
      title: "Email copied!",
      description: "The support email has been copied to your clipboard.",
    });
  };

  const handleWhatsapp = () => {
    window.open(`https://wa.me/9647515497130`, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5 text-amber-600" />
            Contact Us
          </DialogTitle>
          <DialogDescription>
            للتواصل والدعم: يمكنك استخدام الواتساب أو الإيميل أدناه
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Button
            variant="outline"
            className="w-full flex items-center gap-2"
            onClick={handleWhatsapp}
          >
            <Whatsapp className="w-5 h-5 text-green-600" />
            واتساب مباشر: {whatsappNumber}
          </Button>

          <div className="flex items-center gap-2 justify-between border rounded p-2">
            <Mail className="w-5 h-5 text-amber-600" />
            <span className="truncate">{email}</span>
            <Button size="sm" variant="ghost" onClick={handleCopyEmail}>
              نسخ
            </Button>
          </div>

          <div className="flex items-center gap-2 text-amber-700 text-sm">
            <Phone className="w-4 h-4" />
            <span>رقم الهاتف للدعم: {whatsappNumber}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ContactDialog;
